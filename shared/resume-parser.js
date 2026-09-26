// Rule-based resume -> candidate profile. Works for any profession via shared/taxonomy.js.
// Input: plain text (server extracts it from PDF/DOCX/TXT). Output: the profile JSON the CRM runs on.
import { TAXONOMY, ALL_TOOLS, MARKET_OPTIONS, KNOWN_CITIES, CITY_ALIASES, COUNTRY_OF } from './taxonomy.js';

const BULLET = /^[•●▪◦‣∙·*\-–—]\s*/;
const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const DATE = `(?:${MONTH}\\s*'?\\d{2,4}(?:st|nd|rd|th)?|\\d{1,2}\\/\\d{2,4}|\\d{4})`;
const RANGE = new RegExp(`(${DATE}[^\\n]{0,12}?)\\s*(?:–|—|-|to|until)\\s*(present|current|now|till date|today|${MONTH}[^\\n]{0,14}?\\d{4}|\\d{1,2}\\/\\d{4}|\\d{4})`, 'i');
const SECTION_WORDS = {
  summary: /^(professional )?(summary|profile|objective|about( me)?|career summary|overview)$/i,
  experience: /^(professional |work |employment )?(experience|history|employment)( history)?$/i,
  skills: /^(core |key |technical )?(skills|competencies|expertise|technologies|tools)( & tools| and tools| summary)?$/i,
  education: /^(education|academic|qualifications?)( details| background)?$/i,
  certs: /^(certifications?|licen[sc]es( & certifications)?|certificates)$/i,
  achievements: /^(key )?(achievements|accomplishments|highlights)$/i,
  projects: /^(projects|key projects)$/i,
};
const ROLE_NOUN = /(engineer|developer|analyst|manager|administrator|admin|specialist|consultant|lead|architect|designer|scientist|support|executive|officer|accountant|recruiter|coordinator|nurse|teacher|technician|associate|director|owner|master|sme|expert|writer|strategist|operator)/i;
const STOP = new Set(['and', 'of', 'the', 'for', 'in', 'at', 'a', 'an', 'to', 'with', '&', '-', '–', '|', 'senior', 'sr', 'jr', 'junior', 'ii', 'iii', 'i', 'global', 'it']);

const US = new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' '));
const CITY_ST = /([A-Z][a-zA-Z.]+(?: [A-Z][a-zA-Z.]+){0,2}),\s*([A-Z]{2})\b/;
const LABEL = /^(name|contact|e-?mail|phone|mobile|address|location)\s*[-:–]\s*/i;
const cap = (s) => s.replace(/\w\S*/g, (w) => (w.length > 3 || !/^(and|of|the|for|in|at)$/i.test(w) ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()));
const uniq = (a) => [...new Set(a.filter(Boolean))];
const RX = new Map();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
export const termRx = (t) => { const k = t.trim(); if (!RX.has(k)) RX.set(k, new RegExp(`(?<![a-z0-9])${esc(k)}(?![a-z0-9])`, 'g')); return RX.get(k); };
export const countTerm = (text, t) => (text.match(termRx(t)) || []).length;
const pad = (s) => ` ${s.toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ')} `;

function toLines(text) {
  const raw0 = String(text).replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  // re-join superscript ordinals split by PDF extraction: "August 10" / "th" / "2026 • ..."
  const raw = [];
  for (let i = 0; i < raw0.length; i++) {
    if (/^(st|nd|rd|th)$/i.test(raw0[i]) && raw.length) { raw[raw.length - 1] += raw0[i] + (raw0[i + 1] ? ' ' + raw0[++i] : ''); continue; }
    raw.push(raw0[i]);
  }
  const out = [];
  for (const l of raw) {
    const prev = out[out.length - 1];
    const isBullet = BULLET.test(l);
    const isHead = isHeading(l);
    if (prev && !isBullet && !isHead && !RANGE.test(l) && !isHeading(prev) &&
      (/^[a-z(]/.test(l) || (BULLET.test(prev) && !/[.:;!?]$/.test(prev)))) {
      out[out.length - 1] = `${prev}${/-$/.test(prev) ? '' : ' '}${l}`;
    } else out.push(l);
  }
  return out;
}
function isHeading(l) {
  if (l.length > 48 || BULLET.test(l)) return false;
  const clean = l.replace(/[:\s]+$/, '');
  if (Object.values(SECTION_WORDS).some((re) => re.test(clean))) return true;
  const letters = clean.replace(/[^A-Za-z]/g, '');
  return letters.length >= 4 && letters === letters.toUpperCase() && clean.split(' ').length <= 4 && !/@|\d{3}/.test(clean);
}
function sectionOf(l) {
  const clean = l.replace(/[:\s]+$/, '');
  for (const [k, re] of Object.entries(SECTION_WORDS)) if (re.test(clean)) return k;
  return null;
}

/**
 * @param {string} text resume plain text
 * @param {{ fileName?: string, relocation?: string[], remote?: boolean, includeAI?: boolean, recencyDays?: number }} opts
 */
export function parseResume(text, opts = {}) {
  const lines = toLines(text);
  const full = pad(lines.join('\n'));

  // sections
  const sections = { top: [] };
  let cur = 'top';
  for (const l of lines) {
    const s = isHeading(l) ? sectionOf(l) : null;
    if (s) { cur = s; sections[cur] = sections[cur] || []; continue; }
    if (isHeading(l) && cur !== 'top') { cur = 'other'; sections.other = sections.other || []; continue; }
    (sections[cur] = sections[cur] || []).push(l);
  }

  // contacts
  const email = (text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [])[0] || '';
  const phone = ((text.match(/(\+?\d[\d ()-]{8,}\d)/) || [])[1] || '').trim();
  const linkedin = (text.match(/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[\w%-]+/i) || [])[0] || '';

  // name + headline
  const top = lines.slice(0, 8);
  let name = '';
  for (const l of top) {
    if (/^(contact|e-?mail|phone|mobile|address)\s*[-:–]/i.test(l)) continue;
    const c = l.replace(LABEL, '').replace(/\b(cv|resume|résumé|curriculum vitae)\b/gi, '').replace(/[|,]+$/, '').trim();
    if (c && !/[@\d]/.test(c) && c.split(' ').length <= 5 && c.length <= 40 && !sectionOf(c)) { name = c; break; }
  }
  if (name === name.toUpperCase()) name = cap(name);
  const firstName = name.split(' ')[0] || 'Candidate';
  const nameIdx = top.findIndex((l) => l.toLowerCase().includes(name.toLowerCase().split(' ')[0] || '###'));
  const headLines = [];
  for (const l of lines.slice(nameIdx + 1, nameIdx + 4)) {
    if (/@|\+?\d{6,}|linkedin/i.test(l) || isHeading(l)) break;
    headLines.push(l);
  }
  const summaryText = (sections.summary || []).join(' ');
  const headClean = headLines.filter((l) => !LABEL.test(l) && !/^(education|pmp|certified)/i.test(l));
  const rolePhrase = (summaryText.match(/^(.{6,90}?)\s+with\s+\d/i) || [])[1] || '';
  const headline = (headClean.join(' ') || rolePhrase || summaryText.split(/(?<=\.)\s/)[0] || '').slice(0, 160);

  // location (skip education lines: a university city is not where the candidate lives)
  let city = '', country = '';
  for (const l of lines.slice(0, 10)) {
    if (/education|university|college|school|institute|master|bachelor|degree/i.test(l)) continue;
    for (const part of l.split(/[|•·]/)) {
      const hit = KNOWN_CITIES.find((c) => new RegExp(`\\b${c}\\b`, 'i').test(part));
      if (hit) {
        city = CITY_ALIASES[hit.toLowerCase()] || hit;
        const m = part.match(new RegExp(`${hit}\\s*,\\s*([A-Za-z .]+)`, 'i'));
        country = (m && m[1].trim()) || COUNTRY_OF[city] || '';
        break;
      }
    }
    if (city) break;
  }
  // experience entries
  const expLines = sections.experience || lines;
  const experience = [];
  const headerLines = new Set(), titleLines = new Set();
  expLines.forEach((l, i) => {
    const m = l.match(RANGE);
    if (!m || BULLET.test(l) || l.length > 220) return;
    headerLines.add(i);
    let header = l.slice(0, m.index).replace(/[•|,–-]\s*$/, '').trim();
    if (header.length < 4) header = (expLines[i - 1] || '').trim();
    const where = l.slice(m.index + m[0].length).replace(/^[\s•|,–-]+/, '').replace(/[,•]+$/, '').trim();
    let role = header, company = '', loc = '';
    const next = (expLines[i + 1] || '').replace(BULLET, '').trim();
    const cs = header.match(CITY_ST);
    if (cs && US.has(cs[2]) && !ROLE_NOUN.test(header.slice(0, cs.index)) && next.length < 90 && ROLE_NOUN.test(next)) {
      // "Company - City, ST    Mar 2022 to Jan 2024" with the job title on the next line
      company = header.slice(0, cs.index).replace(/[\s,–-]+$/, '').replace(/\s+-\s+Information Technology Division$/i, '');
      role = next; loc = `${cs[1]}, ${cs[2]}`; titleLines.add(i + 1);
    } else {
      const bar = header.split(/\s*\|\s*/);
      if (bar.length > 1) { role = bar[0]; company = bar.slice(1).join(' · '); }
      else { const m2 = header.match(/^(.*?)\s+(?:at|@)\s+(.*)$/) || header.match(/^(.*?)\s+[–—,]\s+(.*)$/); if (m2) { role = m2[1]; company = m2[2]; } }
    }
    experience.push({ role: role.trim(), company: company.replace(/Client\s*:-?/i, 'Client: ').trim(), period: `${m[1].trim()} – ${cap(m[2].trim())}`, where: where || loc, start: m[1], end: m[2] });
  });
  if (!city) {
    // fall back to the most recent job's location
    const l0 = experience[0]?.where || '';
    const known = KNOWN_CITIES.find((c) => new RegExp(`\\b${c}\\b`, 'i').test(l0));
    const cs = l0.match(CITY_ST);
    if (known) { city = CITY_ALIASES[known.toLowerCase()] || known; country = COUNTRY_OF[city] || ''; }
    else if (cs && US.has(cs[2])) { city = cs[1]; country = 'United States'; }
  }
  if (!city) city = 'Remote';

  // years of experience
  let years = 0;
  const ym = [...(summaryText + ' ' + headline).matchAll(/(\d{1,2})\s*\+?\s*(?:years|yrs)/gi)].map((x) => +x[1]).filter((n) => n < 45);
  if (ym.length) years = Math.max(...ym);
  else {
    const yrs = experience.map((e) => +(e.start.match(/\d{4}/) || [0])[0]).filter(Boolean);
    if (yrs.length) years = new Date().getFullYear() - Math.min(...yrs);
  }

  // bullets + achievements
  let bullets = lines.filter((l) => BULLET.test(l)).map((l) => l.replace(BULLET, '').trim()).filter((l) => l.length > 25);
  if (bullets.length < 5) {
    // Word/Docs lists often lose their bullet glyphs: treat experience paragraphs as bullets
    const para = expLines.filter((l, i) => !headerLines.has(i) && !titleLines.has(i) && l.length > 50 && !isHeading(l));
    bullets = [...bullets, ...para, ...(sections.achievements || []).filter((l) => l.length > 40)];
  }
  const withNumbers = bullets.filter((b) => /\d/.test(b));

  // skills via taxonomy
  const groups = TAXONOMY.map((g) => {
    const hits = g.terms.reduce((a, t) => a + countTerm(full, t), 0);
    return { g, hits };
  }).filter((x) => x.hits > 0).sort((a, b) => b.hits - a.hits);
  const bestProof = (g) => {
    const cands = bullets.map((b) => {
      const pb = pad(b);
      const termHits = g.terms.filter((t) => countTerm(pb, t)).length;
      return { b, s: termHits * 3 + (/\d/.test(b) ? 2 : 0) + (b.length > 60 && b.length < 260 ? 1 : 0) };
    }).filter((c) => c.s >= 3).sort((a, b) => b.s - a.s);
    return cands[0]?.b || '';
  };
  const skills = groups.filter((x) => x.hits >= 2).map(({ g, hits }, i) => ({
    key: g.key, label: g.label, domain: g.domain, terms: g.terms, roles: g.roles, hits,
    core: i < 8 && hits >= 2, proof: bestProof(g),
  }));
  const tools = ALL_TOOLS.filter((t) => countTerm(full, t));
  const termFreq = {};
  for (const s of skills) for (const t of s.terms) { const n = countTerm(full, t); if (n) termFreq[t.trim()] = (termFreq[t.trim()] || 0) + n; }
  const keywords = uniq(Object.entries(termFreq).sort((a, b) => b[1] - a[1]).map(([t]) => t)).slice(0, 40);

  // certifications
  const certSrc = (sections.certs || []).join(' • ');
  let certifications = certSrc.split(/\s*[•;|]\s*|\s{2,}/).map((c) => c.replace(BULLET, '').trim()).filter((c) => c.length > 2 && c.length < 90);
  if (!certifications.length) certifications = uniq(lines.filter((l) => /certified|certification/i.test(l) && l.length < 90).map((l) => l.replace(BULLET, '')));

  // target titles
  const titleParts = headline.replace(/\s+with\s+\d.*$/i, '').split(/\s*[|•\/,]\s*|\s+and\s+/).map((s) => s.trim()).filter((s) => s.length > 3 && s.length < 60 && ROLE_NOUN.test(s));
  const roleTitles = experience.slice(0, 3).flatMap((e) => e.role.replace(/\(.*?\)/g, '').split(/\s*\/\s*/))
    .map((r) => r.replace(/\s+[–-]\s.*$|\s*\(.*$/, '').trim()).filter((s) => s.length < 60 && ROLE_NOUN.test(s));
  const targetTitles = uniq([...titleParts, ...roleTitles].map((t) => t.replace(/\s+/g, ' '))).slice(0, 8);
  const roleWords = uniq(targetTitles.join(' ').toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 1 && !STOP.has(w)));

  // queries for scrapers
  // most common role noun across target titles ("Analyst", "Engineer", ...) pairs with top tools
  const nouns = targetTitles.map((t) => (t.match(new RegExp(ROLE_NOUN.source, 'gi')) || []).pop()).filter(Boolean).map((n) => n.toLowerCase());
  const noun = nouns.sort((a, b) => nouns.filter((x) => x === b).length - nouns.filter((x) => x === a).length)[0] || 'engineer';
  const toolName = (t) => t.split(' ').map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(' ');
  const coreGroups = skills.filter((s) => s.core);
  const toolQueries = coreGroups.slice(0, 5).map((s) => {
    const tool = TAXONOMY.find((t) => t.key === s.key)?.tools.find((t) => tools.includes(t));
    return tool ? `${toolName(tool)} ${cap(noun)}` : null;
  });
  const queries = uniq([...targetTitles.slice(0, 5), ...toolQueries]).slice(0, 11).map((q, i) => ({ q, core: i < 5 }));
  if (opts.includeAI !== false) queries.push({ q: `AI ${cap(coreGroups[0]?.label.split(/[ /&]/)[0] || '')} ${cap(noun)}`.replace(/\s+/g, ' '), core: false, ai: true });

  // markets
  const cityPrefix = city.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'LOC';
  // local area = city (+ its US state, so the metro counts as local; + common aliases)
  const st = (text.match(new RegExp(`${esc(city)},\\s*([A-Z]{2})\\b`)) || [])[1];
  const localMatch = [city.toLowerCase(), ...(st && US.has(st) ? [`, ${st.toLowerCase()}\\b`] : []), ...(city === 'Bengaluru' ? ['bangalore', 'karnataka'] : [])].join('|');
  const markets = [
    { id: 'local', label: city, kind: 'Local', prefix: cityPrefix, linkedin: country ? `${city}, ${country}` : city, enabled: city !== 'Remote', match: localMatch },
    { id: 'remote', label: 'Remote', kind: 'Remote', prefix: 'RMT', linkedin: country || 'Worldwide', remote: true, enabled: opts.remote !== false, match: 'remote' },
    ...MARKET_OPTIONS.filter((m) => (opts.relocation || []).includes(m.id)).map((m) => ({ ...m, kind: 'Relocation', enabled: true })),
  ];
  if (country) markets.push({ id: 'country', label: `${country} (other cities)`, kind: 'Relocation', prefix: 'OTH', linkedin: country, enabled: true, noSearch: true, match: country.toLowerCase() });

  // resume versions: one per core competency + senior + remote variants
  const versions = coreGroups.slice(0, 5).map((s) => ({
    id: s.key, name: `${s.label} focus`, focus: s.proof ? s.proof.slice(0, 140) : `Leads with ${s.label}`,
    bestFor: `${s.roles.slice(0, 3).map(cap).join(', ')} roles`, file: 'main', keys: uniq([...s.terms.map((t) => t.trim()), ...s.roles]),
  }));
  if (years >= 7) versions.push({ id: 'lead', name: 'Senior / Lead variant', focus: `Emphasise ${years}+ years, ownership, mentoring and cross-team delivery`, bestFor: 'Senior, lead, principal and manager titles', file: 'main', keys: ['lead', 'senior', 'manager', 'principal', 'architect', 'head', 'mentor'] });
  versions.push({ id: 'remote', name: 'Remote-ready variant', focus: 'Async communication, self-management, documented outcomes, time-zone flexibility', bestFor: 'Remote-first companies', file: 'main', keys: ['remote', 'distributed', 'async', 'customer', 'client'] });

  const last = experience[0];
  const current = last && /present|current|now|today|till/i.test(last.end || '');
  const eduLines = (sections.education || []).slice(0, 2);

  return {
    version: 1, source: 'parser', createdAt: new Date().toISOString(),
    key: `jobpilot-${(name || 'candidate').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: name || 'Candidate', firstName, headline, email, phone, linkedin, city, country,
    years, yearsLabel: years ? `${years}+ years` : 'experienced',
    availability: current ? 'Currently employed (serving notice on request)' : last ? `Immediately available (last role ended ${cap(String(last.end || ''))})` : 'Available',
    workAuth: `${country || 'Local'} work authorization${(opts.relocation || []).length ? '; open to relocation' : ''}`,
    education: eduLines.join(' · '),
    summary: summaryText.slice(0, 900),
    topSkills: skills.slice(0, 10).map((s) => s.label),
    certifications: certifications.slice(0, 16),
    domains: uniq(skills.map((s) => s.domain)).slice(0, 6),
    experience: experience.map(({ start, end, ...e }) => e).slice(0, 8),
    keywords, skills, tools, targetTitles, roleWords,
    stories: withNumbers.slice(0, 5).map((b) => ({ bullet: b, group: skills.find((s) => s.terms.some((t) => countTerm(pad(b), t)))?.label || 'your core area' })),
    resumeVersions: versions,
    resumeFiles: { main: { label: 'Uploaded resume', file: opts.fileName || 'resume' } },
    markets, queries, recencyDays: opts.recencyDays || 30,
  };
}
