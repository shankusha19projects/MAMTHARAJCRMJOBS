// Job source scrapers. Each returns raw job objects; server.js scores + merges them.
// Sources: LinkedIn guest API (no login), Remotive, Himalayas, Jobicy, RemoteOK (public JSON APIs),
// and TinyFish Search + Fetch (needs a free API key from agent.tinyfish.ai/api-keys).

const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, { json = false, headers = {}, timeout = 25000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, { headers: { ...UA, ...headers }, signal: ctl.signal });
    if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status });
    return json ? await r.json() : await r.text();
  } finally { clearTimeout(t); }
}

const decode = (s = '') => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&#x27;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
export const stripHtml = (h = '') => decode(decode(String(h))
  .replace(/<(br|\/p|\/li|\/h\d|\/div)[^>]*>/gi, '\n').replace(/<li[^>]*>/gi, '• ').replace(/<[^>]+>/g, ' '))
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*/g, '\n\n').trim();
const clean = (s) => decode(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// "3 days ago" / "Sep 11, 2026" -> ISO date
export function relDate(txt) {
  if (!txt) return null;
  const m = String(txt).match(/(\d+)\s*(minute|hour|day|week|month)s?\s*ago/i);
  if (m) {
    const mult = { minute: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 2592e6 }[m[2].toLowerCase()];
    return new Date(Date.now() - +m[1] * mult).toISOString();
  }
  const d = Date.parse(txt);
  return isNaN(d) ? null : new Date(d).toISOString();
}

// ---------- LinkedIn (guest endpoints, no login) ----------
export async function linkedinSearch({ keywords, location, remote, recencyDays = 30, start = 0 }) {
  const p = new URLSearchParams({ keywords, location, f_TPR: `r${recencyDays * 86400}`, start: String(start) });
  if (remote) p.set('f_WT', '2');
  const html = await get(`https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${p}`);
  const cards = html.split(/<li>/).slice(1);
  const out = [];
  for (const c of cards) {
    const id = (c.match(/jobPosting:(\d+)/) || [])[1];
    const href = (c.match(/base-card__full-link[^>]*href="([^"]+)"/) || c.match(/href="(https:\/\/[a-z]+\.linkedin\.com\/jobs\/view\/[^"]+)"/) || [])[1];
    if (!id || !href) continue;
    const url = decode(href).split('?')[0];
    out.push({
      source: 'LinkedIn', extId: id, url,
      title: clean((c.match(/base-search-card__title[^>]*>([\s\S]*?)<\/h3>/) || [])[1]),
      company: clean((c.match(/base-search-card__subtitle[^>]*>([\s\S]*?)<\/h4>/) || [])[1]),
      location: clean((c.match(/job-search-card__location[^>]*>([\s\S]*?)<\/span>/) || [])[1]),
      postedAt: (c.match(/datetime="([\d-]+)"/) || [])[1] || null,
      postedText: clean((c.match(/<time[^>]*>([\s\S]*?)<\/time>/) || [])[1]),
      logo: decode((c.match(/data-delayed-url="(https:\/\/media\.licdn\.com[^"]+)"/) || [])[1] || ''),
      tags: /actively hiring/i.test(c) ? ['Actively hiring'] : [],
      salary: clean((c.match(/job-search-card__salary-info[^>]*>([\s\S]*?)<\/span>/) || [])[1]) || '',
    });
  }
  return out;
}

export async function linkedinDetail(id) {
  const html = await get(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`);
  const body = (html.match(/show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '';
  const crit = [...html.matchAll(/description__job-criteria-subheader[^>]*>([\s\S]*?)<\/h3>[\s\S]*?description__job-criteria-text[^>]*>([\s\S]*?)<\/span>/g)]
    .reduce((a, m) => ({ ...a, [clean(m[1])]: clean(m[2]) }), {});
  const applicants = clean((html.match(/num-applicants__caption[^>]*>([\s\S]*?)<\/(span|figcaption)>/) || [])[1]);
  const postedText = clean((html.match(/posted-time-ago__text[^>]*>([\s\S]*?)<\/span>/) || [])[1]);
  return {
    title: clean((html.match(/top-card-layout__title[^>]*>([\s\S]*?)<\/h2>/) || [])[1]),
    company: clean((html.match(/topcard__org-name-link[^>]*>([\s\S]*?)<\/a>/) || [])[1]),
    location: clean((html.match(/topcard__flavor--bullet">([\s\S]*?)<\/span>/) || [])[1]),
    postedText, postedAt: relDate(postedText),
    closed: /no longer accepting applications/i.test(html),
    description: stripHtml(body).slice(0, 9000),
    seniority: crit['Seniority level'] || '',
    employmentType: crit['Employment type'] || '',
    industries: crit['Industries'] || '',
    jobFunction: crit['Job function'] || '',
    applicants,
  };
}

// ---------- Public remote-job APIs ----------
export const OK_GEO = /(worldwide|anywhere|global|india|apac|asia|emea|no restriction)/i;

export async function remotive(term, geo = OK_GEO) {
  const d = await get(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(term)}&limit=40`, { json: true });
  return (d.jobs || []).filter((j) => !j.candidate_required_location || geo.test(j.candidate_required_location)).map((j) => ({
    source: 'Remotive', extId: String(j.id), url: j.url, title: j.title, company: j.company_name,
    location: j.candidate_required_location || 'Worldwide', postedAt: j.publication_date, description: stripHtml(j.description).slice(0, 9000),
    tags: j.tags || [], logo: j.company_logo || '', salary: j.salary || '', employmentType: j.job_type || '',
  }));
}

export async function himalayas(term, geo = OK_GEO) {
  const d = await get(`https://himalayas.app/jobs/api/search?q=${encodeURIComponent(term)}`, { json: true });
  return (d.jobs || []).filter((j) => !(j.locationRestrictions || []).length || (j.locationRestrictions || []).some((l) => geo.test(l))).map((j) => ({
    source: 'Himalayas', extId: j.guid || j.applicationLink, url: j.applicationLink || j.guid, title: j.title, company: j.companyName,
    location: (j.locationRestrictions || []).join(', ') || 'Worldwide',
    postedAt: j.pubDate ? new Date(j.pubDate * (j.pubDate < 1e12 ? 1000 : 1)).toISOString() : null,
    description: stripHtml(j.description || j.excerpt).slice(0, 9000), tags: j.categories || [], logo: j.companyLogo || '',
    salary: j.minSalary ? `${j.currency || ''} ${j.minSalary}–${j.maxSalary || ''}`.trim() : '', employmentType: j.employmentType || '', seniority: (j.seniority || []).join(', '),
  }));
}

export async function jobicy(tag, geo = OK_GEO) {
  const d = await get(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(tag)}`, { json: true });
  return (d.jobs || []).filter((j) => !j.jobGeo || geo.test(j.jobGeo)).map((j) => ({
    source: 'Jobicy', extId: String(j.id), url: j.url, title: clean(j.jobTitle), company: j.companyName, location: j.jobGeo || 'Anywhere',
    postedAt: j.pubDate, description: stripHtml(j.jobDescription || j.jobExcerpt).slice(0, 9000), tags: [].concat(j.jobIndustry || []),
    logo: j.companyLogo || '', employmentType: [].concat(j.jobType || []).join(', '), seniority: j.jobLevel || '',
  }));
}

export async function remoteok(geo = OK_GEO) {
  const d = await get('https://remoteok.com/api', { json: true });
  return (Array.isArray(d) ? d.slice(1) : []).filter((j) => !j.location || geo.test(j.location) || /remote/i.test(j.location)).map((j) => ({
    source: 'RemoteOK', extId: String(j.id), url: j.url || j.apply_url, title: j.position, company: j.company, location: j.location || 'Worldwide',
    postedAt: j.date, description: stripHtml(j.description).slice(0, 9000), tags: j.tags || [], logo: j.company_logo || j.logo || '',
    salary: j.salary_min ? `USD ${j.salary_min}–${j.salary_max}` : '',
  }));
}

// ---------- TinyFish (Search + Fetch APIs, free with API key) ----------
export async function tinyfishSearch(apiKey, query, { recencyDays = 30, location } = {}) {
  const p = new URLSearchParams({ query });
  p.set('recency_minutes', String(recencyDays * 1440));
  if (location) p.set('location', location);
  const d = await get(`https://api.search.tinyfish.ai?${p}`, { json: true, headers: { 'X-API-Key': apiKey }, timeout: 40000 });
  return d.results || [];
}

export async function tinyfishFetch(apiKey, urls) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 150000);
  try {
    const r = await fetch('https://api.fetch.tinyfish.ai', {
      method: 'POST', signal: ctl.signal,
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls, format: 'markdown', purpose: 'Extract job description, requirements and posting details for a job-search CRM', per_url_timeout_ms: 60000 }),
    });
    if (!r.ok) throw new Error(`TinyFish fetch HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(t); }
}

// Parse a TinyFish search hit into a job stub (only for real job-posting URLs).
export function jobFromSearchHit(hit) {
  const url = (hit.url || '').split('?')[0];
  let m = url.match(/linkedin\.com\/jobs\/view\/(?:[^/]*-)?(\d{8,})/);
  if (m) {
    // "Company hiring Title in Location | LinkedIn"
    const raw = (hit.title || '').replace(/\s*[|—-]\s*(LinkedIn|Jobs).*$/i, '').replace(/\s*\.\.\.$/, '');
    const tm = raw.match(/^(.*?) hiring (.*?)(?: in (.*))?$/i) || null;
    const at = !tm && raw.match(/^(.*) at (.*)$/);
    const dash = !tm && !at && raw.match(/^(.*) - (.*)$/);
    return {
      source: 'TinyFish·LinkedIn', extId: m[1], linkedinId: m[1], url: url.replace(/\/$/, ''),
      title: tm ? tm[2] : at ? at[1] : dash ? dash[1] : raw, company: tm ? tm[1] : at ? at[2] : dash ? dash[2] : '',
      location: tm?.[3] || '', postedAt: relDate(hit.date), description: hit.snippet || '',
    };
  }
  m = url.match(/naukri\.com\/job-listings-([^?]+)/);
  if (m) {
    const parts = (hit.title || '').split(/ - | \| /);
    return { source: 'TinyFish·Naukri', extId: m[1], url, title: parts[0] || hit.title, company: parts[1] || '', location: parts[2] || '',
      postedAt: relDate(hit.date), description: hit.snippet || '' };
  }
  m = url.match(/(indeed\.com\/(?:viewjob|rc\/clk|m\/basecamp\/viewjob)|foundit\.in\/job\/|glassdoor\.[a-z.]+\/job-listing\/|instahyre\.com\/job-|iimjobs\.com\/j\/|bayt\.com\/en\/[a-z-]+\/jobs\/|naukrigulf\.com\/.*-jd-)/);
  if (m) {
    const parts = (hit.title || '').split(/ - | \| | at /);
    return { source: `TinyFish·${hit.site_name || new URL(url).hostname}`, extId: url, url, title: parts[0] || hit.title, company: parts[1] || '', location: parts[2] || '',
      postedAt: relDate(hit.date), description: hit.snippet || '' };
  }
  return null;
}
