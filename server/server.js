// JobPilot CRM local server: serves the app, parses uploaded resumes, runs scrapers on demand,
// and streams live updates to the browser (Server-Sent Events).
// Run:  node server/server.js   (or double-click start.bat)  ->  http://localhost:4321
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { MARKET_OPTIONS } from '../shared/taxonomy.js';
import { parseResume } from '../shared/resume-parser.js';
import { scoreJob, isRelevantTitle, detectWorkMode } from '../shared/scoring.js';
import { extractText } from './extract.js';
import * as S from './scrapers.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = process.env.JOBPILOT_DATA ? path.resolve(process.env.JOBPILOT_DATA) : path.join(ROOT, 'data');
const RESUMES = path.join(DATA, 'resumes');
const PORT = +process.env.PORT || 4321;
fs.mkdirSync(RESUMES, { recursive: true });

// ---------- persistence ----------
const file = (n) => path.join(DATA, n);
const load = (n, fallback) => { try { return JSON.parse(fs.readFileSync(file(n), 'utf8')); } catch { return fallback; } };
const save = (n, v) => { const tmp = file(n) + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(v, null, 1)); fs.renameSync(tmp, file(n)); };
const emptyDb = () => ({ jobs: [], meta: { lastRefresh: null, counters: {}, runs: [] } });

let profile = load('profile.json', null);
let db = load('jobs.json', emptyDb());
let pipeline = load('pipeline.json', {});
let contacts = load('contacts.json', []);
let settings = {
  recencyDays: 30, autoRefreshMin: 0, enrichLimit: 160, minScore: 45,
  sources: { linkedin: true, remotive: true, himalayas: true, jobicy: true, remoteok: true, tinyfish: true },
  tinyfishKey: process.env.TINYFISH_API_KEY || '',
  ...load('settings.json', {}),
};
if (profile && !settings.markets) { settings.markets = profile.markets; settings.queries = profile.queries; }
settings.markets ||= []; settings.queries ||= [];
// older settings files: backfill location-match patterns from the profile
if (profile) settings.markets = settings.markets.map((m) => ({ match: profile.markets?.find((x) => x.id === m.id)?.match, ...m }));
const persist = () => save('jobs.json', db);

// ---------- SSE ----------
const clients = new Set();
function emit(type, data) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(msg);
}
let run = { running: false, logs: [], startedAt: null, progress: { done: 0, total: 0 }, sources: {} };
const log = (msg, level = 'info', source = 'system') => {
  const entry = { t: new Date().toISOString(), level, source, msg };
  console.log(`[${source}] ${msg}`);
  emit('log', entry);
  run.logs.push(entry);
};

// ---------- markets ----------
function marketFromLocation(loc = '') {
  const l = loc.toLowerCase();
  const order = [...settings.markets.filter((m) => !m.noSearch), ...settings.markets.filter((m) => m.noSearch)];
  return order.find((m) => m.enabled !== false && m.match && new RegExp(m.match, 'i').test(l)) || null;
}
function marketFor(id) { return settings.markets.find((m) => m.id === id) || settings.markets[0]; }
function nextCode(market) {
  const p = market.prefix || 'JOB';
  db.meta.counters[p] = (db.meta.counters[p] || 0) + 1;
  return `${p}${String(db.meta.counters[p]).padStart(2, '0')}`;
}
const uidOf = (r) => (r.linkedinId ? `LinkedIn:${r.linkedinId}` : `${r.source.startsWith('TinyFish·LinkedIn') ? 'LinkedIn' : r.source}:${r.extId}`);
const normKey = (r) => `${(r.company || '').toLowerCase().replace(/[^a-z0-9]/g, '')}|${(r.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
const geoRegex = () => new RegExp(`(worldwide|anywhere|global|no restriction|${(profile?.country || 'india').toLowerCase()}|apac|asia|emea)`, 'i');

// A local search can return out-of-area postings: re-assign those by their actual location.
function resolveMarket(location, marketId) {
  const mk = marketFor(marketId);
  if (mk?.kind !== 'Local' || !location || !mk.match || new RegExp(mk.match, 'i').test(location)) return mk;
  const alt = marketFromLocation(location);
  return alt && alt.kind !== 'Remote' && alt.id !== mk.id ? alt : mk;
}

function materialize(raw, marketId, existing) {
  const market = resolveMarket(raw.location || existing?.location, marketId);
  const base = { ...(existing || {}), ...Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== '' && v != null)) };
  if (existing?.description && (raw.description || '').length < existing.description.length) base.description = existing.description;
  const sc = scoreJob(base, market, profile);
  return {
    ...base, ...sc,
    uid: existing?.uid || uidOf(raw),
    code: existing?.code || nextCode(market),
    market: market.kind === 'Relocation' ? market.label : market.kind,
    marketKind: market.kind, marketId: market.id,
    workMode: detectWorkMode(`${base.title} ${base.location} ${(base.description || '').slice(0, 1500)}`, market),
    firstSeenAt: existing?.firstSeenAt || new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    postedAt: base.postedAt || existing?.postedAt || new Date().toISOString(),
  };
}

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const it = items[i++]; await fn(it); }
  }));
}

// ---------- refresh (scrape all sources) ----------
async function refresh(trigger = 'manual') {
  if (run.running) return false;
  if (!profile) { emit('run-end', { error: 'Upload a resume first' }); return false; }
  run = { running: true, logs: [], startedAt: new Date().toISOString(), progress: { done: 0, total: 0 }, sources: {}, trigger };
  emit('run-start', { startedAt: run.startedAt, trigger });
  const markets = settings.markets.filter((m) => m.enabled !== false && !m.noSearch);
  log(`Refresh started (${trigger}) for ${profile.name}. Markets: ${markets.map((m) => m.label).join(', ')}`);

  const byUid = new Map(db.jobs.map((j) => [j.uid, j]));
  const byKey = new Map(db.jobs.map((j) => [normKey(j), j]));
  const found = new Map();
  const src = (name, patch) => { run.sources[name] = { ...(run.sources[name] || { count: 0, status: 'running', errors: 0 }), ...patch }; emit('source', { name, ...run.sources[name] }); };
  const addRaw = (raw, marketId) => {
    if (!raw.title || !raw.url || !isRelevantTitle(raw.title, profile)) return false;
    const uid = uidOf(raw);
    if (found.has(uid)) return false;
    found.set(uid, { raw, marketId });
    return true;
  };
  const tasks = [];
  const L = settings.sources;
  const geo = geoRegex();
  const remoteOn = markets.some((m) => m.kind === 'Remote');

  if (L.linkedin) {
    for (const m of markets) {
      const qs = settings.queries.filter((q) => m.kind !== 'Relocation' || q.core);
      for (const q of qs) tasks.push({ src: 'LinkedIn', label: `${q.q} · ${m.label}`, fn: async () => {
        const rs = await S.linkedinSearch({ keywords: q.q, location: m.linkedin, remote: !!m.remote, recencyDays: settings.recencyDays });
        let n = 0; for (const r of rs) if (addRaw(r, m.id)) n++;
        return n;
      } });
    }
  }

  // Postings discovered earlier with the TinyFish Web Agent: re-verify each live on LinkedIn.
  const seed = load('tinyfish-seed.json', { urls: [] }).urls || [];
  if (L.tinyfish && seed.length) tasks.push({ src: 'TinyFish', label: `verify ${seed.length} TinyFish-discovered postings`, fn: async () => {
    let n = 0;
    await pool(seed, 3, async (u) => {
      const id = (u.match(/(\d{8,})/) || [])[1];
      if (!id) return;
      try {
        const d = await S.linkedinDetail(id);
        if (d.closed || !d.title) return;
        const m = marketFromLocation(d.location);
        if (m && addRaw({ source: 'TinyFish·LinkedIn', extId: id, linkedinId: id, url: u, ...d }, m.id)) n++;
      } catch { /* skip */ }
      await S.sleep(300);
    });
    return n;
  } });

  // Remote job boards: search terms derived from the profile
  const remoteTerms = [...new Set([...(profile.tools || []).slice(0, 5), ...(profile.targetTitles || []).slice(0, 3)].map((t) => t.toLowerCase()))].slice(0, 8);
  if (remoteOn) {
    if (L.remotive) for (const t of remoteTerms.slice(0, 6)) tasks.push({ src: 'Remotive', label: t, fn: async () => { let n = 0; for (const r of await S.remotive(t, geo)) if (addRaw(r, 'remote')) n++; return n; } });
    if (L.himalayas) for (const t of remoteTerms) tasks.push({ src: 'Himalayas', label: t, fn: async () => { let n = 0; for (const r of await S.himalayas(t, geo)) if (addRaw(r, 'remote')) n++; return n; } });
    if (L.jobicy) for (const t of remoteTerms.slice(0, 4)) tasks.push({ src: 'Jobicy', label: t, fn: async () => { let n = 0; for (const r of await S.jobicy(t.replace(/\s+/g, '-'), geo)) if (addRaw(r, 'remote')) n++; return n; } });
    if (L.remoteok) tasks.push({ src: 'RemoteOK', label: 'all', fn: async () => { let n = 0; for (const r of await S.remoteok(geo)) if (addRaw(r, 'remote')) n++; return n; } });
  }

  // TinyFish Search API (free key): discovers postings across LinkedIn, Naukri, Bayt and Indeed.
  const key = settings.tinyfishKey;
  if (L.tinyfish && key) {
    const kw = (profile.tools || []).slice(0, 4).map((t) => `"${t}"`).join(' OR ') || `"${profile.targetTitles?.[0] || ''}"`;
    const tfQueries = [];
    for (const m of markets) {
      const where = m.kind === 'Remote' ? `remote ${profile.country || ''}` : m.linkedin.split(',')[0];
      tfQueries.push({ q: `site:linkedin.com/jobs/view (${kw}) ${where}`, m: m.id });
      if (m.kind === 'Local') {
        if (/india/i.test(profile.country || '')) tfQueries.push({ q: `site:naukri.com job-listings ${kw} ${profile.city}`, m: m.id });
        tfQueries.push({ q: `${profile.targetTitles?.[0] || ''} job opening ${profile.city} ${new Date().getFullYear()}`, m: m.id });
      }
      if (m.id === 'uae') tfQueries.push({ q: `site:bayt.com OR site:naukrigulf.com ${profile.targetTitles?.[0] || ''} Dubai`, m: m.id });
    }
    for (const t of tfQueries) tasks.push({ src: 'TinyFish', label: t.q.slice(0, 70), fn: async () => {
      const hits = await S.tinyfishSearch(key, t.q, { recencyDays: settings.recencyDays });
      let n = 0; for (const h of hits) { const j = S.jobFromSearchHit(h); if (j && addRaw(j, (marketFromLocation(j.location) || marketFor(t.m)).id)) n++; }
      return n;
    } });
  } else if (L.tinyfish) {
    src('TinyFish', { status: seed.length ? 'running' : 'skipped', note: 'Add a free API key in Sources to enable search' });
    log('TinyFish search skipped. Add your free API key (agent.tinyfish.ai/api-keys) in Sources & Scrapers.', 'warn', 'TinyFish');
  }

  run.progress = { done: 0, total: tasks.length };
  emit('progress', run.progress);
  const conc = { LinkedIn: 2, TinyFish: 2 };
  const groups = tasks.reduce((a, t) => ((a[t.src] ||= []).push(t), a), {});
  await Promise.all(Object.entries(groups).map(([name, list]) => {
    src(name, { status: 'running' });
    return pool(list, conc[name] || 2, async (t) => {
      let n = 0;
      for (let attempt = 0; attempt < 3; attempt++) {
        try { n = await t.fn(); src(name, { count: (run.sources[name].count || 0) + n }); log(`${t.label}: +${n}`, 'info', name); break; }
        catch (e) {
          if (e.status === 429 && attempt < 2) { log(`${t.label}: rate-limited, backing off`, 'warn', name); await S.sleep(4000 * (attempt + 1)); continue; }
          src(name, { errors: (run.sources[name].errors || 0) + 1 }); log(`${t.label}: ${e.message}`, 'error', name); break;
        }
      }
      if (name === 'LinkedIn') await S.sleep(700);
      run.progress.done++; emit('progress', run.progress);
    }).then(() => src(name, { status: run.sources[name].errors && !run.sources[name].count ? 'error' : 'done' }));
  }));

  // Enrich LinkedIn jobs lacking a description (guest detail endpoint, TinyFish Fetch fallback)
  const pending = [...found.entries()].filter(([uid, { raw }]) => {
    const ex = byUid.get(uid);
    return (raw.linkedinId || raw.source === 'LinkedIn') && !(ex?.description?.length > 300) && (raw.description || '').length < 300;
  });
  const prelim = pending.map(([uid, v]) => [uid, v, scoreJob(v.raw, marketFor(v.marketId), profile).match]).sort((a, b) => b[2] - a[2]).slice(0, settings.enrichLimit);
  if (prelim.length) {
    log(`Enriching ${prelim.length} LinkedIn postings with full job descriptions…`, 'info', 'Enrich');
    src('Enrich', { status: 'running' });
    const failed = [];
    await pool(prelim, 3, async ([uid, v]) => {
      try {
        const d = await S.linkedinDetail(v.raw.linkedinId || v.raw.extId);
        if (d.closed) { found.delete(uid); return; }
        if (d.description) {
          for (const [k, val] of Object.entries(d)) if (val && !(k === 'postedAt' && v.raw.postedAt) && !(k === 'title' && v.raw.title)) v.raw[k] = val;
          src('Enrich', { count: (run.sources.Enrich.count || 0) + 1 });
        } else failed.push(v);
      } catch (e) { failed.push(v); if (e.status === 429) await S.sleep(3000); }
      await S.sleep(350);
    });
    if (failed.length && key) {
      log(`TinyFish Fetch fallback for ${failed.length} postings`, 'info', 'TinyFish');
      for (let i = 0; i < failed.length; i += 10) {
        try {
          const res = await S.tinyfishFetch(key, failed.slice(i, i + 10).map((v) => v.raw.url));
          for (const r of res.results || []) {
            const v = failed.find((f) => f.raw.url === r.url);
            if (v && r.text) { v.raw.description = String(r.text).slice(0, 9000); src('Enrich', { count: (run.sources.Enrich.count || 0) + 1 }); }
          }
        } catch (e) { log(e.message, 'error', 'TinyFish'); }
      }
    }
    src('Enrich', { status: 'done' });
  }

  // Merge into the CRM
  let added = 0, updated = 0;
  for (const [uid, { raw, marketId }] of found) {
    const existing = byUid.get(uid) || byKey.get(normKey(raw));
    const job = materialize(raw, marketId, existing);
    if (!existing && job.match < settings.minScore) continue;
    if (existing) { Object.assign(existing, job); updated++; }
    else { job.isNewRun = true; db.jobs.push(job); byUid.set(job.uid, job); byKey.set(normKey(job), job); added++; emit('job', withPipeline(job)); }
  }
  for (const j of db.jobs) if (j.isNewRun && j.firstSeenAt < run.startedAt) delete j.isNewRun;
  sortJobs();
  db.meta.lastRefresh = new Date().toISOString();
  db.meta.runs = [{ at: db.meta.lastRefresh, trigger, added, updated, found: found.size, sources: run.sources }, ...(db.meta.runs || [])].slice(0, 30);
  persist();
  run.running = false;
  log(`Done. ${found.size} relevant postings scanned, ${added} new, ${updated} updated. Total in CRM: ${db.jobs.length}.`, 'success');
  emit('run-end', { added, updated, total: db.jobs.length, lastRefresh: db.meta.lastRefresh });
  return true;
}

function sortJobs() {
  const pr = { A: 0, B: 1, C: 2, D: 3 };
  db.jobs.sort((a, b) => pr[a.priority] - pr[b.priority] || b.match - a.match);
}
function rescoreAll() {
  if (!profile) return;
  for (const j of db.jobs) {
    const mk = resolveMarket(j.location, j.marketId) || { kind: j.marketKind, label: j.market, id: j.marketId };
    Object.assign(j, scoreJob(j, mk, profile), { market: mk.kind === 'Relocation' ? mk.label : mk.kind, marketKind: mk.kind, marketId: mk.id });
  }
  sortJobs(); persist();
}
const withPipeline = (j) => ({ ...j, ...(pipeline[j.uid] || { stage: 'New' }) });
const publicSettings = () => ({ ...settings, tinyfishKey: undefined, hasTinyfishKey: !!settings.tinyfishKey });

// ---------- resume upload -> profile ----------
async function ingestResume(buf, fileName, opts) {
  const safe = path.basename(fileName).replace(/[^\w.() -]/g, '_') || 'resume.pdf';
  fs.writeFileSync(path.join(RESUMES, safe), buf);
  const text = await extractText(buf, safe);
  if (text.replace(/\s/g, '').length < 200) throw new Error('Could not read text from this file. If it is a scanned PDF, upload a DOCX or text-based PDF.');
  const next = parseResume(text, { ...opts, fileName: safe });
  const samePerson = profile && profile.key === next.key;
  if (!samePerson && (db.jobs.length || Object.keys(pipeline).length)) {
    // new candidate: archive the previous CRM
    const dir = path.join(DATA, 'archive', `${profile?.key || 'previous'}-${Date.now()}`);
    fs.mkdirSync(dir, { recursive: true });
    for (const n of ['jobs.json', 'pipeline.json', 'contacts.json', 'profile.json', 'tinyfish-seed.json']) if (fs.existsSync(file(n))) fs.renameSync(file(n), path.join(dir, n));
    db = emptyDb(); pipeline = {}; contacts = [];
    log(`Archived previous CRM to ${path.relative(ROOT, dir)}`);
  }
  profile = next;
  save('profile.json', profile);
  settings.markets = profile.markets; settings.queries = profile.queries; settings.recencyDays = opts.recencyDays || settings.recencyDays;
  save('settings.json', settings);
  rescoreAll();
  emit('profile', profile);
  emit('settings', publicSettings());
  emit('reload', {});
  return { profile, samePerson };
}

// ---------- auto refresh ----------
setInterval(() => {
  if (!settings.autoRefreshMin || run.running || !profile) return;
  const last = db.meta.lastRefresh ? Date.parse(db.meta.lastRefresh) : 0;
  if (Date.now() - last >= settings.autoRefreshMin * 60000) refresh('auto');
}, 60000);

// ---------- HTTP ----------
const rawBody = (req, limit = 15e6) => new Promise((res, rej) => {
  const chunks = []; let size = 0;
  req.on('data', (c) => { size += c.length; if (size > limit) { rej(new Error('File too large (max 15 MB)')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => res(Buffer.concat(chunks)));
  req.on('error', rej);
});
const body = async (req) => { const b = (await rawBody(req)).toString('utf8'); return b ? JSON.parse(b) : {}; };
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const MIME = { '.html': 'text/html; charset=utf-8', '.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json' };

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Filename');
  if (req.method === 'OPTIONS') return res.end();
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  try {
    if (p === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(`event: hello\ndata: ${JSON.stringify({ running: run.running, progress: run.progress, sources: run.sources, logs: run.logs.slice(-80) })}\n\n`);
      clients.add(res);
      const ping = setInterval(() => res.write(': ping\n\n'), 20000);
      req.on('close', () => { clearInterval(ping); clients.delete(res); });
      return;
    }
    if (p === '/api/state' && req.method === 'GET') {
      return send(res, 200, { profile, jobs: db.jobs.map(withPipeline), meta: db.meta, settings: publicSettings(), contacts, running: run.running, marketOptions: MARKET_OPTIONS, serverTime: new Date().toISOString() });
    }
    if (p === '/api/resume' && req.method === 'POST') {
      const buf = await rawBody(req);
      const q = url.searchParams;
      const opts = {
        relocation: (q.get('relocation') || '').split(',').filter(Boolean), remote: q.get('remote') !== '0',
        includeAI: q.get('ai') !== '0', recencyDays: +q.get('recency') || 30,
      };
      const out = await ingestResume(buf, decodeURIComponent(req.headers['x-filename'] || 'resume.pdf'), opts);
      if (q.get('scrape') !== '0') setTimeout(() => refresh('resume-upload').catch((e) => log(e.message, 'error')), 300);
      return send(res, 200, out);
    }
    if (p === '/api/profile' && req.method === 'PUT') {
      profile = { ...profile, ...(await body(req)), updatedAt: new Date().toISOString() };
      save('profile.json', profile); rescoreAll();
      emit('profile', profile); emit('reload', {});
      return send(res, 200, profile);
    }
    if (p === '/api/refresh' && req.method === 'POST') {
      if (!profile) return send(res, 400, { error: 'Upload a resume first' });
      const started = !run.running;
      if (started) refresh('manual').catch((e) => { run.running = false; log(`Refresh failed: ${e.message}`, 'error'); emit('run-end', { error: e.message }); });
      return send(res, 202, { started, running: true });
    }
    let m;
    if ((m = p.match(/^\/api\/pipeline\/(.+)$/)) && req.method === 'PUT') {
      const uid = decodeURIComponent(m[1]);
      const b = await body(req);
      const prev = pipeline[uid] || { stage: 'New', history: [] };
      const entry = { ...prev, ...b, updatedAt: new Date().toISOString() };
      if (b.stage && b.stage !== prev.stage) entry.history = [...(prev.history || []), { stage: b.stage, at: entry.updatedAt }];
      if (b.stage === 'Applied' && !prev.appliedAt) entry.appliedAt = entry.updatedAt;
      pipeline[uid] = entry; save('pipeline.json', pipeline);
      emit('pipeline', { uid, entry });
      return send(res, 200, entry);
    }
    if (p === '/api/jobs' && req.method === 'POST') {
      if (!profile) return send(res, 400, { error: 'Upload a resume first' });
      const b = await body(req);
      const job = materialize({ source: 'Manual', extId: String(Date.now()), ...b }, b.marketId || 'local', null);
      db.jobs.push(job); sortJobs(); persist();
      emit('job', withPipeline(job));
      return send(res, 201, withPipeline(job));
    }
    if ((m = p.match(/^\/api\/jobs\/(.+)$/)) && req.method === 'DELETE') {
      const uid = decodeURIComponent(m[1]);
      db.jobs = db.jobs.filter((j) => j.uid !== uid); persist();
      emit('job-removed', { uid });
      return send(res, 200, { ok: true });
    }
    if (p === '/api/contacts' && req.method === 'PUT') {
      contacts = (await body(req)).contacts || []; save('contacts.json', contacts);
      emit('contacts', contacts);
      return send(res, 200, { ok: true });
    }
    if (p === '/api/settings' && req.method === 'PUT') {
      const b = await body(req);
      const before = JSON.stringify(settings.markets);
      settings = { ...settings, ...b };
      if (b.tinyfishKey === '') settings.tinyfishKey = '';
      save('settings.json', settings);
      if (JSON.stringify(settings.markets) !== before) rescoreAll();
      emit('settings', publicSettings());
      return send(res, 200, publicSettings());
    }
    if (p === '/api/rescore' && req.method === 'POST') { rescoreAll(); emit('reload', {}); return send(res, 200, { ok: true }); }

    // static: app + resume files
    if (p === '/' || p === '/index.html') return serveFile(res, path.join(ROOT, 'JobPilot-CRM.html'));
    if (p.startsWith('/files/')) {
      const name = path.basename(decodeURIComponent(p.slice(7)));
      if (/\.(pdf|docx|txt|md)$/i.test(name)) return serveFile(res, fs.existsSync(path.join(RESUMES, name)) ? path.join(RESUMES, name) : path.join(ROOT, name));
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: e.message });
  }
});

function serveFile(res, f) {
  if (!fs.existsSync(f)) return send(res, 404, { error: `missing ${path.basename(f)}. Run "npm run build" first` });
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') { console.log(`\n  JobPilot is already running → http://localhost:${PORT}\n`); if (!process.argv.includes('--no-open')) exec(`start "" "http://localhost:${PORT}"`); process.exit(0); }
  throw e;
});
server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  JobPilot CRM${profile ? ` for ${profile.name}` : ' (no resume yet: upload one in the browser)'} → ${url}\n`);
  if (!process.argv.includes('--no-open')) exec(process.platform === 'win32' ? `start "" "${url}"` : `${process.platform === 'darwin' ? 'open' : 'xdg-open'} "${url}"`);
  if (profile && (!db.jobs.length || process.argv.includes('--refresh'))) refresh('startup');
});
