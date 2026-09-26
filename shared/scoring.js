// Profile-driven match scoring, shared by the Node scraper server and the React app (Add Job).
// profile = data/profile.json (built from the uploaded resume by shared/resume-parser.js).
import { TAXONOMY, ALL_TOOLS, AI_COMPANIES } from './taxonomy.js';
import { countTerm } from './resume-parser.js';

const WEIGHTS = { skills: 25, experience: 25, domain: 15, tools: 15, seniority: 10, location: 5, keyword: 5 };
const STOP = new Set(['and', 'of', 'the', 'for', 'in', 'at', 'a', 'an', 'to', 'with', 'senior', 'sr', 'jr', 'junior', 'ii', 'iii', 'iv', 'i', 'global', 'it', 'remote', 'hybrid', 'india', 'contract', 'full', 'time']);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const norm = (s) => ' ' + String(s || '').toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ') + ' ';
const has = (text, term) => countTerm(text, term) > 0;
const words = (s) => norm(s).split(/[^a-z0-9+#.]+/).filter((w) => w.length > 1 && !STOP.has(w));

/** Experience alignment 0..1: job title vs the candidate's target titles and core competency role words. */
function titleFit(title, profile) {
  const tw = new Set(words(title));
  let best = 0;
  for (const t of profile.targetTitles || []) {
    const w = words(t);
    if (!w.length) continue;
    const overlap = w.filter((x) => tw.has(x)).length / Math.min(w.length, Math.max(1, tw.size));
    if (overlap > 0) best = Math.max(best, overlap >= 0.99 ? 1 : 0.4 + overlap * 0.55);
  }
  const t = norm(title);
  for (const s of profile.skills || []) {
    const roleHit = (s.roles || []).some((r) => has(t, r));
    const termHit = s.core && s.terms.some((term) => term.trim().length > 3 && has(t, term));
    if (roleHit || termHit) best = Math.max(best, s.core ? (roleHit && termHit ? 0.97 : 0.9) : 0.7);
  }
  return best || 0.3;
}

/** False when the title clearly belongs to a profession the candidate doesn't have. */
export function isRelevantTitle(title, profile) {
  const t = norm(title);
  if (/\b(intern|internship|trainee|fresher)\b/.test(t) && (profile.years || 0) >= 3) return false;
  const fit = titleFit(title, profile);
  if (fit >= 0.6) return true;
  const mine = new Set((profile.skills || []).map((s) => s.key));
  const titleGroups = TAXONOMY.filter((g) => g.roles.some((r) => has(t, r)));
  if (titleGroups.length && !titleGroups.some((g) => mine.has(g.key))) return false;
  return fit >= 0.4;
}

function seniorityFit(title, desc, years) {
  const t = norm(title);
  const senior = years >= 6;
  if (/\b(vp|vice president|director|head of|chief)\b/.test(t)) return years >= 12 ? 0.8 : 0.35;
  if (/\b(intern|trainee|fresher|graduate|junior|jr\.?|entry|l1|level 1)\b/.test(t)) return senior ? 0.4 : 0.9;
  if (/\bmanager\b/.test(t)) return years >= 8 ? 0.85 : 0.6;
  if (/\b(senior|sr\.?|lead|principal|staff|specialist|sme|l3|level 3|consultant|architect|expert)\b/.test(t)) return senior ? 1 : 0.65;
  let s = 0.85;
  const m = norm(desc).match(/(\d{1,2})\s*\+?\s*(?:-|to)?\s*(\d{1,2})?\s*\+?\s*(?:years|yrs)/);
  if (m) { const lo = +m[1]; if (lo > years + 4) s = 0.5; else if (lo <= years) s = 1; else s = 0.75; }
  return s;
}

export function detectWorkMode(text, market) {
  const t = norm(text);
  if (/\bremote\b|work from home|\bwfh\b|anywhere/.test(t) || market?.kind === 'Remote') return 'Remote';
  if (/hybrid/.test(t)) return 'Hybrid';
  return 'On-site';
}

/**
 * @param {{title:string, company?:string, description?:string, tags?:string[]}} job
 * @param {{kind:string,label:string}} market
 * @param {object} profile candidate profile (data/profile.json)
 */
export function scoreJob(job, market, profile) {
  const title = job.title || '';
  const desc = job.description || '';
  const text = norm([title, title, desc, (job.tags || []).join(' '), job.company].join(' '));
  const titleN = norm(title);
  const thin = desc.length < 250;
  const skills = profile.skills || [];
  const years = profile.years || 0;

  const groupsHit = skills.filter((g) => g.terms.some((term) => has(text, term)));
  const titleGroups = skills.filter((g) => g.terms.some((term) => has(titleN, term)));
  const exp0 = titleFit(title, profile);

  const skillPts = groupsHit.reduce((a, g) => a + (g.core ? 1 : 0.5), 0);
  let sk = clamp(skillPts / (thin ? 3 : 9.5));
  if (titleGroups.length) sk = clamp(sk + 0.15);
  if (thin) sk = Math.max(sk, exp0 * 0.62);

  let experience = exp0;
  const yrs = norm(desc).match(/(\d{1,2})\s*\+?\s*(?:-|to)?\s*(\d{1,2})?\s*\+?\s*(?:years|yrs)/);
  if (yrs && +yrs[1] > years + 4) experience *= 0.8;

  const myDomains = new Set(skills.map((s) => s.domain));
  const domainHits = TAXONOMY.filter((g) => myDomains.has(g.domain) && g.terms.some((t) => has(text, t))).length;
  let domain = clamp(domainHits / 8);
  if (thin) domain = Math.max(domain, exp0 * 0.6);

  const toolsHit = (profile.tools || []).filter((t) => has(text, t));
  let tools = [0.1, 0.4, 0.55, 0.68, 0.78, 0.86, 0.93, 1][Math.min(7, toolsHit.length)];
  if (thin) tools = Math.max(tools, exp0 * 0.55);

  const seniority = seniorityFit(title, desc, years);
  const location = market.kind === 'Local' ? 1 : market.kind === 'Remote' ? 0.95 : 0.8;
  const kwHits = (profile.keywords || []).filter((k) => has(text, k));
  const keyword = clamp(kwHits.length / 20);

  const breakdown = {
    skills: Math.round(sk * WEIGHTS.skills),
    experience: Math.round(experience * WEIGHTS.experience),
    domain: Math.round(domain * WEIGHTS.domain),
    tools: Math.round(tools * WEIGHTS.tools),
    seniority: Math.round(seniority * WEIGHTS.seniority),
    location: Math.round(location * WEIGHTS.location),
    keyword: Math.round(keyword * WEIGHTS.keyword),
  };
  // Tools the JD asks for that the resume doesn't mention -> gaps + small penalty
  const mine = new Set(profile.tools || []);
  const gapTools = ALL_TOOLS.filter((t) => !mine.has(t) && t.length > 2 && has(norm(desc), t));
  breakdown.skills = Math.max(0, breakdown.skills - Math.min(8, gapTools.length * 2));
  let match = Object.values(breakdown).reduce((a, b) => a + b, 0);
  if (match > 80) match = Math.round(80 + (match - 80) * 0.8);
  if (!isRelevantTitle(title, profile)) match = Math.min(match, 38);
  if (thin) match = Math.min(match, 84); // no full JD yet -> never auto-A
  match = clamp(match, 5, 98);

  const priority = match >= 85 ? 'A' : match >= 70 ? 'B' : match >= 55 ? 'C' : 'D';
  const shortlistProb = Math.round(match * (market.kind === 'Relocation' ? 0.9 : 0.94));
  const interviewProb = Math.round(shortlistProb * 0.76);
  const offerProb = Math.round(shortlistProb * 0.4);
  const ats = Math.max(0, match - 2);

  const versions = profile.resumeVersions || [];
  let best = versions[0] || { id: 'main', name: 'Main resume', keys: [] }, bestScore = -1;
  for (const v of versions) {
    let s = (v.keys || []).reduce((a, k) => a + (has(text, k) ? 1 : 0) + (has(titleN, k) ? 2 : 0), 0);
    if (v.id === 'remote' && market.kind === 'Remote') s += 1.5;
    if (s > bestScore) { bestScore = s; best = v; }
  }

  const aiFlag = AI_COMPANIES.some((c) => norm(job.company).includes(c)) ||
    /\b(artificial intelligence|genai|gen ai|generative ai|llm|machine learning|copilot|ai-powered|ai powered|aiops|ai agents?)\b/.test(text) || /\bai\b/.test(titleN);
  const matched = groupsHit.length ? groupsHit : titleGroups;
  const fam = (titleGroups[0] || groupsHit[0])?.label || 'Adjacent';

  return {
    match, breakdown, priority, shortlistProb, interviewProb, offerProb, ats,
    resumeVersion: best.id, family: fam, aiFlag,
    matchedKeywords: kwHits.slice(0, 14), matchedSkills: matched.map((g) => g.label), toolsHit,
    whyMatch: buildWhy(job, market, matched, profile),
    gaps: buildGaps(gapTools, market, thin, profile),
    tailoring: buildTailoring(best, matched, kwHits, job),
  };
}

const quote = (s, n = 150) => `“${s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s}”`;

function buildWhy(job, market, groups, p) {
  const company = job.company || 'This employer';
  const top = groups.filter((g) => g.proof).slice(0, 2);
  const s = [];
  if (groups.length) {
    const labels = groups.slice(0, 3).map((g) => g.label).join(', ').replace(/, ([^,]*)$/, ' and $1');
    s.push(`${company}'s ${job.title} role leans on ${labels}, which are core strengths for ${p.firstName} (${p.yearsLabel}).`);
    if (top.length) s.push(`Resume proof: ${quote(top[0].proof)}${top[1] ? ` and ${quote(top[1].proof, 110)}` : ''}.`);
  } else {
    s.push(`${company}'s ${job.title} opening is adjacent to ${p.firstName}'s background. The overlap is mostly transferable, so lead with outcomes rather than tools.`);
  }
  if (market.kind === 'Local') s.push(`It's in the ${p.city} area, so there's no relocation.`);
  else if (market.kind === 'Remote') s.push('It is remote, so location is not a constraint. Show async, self-directed delivery.');
  else s.push(`It's a relocation to ${market.label}. Confirm visa sponsorship early.`);
  return s.slice(0, 4).join(' ');
}

function buildGaps(gapTools, market, thin, p) {
  const out = gapTools.slice(0, 2).map((g) => `JD mentions ${g}. It's not on the resume, so frame adjacent experience or do a quick upskill.`);
  if (market.kind === 'Relocation') out.push(`Work authorization for ${market.label}: confirm sponsorship before investing heavy prep.`);
  if (thin) out.push('Full JD not captured. Open the posting and paste it into Add Job to re-score precisely.');
  if (/immediately/i.test(p.availability || '')) out.push('You are between roles. Say "immediately available" early, since it is a plus for backfills.');
  return out.slice(0, 3);
}

function buildTailoring(version, groups, kws, job) {
  const t = [`Send the "${version.name}" resume version.`];
  const g = groups.find((x) => x.proof);
  if (g) t.push(`Open the summary with your strongest ${g.label} result: ${quote(g.proof, 100)}.`);
  const mirror = kws.filter((k) => k.length > 3).slice(0, 5);
  if (mirror.length) t.push(`Mirror JD wording in your skills section: ${mirror.join(', ')}.`);
  else t.push(`Add the exact job title "${job.title}" to the resume headline for ATS matching.`);
  return t.slice(0, 3);
}
