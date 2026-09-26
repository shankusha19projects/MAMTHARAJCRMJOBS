---
name: jobpilot-crm
description: Build and run JobPilot CRM, a realtime, locally hosted job-search CRM. Upload any resume (PDF/DOCX/TXT) and it parses a candidate profile, scrapes live jobs (LinkedIn guest API, TinyFish Web Agent, Remotive, Himalayas, Jobicy, RemoteOK), scores every job 0–100, and gives a visual CRM (dashboard, Kanban pipeline, job board, resume center, outreach drafts, analytics). Use when someone wants a job-search CRM, a job tracker from their resume, or to recreate JobPilot on a new machine.
---

# JobPilot CRM: recreate anywhere, driven by your resume

**What you get:** a local web app at **http://localhost:4321**. On first open it asks for a resume.
Drop in a PDF, DOCX or TXT and within minutes you have a live CRM of real, currently open jobs, scored against that resume.

- **Resume → profile, automatically.** Name, contacts, city/country, years, target titles, certifications, experience,
  core skills (from a 45-group multi-profession taxonomy) **with the resume bullet that proves each skill**, keywords, tools,
  resume versions, and scraper search queries. This works for IT, software, data, BA/PM, finance, HR, marketing, healthcare, ops and more.
- **Realtime scraping** with a **Refresh** button (or press `R`), plus optional auto-refresh. Progress streams live over Server-Sent Events:
  a progress bar, a live console with per-source counts and logs, toasts, and new jobs flagged **NEW**.
- **Sources:** the LinkedIn guest search + job-detail pages (real `linkedin.com/jobs/view/…` links, full JD, no login),
  the **TinyFish Web Agent** Search + Fetch APIs (free key), and the public remote-job APIs Remotive, Himalayas, Jobicy and RemoteOK.
- **Scoring (0–100)** in 7 weighted categories: skills 25 · experience 25 · domain 15 · tools 15 · seniority 10 · location 5 · keyword 5.
  Priority A ≥ 85, B ≥ 70, C ≥ 55, else D, plus ATS score and shortlist/interview/offer estimates.
- **The CRM:** a Dashboard (72-hour fresh roles, today's queue, funnel), a drag-and-drop Pipeline (New → Ready → Applied → Screening → Interview → Offer),
  a Job Board (filters, big **APPLY** button, copy link), and a Job Drawer (fit analysis, score breakdown, gaps, tailoring, plus auto-drafted cover letter,
  recruiter email, LinkedIn DM, follow-up, referral ask, thank-you note, interview prep with STAR stories, and salary guidance).
  There's also a Resume Center (profile, editable targeting, proof points, market-demand vs gaps), Contacts & outreach, Analytics,
  Add Job (paste a JD and it's scored live), and Sources & Scrapers settings.
- **Upload another resume anytime** from the sidebar. The same person keeps their pipeline and gets re-scored. A different person has the old CRM
  archived to `data/archive/` and gets a fresh one.
- **11 themes:** JobPilot Navy plus the 10 theme-factory palettes (Ocean Depths, Sunset Boulevard, Forest Canopy, Modern Minimalist, Golden Hour,
  Arctic Frost, Desert Rose, Tech Innovation, Botanical Garden, Midnight Galaxy).
- **Private and local.** Data lives in `data/*.json` + browser localStorage, and the only outbound calls are to the job sources.

---

## INSTRUCTIONS FOR CLAUDE (or anyone) TO RECREATE IT

### Requirements
- **Node.js 18+** (20+ recommended) and npm. Internet access for scraping and Google Fonts.
- Windows, macOS or Linux.

### Step 1: Write the files
Create an empty folder (e.g. `C:\jobpilot` or `~/jobpilot`) and write **every file in the "Source files" appendix below,
verbatim, at the path shown in its heading**. Don't summarize, "improve" or skip any file: the app depends on all of them.

Faster alternative: save this SKILL.md into the folder, write only `scripts/unpack-skill.mjs` from the appendix, then run
`node scripts/unpack-skill.mjs SKILL.md`. It extracts every file automatically.

### Step 2: Install and build
```bash
npm install                                  # server deps: pdfjs-dist (PDF) + mammoth (DOCX)
cd app && npm install && npm run build && cd ..   # React 18 + TS → Parcel → one self-contained JobPilot-CRM.html
```
(or just `npm run setup`). The build writes `JobPilot-CRM.html` in the project root.

### Step 3: Run
- Windows: double-click **`start.bat`**. macOS/Linux: `./start.sh`. Or run `npm start`.
- The browser opens **http://localhost:4321** on the upload screen.

### Step 4: Load the resume → jobs
- **In the browser (normal path):** drop the resume, choose Remote / AI-adjacent / relocation countries / recency, then click
  **Build my CRM & scrape jobs**. The profile is built instantly and the first scrape (≈2–4 min) streams in live.
- **If the user gave Claude the resume in chat**, Claude can load it without the browser:
  ```bash
  curl -X POST "http://localhost:4321/api/resume?relocation=uae,singapore&remote=1&ai=1&recency=30" \
       -H "X-Filename: resume.pdf" --data-binary @path/to/resume.pdf
  ```
  Relocation ids: `uae singapore canada uk usa germany netherlands ireland australia saudi qatar`.
  Then check `GET /api/state` and report the profile (name, titles, core skills) and the job counts to the user.
- **Ask the user** (one short message) only for what the resume can't tell you: relocation countries, whether they're open to remote,
  and whether to include AI-adjacent roles. Default: resume city + remote + AI-adjacent, 30-day window.

### Step 5 (optional, recommended): TinyFish
- Get a free API key at **agent.tinyfish.ai/api-keys** and paste it in **Sources & Scrapers**. It's stored in `data/settings.json` and never sent to the browser.
  The Search API then discovers postings across LinkedIn, Naukri, Bayt and Indeed, and the Fetch API backfills job descriptions when LinkedIn blocks.
- **If Claude has the TinyFish MCP tools**, seed extra verified postings: run `search` with queries like
  `site:linkedin.com/jobs/view <top tool or title> <city>` (recency ~30 days), keep only real `linkedin.com/jobs/view/…-<id>` URLs,
  and write them to `data/tinyfish-seed.json` as `{ "urls": [ ... ] }`. Every refresh re-verifies them live on LinkedIn and closed postings drop out.

### Step 6: Deliver
Tell the user how many jobs were scraped, the priority and market breakdown, and the count of AI-adjacent roles. List the top Priority-A/B
jobs with their real apply links, and note any source that was blocked or rate-limited (the Live console shows this).

### Non-negotiable rules
1. **Only real job URLs** from actual scrape results. Never construct or invent a URL or listing.
2. APPLY opens the posting in a new tab and falls back to same-tab if pop-ups are blocked. Copy uses `navigator.clipboard`, then
   `execCommand('copy')`, then `prompt()`, so it works from `file://` too. (Already implemented in `app/src/lib/util.ts`.)
3. Keep everything local. No accounts, no uploads to third parties except the job-source APIs.

---

## How it works

```
 Browser (JobPilot-CRM.html: React 18 + TS, one inlined file)
   │  GET /api/state · SSE /api/events · POST /api/refresh · POST /api/resume · PUT /api/pipeline|profile|settings|contacts
   ▼
 server/server.js (Node, zero-framework HTTP + SSE)
   ├─ server/extract.js        resume file → text (pdfjs-dist / mammoth)
   ├─ shared/resume-parser.js  text → profile.json (taxonomy match, proof bullets, titles, markets, queries)
   ├─ server/scrapers.js       LinkedIn guest · TinyFish Search/Fetch · Remotive · Himalayas · Jobicy · RemoteOK
   ├─ shared/scoring.js        job × profile → match, priority, why-match, gaps, tailoring (also used live in Add Job)
   └─ data/                    profile.json · jobs.json · pipeline.json · contacts.json · settings.json · resumes/ · archive/
```

**A refresh:** it builds tasks for each enabled market × search query (relocation markets use only "core" queries), then runs the remote-board
searches, TinyFish (if keyed) and the seed re-verification. Concurrency is capped per source and 429s back off automatically. Out-of-area
"local" results are re-assigned by location. The top ~160 LinkedIn postings without a JD are enriched from the job-detail page (TinyFish Fetch
fallback). Everything is scored, and anything below `minScore` (45) is dropped. It then merges by id plus company+title, emits `job` events live, and saves.

**Useful API calls:** `POST /api/rescore` (re-score everything after editing the profile), `PUT /api/profile` (partial profile edit),
`POST /api/refresh`, `GET /api/state`.

**Running two candidates at once:** each instance gets its own port and data folder:
`PORT=4322 JOBPILOT_DATA=./data-other node server/server.js` (Windows: `set PORT=4322` and `set JOBPILOT_DATA=...` first).

## Customizing
- **Taxonomy** (`shared/taxonomy.js`): add a skill group `{ key, label, domain, terms, tools, roles }` to support a new profession.
  Terms are word-boundary matched.
- **Relocation markets:** add to `MARKET_OPTIONS` (`linkedin` = LinkedIn location string, `match` = regex applied to job locations).
- **Hand-tune a profile:** edit `data/profile.json` (proof sentences, `targetTitles`, `keywords`, `resumeVersions`, optional
  `salary` map keyed by market label, and `stories` with `{q,s,t,a,r}` for STAR prep). Then `POST /api/rescore`.
- **Scoring weights and thresholds:** see `WEIGHTS` and the divisors in `shared/scoring.js`.
- **Offline snapshot:** `cd app && npm run build` embeds the current data into `JobPilot-CRM.html`, so it also opens from disk
  (it reconnects to the live server automatically when that's running).

## Troubleshooting
| Symptom | Fix |
|---|---|
| "Could not read text from this file" | Scanned/image PDF. Upload a DOCX or a text-based PDF. |
| Few or zero jobs | Check the Live console. LinkedIn can rate-limit (it retries automatically, so refresh again later). Broaden titles in Resume Center → Targeting, or add queries in Sources. |
| Wrong city or titles parsed | Resume Center → Targeting → Edit, or edit `data/profile.json` and then `POST /api/rescore`. |
| Port 4321 busy | Something is already running. The server detects it and opens the existing app, or set `PORT`. |
| Fonts look plain offline | Google Fonts need internet. Everything else works offline. |

---

## Source files
Each file below is complete. Write it verbatim at the path in its heading.

### File: package.json
`````json
{
  "name": "jobpilot-crm",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "setup": "npm install && cd app && npm install && npm run build",
    "start": "node server/server.js",
    "refresh": "node server/server.js --refresh",
    "build": "cd app && npm run build",
    "skill": "node scripts/make-skill.mjs"
  },
  "dependencies": {
    "mammoth": "^1.12.3",
    "pdfjs-dist": "^4.10.38"
  },
  "engines": {
    "node": ">=18"
  }
}
`````

### File: start.bat
`````bat
@echo off
title JobPilot CRM - live server
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js 18+ is required: https://nodejs.org & pause & exit /b 1)
if not exist "node_modules" (echo Installing server dependencies... & call npm install --no-audit --no-fund)
if not exist "JobPilot-CRM.html" (
  echo Building the app for the first time...
  pushd app && call npm install --no-audit --no-fund && call npm run build && popd
)
echo Starting JobPilot CRM on http://localhost:4321  (keep this window open)
node server\server.js
pause
`````

### File: start.sh
`````bash
#!/usr/bin/env bash
# JobPilot CRM launcher for macOS / Linux
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js 18+ is required: https://nodejs.org"; exit 1; }
[ -d node_modules ] || npm install --no-audit --no-fund
if [ ! -f JobPilot-CRM.html ]; then (cd app && npm install --no-audit --no-fund && npm run build); fi
echo "Starting JobPilot CRM on http://localhost:4321 (Ctrl+C to stop)"
node server/server.js
`````

### File: README.md
`````markdown
# JobPilot CRM

A realtime, locally run job-search CRM. Upload a resume, and JobPilot builds a candidate profile, scrapes live jobs, scores
every one against the profile, and gives you a visual CRM to work the pipeline.

## Run
- **Windows:** double-click `start.bat`. **macOS/Linux:** `./start.sh`. Or run `npm run setup` once, then `npm start`.
- Open **http://localhost:4321**. On first run you'll see the upload screen: drop a PDF, DOCX or TXT resume, pick markets, and click **Build my CRM & scrape jobs**.
- **Refresh** (or press `R`) pulls the latest jobs, with progress streamed live in the console, progress bar and toasts. Auto-refresh is in **Sources & Scrapers**.
- Upload a new or updated resume anytime by clicking your name in the sidebar.

## Sources
| Source | How | Key |
|---|---|---|
| LinkedIn | Guest job-search API + job-detail pages (real `linkedin.com/jobs/view/…` links, full JD) | none |
| TinyFish Web Agent | Search API (LinkedIn/Naukri/Bayt/Indeed discovery) + Fetch API (JD fallback) + re-verifies `data/tinyfish-seed.json` | free: agent.tinyfish.ai/api-keys |
| Remotive · Himalayas · Jobicy · RemoteOK | Public remote-job APIs, filtered to roles open to your country/region | none |

## Scoring
Skills 25 · Experience 25 · Domain 15 · Tools 15 · Seniority 10 · Location 5 · Keyword 5.
Missing-tool penalties apply, and a job without a full JD is capped at 84. Priority: A ≥ 85, B ≥ 70, C ≥ 55.

## Files
- `server/`: HTTP + SSE server, scrapers, resume text extraction
- `shared/`: taxonomy, resume parser, scoring (used by both server and app)
- `app/`: React 18 + TypeScript UI, bundled by Parcel into one `JobPilot-CRM.html`
- `data/`: profile, jobs, pipeline, contacts, settings, uploaded resumes, archives. All local.

## Multiple candidates
Run another instance with its own port and data folder: `PORT=4322 JOBPILOT_DATA=./data-other node server/server.js`
(Windows: `set PORT=4322` and `set JOBPILOT_DATA=%~dp0data-other`, then `node server\server.js`).

## Recreate on another machine
`SKILL.md` contains the full instructions plus every source file. Copy it over and run
`node scripts/unpack-skill.mjs SKILL.md` (after writing that one small script from the appendix), or give SKILL.md to Claude and ask it to build JobPilot.
Regenerate it after code changes with `npm run skill`.
`````

### File: server/server.js
`````js
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
`````

### File: server/scrapers.js
`````js
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
`````

### File: server/extract.js
`````js
// Resume file -> plain text (PDF via pdf.js, DOCX via mammoth, TXT/MD as-is).
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';

export async function extractText(buf, fileName = '') {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'pdf' || buf.slice(0, 4).toString() === '%PDF') {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true, isEvalSupported: false, verbosity: 0 }).promise;
    let out = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const c = await page.getTextContent();
      let lastY = null;
      for (const it of c.items) {
        if (lastY !== null && Math.abs(it.transform[5] - lastY) > 2) out += '\n';
        out += it.str; lastY = it.transform[5];
      }
      out += '\n';
    }
    return out;
  }
  if (ext === 'docx') return (await mammoth.extractRawText({ buffer: buf })).value;
  return buf.toString('utf8');
}
`````

### File: shared/taxonomy.js
`````js
// Generic, multi-profession skills taxonomy. The resume parser matches a resume against these groups
// to build a candidate profile; the scorer then matches job descriptions against that profile.
// terms: lowercase phrases (pad short ones with spaces), tools: product names counted as "tools/tech",
// roles: title fragments that indicate a job in this family.

export const TAXONOMY = [
  // ---- IT infrastructure / end-user computing ----
  { key: 'dex', label: 'DEX / Nexthink', domain: 'End-user computing', terms: ['nexthink', 'digital employee experience', ' dex ', 'dex score', 'employee experience', 'systrack', 'lakeside', 'remote action'], tools: ['nexthink', 'systrack', '1e tachyon'], roles: ['dex', 'nexthink', 'employee experience'] },
  { key: 'mdm', label: 'Intune / MDM', domain: 'End-user computing', terms: ['intune', 'autopilot', 'modern workplace', 'endpoint manager', ' mdm', 'mobile device management', ' uem', 'workspace one', 'airwatch'], tools: ['intune', 'autopilot', 'workspace one'], roles: ['intune', 'mdm', 'modern workplace', 'endpoint', 'uem'] },
  { key: 'sccm', label: 'SCCM / MECM & patching', domain: 'End-user computing', terms: ['sccm', 'mecm', 'configuration manager', 'wsus', 'patching', 'patch management', 'packaging', 'task sequence', 'software deployment'], tools: ['sccm', 'mecm', 'wsus'], roles: ['sccm', 'mecm', 'packaging', 'patch'] },
  { key: 'mac', label: 'JAMF / macOS', domain: 'End-user computing', terms: ['jamf', 'macos', 'mac os', 'apple business manager', ' abm ', ' ade ', 'kandji', 'apple device'], tools: ['jamf', 'kandji', 'apple business manager'], roles: ['jamf', 'mac', 'apple'] },
  { key: 'euc', label: 'Desktop / EUC engineering', domain: 'End-user computing', terms: ['end user computing', ' euc', 'desktop engineering', 'windows 10', 'windows 11', 'group policy', ' gpo', 'imaging', 'bitlocker'], tools: ['group policy', 'bitlocker'], roles: ['desktop', 'euc', 'end user', 'workplace', 'endpoint'] },
  { key: 'vdi', label: 'Citrix / VDI', domain: 'End-user computing', terms: ['citrix', 'xenapp', 'xendesktop', ' vdi', 'virtual desktop', ' avd', 'vmware horizon', 'windows 365'], tools: ['citrix', 'vmware horizon', 'avd'], roles: ['citrix', 'vdi', 'virtual desktop'] },
  { key: 'support', label: 'L2/L3 & production support', domain: 'IT operations', terms: ['production support', 'application support', ' l2', ' l3', 'level 2', 'level 3', 'escalation', 'incident', 'on-call', '24x7', '24/7', ' sla', 'service desk', 'help desk', 'helpdesk', 'desktop support', 'technical support', 'troubleshoot'], tools: [], roles: ['support', 'service desk', 'helpdesk', 'help desk', 'operations'] },
  { key: 'itsm', label: 'ITIL / ITSM', domain: 'IT operations', terms: ['itil', 'itsm', 'change management', 'problem management', 'incident management', 'servicenow', 'jira service', 'remedy', 'root cause', ' rca'], tools: ['servicenow', 'jira service management', 'bmc remedy'], roles: ['itsm', 'servicenow', 'problem manager', 'incident manager', 'change manager'] },
  { key: 'identity', label: 'Identity & access (AD / Entra / Okta)', domain: 'Identity & security', terms: ['active directory', 'azure ad', 'entra', 'okta', 'identity', 'access management', ' iam', 'conditional access', ' sso', ' mfa', 'sailpoint', 'cyberark', 'provisioning'], tools: ['active directory', 'azure ad', 'entra', 'okta', 'sailpoint', 'cyberark'], roles: ['identity', 'iam', 'access'] },
  { key: 'm365', label: 'Microsoft 365 / Exchange', domain: 'Collaboration', terms: ['microsoft 365', ' m365', 'office 365', ' o365', 'exchange', 'sharepoint', 'onedrive', 'microsoft teams', 'google workspace'], tools: ['microsoft 365', 'exchange', 'sharepoint', 'google workspace'], roles: ['m365', 'microsoft 365', 'office 365', 'exchange', 'collaboration'] },
  { key: 'network', label: 'Networking', domain: 'Infrastructure', terms: ['tcp/ip', ' dns', ' dhcp', ' vpn', ' lan', ' wan', 'routing', 'switching', 'firewall', 'cisco', 'ccna', 'sd-wan', 'load balancer'], tools: ['cisco', 'palo alto', 'fortinet', 'zscaler'], roles: ['network'] },
  { key: 'endsec', label: 'Endpoint & cyber security', domain: 'Identity & security', terms: ['crowdstrike', 'zscaler', 'mcafee', 'defender', 'endpoint security', ' edr', ' siem', ' soc ', 'vulnerability', 'iso 27001', 'hardening', 'cis benchmark', 'penetration', 'threat'], tools: ['crowdstrike', 'zscaler', 'defender', 'splunk', 'qradar', 'sentinelone', 'tenable', 'qualys'], roles: ['security', 'soc', 'cyber'] },
  { key: 'sysadmin', label: 'Windows / Linux server admin', domain: 'Infrastructure', terms: ['windows server', 'linux', 'red hat', 'rhel', 'ubuntu', 'vmware', 'vsphere', 'hyper-v', 'backup', 'active directory'], tools: ['vmware', 'vsphere', 'hyper-v', 'veeam'], roles: ['system administrator', 'systems administrator', 'sysadmin', 'infrastructure', 'systems engineer', 'server'] },
  { key: 'scripting', label: 'Scripting & automation', domain: 'Automation', terms: ['powershell', 'python', 'bash', 'scripting', 'automation', 'automate', ' rpa', 'uipath', 'power automate'], tools: ['powershell', 'python', 'uipath', 'power automate'], roles: ['automation'] },
  // ---- cloud / devops ----
  { key: 'azure', label: 'Microsoft Azure', domain: 'Cloud', terms: ['azure', 'arm template', 'bicep', 'azure devops'], tools: ['azure', 'azure devops'], roles: ['azure', 'cloud'] },
  { key: 'aws', label: 'AWS', domain: 'Cloud', terms: [' aws', 'amazon web services', ' ec2', ' s3', 'lambda', 'cloudformation'], tools: ['aws', 'cloudformation'], roles: ['aws', 'cloud'] },
  { key: 'gcp', label: 'Google Cloud', domain: 'Cloud', terms: [' gcp', 'google cloud', 'bigquery', 'gke'], tools: ['gcp', 'bigquery'], roles: ['gcp', 'google cloud', 'cloud'] },
  { key: 'containers', label: 'Kubernetes & containers', domain: 'DevOps', terms: ['kubernetes', ' k8s', 'docker', 'helm', 'openshift', 'container'], tools: ['kubernetes', 'docker', 'helm', 'openshift'], roles: ['kubernetes', 'platform', 'devops'] },
  { key: 'iac', label: 'Infrastructure as code', domain: 'DevOps', terms: ['terraform', 'ansible', 'puppet', 'chef', 'infrastructure as code', ' iac', ' dsc'], tools: ['terraform', 'ansible', 'puppet'], roles: ['devops', 'platform', 'infrastructure'] },
  { key: 'cicd', label: 'CI/CD', domain: 'DevOps', terms: ['ci/cd', 'jenkins', 'github actions', 'gitlab', 'pipeline', 'argo'], tools: ['jenkins', 'github actions', 'gitlab', 'argocd'], roles: ['devops', 'build', 'release'] },
  { key: 'observability', label: 'Monitoring & observability', domain: 'DevOps', terms: ['splunk', 'datadog', 'prometheus', 'grafana', 'new relic', 'dynatrace', 'monitoring', 'observability', 'elk'], tools: ['splunk', 'datadog', 'prometheus', 'grafana', 'dynatrace', 'new relic'], roles: ['sre', 'site reliability', 'monitoring', 'observability'] },
  // ---- software ----
  { key: 'frontend', label: 'Front-end development', domain: 'Software', terms: ['react', 'angular', 'vue', 'typescript', 'javascript', 'html', 'css', 'next.js', 'redux'], tools: ['react', 'angular', 'vue', 'typescript', 'next.js'], roles: ['frontend', 'front end', 'front-end', 'ui developer', 'web developer'] },
  { key: 'backend', label: 'Back-end development', domain: 'Software', terms: ['java', 'spring', 'node.js', 'nodejs', '.net', ' c#', 'django', 'flask', 'golang', 'microservices', 'rest api', 'graphql', 'kotlin'], tools: ['java', 'spring boot', 'node.js', '.net', 'django', 'golang'], roles: ['backend', 'back end', 'software engineer', 'developer', 'programmer', 'full stack'] },
  { key: 'mobile', label: 'Mobile development', domain: 'Software', terms: ['android', ' ios', 'swift', 'flutter', 'react native', 'kotlin'], tools: ['android', 'swift', 'flutter', 'react native'], roles: ['mobile', 'android', 'ios developer'] },
  { key: 'databases', label: 'Databases & SQL', domain: 'Data', terms: [' sql', 'postgres', 'mysql', 'mongodb', 'oracle', 'sql server', 'nosql', 'database'], tools: ['sql', 'postgresql', 'mysql', 'mongodb', 'oracle', 'sql server'], roles: ['database', 'dba'] },
  { key: 'qa', label: 'QA & testing', domain: 'Software', terms: ['selenium', 'cypress', 'test automation', 'manual testing', 'jmeter', 'test cases', 'regression', 'playwright', 'quality assurance'], tools: ['selenium', 'cypress', 'jmeter', 'playwright'], roles: ['qa', 'test', 'quality', 'sdet'] },
  // ---- data / AI ----
  { key: 'dataeng', label: 'Data engineering', domain: 'Data', terms: ['spark', 'airflow', ' etl', 'snowflake', 'databricks', 'data pipeline', 'kafka', 'hadoop', 'dbt'], tools: ['spark', 'airflow', 'snowflake', 'databricks', 'kafka', 'dbt'], roles: ['data engineer', 'etl', 'big data'] },
  { key: 'bi', label: 'Analytics & BI', domain: 'Data', terms: ['power bi', 'tableau', 'looker', 'excel', 'dashboard', 'reporting', ' kpi', 'analytics', 'data analysis'], tools: ['power bi', 'tableau', 'looker', 'excel'], roles: ['analyst', 'bi ', 'business intelligence', 'reporting'] },
  { key: 'ml', label: 'Machine learning & AI', domain: 'AI', terms: ['machine learning', 'deep learning', 'tensorflow', 'pytorch', ' llm', ' nlp', 'computer vision', 'generative ai', 'genai', 'scikit'], tools: ['tensorflow', 'pytorch', 'scikit-learn', 'langchain'], roles: ['machine learning', 'ml engineer', 'data scientist', 'ai engineer'] },
  // ---- enterprise apps ----
  { key: 'salesforce', label: 'Salesforce', domain: 'Enterprise apps', terms: ['salesforce', 'apex', 'lightning', 'service cloud', 'sales cloud'], tools: ['salesforce'], roles: ['salesforce'] },
  { key: 'sap', label: 'SAP / ERP', domain: 'Enterprise apps', terms: [' sap', 's/4hana', ' abap', ' fico', ' erp', 'oracle ebs', 'dynamics 365', 'netsuite', 'workday'], tools: ['sap', 'dynamics 365', 'netsuite', 'workday'], roles: ['sap', 'erp', 'workday', 'dynamics'] },
  // ---- business ----
  { key: 'pm', label: 'Project / program management', domain: 'Management', terms: ['project management', 'program management', ' pmp', 'prince2', 'stakeholder', 'agile', 'scrum', 'jira', 'roadmap', 'budget'], tools: ['jira', 'ms project', 'confluence'], roles: ['project manager', 'program manager', 'scrum master', 'delivery manager', 'pmo'] },
  { key: 'product', label: 'Product management', domain: 'Management', terms: ['product management', 'product roadmap', 'user stories', 'product owner', 'go-to-market', 'prd'], tools: [], roles: ['product manager', 'product owner'] },
  { key: 'ba', label: 'Business analysis', domain: 'Management', terms: ['business analysis', 'requirements gathering', 'brd', 'frd', 'bpmn', ' uat', 'gap analysis', 'process mapping'], tools: ['visio'], roles: ['business analyst', 'functional consultant'] },
  { key: 'people', label: 'Team leadership & mentoring', domain: 'Management', terms: ['mentor', 'mentored', 'led a team', 'team lead', 'people management', 'coached', 'trained'], tools: [], roles: ['lead', 'manager', 'head'] },
  { key: 'sales', label: 'Sales & business development', domain: 'Business', terms: ['sales', 'quota', 'pipeline generation', 'business development', 'account management', 'lead generation', 'b2b'], tools: ['hubspot', 'salesforce'], roles: ['sales', 'account executive', 'business development', 'account manager'] },
  { key: 'marketing', label: 'Marketing', domain: 'Business', terms: [' seo', ' sem', 'content marketing', 'social media', 'google ads', 'campaign', 'brand', 'email marketing'], tools: ['google ads', 'hubspot', 'google analytics'], roles: ['marketing', 'seo', 'content', 'growth'] },
  { key: 'finance', label: 'Finance & accounting', domain: 'Finance', terms: ['accounting', ' gaap', ' ifrs', 'reconciliation', 'accounts payable', 'accounts receivable', 'financial reporting', 'audit', 'tally', 'taxation', 'budgeting'], tools: ['tally', 'quickbooks', 'sap fico'], roles: ['accountant', 'finance', 'audit', 'controller', 'accounts'] },
  { key: 'hr', label: 'HR & recruiting', domain: 'People', terms: ['recruitment', 'talent acquisition', 'payroll', 'onboarding', 'hrms', 'employee relations', 'sourcing'], tools: ['workday', 'successfactors'], roles: ['hr', 'recruiter', 'talent', 'people partner'] },
  { key: 'cx', label: 'Customer support & success', domain: 'Customer', terms: ['customer support', 'customer success', 'zendesk', 'freshdesk', 'csat', ' nps', 'client relationship'], tools: ['zendesk', 'freshdesk', 'intercom'], roles: ['customer success', 'customer support', 'client'] },
  { key: 'design', label: 'UX / UI design', domain: 'Design', terms: ['figma', 'user experience', ' ux', ' ui ', 'wireframe', 'prototype', 'design system', 'adobe xd', 'user research'], tools: ['figma', 'adobe xd', 'sketch'], roles: ['designer', 'ux', 'ui'] },
  { key: 'health', label: 'Healthcare', domain: 'Healthcare', terms: ['clinical', ' ehr', ' emr', 'hipaa', 'medical coding', 'patient', 'epic', 'cerner', 'pharma'], tools: ['epic', 'cerner'], roles: ['clinical', 'medical', 'healthcare', 'nurse', 'pharma'] },
  { key: 'ops', label: 'Operations & supply chain', domain: 'Operations', terms: ['supply chain', 'logistics', 'procurement', 'inventory', 'vendor management', 'warehouse', 'six sigma', 'lean'], tools: ['sap mm'], roles: ['operations', 'supply chain', 'procurement', 'logistics'] },
];

export const ALL_TOOLS = [...new Set(TAXONOMY.flatMap((g) => g.tools))];

export const AI_COMPANIES = ['openai', 'anthropic', 'nvidia', 'databricks', 'scale ai', 'cohere', 'mistral', 'hugging face', 'glean', 'moveworks', 'uipath', 'aisera', 'deepmind', 'perplexity', 'sarvam', 'krutrim', 'fractal', 'observe.ai', 'gupshup', 'yellow.ai', 'haptik'];

// Relocation options offered at upload time. linkedin = location string for LinkedIn guest search.
export const MARKET_OPTIONS = [
  { id: 'uae', label: 'Dubai / UAE', prefix: 'DXB', linkedin: 'United Arab Emirates', match: 'dubai|abu dhabi|emirates|uae|sharjah' },
  { id: 'singapore', label: 'Singapore', prefix: 'SIN', linkedin: 'Singapore', match: 'singapore' },
  { id: 'canada', label: 'Canada', prefix: 'CAN', linkedin: 'Canada', match: 'canada|toronto|vancouver|ontario|montreal|calgary' },
  { id: 'uk', label: 'United Kingdom', prefix: 'UK', linkedin: 'United Kingdom', match: 'united kingdom|london|england|scotland|manchester' },
  { id: 'usa', label: 'United States', prefix: 'USA', linkedin: 'United States', match: 'united states|, [a-z]{2}$|new york|california|texas' },
  { id: 'germany', label: 'Germany', prefix: 'DE', linkedin: 'Germany', match: 'germany|berlin|munich|frankfurt' },
  { id: 'netherlands', label: 'Netherlands', prefix: 'NL', linkedin: 'Netherlands', match: 'netherlands|amsterdam|rotterdam' },
  { id: 'ireland', label: 'Ireland', prefix: 'IE', linkedin: 'Ireland', match: 'ireland|dublin' },
  { id: 'australia', label: 'Australia', prefix: 'AU', linkedin: 'Australia', match: 'australia|sydney|melbourne' },
  { id: 'saudi', label: 'Saudi Arabia', prefix: 'KSA', linkedin: 'Saudi Arabia', match: 'saudi|riyadh|jeddah' },
  { id: 'qatar', label: 'Qatar', prefix: 'QA', linkedin: 'Qatar', match: 'qatar|doha' },
];

export const CITY_ALIASES = { bangalore: 'Bengaluru', bengaluru: 'Bengaluru', bombay: 'Mumbai', gurgaon: 'Gurugram', madras: 'Chennai' };
export const KNOWN_CITIES = ['Bengaluru', 'Bangalore', 'Mumbai', 'Pune', 'Hyderabad', 'Chennai', 'Delhi', 'New Delhi', 'Noida', 'Gurugram', 'Gurgaon', 'Kolkata', 'Ahmedabad', 'Kochi', 'Coimbatore', 'Jaipur', 'Mysuru', 'Trivandrum',
  'Dubai', 'Abu Dhabi', 'Singapore', 'London', 'Manchester', 'Toronto', 'Vancouver', 'Montreal', 'New York', 'San Francisco', 'Seattle', 'Austin', 'Chicago', 'Boston', 'Dallas',
  'Berlin', 'Munich', 'Amsterdam', 'Dublin', 'Sydney', 'Melbourne', 'Riyadh', 'Doha', 'Kuala Lumpur', 'Manila', 'Colombo', 'Dhaka', 'Karachi', 'Lahore', 'Nairobi', 'Lagos', 'Johannesburg', 'Cairo'];
export const COUNTRY_OF = { Bengaluru: 'India', Mumbai: 'India', Pune: 'India', Hyderabad: 'India', Chennai: 'India', Delhi: 'India', 'New Delhi': 'India', Noida: 'India', Gurugram: 'India', Kolkata: 'India', Ahmedabad: 'India', Kochi: 'India', Coimbatore: 'India', Jaipur: 'India', Mysuru: 'India', Trivandrum: 'India',
  Dubai: 'United Arab Emirates', 'Abu Dhabi': 'United Arab Emirates', Singapore: 'Singapore', London: 'United Kingdom', Manchester: 'United Kingdom', Toronto: 'Canada', Vancouver: 'Canada', Montreal: 'Canada',
  'New York': 'United States', 'San Francisco': 'United States', Seattle: 'United States', Austin: 'United States', Chicago: 'United States', Boston: 'United States', Dallas: 'United States',
  Berlin: 'Germany', Munich: 'Germany', Amsterdam: 'Netherlands', Dublin: 'Ireland', Sydney: 'Australia', Melbourne: 'Australia', Riyadh: 'Saudi Arabia', Doha: 'Qatar', 'Kuala Lumpur': 'Malaysia', Manila: 'Philippines', Colombo: 'Sri Lanka', Dhaka: 'Bangladesh', Karachi: 'Pakistan', Lahore: 'Pakistan', Nairobi: 'Kenya', Lagos: 'Nigeria', Johannesburg: 'South Africa', Cairo: 'Egypt' };
`````

### File: shared/resume-parser.js
`````js
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
`````

### File: shared/scoring.js
`````js
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
`````

### File: scripts/seed.mjs
`````js
// Snapshot data/*.json into app/src/seed.json so the HTML also works offline (file://) without the server.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (n, f) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', n), 'utf8')); } catch { return f; } };
const db = read('jobs.json', { jobs: [], meta: {} });
const pipeline = read('pipeline.json', {});
const profile = read('profile.json', null);
const jobs = db.jobs.map((j) => ({ ...j, ...(pipeline[j.uid] || {}), description: (j.description || '').slice(0, 4000) }));
fs.writeFileSync(path.join(ROOT, 'app', 'src', 'seed.json'), JSON.stringify({ profile, jobs, meta: db.meta, contacts: read('contacts.json', []), builtAt: new Date().toISOString() }));
console.log(`seed.json: ${jobs.length} jobs`);
`````

### File: scripts/inline.mjs
`````js
// Inline Parcel's dist output (JS + CSS) into ONE self-contained JobPilot-CRM.html (works from file:// too).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(ROOT, 'app', 'dist');
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const readAsset = (src) => fs.readFileSync(path.join(dist, src.replace(/^\.?\//, '').split('?')[0]), 'utf8');
// Parcel 2 emits unquoted attributes, so match quotes optionally.
html = html.replace(/<script([^>]*?)src=["']?([^"' >]+\.js)["']?([^>]*)><\/script>/g, (_, a, src, b) =>
  `<script${a.replace(/\s+$/, '')}${b}>${readAsset(src).replace(/<\/script>/g, '<\/script>')}</script>`);
html = html.replace(/<link([^>]*?)rel=["']?stylesheet["']?([^>]*?)href=["']?([^"' >]+\.css)["']?([^>]*)>/g, (_, a, b, href) => `<style>${readAsset(href)}</style>`);
html = html.replace(/<link([^>]*?)href=["']?([^"' >]+\.css)["']?([^>]*?)rel=["']?stylesheet["']?([^>]*)>/g, (_, a, href) => `<style>${readAsset(href)}</style>`);
const out = path.join(ROOT, 'JobPilot-CRM.html');
fs.writeFileSync(out, html);
console.log(`Wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
`````

### File: scripts/unpack-skill.mjs
`````js
// Extracts every "### File: <path>" block from SKILL.md into the current folder.
// Usage: node scripts/unpack-skill.mjs SKILL.md [targetDir]
import fs from 'node:fs';
import path from 'node:path';

const [src = 'SKILL.md', target = '.'] = process.argv.slice(2);
const md = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');
const re = /^### File: (.+)\n`{5}[a-z]*\n([\s\S]*?)\n`{5}$/gm;
let m, n = 0;
while ((m = re.exec(md))) {
  const out = path.join(target, m[1].trim());
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, m[2] + '\n');
  n++;
}
console.log(`Unpacked ${n} files into ${path.resolve(target)}`);
console.log('Next: npm install && cd app && npm install && npm run build && cd .. && npm start');
`````

### File: scripts/make-skill.mjs
`````js
// Generates SKILL.md: a single self-contained file that recreates JobPilot CRM on any machine.
// Usage: node scripts/make-skill.mjs   (or: npm run skill)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = [
  'package.json', 'start.bat', 'start.sh', 'README.md',
  'server/server.js', 'server/scrapers.js', 'server/extract.js',
  'shared/taxonomy.js', 'shared/resume-parser.js', 'shared/scoring.js',
  'scripts/seed.mjs', 'scripts/inline.mjs', 'scripts/unpack-skill.mjs', 'scripts/make-skill.mjs',
  'app/package.json', 'app/tsconfig.json', 'app/index.html',
  ...walk('app/src').filter((f) => !f.endsWith('seed.json')),
];
function walk(dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(`${dir}/${d.name}`) : [`${dir}/${d.name}`]).sort();
}
const lang = (f) => ({ js: 'js', mjs: 'js', ts: 'ts', tsx: 'tsx', json: 'json', html: 'html', css: 'css', md: 'markdown', bat: 'bat', sh: 'bash' })[f.split('.').pop()] || '';
const FENCE = '`'.repeat(5);

const header = `---
name: jobpilot-crm
description: Build and run JobPilot CRM, a realtime, locally hosted job-search CRM. Upload any resume (PDF/DOCX/TXT) and it parses a candidate profile, scrapes live jobs (LinkedIn guest API, TinyFish Web Agent, Remotive, Himalayas, Jobicy, RemoteOK), scores every job 0–100, and gives a visual CRM (dashboard, Kanban pipeline, job board, resume center, outreach drafts, analytics). Use when someone wants a job-search CRM, a job tracker from their resume, or to recreate JobPilot on a new machine.
---

# JobPilot CRM: recreate anywhere, driven by your resume

**What you get:** a local web app at **http://localhost:4321**. On first open it asks for a resume.
Drop in a PDF, DOCX or TXT and within minutes you have a live CRM of real, currently open jobs, scored against that resume.

- **Resume → profile, automatically.** Name, contacts, city/country, years, target titles, certifications, experience,
  core skills (from a 45-group multi-profession taxonomy) **with the resume bullet that proves each skill**, keywords, tools,
  resume versions, and scraper search queries. This works for IT, software, data, BA/PM, finance, HR, marketing, healthcare, ops and more.
- **Realtime scraping** with a **Refresh** button (or press \`R\`), plus optional auto-refresh. Progress streams live over Server-Sent Events:
  a progress bar, a live console with per-source counts and logs, toasts, and new jobs flagged **NEW**.
- **Sources:** the LinkedIn guest search + job-detail pages (real \`linkedin.com/jobs/view/…\` links, full JD, no login),
  the **TinyFish Web Agent** Search + Fetch APIs (free key), and the public remote-job APIs Remotive, Himalayas, Jobicy and RemoteOK.
- **Scoring (0–100)** in 7 weighted categories: skills 25 · experience 25 · domain 15 · tools 15 · seniority 10 · location 5 · keyword 5.
  Priority A ≥ 85, B ≥ 70, C ≥ 55, else D, plus ATS score and shortlist/interview/offer estimates.
- **The CRM:** a Dashboard (72-hour fresh roles, today's queue, funnel), a drag-and-drop Pipeline (New → Ready → Applied → Screening → Interview → Offer),
  a Job Board (filters, big **APPLY** button, copy link), and a Job Drawer (fit analysis, score breakdown, gaps, tailoring, plus auto-drafted cover letter,
  recruiter email, LinkedIn DM, follow-up, referral ask, thank-you note, interview prep with STAR stories, and salary guidance).
  There's also a Resume Center (profile, editable targeting, proof points, market-demand vs gaps), Contacts & outreach, Analytics,
  Add Job (paste a JD and it's scored live), and Sources & Scrapers settings.
- **Upload another resume anytime** from the sidebar. The same person keeps their pipeline and gets re-scored. A different person has the old CRM
  archived to \`data/archive/\` and gets a fresh one.
- **11 themes:** JobPilot Navy plus the 10 theme-factory palettes (Ocean Depths, Sunset Boulevard, Forest Canopy, Modern Minimalist, Golden Hour,
  Arctic Frost, Desert Rose, Tech Innovation, Botanical Garden, Midnight Galaxy).
- **Private and local.** Data lives in \`data/*.json\` + browser localStorage, and the only outbound calls are to the job sources.

---

## INSTRUCTIONS FOR CLAUDE (or anyone) TO RECREATE IT

### Requirements
- **Node.js 18+** (20+ recommended) and npm. Internet access for scraping and Google Fonts.
- Windows, macOS or Linux.

### Step 1: Write the files
Create an empty folder (e.g. \`C:\\jobpilot\` or \`~/jobpilot\`) and write **every file in the "Source files" appendix below,
verbatim, at the path shown in its heading**. Don't summarize, "improve" or skip any file: the app depends on all of them.

Faster alternative: save this SKILL.md into the folder, write only \`scripts/unpack-skill.mjs\` from the appendix, then run
\`node scripts/unpack-skill.mjs SKILL.md\`. It extracts every file automatically.

### Step 2: Install and build
\`\`\`bash
npm install                                  # server deps: pdfjs-dist (PDF) + mammoth (DOCX)
cd app && npm install && npm run build && cd ..   # React 18 + TS → Parcel → one self-contained JobPilot-CRM.html
\`\`\`
(or just \`npm run setup\`). The build writes \`JobPilot-CRM.html\` in the project root.

### Step 3: Run
- Windows: double-click **\`start.bat\`**. macOS/Linux: \`./start.sh\`. Or run \`npm start\`.
- The browser opens **http://localhost:4321** on the upload screen.

### Step 4: Load the resume → jobs
- **In the browser (normal path):** drop the resume, choose Remote / AI-adjacent / relocation countries / recency, then click
  **Build my CRM & scrape jobs**. The profile is built instantly and the first scrape (≈2–4 min) streams in live.
- **If the user gave Claude the resume in chat**, Claude can load it without the browser:
  \`\`\`bash
  curl -X POST "http://localhost:4321/api/resume?relocation=uae,singapore&remote=1&ai=1&recency=30" \\
       -H "X-Filename: resume.pdf" --data-binary @path/to/resume.pdf
  \`\`\`
  Relocation ids: \`uae singapore canada uk usa germany netherlands ireland australia saudi qatar\`.
  Then check \`GET /api/state\` and report the profile (name, titles, core skills) and the job counts to the user.
- **Ask the user** (one short message) only for what the resume can't tell you: relocation countries, whether they're open to remote,
  and whether to include AI-adjacent roles. Default: resume city + remote + AI-adjacent, 30-day window.

### Step 5 (optional, recommended): TinyFish
- Get a free API key at **agent.tinyfish.ai/api-keys** and paste it in **Sources & Scrapers**. It's stored in \`data/settings.json\` and never sent to the browser.
  The Search API then discovers postings across LinkedIn, Naukri, Bayt and Indeed, and the Fetch API backfills job descriptions when LinkedIn blocks.
- **If Claude has the TinyFish MCP tools**, seed extra verified postings: run \`search\` with queries like
  \`site:linkedin.com/jobs/view <top tool or title> <city>\` (recency ~30 days), keep only real \`linkedin.com/jobs/view/…-<id>\` URLs,
  and write them to \`data/tinyfish-seed.json\` as \`{ "urls": [ ... ] }\`. Every refresh re-verifies them live on LinkedIn and closed postings drop out.

### Step 6: Deliver
Tell the user how many jobs were scraped, the priority and market breakdown, and the count of AI-adjacent roles. List the top Priority-A/B
jobs with their real apply links, and note any source that was blocked or rate-limited (the Live console shows this).

### Non-negotiable rules
1. **Only real job URLs** from actual scrape results. Never construct or invent a URL or listing.
2. APPLY opens the posting in a new tab and falls back to same-tab if pop-ups are blocked. Copy uses \`navigator.clipboard\`, then
   \`execCommand('copy')\`, then \`prompt()\`, so it works from \`file://\` too. (Already implemented in \`app/src/lib/util.ts\`.)
3. Keep everything local. No accounts, no uploads to third parties except the job-source APIs.

---

## How it works

\`\`\`
 Browser (JobPilot-CRM.html: React 18 + TS, one inlined file)
   │  GET /api/state · SSE /api/events · POST /api/refresh · POST /api/resume · PUT /api/pipeline|profile|settings|contacts
   ▼
 server/server.js (Node, zero-framework HTTP + SSE)
   ├─ server/extract.js        resume file → text (pdfjs-dist / mammoth)
   ├─ shared/resume-parser.js  text → profile.json (taxonomy match, proof bullets, titles, markets, queries)
   ├─ server/scrapers.js       LinkedIn guest · TinyFish Search/Fetch · Remotive · Himalayas · Jobicy · RemoteOK
   ├─ shared/scoring.js        job × profile → match, priority, why-match, gaps, tailoring (also used live in Add Job)
   └─ data/                    profile.json · jobs.json · pipeline.json · contacts.json · settings.json · resumes/ · archive/
\`\`\`

**A refresh:** it builds tasks for each enabled market × search query (relocation markets use only "core" queries), then runs the remote-board
searches, TinyFish (if keyed) and the seed re-verification. Concurrency is capped per source and 429s back off automatically. Out-of-area
"local" results are re-assigned by location. The top ~160 LinkedIn postings without a JD are enriched from the job-detail page (TinyFish Fetch
fallback). Everything is scored, and anything below \`minScore\` (45) is dropped. It then merges by id plus company+title, emits \`job\` events live, and saves.

**Useful API calls:** \`POST /api/rescore\` (re-score everything after editing the profile), \`PUT /api/profile\` (partial profile edit),
\`POST /api/refresh\`, \`GET /api/state\`.

**Running two candidates at once:** each instance gets its own port and data folder:
\`PORT=4322 JOBPILOT_DATA=./data-other node server/server.js\` (Windows: \`set PORT=4322\` and \`set JOBPILOT_DATA=...\` first).

## Customizing
- **Taxonomy** (\`shared/taxonomy.js\`): add a skill group \`{ key, label, domain, terms, tools, roles }\` to support a new profession.
  Terms are word-boundary matched.
- **Relocation markets:** add to \`MARKET_OPTIONS\` (\`linkedin\` = LinkedIn location string, \`match\` = regex applied to job locations).
- **Hand-tune a profile:** edit \`data/profile.json\` (proof sentences, \`targetTitles\`, \`keywords\`, \`resumeVersions\`, optional
  \`salary\` map keyed by market label, and \`stories\` with \`{q,s,t,a,r}\` for STAR prep). Then \`POST /api/rescore\`.
- **Scoring weights and thresholds:** see \`WEIGHTS\` and the divisors in \`shared/scoring.js\`.
- **Offline snapshot:** \`cd app && npm run build\` embeds the current data into \`JobPilot-CRM.html\`, so it also opens from disk
  (it reconnects to the live server automatically when that's running).

## Troubleshooting
| Symptom | Fix |
|---|---|
| "Could not read text from this file" | Scanned/image PDF. Upload a DOCX or a text-based PDF. |
| Few or zero jobs | Check the Live console. LinkedIn can rate-limit (it retries automatically, so refresh again later). Broaden titles in Resume Center → Targeting, or add queries in Sources. |
| Wrong city or titles parsed | Resume Center → Targeting → Edit, or edit \`data/profile.json\` and then \`POST /api/rescore\`. |
| Port 4321 busy | Something is already running. The server detects it and opens the existing app, or set \`PORT\`. |
| Fonts look plain offline | Google Fonts need internet. Everything else works offline. |

---

## Source files
Each file below is complete. Write it verbatim at the path in its heading.
`;

let out = header;
for (const f of FILES) {
  const body = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
  if (body.includes(FENCE)) throw new Error(`${f} contains the fence marker`);
  out += `\n### File: ${f}\n${FENCE}${lang(f)}\n${body}${body.endsWith('\n') ? '' : '\n'}${FENCE}\n`;
}
fs.writeFileSync(path.join(ROOT, 'SKILL.md'), out);
console.log(`SKILL.md written: ${FILES.length} files, ${(out.length / 1024).toFixed(0)} KB`);
`````

### File: app/package.json
`````json
{
  "name": "jobpilot-crm-app",
  "private": true,
  "version": "1.0.0",
  "source": "index.html",
  "scripts": {
    "build": "node ../scripts/seed.mjs && parcel build index.html --dist-dir dist --no-source-maps --public-url ./ --no-cache && node ../scripts/inline.mjs",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "lucide-react": "0.383.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "parcel": "^2.12.0",
    "typescript": "^5.5.4"
  }
}
`````

### File: app/tsconfig.json
`````json
{
  "compilerOptions": {
    "target": "ES2020", "module": "ESNext", "moduleResolution": "Bundler", "jsx": "react-jsx",
    "strict": true, "noImplicitAny": false, "allowJs": true, "checkJs": false, "skipLibCheck": true,
    "esModuleInterop": true, "resolveJsonModule": true, "isolatedModules": true, "noEmit": true,
    "lib": ["ES2021", "DOM", "DOM.Iterable"]
  },
  "include": ["src", "../shared"]
}
`````

### File: app/index.html
`````html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>JobPilot CRM</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%232b6cf6'/><path d='M6 22 L16 6 L26 22 L16 18 Z' fill='white'/></svg>" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./src/main.tsx"></script>
  </body>
</html>
`````

### File: app/src/App.tsx
`````tsx
import React, { useEffect, useState } from 'react';
import { StoreProvider, useStore } from './store';
import { LiveConsole, NAV, Sidebar, Toasts, Topbar, type Page } from './components/Shell';
import { Drawer } from './components/Drawer';
import { Dashboard } from './pages/Dashboard';
import { Pipeline } from './pages/Pipeline';
import { JobBoard, type BoardFilter } from './pages/JobBoard';
import { ResumeCenter } from './pages/ResumeCenter';
import { Contacts } from './pages/Contacts';
import { Analytics } from './pages/Analytics';
import { AddJob } from './pages/AddJob';
import { Sources } from './pages/Sources';
import { UploadResume } from './components/Upload';

function Shell() {
  const [page, setPage] = useState<Page>(() => { try { return (sessionStorage.getItem('jp-page') as Page) || 'dashboard'; } catch { return 'dashboard'; } });
  const [query, setQuery] = useState('');
  const [boardFilter, setBoardFilter] = useState<BoardFilter | undefined>();
  const [consoleOpen, setConsoleOpen] = useState(false);
  const { run, profile, loaded } = useStore();
  const [uploadOpen, setUploadOpen] = useState(false);
  useEffect(() => { document.title = profile ? `JobPilot CRM · ${profile.name}` : 'JobPilot CRM'; }, [profile]);

  const go = (p: Page, filter?: BoardFilter & { q?: string }) => {
    if (filter?.q) { setQuery(filter.q); delete filter.q; }
    if (p === 'board') setBoardFilter(filter ? { ...filter } : undefined);
    setPage(p); try { sessionStorage.setItem('jp-page', p); } catch { /* */ }
    window.scrollTo({ top: 0 });
  };
  const title = NAV.find((n) => n.id === page)?.label || '';

  if (loaded && !profile) return (
    <div className="onboard"><UploadResume onDone={() => go('dashboard')} /><Toasts /><LiveConsole open={run.running} onClose={() => {}} /></div>
  );

  return (
    <div className="app">
      <Sidebar page={page} go={go} onMarket={(m) => go('board', { market: m })} onUpload={() => setUploadOpen(true)} />
      <main>
        <Topbar title={title} query={query} setQuery={(q) => { setQuery(q); if (q && (page === 'dashboard' || page === 'analytics')) go('board'); }} onConsole={() => setConsoleOpen((o) => !o)} />
        <div className="content" key={page}>
          {page === 'dashboard' && <Dashboard go={go} />}
          {page === 'pipeline' && <Pipeline query={query} />}
          {page === 'board' && <JobBoard query={query} initial={boardFilter} />}
          {page === 'resume' && <ResumeCenter onUpload={() => setUploadOpen(true)} />}
          {page === 'contacts' && <Contacts />}
          {page === 'analytics' && <Analytics onFilter={(f) => go('board', f)} />}
          {page === 'add' && <AddJob />}
          {page === 'sources' && <Sources />}
        </div>
      </main>
      <LiveConsole open={consoleOpen || false} onClose={() => setConsoleOpen(false)} />
      {run.running && !consoleOpen && <button className="console-fab" onClick={() => setConsoleOpen(true)}><span className="pulse busy" />Scraping live · {run.progress.done}/{run.progress.total}</button>}
      <Drawer />
      {uploadOpen && <div className="modal-wrap" onClick={() => setUploadOpen(false)}><div onClick={(e) => e.stopPropagation()}><UploadResume compact onCancel={() => setUploadOpen(false)} onDone={() => { setUploadOpen(false); go('dashboard'); }} /></div></div>}
      <Toasts />
    </div>
  );
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>;
}
`````

### File: app/src/components/Drawer.tsx
`````tsx
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Briefcase, Clock, FileText, Lightbulb, MapPin, Sparkles, Target, Trash2, Users, X } from 'lucide-react';
import { useStore } from '../store';
import { ALL_STAGES } from '../types';
import { Ring } from './charts';
import { ApplyButton, Chip, CopyButton, Logo } from './ui';
import { DRAFTS, resumeFileOf, shareSnippet, versionOf } from '../lib/drafts';
import { copyOrPrompt, cx, prColor, shortUrl, timeAgo } from '../lib/util';
import { API_BASE } from '../store';

const BREAK = [
  ['skills', 'Skills match', 25], ['experience', 'Experience alignment', 25], ['domain', 'Domain fit', 15],
  ['tools', 'Tools / tech', 15], ['seniority', 'Seniority fit', 10], ['location', 'Location / market', 5], ['keyword', 'Keyword match', 5],
] as const;

export function Drawer() {
  const { openUid, openJob, jobs, patchJob, setStage, removeJob, now, profile } = useStore();
  const job = jobs.find((j) => j.uid === openUid);
  const [tab, setTab] = useState<'fit' | 'drafts' | 'jd' | 'notes'>('fit');
  const [draft, setDraft] = useState('cover');
  const [notes, setNotes] = useState('');
  const [urlCopied, setUrlCopied] = useState(false);
  useEffect(() => { setNotes(job?.notes || ''); setTab('fit'); /* eslint-disable-next-line */ }, [openUid]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && openJob(null); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [openJob]);
  if (!job || !profile) return <div className="drawer-wrap" />;
  const v = versionOf(profile, job.resumeVersion);
  const rf = resumeFileOf(profile, job.resumeVersion);
  const d = DRAFTS.find((x) => x.id === draft)!;
  const text = d.fn(job, profile);

  return (
    <div className="drawer-wrap open" onClick={() => openJob(null)}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-hero" style={{ ['--c' as any]: prColor(job.priority) }}>
          <button className="icon-btn close" onClick={() => openJob(null)}><X size={18} /></button>
          <div className="dh-top">
            <Logo job={job} size={56} />
            <div className="dh-t">
              <span className="code">{job.code} · {job.source}</span>
              <h2>{job.title}</h2>
              <p><b>{job.company}</b></p>
              <div className="dh-meta">
                <span><MapPin size={13} />{job.location || job.market}</span>
                <span><Briefcase size={13} />{job.workMode}{job.employmentType ? ` · ${job.employmentType}` : ''}</span>
                <span><Clock size={13} />Posted {timeAgo(job.postedAt, now)}</span>
                {job.applicants && <span><Users size={13} />{job.applicants}</span>}
              </div>
            </div>
            <Ring value={job.match} size={96} stroke={9} color={prColor(job.priority)} sub={`Priority ${job.priority}`} />
          </div>
          <div className="dh-actions">
            <ApplyButton url={job.url} big label={job.url.includes('linkedin') ? 'APPLY ON LINKEDIN' : 'APPLY NOW'} />
            <CopyButton text={() => shareSnippet(job)} label="Copy share snippet" />
            <select value={job.stage} onChange={(e) => setStage(job.uid, e.target.value as any)} className="stage-select">
              {ALL_STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <button className={cx('url-box', urlCopied && 'done')} onClick={async () => { await copyOrPrompt(job.url); setUrlCopied(true); setTimeout(() => setUrlCopied(false), 1500); }} title="Click to copy">
            {urlCopied ? '✓ Copied!' : shortUrl(job.url)}
          </button>
          <div className="dh-chips">
            <Chip tone="accent">{job.market}</Chip>
            {job.aiFlag && <Chip tone="ai" icon={<Sparkles size={11} />}>AI-adjacent</Chip>}
            <Chip>{job.family}</Chip>
            {job.seniority && <Chip>{job.seniority}</Chip>}
            {job.salary && <Chip tone="good">{job.salary}</Chip>}
          </div>
        </div>

        <div className="tabs">
          {([['fit', 'Fit analysis'], ['drafts', 'Auto-drafts'], ['jd', 'Job description'], ['notes', 'Notes & timeline']] as const).map(([id, l]) => (
            <button key={id} className={cx(tab === id && 'on')} onClick={() => setTab(id)}>{l}</button>
          ))}
        </div>

        <div className="drawer-body">
          {tab === 'fit' && (
            <>
              <div className="why"><Target size={18} /><p>{job.whyMatch}</p></div>
              <div className="probs">
                {[['ATS score', job.ats], ['Shortlist', job.shortlistProb], ['Interview', job.interviewProb], ['Offer', job.offerProb]].map(([l, val]) => (
                  <div key={l as string}><Ring value={val as number} size={74} stroke={7} color={l === 'ATS score' ? 'var(--accent-2)' : 'var(--accent)'} label={`${val}%`} /><span>{l}</span></div>
                ))}
              </div>
              <h4>Score breakdown</h4>
              <div className="breakdown">
                {BREAK.map(([k, l, w]) => {
                  const val = (job.breakdown as any)?.[k] ?? 0;
                  return (
                    <div key={k} className="bd">
                      <span>{l}</span>
                      <div className="bd-t"><div style={{ width: `${(val / w) * 100}%` }} /></div>
                      <b>{val}<em>/{w}</em></b>
                    </div>
                  );
                })}
              </div>
              <div className="two">
                <div className="note-card warn"><h5><AlertTriangle size={15} />Gaps & talking points</h5><ul>{job.gaps.map((g) => <li key={g}>{g}</li>)}</ul></div>
                <div className="note-card good"><h5><Lightbulb size={15} />Tailoring tips</h5><ul>{job.tailoring.map((g) => <li key={g}>{g}</li>)}</ul></div>
              </div>
              <div className="resume-pick">
                <FileText size={18} />
                <div><b>Send: {v.name}</b><span>{v.focus}</span></div>
                <a className="btn-ghost" href={`${API_BASE}/files/${encodeURIComponent(rf?.file || '')}`} target="_blank" rel="noreferrer">Open PDF</a>
              </div>
              {!!job.matchedKeywords?.length && (<><h4>Matched keywords</h4><div className="kw">{job.matchedKeywords.map((k) => <span key={k}>{k}</span>)}</div></>)}
            </>
          )}

          {tab === 'drafts' && (
            <>
              <div className="draft-tabs">{DRAFTS.map((x) => <button key={x.id} className={cx(draft === x.id && 'on')} onClick={() => setDraft(x.id)}>{x.label}</button>)}</div>
              <div className="draft">
                <div className="draft-h"><b>{d.label}</b><CopyButton text={text} label="Copy draft" /></div>
                <pre>{text}</pre>
              </div>
            </>
          )}

          {tab === 'jd' && (
            <div className="jd">
              {job.description ? <pre>{job.description}</pre> : <p className="muted">No description captured yet. Open the posting, then paste the JD into Add Job to re-score it.</p>}
            </div>
          )}

          {tab === 'notes' && (
            <>
              <textarea className="notes" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (job.notes || '') && patchJob(job.uid, { notes })} placeholder="Recruiter name, call notes, next steps… (auto-saves)" />
              <h4>Timeline</h4>
              <ul className="timeline">
                <li><i />First seen by scraper<time>{new Date(job.firstSeenAt).toLocaleString()}</time></li>
                {(job.history || []).map((h, i) => <li key={i}><i className="on" />Moved to <b>{h.stage}</b><time>{new Date(h.at).toLocaleString()}</time></li>)}
              </ul>
              <button className="btn-danger" onClick={() => { if (confirm('Remove this job from the CRM?')) { removeJob(job.uid); openJob(null); } }}><Trash2 size={14} />Remove job</button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
`````

### File: app/src/components/Shell.tsx
`````tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UploadCloud, BarChart3, Briefcase, CheckCircle2, CircleAlert, FileText, Kanban, LayoutDashboard, Loader2, Palette, PlusCircle, Radio, RefreshCw, Search, Settings2, Terminal, Users, X, XCircle, Info, MinusCircle } from 'lucide-react';
import { useStore } from '../store';
import { cx, timeAgo } from '../lib/util';
import { THEMES, applyTheme } from '../lib/themes';

export type Page = 'dashboard' | 'pipeline' | 'board' | 'resume' | 'contacts' | 'analytics' | 'add' | 'sources';
export const NAV: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'pipeline', label: 'Pipeline', icon: <Kanban size={18} /> },
  { id: 'board', label: 'Job Board', icon: <Briefcase size={18} /> },
  { id: 'resume', label: 'Resume Center', icon: <FileText size={18} /> },
  { id: 'contacts', label: 'Contacts & Prep', icon: <Users size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { id: 'add', label: 'Add Job', icon: <PlusCircle size={18} /> },
  { id: 'sources', label: 'Sources & Scrapers', icon: <Settings2 size={18} /> },
];

export function Sidebar({ page, go, onMarket, onUpload }: { page: Page; go: (p: Page) => void; onMarket: (m: string) => void; onUpload: () => void }) {
  const { jobs, online, meta, now, run, profile } = useStore();
  const markets = useMemo(() => {
    const m: Record<string, number> = {};
    for (const j of jobs) m[j.market] = (m[j.market] || 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [jobs]);
  const counts: Partial<Record<Page, number>> = {
    board: jobs.length,
    pipeline: jobs.filter((j) => j.stage && j.stage !== 'New' && j.stage !== 'Rejected').length,
  };
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><svg viewBox="0 0 32 32" width="30" height="30"><path d="M4 22 L16 4 L28 22 L16 17 Z" fill="currentColor" /><path d="M10 26 L16 21 L22 26" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" /></svg></div>
        <div><b>JobPilot</b><span>CRM · live</span></div>
      </div>
      <button className="me" onClick={onUpload} title="Upload a new or updated resume">
        <div className="avatar">{(profile?.name || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('')}</div>
        <div><b>{profile?.name || 'No resume yet'}</b><span>{profile?.headline || 'Click to upload your resume'}</span></div>
        <UploadCloud size={15} className="me-up" />
      </button>
      <nav>
        {NAV.map((n) => (
          <button key={n.id} className={cx('nav', page === n.id && 'active')} onClick={() => go(n.id)}>
            {n.icon}<span>{n.label}</span>{counts[n.id] != null && <em>{counts[n.id]}</em>}
          </button>
        ))}
      </nav>
      <div className="side-block">
        <h6>Markets</h6>
        {markets.map(([m, c]) => (
          <button key={m} className="mkt" onClick={() => onMarket(m)}><span>{m}</span><em>{c}</em></button>
        ))}
      </div>
      <div className="side-foot">
        <span className={cx('pulse', online ? (run.running ? 'busy' : 'on') : 'off')} />
        <div>
          <b>{online ? (run.running ? 'Scraping live…' : 'Live · connected') : 'Offline snapshot'}</b>
          <span>{meta.lastRefresh ? `Synced ${timeAgo(meta.lastRefresh, now)}` : 'Never synced'}</span>
        </div>
      </div>
    </aside>
  );
}

export function Topbar({ title, query, setQuery, onConsole }: { title: string; query: string; setQuery: (s: string) => void; onConsole: () => void }) {
  const { refresh, run, online, meta, now } = useStore();
  const [themeOpen, setThemeOpen] = useState(false);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('jobpilot-theme') || 'jobpilot'; } catch { return 'jobpilot'; } });
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { applyTheme(THEMES.find((t) => t.id === theme) || THEMES[0]); try { localStorage.setItem('jobpilot-theme', theme); } catch { /* */ } }, [theme]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName);
      if (e.key === '/' && !typing) { e.preventDefault(); input.current?.focus(); }
      if (e.key.toLowerCase() === 'r' && !typing && !e.ctrlKey && !e.metaKey) refresh();
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [refresh]);
  const pct = run.progress.total ? Math.round((run.progress.done / run.progress.total) * 100) : 0;
  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div className="search">
        <Search size={16} />
        <input ref={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search jobs, companies, skills…  ( / )" />
        {query && <button onClick={() => setQuery('')}><X size={14} /></button>}
      </div>
      <div className="top-right">
        <button className={cx('live-pill', online ? 'on' : 'off')} onClick={onConsole} title="Open live scrape console">
          <Radio size={14} />{online ? (run.running ? `${pct}%` : 'Live') : 'Offline'}
        </button>
        <span className="synced">{meta.lastRefresh ? `Updated ${timeAgo(meta.lastRefresh, now)}` : ''}</span>
        <button className={cx('btn-refresh', run.running && 'spinning')} onClick={() => (run.running ? onConsole() : refresh())} title="Refresh: scrape and pull the latest jobs (R)">
          <RefreshCw size={16} /><span>{run.running ? 'Pulling latest…' : 'Refresh'}</span>
        </button>
        <div className="theme-pick">
          <button className="icon-btn" onClick={() => setThemeOpen((o) => !o)} title="Theme"><Palette size={18} /></button>
          {themeOpen && (
            <div className="theme-menu" onMouseLeave={() => setThemeOpen(false)}>
              <h6>Theme</h6>
              {THEMES.map((t) => (
                <button key={t.id} className={cx(theme === t.id && 'on')} onClick={() => setTheme(t.id)}>
                  <span className="sw">{t.swatch.map((c) => <i key={c} style={{ background: c }} />)}</span>{t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {run.running && <div className="progress"><div style={{ width: `${Math.max(4, pct)}%` }} /></div>}
    </header>
  );
}

const statusIcon = (s: string) => s === 'done' ? <CheckCircle2 size={14} className="ok" /> : s === 'error' ? <XCircle size={14} className="err" /> : s === 'skipped' ? <MinusCircle size={14} className="skip" /> : <Loader2 size={14} className="spin" />;

export function LiveConsole({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { run, online, refresh, meta } = useStore();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.scrollTo({ top: 1e9 }); }, [run.logs.length]);
  const sources = Object.values(run.sources);
  const lastRun = meta.runs?.[0];
  return (
    <div className={cx('console', open && 'open')}>
      <header>
        <Terminal size={16} /><b>Live scrape console</b>
        <span className={cx('pulse', online ? (run.running ? 'busy' : 'on') : 'off')} />
        <button className="icon-btn" onClick={onClose}><X size={16} /></button>
      </header>
      <div className="src-grid">
        {(sources.length ? sources : Object.values(lastRun?.sources || {}).map((s: any, i) => ({ ...s, name: Object.keys(lastRun!.sources)[i] }))).map((s: any) => (
          <div key={s.name} className={cx('src', s.status)}>{statusIcon(s.status)}<span>{s.name}</span><b>{s.count || 0}</b></div>
        ))}
        {!sources.length && !lastRun && <p className="muted">No runs yet. Press Refresh.</p>}
      </div>
      <div className="logs" ref={box}>
        {run.logs.map((l, i) => (
          <div key={i} className={cx('log', l.level)}>
            <time>{new Date(l.t).toLocaleTimeString()}</time><em>{l.source}</em><span>{l.msg}</span>
          </div>
        ))}
        {!run.logs.length && <div className="log muted"><span>{online ? 'Idle. Logs stream here in real time while scraping.' : 'Server offline. Run start.bat to enable live scraping.'}</span></div>}
      </div>
      <footer>
        <button className="btn-refresh" disabled={run.running || !online} onClick={refresh}><RefreshCw size={15} />{run.running ? 'Running…' : 'Run refresh now'}</button>
      </footer>
    </div>
  );
}

export function Toasts() {
  const { toasts, dismiss } = useStore();
  const icon = { good: <CheckCircle2 size={18} />, info: <Info size={18} />, warn: <CircleAlert size={18} />, bad: <XCircle size={18} /> };
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={cx('toast', t.kind)} onClick={() => dismiss(t.id)}>
          {icon[t.kind]}<div><b>{t.title}</b>{t.body && <p>{t.body}</p>}</div>
        </div>
      ))}
    </div>
  );
}
`````

### File: app/src/components/Upload.tsx
`````tsx
import React, { useRef, useState } from 'react';
import { CheckCircle2, FileUp, Globe2, Loader2, MapPin, Sparkles, UploadCloud, X } from 'lucide-react';
import { useStore } from '../store';
import { cx } from '../lib/util';

const FALLBACK_OPTIONS = [
  { id: 'uae', label: 'Dubai / UAE' }, { id: 'singapore', label: 'Singapore' }, { id: 'canada', label: 'Canada' }, { id: 'uk', label: 'United Kingdom' },
  { id: 'usa', label: 'United States' }, { id: 'germany', label: 'Germany' }, { id: 'netherlands', label: 'Netherlands' }, { id: 'ireland', label: 'Ireland' },
  { id: 'australia', label: 'Australia' }, { id: 'saudi', label: 'Saudi Arabia' }, { id: 'qatar', label: 'Qatar' },
];

/** Resume upload: parses the resume on the server, builds the profile, then starts a live scrape. */
export function UploadResume({ onDone, onCancel, compact }: { onDone?: () => void; onCancel?: () => void; compact?: boolean }) {
  const { uploadResume, marketOptions, online, toast, profile } = useStore();
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [reloc, setReloc] = useState<string[]>(() => (profile?.markets || []).filter((m) => m.kind === 'Relocation' && !m.noSearch).map((m) => m.id).filter((id) => FALLBACK_OPTIONS.some((o) => o.id === id)));
  const [remote, setRemote] = useState(true);
  const [ai, setAi] = useState(true);
  const [recency, setRecency] = useState(30);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const opts = marketOptions.length ? marketOptions : FALLBACK_OPTIONS;

  const pick = (f?: File | null) => { if (!f) return; if (!/\.(pdf|docx|txt|md)$/i.test(f.name)) { setErr('Please upload a PDF, DOCX or TXT resume.'); return; } setErr(''); setFile(f); };
  const go = async () => {
    if (!file) return;
    setBusy(true); setErr('');
    try {
      const d = await uploadResume(file, { relocation: reloc, remote, ai, recency });
      toast({ kind: 'good', title: `Profile built for ${d.profile.name}`, body: `${d.profile.skills.filter((s) => s.core).length} core skills · ${d.profile.targetTitles.length} target titles. Scraping jobs now…` });
      onDone?.();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div className={cx('upload', compact && 'compact')}>
      {onCancel && <button className="icon-btn up-close" onClick={onCancel}><X size={18} /></button>}
      {!compact && (
        <div className="up-hero">
          <span className="eyebrow"><Sparkles size={14} />JobPilot CRM</span>
          <h2>Upload your resume.<br />Get a live job CRM in minutes.</h2>
          <p>Your resume is parsed locally into a profile (skills, proof points, target titles). JobPilot then scrapes LinkedIn, TinyFish and remote job boards, and scores every job against you in real time.</p>
          <ul className="up-steps">
            <li><CheckCircle2 size={16} />Parse resume → skills, titles, achievements</li>
            <li><CheckCircle2 size={16} />Scrape matching jobs across your markets</li>
            <li><CheckCircle2 size={16} />Score, prioritise and auto-draft outreach</li>
          </ul>
        </div>
      )}
      <div className="up-card">
        <h3>{compact ? 'Upload a new or updated resume' : 'Your resume'}</h3>
        <div className={cx('drop', drag && 'drag', file && 'has')} onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}>
          <input ref={input} type="file" accept=".pdf,.docx,.txt,.md" hidden onChange={(e) => pick(e.target.files?.[0])} />
          {file ? <><FileUp size={30} /><b>{file.name}</b><span>{(file.size / 1024).toFixed(0)} KB · click to change</span></>
            : <><UploadCloud size={34} /><b>Drop your resume here</b><span>PDF, DOCX or TXT · or click to browse</span></>}
        </div>
        <h5><Globe2 size={14} />Markets</h5>
        <div className="up-row">
          <label className={cx('pill', 'on', 'fixed')}><MapPin size={13} />Your city (from resume)</label>
          <label className={cx('pill', remote && 'on')}><input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} />Remote</label>
          <label className={cx('pill', ai && 'on')}><input type="checkbox" checked={ai} onChange={(e) => setAi(e.target.checked)} />Include AI-adjacent roles</label>
        </div>
        <h5>Open to relocating to</h5>
        <div className="up-row">
          {opts.map((o) => (
            <label key={o.id} className={cx('pill', reloc.includes(o.id) && 'on')}>
              <input type="checkbox" checked={reloc.includes(o.id)} onChange={(e) => setReloc(e.target.checked ? [...reloc, o.id] : reloc.filter((x) => x !== o.id))} />{o.label}
            </label>
          ))}
        </div>
        <h5>Recency window</h5>
        <div className="seg">{[7, 14, 30].map((d) => <button key={d} className={cx(recency === d && 'on')} onClick={() => setRecency(d)}>Last {d} days</button>)}</div>
        {compact && profile && <p className="muted small">If this resume belongs to someone else, the current CRM is archived to data/archive and a fresh one is built. If it's the same person, the pipeline is kept and every job is re-scored.</p>}
        {err && <p className="err-msg">{err}</p>}
        {!online && <p className="err-msg">The local server is offline. Run start.bat (Windows) or ./start.sh (Mac/Linux), and this page reconnects automatically.</p>}
        <button className="btn-primary big" disabled={!file || busy || !online} onClick={go}>
          {busy ? <><Loader2 size={17} className="spin" />Reading resume…</> : <><Sparkles size={17} />Build my CRM & scrape jobs</>}
        </button>
      </div>
    </div>
  );
}
`````

### File: app/src/components/charts.tsx
`````tsx
import React from 'react';

// Hand-rolled SVG charts (no chart library): ring, donut, bars, funnel, columns.

export function Ring({ value, max = 100, size = 120, stroke = 12, color = 'var(--accent)', label, sub }: { value: number; max?: number; size?: number; stroke?: number; color?: string; label?: React.ReactNode; sub?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="ring-arc" />
      </svg>
      <div className="ring-label"><b>{label ?? Math.round(value)}</b>{sub && <span>{sub}</span>}</div>
    </div>
  );
}

export interface Slice { label: string; value: number; color: string }

export function Donut({ data, size = 170, stroke = 26, center }: { data: Slice[]; size?: number; stroke?: number; center?: React.ReactNode }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="donut-wrap">
      <div className="ring" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
          {data.filter((d) => d.value > 0).map((d) => {
            const len = (d.value / total) * c;
            const el = <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-off} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="ring-arc"><title>{`${d.label}: ${d.value}`}</title></circle>;
            off += len; return el;
          })}
        </svg>
        <div className="ring-label">{center ?? <><b>{total}</b><span>total</span></>}</div>
      </div>
      <ul className="legend">
        {data.map((d) => <li key={d.label}><i style={{ background: d.color }} />{d.label}<b>{d.value}</b><em>{Math.round((d.value / total) * 100)}%</em></li>)}
      </ul>
    </div>
  );
}

export function HBars({ data, max, suffix = '', onClick }: { data: { label: string; value: number; color?: string; hint?: string }[]; max?: number; suffix?: string; onClick?: (label: string) => void }) {
  const m = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="hbars">
      {data.map((d, i) => (
        <div key={d.label} className={onClick ? 'hbar click' : 'hbar'} onClick={() => onClick?.(d.label)} title={d.hint}>
          <span className="hbar-l">{d.label}</span>
          <div className="hbar-t"><div className="hbar-f" style={{ width: `${(d.value / m) * 100}%`, background: d.color || 'linear-gradient(90deg,var(--accent),var(--accent-2))', animationDelay: `${i * 50}ms` }} /></div>
          <b>{d.value}{suffix}</b>
        </div>
      ))}
    </div>
  );
}

export function Funnel({ data }: { data: { label: string; value: number }[] }) {
  const m = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="funnel">
      {data.map((d, i) => {
        const w = 28 + (d.value / m) * 72;
        return (
          <div key={d.label} className="funnel-row">
            <div className="funnel-bar" style={{ width: `${w}%`, opacity: 1 - i * 0.1, animationDelay: `${i * 70}ms` }}><span>{d.label}</span><b>{d.value}</b></div>
          </div>
        );
      })}
    </div>
  );
}

export function Columns({ data, height = 140, color = 'var(--accent)' }: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  const m = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="cols" style={{ height }}>
      {data.map((d, i) => (
        <div className="col" key={d.label + i} title={`${d.label}: ${d.value}`}>
          <div className="col-b" style={{ height: `${(d.value / m) * 100}%`, background: color, animationDelay: `${i * 25}ms` }}>{d.value > 0 && <em>{d.value}</em>}</div>
          <span>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Spark({ values, w = 110, h = 34, color = 'var(--accent)' }: { values: number[]; w?: number; h?: number; color?: string }) {
  if (values.length < 2) return null;
  const m = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / m) * (h - 4) - 2}`).join(' ');
  return (
    <svg width={w} height={h} className="spark">
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity="0.12" stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
`````

### File: app/src/components/ui.tsx
`````tsx
import React, { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Sparkles, Star } from 'lucide-react';
import type { Job } from '../types';
import { copyOrPrompt, cx, hashHue, initials, openJobUrl, prColor, timeAgo } from '../lib/util';
import { useStore } from '../store';

export function Logo({ job, size = 40 }: { job: Pick<Job, 'company' | 'logo'>; size?: number }) {
  const [bad, setBad] = useState(false);
  const hue = hashHue(job.company || '?');
  if (job.logo && !bad) return <img className="logo" src={job.logo} alt="" width={size} height={size} onError={() => setBad(true)} referrerPolicy="no-referrer" loading="lazy" />;
  return <div className="logo logo-fallback" style={{ width: size, height: size, background: `linear-gradient(135deg,hsl(${hue} 70% 55%),hsl(${(hue + 40) % 360} 70% 42%))`, fontSize: size * 0.36 }}>{initials(job.company || '?')}</div>;
}

export function Score({ job, size = 'md' }: { job: Pick<Job, 'match' | 'priority'>; size?: 'sm' | 'md' }) {
  return (
    <div className={cx('score', size)} style={{ ['--c' as any]: prColor(job.priority) }} title={`Match ${job.match}/100 · Priority ${job.priority}`}>
      <b>{job.match}</b><span>{job.priority}</span>
    </div>
  );
}

export function Chip({ children, tone, icon }: { children: React.ReactNode; tone?: 'ai' | 'new' | 'good' | 'warn' | 'muted' | 'accent'; icon?: React.ReactNode }) {
  return <span className={cx('chip', tone && `chip-${tone}`)}>{icon}{children}</span>;
}

export function ApplyButton({ url, label = 'APPLY', big }: { url: string; label?: string; big?: boolean }) {
  return (
    <button className={cx('btn-apply', big && 'big')} onClick={(e) => { e.stopPropagation(); openJobUrl(url); }} disabled={!url}>
      {label} <ExternalLink size={big ? 16 : 14} />
    </button>
  );
}

export function CopyButton({ text, label = 'Copy', compact, className }: { text: string | (() => string); label?: string; compact?: boolean; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className={cx('btn-copy', compact && 'compact', done && 'done', className)} onClick={async (e) => {
      e.stopPropagation();
      await copyOrPrompt(typeof text === 'function' ? text() : text);
      setDone(true); setTimeout(() => setDone(false), 1600);
    }}>
      {done ? <Check size={14} /> : <Copy size={14} />}{!compact && <span>{done ? 'Copied!' : label}</span>}
    </button>
  );
}

export function JobRow({ job, dense }: { job: Job; dense?: boolean }) {
  const { openJob, patchJob, now, lastSeen } = useStore();
  const fresh = job.firstSeenAt > lastSeen && lastSeen > '1971';
  return (
    <div className={cx('job-row', dense && 'dense', fresh && 'is-new')} onClick={() => openJob(job.uid)}>
      <Logo job={job} size={dense ? 34 : 42} />
      <div className="job-main">
        <div className="job-title">
          <span className="code">{job.code}</span>
          <span className="t">{job.title}</span>
          {fresh && <Chip tone="new">NEW</Chip>}
        </div>
        <div className="job-sub">
          <b>{job.company}</b><span className="dot">•</span>{job.location || job.market}<span className="dot">•</span>
          <span title={job.postedAt}>{timeAgo(job.postedAt, now)}</span>
        </div>
        {!dense && (
          <div className="job-chips">
            <Chip tone="accent">{job.market}</Chip>
            <Chip>{job.workMode}</Chip>
            {job.aiFlag && <Chip tone="ai" icon={<Sparkles size={11} />}>AI</Chip>}
            <Chip tone="muted">{job.source}</Chip>
            {job.stage && job.stage !== 'New' && <Chip tone="good">{job.stage}</Chip>}
          </div>
        )}
      </div>
      <button className={cx('star', job.starred && 'on')} onClick={(e) => { e.stopPropagation(); patchJob(job.uid, { starred: !job.starred }); }} title="Star"><Star size={16} /></button>
      <Score job={job} size={dense ? 'sm' : 'md'} />
      <div className="job-actions">
        <ApplyButton url={job.url} />
        <CopyButton text={job.url} compact={dense} />
      </div>
    </div>
  );
}

export function CountUp({ value, dur = 900 }: { value: number; dur?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const s = performance.now(); const from = v;
    const tick = (t: number) => { const k = Math.min(1, (t - s) / dur); setV(Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{v}</>;
}

export function Empty({ icon, title, body, action }: { icon: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return <div className="empty">{icon}<h4>{title}</h4>{body && <p>{body}</p>}{action}</div>;
}

export function Section({ title, sub, right, children, className }: { title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx('card', className)}>
      <header className="card-h"><div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>{right}</header>
      {children}
    </section>
  );
}
`````

### File: app/src/lib/drafts.ts
`````ts
import type { Job, Profile } from '../types';

// All drafts are generated from the candidate profile (data/profile.json) + the specific job.
const sig = (P: Profile) => [P.name, [P.phone, P.email].filter(Boolean).join(' · '), P.linkedin].filter(Boolean).join('\n');
const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, '');
export const versionOf = (P: Profile, id: string) => P.resumeVersions.find((v) => v.id === id) || P.resumeVersions[0] || { id: 'main', name: 'Main resume', focus: '', bestFor: '', file: 'main' };
export const resumeFileOf = (P: Profile, id: string) => P.resumeFiles[versionOf(P, id).file] || Object.values(P.resumeFiles)[0];

function proofs(P: Profile, job: Job, n = 3) {
  const byLabel = (l: string) => P.skills.find((s) => s.label === l);
  const picked = (job.matchedSkills || []).map(byLabel).filter((s) => s && s.proof);
  const rest = P.skills.filter((s) => s.proof && s.core && !picked.includes(s));
  return [...picked, ...rest].slice(0, n).map((s) => s!.proof);
}
const skillsLine = (P: Profile, job: Job) => (job.matchedSkills?.length ? job.matchedSkills.slice(0, 4) : P.topSkills.slice(0, 4)).join(', ');
const where = (P: Profile, job: Job) => job.marketKind === 'Relocation' ? `ready to relocate to ${job.market}` : job.marketKind === 'Remote' ? 'set up for remote work across time zones' : `based in ${P.city}`;

export function coverLetter(job: Job, P: Profile) {
  const pr = proofs(P, job, 3);
  return `Dear Hiring Team at ${job.company},

I'm applying for the ${job.title} role. I bring ${P.yearsLabel} of experience as ${P.headline.split(/[|•]/)[0].trim()}${P.experience[0] ? `, most recently as ${P.experience[0].role}${P.experience[0].company ? ` at ${P.experience[0].company}` : ''}` : ''}.

What I would bring to ${job.company}:
${pr.map((p) => `• ${p.replace(/\.$/, '')}.`).join('\n')}

Your posting stresses ${skillsLine(P, job)}. That is work I have done hands-on${P.certifications.length ? `, backed by certifications including ${P.certifications.slice(0, 3).join(', ')}` : ''}.

I'm ${lc(P.availability)} and ${where(P, job)}. I'd welcome a conversation about how I can deliver the same results for your team.

Warm regards,
${sig(P)}`;
}

export function recruiterEmail(job: Job, P: Profile) {
  const pr = proofs(P, job, 2);
  return `Subject: ${job.title} – ${P.name} (${P.yearsLabel}, ${P.topSkills.slice(0, 2).join(' / ')})

Hi {{Recruiter name}},

I saw ${job.company}'s opening for ${job.title} and I'm a strong fit:
• ${P.yearsLabel} in ${P.topSkills.slice(0, 3).join(', ')}
${pr.map((p) => `• ${p.replace(/\.$/, '')}`).join('\n')}
${P.certifications.length ? `• Certified: ${P.certifications.slice(0, 3).join(' · ')}\n` : ''}
${P.availability}${job.marketKind === 'Relocation' ? ` and open to relocating to ${job.market}` : ''}. My resume is attached. Could we set up a 15-minute call this week?

Posting: ${job.url}

Thanks,
${sig(P)}`;
}

export const linkedinDM = (job: Job, P: Profile) =>
  `Hi {{Name}}, I noticed ${job.company} is hiring a ${job.title}. I have ${P.yearsLabel} in ${P.topSkills.slice(0, 3).join(', ')}${P.experience[0]?.company ? ` (most recently ${P.experience[0].company})` : ''}. Would you be open to a quick chat, or could you point me to the hiring manager? Thanks! – ${P.firstName}`;

export function followUp(job: Job, P: Profile) {
  return `Subject: Following up – ${job.title} application

Hi {{Name}},

I applied for the ${job.title} role at ${job.company} on {{date}} and wanted to follow up. I remain very interested, especially because the role focuses on ${skillsLine(P, job)}.

One quick highlight: ${proofs(P, job, 1)[0] || P.topSkills[0]}.

Happy to share more or work around your schedule for a conversation.

Best,
${sig(P)}`;
}

export const referralAsk = (job: Job, P: Profile) =>
  `Hi {{Name}}, hope you're doing well! I'm applying for the ${job.title} role at ${job.company} (${job.url}). With ${P.yearsLabel} in ${P.topSkills.slice(0, 2).join(' and ')}, it's a close fit. Would you be comfortable referring me or introducing me to the hiring manager? I can send my resume and a short blurb to make it easy. Thanks so much! – ${P.firstName}`;

export function thankYou(job: Job, P: Profile) {
  return `Subject: Thank you – ${job.title} interview

Hi {{Interviewer}},

Thank you for your time today discussing the ${job.title} role. I enjoyed learning about {{topic you discussed}}, and it confirmed my interest in helping ${job.company} with ${skillsLine(P, job)}.

As I mentioned: ${proofs(P, job, 1)[0] || P.topSkills[0]}. I'd love to bring that same approach to your team.

Looking forward to next steps.

Best regards,
${sig(P)}`;
}

export function interviewPrep(job: Job, P: Profile) {
  const pr = proofs(P, job, 2);
  const stories = (P.stories || []).slice(0, 4).map((x, i) => x.s
    ? `${i + 1}. ${x.q}\n   S: ${x.s}\n   T: ${x.t}\n   A: ${x.a}\n   R: ${x.r}`
    : `${i + 1}. "Tell me about a time you delivered impact in ${x.group}."\n   Story: ${x.bullet}\n   Frame it as Situation → Task → Action → Result, and end on the number.`);
  return `INTERVIEW PREP · ${job.title} @ ${job.company}

60-SECOND PITCH
"I'm a ${P.headline.split(/[|•]/)[0].trim()} with ${P.yearsLabel}. ${pr.map((p) => p.replace(/\.$/, '')).join('. ')}. I'm excited about ${job.company} because this role centers on ${skillsLine(P, job)}."

LIKELY QUESTIONS
${(job.matchedSkills?.length ? job.matchedSkills : P.topSkills).slice(0, 5).map((s) => `• Walk through how you'd apply ${s} at ${job.company}'s scale.`).join('\n')}
• Tell us about a failure, and what you changed afterwards.
• How do you prioritize when everything is urgent?

STAR STORIES
${stories.join('\n\n') || '• Pick three resume bullets that end in a number and rehearse them as STAR stories.'}

GAPS TO ADDRESS
${(job.gaps || []).map((g) => `• ${g}`).join('\n')}

QUESTIONS TO ASK THEM
• What does success look like in the first 90 days for this ${job.title}?
• Which metrics does leadership use to judge this team?
• What's the biggest challenge the team is facing this quarter?
• How is the team structured, and who would I work with most closely?
• What does the interview process look like from here?`;
}

export function salaryGuide(job: Job, P: Profile) {
  const g = P.salary?.[job.marketKind === 'Relocation' ? job.market : job.marketKind];
  const lead = /lead|senior|architect|principal|manager|specialist/i.test(job.title);
  if (g) return `SALARY GUIDANCE · ${job.title} (${job.market})

Target range: ${g.range}
${lead ? `Senior/lead title, so aim for the top of the range or the stretch: ${g.stretch}` : `Stretch: ${g.stretch}`}

Notes: ${g.note}

Negotiation script:
"Based on my ${P.yearsLabel} and the results I've delivered, I'm targeting ${g.range.split('(')[0].trim()}. I'm flexible on structure: base, joining bonus and learning budget."

${job.salary ? `Posted salary info: ${job.salary}\n` : ''}These are estimates. Verify against Glassdoor, Levels.fyi or AmbitionBox for ${job.company}.`;
  return `SALARY GUIDANCE · ${job.title} (${job.market})

${job.salary ? `Posted salary info: ${job.salary}\n\n` : ''}1. Look up the band for "${job.title}" at ${job.company} on Glassdoor, Levels.fyi, LinkedIn Salary${/india/i.test(P.country) ? ' and AmbitionBox' : ''}.
2. With ${P.yearsLabel}${lead ? ' and a senior/lead title' : ''}, anchor at the 75th percentile of that band.
3. ${job.marketKind === 'Relocation' ? `For ${job.market}, ask for relocation, housing and visa support on top of base.` : job.marketKind === 'Remote' ? 'Remote roles often pay by location band. Ask which band applies before naming a number.' : 'Ask about variable pay, joining bonus and notice-period buyout.'}

Negotiation script:
"Based on my ${P.yearsLabel} and results like ${lc(proofs(P, job, 1)[0] || P.topSkills[0])}, I'm targeting {{number}}. I'm flexible on structure."

Tip: add a curated "salary" map to data/profile.json to get market-specific ranges here.`;
}

export const DRAFTS: { id: string; label: string; fn: (j: Job, p: Profile) => string }[] = [
  { id: 'cover', label: 'Cover letter', fn: coverLetter },
  { id: 'email', label: 'Recruiter email', fn: recruiterEmail },
  { id: 'dm', label: 'LinkedIn DM', fn: linkedinDM },
  { id: 'follow', label: 'Follow-up', fn: followUp },
  { id: 'referral', label: 'Referral ask', fn: referralAsk },
  { id: 'thanks', label: 'Thank-you note', fn: thankYou },
  { id: 'prep', label: 'Interview prep', fn: interviewPrep },
  { id: 'salary', label: 'Salary guidance', fn: salaryGuide },
];

export const shareSnippet = (j: Job) => `${j.title} @ ${j.company} (${j.location || j.market})\nMatch ${j.match}/100 · Priority ${j.priority}\nApply: ${j.url}`;
`````

### File: app/src/lib/themes.ts
`````ts
// Themes: the JobPilot default (from the skill spec) plus the 10 theme-factory palettes.
export interface Theme {
  id: string; name: string; dark?: boolean; head: string; body: string;
  sidebar: string; sidebar2: string; bg: string; surface: string; surface2: string;
  text: string; muted: string; border: string; accent: string; accent2: string; onAccent: string;
  swatch: string[];
}

const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const SORA = "'Sora', 'IBM Plex Sans', sans-serif";
const SERIF = "'Fraunces', Georgia, serif";
const GROTESK = "'Space Grotesk', 'IBM Plex Sans', sans-serif";

export const THEMES: Theme[] = [
  { id: 'jobpilot', name: 'JobPilot Navy', head: SORA, body: SANS, sidebar: '#0b1830', sidebar2: '#12233f', bg: '#f0f4f8', surface: '#ffffff', surface2: '#f6f8fb', text: '#0f1b2d', muted: '#5b6b82', border: '#e2e8f0', accent: '#2b6cf6', accent2: '#06b6d4', onAccent: '#fff', swatch: ['#0b1830', '#2b6cf6', '#06b6d4', '#f0f4f8'] },
  { id: 'ocean', name: 'Ocean Depths', head: SORA, body: SANS, sidebar: '#1a2332', sidebar2: '#22324a', bg: '#eef5f3', surface: '#ffffff', surface2: '#f4faf8', text: '#152029', muted: '#557078', border: '#d6e6e3', accent: '#2d8b8b', accent2: '#a8dadc', onAccent: '#fff', swatch: ['#1a2332', '#2d8b8b', '#a8dadc', '#f1faee'] },
  { id: 'sunset', name: 'Sunset Boulevard', head: SERIF, body: SANS, sidebar: '#264653', sidebar2: '#2f5866', bg: '#fbf3ea', surface: '#fffdf9', surface2: '#fcf6ef', text: '#1f2d33', muted: '#6b6b63', border: '#efdfcc', accent: '#e76f51', accent2: '#f4a261', onAccent: '#fff', swatch: ['#264653', '#e76f51', '#f4a261', '#e9c46a'] },
  { id: 'forest', name: 'Forest Canopy', head: SERIF, body: SANS, sidebar: '#1f331e', sidebar2: '#2d4a2b', bg: '#f4f3ee', surface: '#faf9f6', surface2: '#f1f0e9', text: '#1f2a1e', muted: '#6a7160', border: '#dfe0d3', accent: '#4f7a3a', accent2: '#a4ac86', onAccent: '#fff', swatch: ['#2d4a2b', '#7d8471', '#a4ac86', '#faf9f6'] },
  { id: 'minimal', name: 'Modern Minimalist', head: SORA, body: SANS, sidebar: '#36454f', sidebar2: '#43535e', bg: '#f3f4f5', surface: '#ffffff', surface2: '#f7f8f9', text: '#1f2a30', muted: '#708090', border: '#dcdfe2', accent: '#36454f', accent2: '#708090', onAccent: '#fff', swatch: ['#36454f', '#708090', '#d3d3d3', '#ffffff'] },
  { id: 'golden', name: 'Golden Hour', head: SORA, body: SANS, sidebar: '#4a403a', sidebar2: '#5a4e46', bg: '#f8f2e9', surface: '#fffcf7', surface2: '#fbf5ec', text: '#2e2723', muted: '#7a6c60', border: '#eadcc8', accent: '#c98b00', accent2: '#c1666b', onAccent: '#fff', swatch: ['#4a403a', '#f4a900', '#c1666b', '#d4b896'] },
  { id: 'arctic', name: 'Arctic Frost', head: SORA, body: SANS, sidebar: '#24364f', sidebar2: '#2e4463', bg: '#eef3f9', surface: '#fafafa', surface2: '#f2f6fb', text: '#18253a', muted: '#5f708a', border: '#d4e0ee', accent: '#4a6fa5', accent2: '#8fb3e0', onAccent: '#fff', swatch: ['#4a6fa5', '#d4e4f7', '#c0c0c0', '#fafafa'] },
  { id: 'desert', name: 'Desert Rose', head: SORA, body: SANS, sidebar: '#5d2e46', sidebar2: '#6d3a54', bg: '#f7efe9', surface: '#fffaf6', surface2: '#faf2ec', text: '#34202a', muted: '#86666f', border: '#ead8cc', accent: '#b0665a', accent2: '#d4a5a5', onAccent: '#fff', swatch: ['#5d2e46', '#b87d6d', '#d4a5a5', '#e8d5c4'] },
  { id: 'tech', name: 'Tech Innovation', dark: true, head: GROTESK, body: SANS, sidebar: '#0d0d0f', sidebar2: '#141418', bg: '#16161a', surface: '#1e1e22', surface2: '#25252b', text: '#f2f5f9', muted: '#9aa3b2', border: '#2e2f36', accent: '#1f6fff', accent2: '#00e5ff', onAccent: '#fff', swatch: ['#1e1e1e', '#0066ff', '#00ffff', '#ffffff'] },
  { id: 'botanical', name: 'Botanical Garden', head: SERIF, body: SANS, sidebar: '#2b4633', sidebar2: '#355640', bg: '#f5f3ed', surface: '#fffdf8', surface2: '#f8f5ee', text: '#1f2b22', muted: '#6c7465', border: '#e3dfd2', accent: '#4a7c59', accent2: '#f9a620', onAccent: '#fff', swatch: ['#4a7c59', '#f9a620', '#b7472a', '#f5f3ed'] },
  { id: 'galaxy', name: 'Midnight Galaxy', dark: true, head: GROTESK, body: SANS, sidebar: '#150e22', sidebar2: '#1f1533', bg: '#1d1530', surface: '#271d3d', surface2: '#2f2449', text: '#ecebfa', muted: '#a79fc4', border: '#3a2f55', accent: '#8f7ae0', accent2: '#e6a8ff', onAccent: '#fff', swatch: ['#2b1e3e', '#4a4e8f', '#a490c2', '#e6e6fa'] },
];

export function applyTheme(t: Theme) {
  const r = document.documentElement.style;
  const set = (k: string, v: string) => r.setProperty(k, v);
  set('--font-head', t.head); set('--font-body', t.body);
  set('--sidebar', t.sidebar); set('--sidebar-2', t.sidebar2); set('--bg', t.bg); set('--surface', t.surface); set('--surface-2', t.surface2);
  set('--text', t.text); set('--muted', t.muted); set('--border', t.border); set('--accent', t.accent); set('--accent-2', t.accent2); set('--on-accent', t.onAccent);
  document.documentElement.dataset.dark = t.dark ? '1' : '0';
}
`````

### File: app/src/lib/util.ts
`````ts
// Links + clipboard helpers that work even from file:// (see skill spec).
export function openJobUrl(url: string) {
  const w = window.open(url, '_blank', 'noopener');
  if (!w) window.location.href = url;
}

export function copyText(txt: string): Promise<boolean> {
  return new Promise((res) => {
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.focus(); ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta); res(ok);
      } catch { res(false); }
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(() => res(true)).catch(fallback);
    else fallback();
  });
}

/** Copy with the guaranteed prompt() fallback; returns true if copied silently. */
export async function copyOrPrompt(txt: string) {
  const ok = await copyText(txt);
  if (!ok) window.prompt('Copy this (Ctrl+C):', txt);
  return ok;
}

export function timeAgo(iso?: string | null, now = Date.now()) {
  if (!iso) return '—';
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  const d = Math.round(s / 86400);
  if (d < 30) return `${d}d ago`;
  return `${Math.round(d / 30)}mo ago`;
}
export const ageHours = (iso?: string) => (iso ? (Date.now() - Date.parse(iso)) / 36e5 : 1e9);

export function hashHue(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; }
export const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
export const shortUrl = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '');
export const prColor = (p: string) => ({ A: 'var(--good)', B: 'var(--accent)', C: 'var(--warn)', D: 'var(--bad)' } as Record<string, string>)[p] || 'var(--muted)';
`````

### File: app/src/main.tsx
`````tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App />);
`````

### File: app/src/pages/AddJob.tsx
`````tsx
import React, { useMemo, useState } from 'react';
import { Wand2 } from 'lucide-react';
import { scoreJob } from '../../../shared/scoring.js';
import { useStore } from '../store';
import { Ring } from '../components/charts';
import { Section } from '../components/ui';
import { prColor } from '../lib/util';

export function AddJob() {
  const { addJob, settings, openJob, toast, profile } = useStore();
  const markets = settings?.markets || profile?.markets || [];
  const [f, setF] = useState({ title: '', company: '', url: '', location: '', marketId: 'local', description: '' });
  const market = markets.find((m: any) => m.id === f.marketId) || markets[0];
  const live = useMemo(() => (f.title && profile && market ? scoreJob(f, market, profile) : null), [f, market, profile]);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="page">
      <div className="grid-2 top addjob">
        <Section title="Add a job" sub={`Paste any job description. It is scored live against ${profile?.firstName || 'your'}'s profile`}>
          <div className="form">
            <label><span>Job title *</span><input value={f.title} onChange={set('title')} placeholder="e.g. Senior Engineer" /></label>
            <label><span>Company *</span><input value={f.company} onChange={set('company')} placeholder="e.g. Microsoft" /></label>
            <label><span>Posting URL</span><input value={f.url} onChange={set('url')} placeholder="https://…" /></label>
            <label><span>Location</span><input value={f.location} onChange={set('location')} placeholder="City / Remote" /></label>
            <label><span>Market</span><select value={f.marketId} onChange={set('marketId')}>{markets.map((m: any) => <option key={m.id} value={m.id}>{m.label} ({m.kind})</option>)}</select></label>
            <label className="full"><span>Job description</span><textarea rows={12} value={f.description} onChange={set('description')} placeholder="Paste the full JD here…" /></label>
            <div className="full row-end">
              <button className="btn-primary" disabled={!f.title || !f.company} onClick={async () => {
                const j = await addJob(f as any);
                toast({ kind: 'good', title: `Added ${j.code}: match ${j.match}`, body: `${j.title} @ ${j.company}` });
                setF({ ...f, title: '', company: '', url: '', description: '' });
                openJob(j.uid);
              }}><Wand2 size={16} />Score & add to CRM</button>
            </div>
          </div>
        </Section>
        <Section title="Live score preview">
          {!live ? <p className="muted">Start typing a title to see the score.</p> : (
            <div className="preview">
              <Ring value={live.match} size={150} stroke={13} color={prColor(live.priority)} sub={`Priority ${live.priority}`} />
              <div className="breakdown">
                {Object.entries(live.breakdown).map(([k, v]) => (
                  <div key={k} className="bd"><span>{k}</span><div className="bd-t"><div style={{ width: `${((v as number) / ({ skills: 25, experience: 25, domain: 15, tools: 15, seniority: 10, location: 5, keyword: 5 } as any)[k]) * 100}%` }} /></div><b>{v as number}</b></div>
                ))}
              </div>
              <p className="why small">{live.whyMatch}</p>
              {!!live.matchedKeywords.length && <div className="kw">{live.matchedKeywords.map((k: string) => <span key={k}>{k}</span>)}</div>}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
`````

### File: app/src/pages/Analytics.tsx
`````tsx
import React, { useMemo } from 'react';
import { useStore } from '../store';
import { Columns, Donut, HBars, Ring } from '../components/charts';
import { Section } from '../components/ui';

const PAL = ['#2b6cf6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#64748b', '#14b8a6'];

export function Analytics({ onFilter }: { onFilter: (f: any) => void }) {
  const { jobs } = useStore();
  const a = useMemo(() => {
    const cnt = (k: (j: any) => string) => { const m: Record<string, number> = {}; for (const j of jobs) { const v = k(j); m[v] = (m[v] || 0) + 1; } return Object.entries(m).sort((x, y) => y[1] - x[1]); };
    const avg = (k: string) => (jobs.length ? Math.round(jobs.reduce((s, j: any) => s + j[k], 0) / jobs.length) : 0);
    const bins = Array.from({ length: 10 }, (_, i) => ({ label: `${i * 10}`, value: jobs.filter((j) => Math.min(9, Math.floor(j.match / 10)) === i).length })).slice(3);
    const top = [...jobs].filter((j) => j.priority === 'A' || j.priority === 'B');
    const comp = cnt((j) => j.company).slice(0, 10);
    const bd = ['skills', 'experience', 'domain', 'tools', 'seniority', 'location', 'keyword'].map((k) => ({ label: k, value: jobs.length ? Math.round(jobs.reduce((s, j: any) => s + (j.breakdown?.[k] || 0), 0) / jobs.length) : 0 }));
    return {
      pr: cnt((j) => j.priority).sort(), market: cnt((j) => j.market), mode: cnt((j) => j.workMode), source: cnt((j) => j.source),
      family: cnt((j) => j.family), comp, bins, bd,
      sl: avg('shortlistProb'), iv: avg('interviewProb'), of: avg('offerProb'), ats: avg('ats'),
      topAvg: top.length ? Math.round(top.reduce((s, j) => s + j.interviewProb, 0) / top.length) : 0,
    };
  }, [jobs]);
  const prCol: Record<string, string> = { A: '#10b981', B: '#2b6cf6', C: '#f59e0b', D: '#ef4444' };

  return (
    <div className="page analytics">
      <div className="probs big card">
        {[['Avg ATS', a.ats, 'var(--accent-2)'], ['Shortlist', a.sl, 'var(--accent)'], ['Interview', a.iv, '#8b5cf6'], ['Offer', a.of, '#10b981'], ['Interview (A/B only)', a.topAvg, '#f59e0b']].map(([l, v, c]) => (
          <div key={l as string}><Ring value={v as number} size={110} stroke={10} color={c as string} label={`${v}%`} /><span>{l}</span></div>
        ))}
      </div>
      <div className="grid-3">
        <Section title="Priority mix"><Donut data={a.pr.map(([k, v]) => ({ label: `Priority ${k}`, value: v, color: prCol[k] }))} /></Section>
        <Section title="Market split"><Donut data={a.market.map(([k, v], i) => ({ label: k, value: v, color: PAL[i % PAL.length] }))} /></Section>
        <Section title="Work mode"><Donut data={a.mode.map(([k, v], i) => ({ label: k, value: v, color: PAL[(i + 2) % PAL.length] }))} /></Section>
      </div>
      <div className="grid-2">
        <Section title="Top hiring companies" sub="Click to filter the Job Board"><HBars data={a.comp.map(([k, v]) => ({ label: k, value: v }))} onClick={(c) => onFilter({ q: c })} /></Section>
        <Section title="Match score distribution"><Columns data={a.bins} /></Section>
      </div>
      <div className="grid-3">
        <Section title="Role families"><HBars data={a.family.map(([k, v]) => ({ label: k, value: v }))} /></Section>
        <Section title="Sources"><HBars data={a.source.map(([k, v], i) => ({ label: k, value: v, color: PAL[i % PAL.length] }))} /></Section>
        <Section title="Avg score by category"><HBars data={a.bd} max={25} /></Section>
      </div>
    </div>
  );
}
`````

### File: app/src/pages/Contacts.tsx
`````tsx
import React, { useMemo, useState } from 'react';
import { Mail, Linkedin, Phone, Plus, Trash2, UserRound } from 'lucide-react';
import { useStore } from '../store';
import type { Contact } from '../types';
import { DRAFTS } from '../lib/drafts';
import { CopyButton, Empty, Section } from '../components/ui';
import { cx } from '../lib/util';

const blank = (): Contact => ({ id: String(Date.now()), name: '', company: '', role: 'Recruiter', email: '', linkedin: '', phone: '', lastContact: new Date().toISOString().slice(0, 10), notes: '' });

export function Contacts() {
  const { jobs, contacts, saveContacts, profile } = useStore();
  const targets = useMemo(() => jobs.filter((j) => j.stage !== 'Rejected').sort((a, b) => (b.stage !== 'New' ? 1 : 0) - (a.stage !== 'New' ? 1 : 0) || b.match - a.match).slice(0, 80), [jobs]);
  const [uid, setUid] = useState(targets[0]?.uid || '');
  const [tpl, setTpl] = useState('email');
  const [form, setForm] = useState<Contact | null>(null);
  const job = jobs.find((j) => j.uid === uid) || targets[0];
  const d = DRAFTS.find((x) => x.id === tpl)!;
  const contact = contacts.find((c) => c.jobUid === job?.uid) || contacts.find((c) => job && c.company.toLowerCase() === job.company.toLowerCase());
  const text = job && profile ? d.fn(job, profile).replace(/\{\{(Recruiter name|Name|Interviewer)\}\}/g, contact?.name?.split(' ')[0] || '$&') : '';

  return (
    <div className="page">
      <div className="grid-2 top">
        <Section title="Outreach studio" sub="Pick a job and a template. Everything is pre-filled with your profile and the role">
          {!job ? <Empty icon={<Mail size={30} />} title="No jobs yet" /> : (
            <>
              <div className="toolbar tight">
                <select value={job.uid} onChange={(e) => setUid(e.target.value)} className="grow">
                  {targets.map((j) => <option key={j.uid} value={j.uid}>{j.code} · {j.title} @ {j.company} ({j.stage})</option>)}
                </select>
              </div>
              <div className="draft-tabs">{DRAFTS.filter((x) => x.id !== 'salary').map((x) => <button key={x.id} className={cx(tpl === x.id && 'on')} onClick={() => setTpl(x.id)}>{x.label}</button>)}</div>
              <div className="draft">
                <div className="draft-h"><b>{d.label} · {job.company}</b><CopyButton text={text} label="Copy" /></div>
                <pre>{text}</pre>
              </div>
            </>
          )}
        </Section>

        <Section title="Contacts" sub="Recruiters, referrers and hiring managers" right={<button className="btn-primary sm" onClick={() => setForm({ ...blank(), company: job?.company || '', jobUid: job?.uid })}><Plus size={14} />Add</button>}>
          {form && (
            <div className="contact-form">
              {(['name', 'company', 'role', 'email', 'linkedin', 'phone', 'lastContact'] as const).map((k) => (
                <label key={k}><span>{k === 'lastContact' ? 'Last contact' : k}</span><input type={k === 'lastContact' ? 'date' : 'text'} value={(form as any)[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
              ))}
              <label className="full"><span>Notes</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
              <div className="full row-end">
                <button className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
                <button className="btn-primary" disabled={!form.name} onClick={() => { saveContacts([form, ...contacts.filter((c) => c.id !== form.id)]); setForm(null); }}>Save contact</button>
              </div>
            </div>
          )}
          <div className="contacts">
            {contacts.map((c) => (
              <div key={c.id} className="contact" onClick={() => setForm(c)}>
                <div className="c-av"><UserRound size={18} /></div>
                <div className="c-main"><b>{c.name}</b><span>{c.role} · {c.company}</span>{c.notes && <em>{c.notes}</em>}</div>
                <div className="c-act" onClick={(e) => e.stopPropagation()}>
                  {c.email && <CopyButton text={c.email} compact />}
                  {c.email && <a className="icon-btn" href={`mailto:${c.email}`} title="Email"><Mail size={15} /></a>}
                  {c.linkedin && <a className="icon-btn" href={c.linkedin.startsWith('http') ? c.linkedin : `https://${c.linkedin}`} target="_blank" rel="noreferrer"><Linkedin size={15} /></a>}
                  {c.phone && <a className="icon-btn" href={`tel:${c.phone}`}><Phone size={15} /></a>}
                  <button className="icon-btn" onClick={() => saveContacts(contacts.filter((x) => x.id !== c.id))}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
            {!contacts.length && !form && <Empty icon={<UserRound size={30} />} title="No contacts yet" body="Add recruiters you reach out to. The outreach templates auto-fill their first name." />}
          </div>
        </Section>
      </div>
    </div>
  );
}
`````

### File: app/src/pages/Dashboard.tsx
`````tsx
import React, { useMemo } from 'react';
import { ArrowRight, Flame, Rocket, Sparkles, Target, TrendingUp, Zap, Activity } from 'lucide-react';
import { useStore } from '../store';
import { STAGES } from '../types';
import { Funnel, Ring, Spark } from '../components/charts';
import { CountUp, JobRow, Section } from '../components/ui';
import { ageHours, timeAgo } from '../lib/util';
import type { Page } from '../components/Shell';

export function Dashboard({ go }: { go: (p: Page, filter?: any) => void }) {
  const { jobs, meta, now, run, refresh, online, lastSeen, markSeen, profile } = useStore();
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const s = useMemo(() => {
    const active = jobs.filter((j) => j.stage !== 'Rejected');
    const fresh = active.filter((j) => ageHours(j.postedAt) <= 72).sort((a, b) => b.match - a.match);
    const queue = active.filter((j) => (j.stage === 'New' || j.stage === 'Ready') && (j.priority === 'A' || j.priority === 'B'))
      .sort((a, b) => (a.stage === 'Ready' ? -1 : 0) - (b.stage === 'Ready' ? -1 : 0) || b.match - a.match || Date.parse(b.postedAt) - Date.parse(a.postedAt));
    const avg = active.length ? Math.round(active.reduce((a, j) => a + j.match, 0) / active.length) : 0;
    const byStage = Object.fromEntries(STAGES.map((st) => [st, active.filter((j) => j.stage === st).length]));
    const reached = (i: number) => active.filter((j) => STAGES.indexOf(j.stage as any) >= i).length;
    const newSince = jobs.filter((j) => j.firstSeenAt > lastSeen).length;
    // postings per day, last 14 days
    const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(now - (13 - i) * 864e5).toISOString().slice(0, 10); return jobs.filter((j) => (j.postedAt || '').slice(0, 10) === d).length; });
    return { active, fresh, queue, avg, byStage, reached, newSince, days, A: active.filter((j) => j.priority === 'A').length, ai: active.filter((j) => j.aiFlag).length };
  }, [jobs, now, lastSeen]);

  return (
    <div className="page dash">
      <section className="hero">
        <div className="hero-mesh" />
        <div className="hero-l">
          <span className="eyebrow"><Sparkles size={14} />{profile?.headline}</span>
          <h2>{greet}, {profile?.firstName}.</h2>
          <p>
            <b>{s.fresh.length}</b> roles were posted in the last 72 hours and <b>{s.A}</b> are Priority-A matches.
            {s.newSince > 0 && lastSeen > '1971' && <> <b className="hl">{s.newSince} new</b> since your last visit.</>}
          </p>
          <div className="hero-cta">
            <button className="btn-primary" onClick={() => go('board', { stage: 'queue' })}><Rocket size={16} />Start today's queue</button>
            <button className="btn-glass" onClick={refresh} disabled={run.running}><Zap size={16} />{run.running ? `Scraping… ${run.progress.done}/${run.progress.total}` : 'Pull latest jobs'}</button>
            {s.newSince > 0 && <button className="btn-glass" onClick={markSeen}>Mark all seen</button>}
          </div>
          <span className="hero-foot">{online ? 'Live' : 'Offline snapshot'} · last scrape {timeAgo(meta.lastRefresh, now)} · sources: LinkedIn, TinyFish, Remotive, Himalayas, Jobicy, RemoteOK</span>
        </div>
        <div className="hero-r">
          <Ring value={s.avg} size={168} stroke={14} color="url(#g1)" sub="avg match" />
          <svg width="0" height="0"><defs><linearGradient id="g1" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="var(--accent-2)" /><stop offset="1" stopColor="#fff" /></linearGradient></defs></svg>
        </div>
      </section>

      <div className="kpis">
        {[
          { l: 'Jobs tracked', v: s.active.length, i: <Target size={18} />, spark: s.days, hint: 'posted per day, 14d' },
          { l: 'Priority A', v: s.A, i: <Flame size={18} />, tone: 'good' },
          { l: 'Posted ≤ 72h', v: s.fresh.length, i: <Zap size={18} />, tone: 'warn' },
          { l: 'Applied +', v: s.reached(2), i: <TrendingUp size={18} />, tone: 'accent' },
          { l: 'Interviews', v: s.reached(4), i: <Activity size={18} />, tone: 'purple' },
          { l: 'AI-adjacent', v: s.ai, i: <Sparkles size={18} />, tone: 'cyan' },
        ].map((k) => (
          <div key={k.l} className={`kpi tone-${k.tone || 'base'}`}>
            <div className="kpi-i">{k.i}</div>
            <div><span>{k.l}</span><b><CountUp value={k.v} /></b></div>
            {k.spark && <Spark values={k.spark} w={64} h={26} />}
          </div>
        ))}
      </div>

      <div className="grid-2">
        <Section title="Today's application queue" sub="Priority A/B roles in New or Ready, best first" right={<button className="link" onClick={() => go('board', { stage: 'queue' })}>See all <ArrowRight size={14} /></button>}>
          <div className="list">{s.queue.slice(0, 7).map((j) => <JobRow key={j.uid} job={j} dense />)}</div>
        </Section>
        <div className="stack">
          <Section title="Pipeline funnel" sub="Jobs that reached each stage">
            <Funnel data={STAGES.map((st, i) => ({ label: st, value: s.reached(i) }))} />
          </Section>
          <Section title="Recent scrapes" sub="Every refresh is logged">
            <ul className="runs">
              {(meta.runs || []).slice(0, 4).map((r) => (
                <li key={r.at}><span className={`dotc ${r.added ? 'good' : ''}`} /><b>+{r.added}</b> new · {r.updated} updated<time>{timeAgo(r.at, now)} · {r.trigger}</time></li>
              ))}
              {!meta.runs?.length && <li className="muted">No scrapes yet.</li>}
            </ul>
          </Section>
        </div>
      </div>

      <Section title={<><Flame size={18} className="flame" /> Posted in the last 72 hours: apply first</>} sub="Early applicants get far more recruiter views" right={<button className="link" onClick={() => go('board', { fresh: true })}>Open in Job Board <ArrowRight size={14} /></button>}>
        <div className="fresh-grid">
          {s.fresh.slice(0, 9).map((j) => <JobRow key={j.uid} job={j} dense />)}
          {!s.fresh.length && <p className="muted pad">Nothing posted in the last 72h. Hit Refresh to pull the latest.</p>}
        </div>
      </Section>
    </div>
  );
}
`````

### File: app/src/pages/JobBoard.tsx
`````tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Filter, LayoutList, Rows3, Sparkles, Star, Zap } from 'lucide-react';
import { useStore } from '../store';
import { ALL_STAGES } from '../types';
import { ApplyButton, Chip, CopyButton, Empty, JobRow, Logo, Score } from '../components/ui';
import { ageHours, cx, timeAgo } from '../lib/util';

export interface BoardFilter { market?: string; priority?: string; stage?: string; fresh?: boolean; ai?: boolean; starred?: boolean; mode?: string; source?: string }

export function JobBoard({ query, initial }: { query: string; initial?: BoardFilter }) {
  const { jobs, openJob, now } = useStore();
  const [f, setF] = useState<BoardFilter>(initial || {});
  const [sort, setSort] = useState<'match' | 'newest' | 'company'>('match');
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [limit, setLimit] = useState(60);
  useEffect(() => { if (initial) setF(initial); }, [initial]);

  const opts = useMemo(() => ({
    markets: [...new Set(jobs.map((j) => j.market))],
    modes: [...new Set(jobs.map((j) => j.workMode))],
    sources: [...new Set(jobs.map((j) => j.source))],
  }), [jobs]);

  const list = useMemo(() => {
    const q = query.toLowerCase().trim();
    let l = jobs.filter((j) => {
      if (f.stage === 'queue') { if (!(j.stage === 'New' || j.stage === 'Ready') || !(j.priority === 'A' || j.priority === 'B')) return false; }
      else if (f.stage) { if (j.stage !== f.stage) return false; }
      else if (j.stage === 'Rejected') return false;
      if (f.market && j.market !== f.market) return false;
      if (f.priority && j.priority !== f.priority) return false;
      if (f.mode && j.workMode !== f.mode) return false;
      if (f.source && j.source !== f.source) return false;
      if (f.fresh && ageHours(j.postedAt) > 72) return false;
      if (f.ai && !j.aiFlag) return false;
      if (f.starred && !j.starred) return false;
      if (q && !`${j.title} ${j.company} ${j.location} ${j.code} ${(j.matchedKeywords || []).join(' ')} ${j.description?.slice(0, 2000) || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sort === 'newest') l = [...l].sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));
    if (sort === 'company') l = [...l].sort((a, b) => a.company.localeCompare(b.company));
    return l;
  }, [jobs, f, sort, query]);

  const sel = (k: keyof BoardFilter, options: string[], label: string) => (
    <select value={(f[k] as string) || ''} onChange={(e) => setF({ ...f, [k]: e.target.value || undefined })}>
      <option value="">{label}</option>{options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  const toggle = (k: keyof BoardFilter, label: React.ReactNode) => <button className={cx('tog', f[k] && 'on')} onClick={() => setF({ ...f, [k]: !f[k] || undefined })}>{label}</button>;

  return (
    <div className="page">
      <div className="toolbar wrap">
        <Filter size={16} className="muted" />
        {sel('market', opts.markets, 'All markets')}
        {sel('priority', ['A', 'B', 'C', 'D'], 'Any priority')}
        <select value={f.stage || ''} onChange={(e) => setF({ ...f, stage: e.target.value || undefined })}>
          <option value="">Active stages</option><option value="queue">Today's queue (A/B)</option>{ALL_STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>
        {sel('mode', opts.modes, 'Any work mode')}
        {sel('source', opts.sources, 'All sources')}
        {toggle('fresh', <><Zap size={13} />≤72h</>)}
        {toggle('ai', <><Sparkles size={13} />AI</>)}
        {toggle('starred', <><Star size={13} />Starred</>)}
        {Object.keys(f).some((k) => (f as any)[k]) && <button className="link" onClick={() => setF({})}>Clear</button>}
        <div className="spacer" />
        <span className="count">{list.length} jobs</span>
        <select value={sort} onChange={(e) => setSort(e.target.value as any)}><option value="match">Best match</option><option value="newest">Newest</option><option value="company">Company A–Z</option></select>
        <div className="seg">
          <button className={cx(view === 'cards' && 'on')} onClick={() => setView('cards')} title="Cards"><LayoutList size={15} /></button>
          <button className={cx(view === 'table' && 'on')} onClick={() => setView('table')} title="Table"><Rows3 size={15} /></button>
        </div>
      </div>

      {!list.length && <Empty icon={<Filter size={32} />} title="No jobs match these filters" body="Loosen a filter or press Refresh to pull the latest postings." />}

      {view === 'cards' ? (
        <div className="list board">{list.slice(0, limit).map((j) => <JobRow key={j.uid} job={j} />)}</div>
      ) : (
        <div className="card table-wrap">
          <table className="tbl">
            <thead><tr><th>ID</th><th></th><th>Role</th><th>Company</th><th>Market</th><th>Mode</th><th>Posted</th><th>Stage</th><th>Match</th><th>Link</th></tr></thead>
            <tbody>
              {list.slice(0, limit).map((j) => (
                <tr key={j.uid} onClick={() => openJob(j.uid)}>
                  <td className="code">{j.code}</td><td><Logo job={j} size={26} /></td>
                  <td className="t">{j.title}{j.aiFlag && <Chip tone="ai">AI</Chip>}</td><td>{j.company}</td><td>{j.market}</td><td>{j.workMode}</td>
                  <td>{timeAgo(j.postedAt, now)}</td><td>{j.stage}</td><td><Score job={j} size="sm" /></td>
                  <td className="row-act"><ApplyButton url={j.url} /><CopyButton text={j.url} compact /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.length > limit && <button className="btn-more" onClick={() => setLimit(limit + 60)}>Show more ({list.length - limit} left)</button>}
    </div>
  );
}
`````

### File: app/src/pages/Pipeline.tsx
`````tsx
import React, { useMemo, useState } from 'react';
import { GripVertical, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { STAGES, type Stage } from '../types';
import { ApplyButton, Logo, Score } from '../components/ui';
import { cx, timeAgo } from '../lib/util';

const STAGE_COLOR: Record<string, string> = { New: '#64748b', Ready: '#06b6d4', Applied: '#2b6cf6', Screening: '#8b5cf6', Interview: '#f59e0b', Offer: '#10b981', Rejected: '#ef4444' };

export function Pipeline({ query }: { query: string }) {
  const { jobs, setStage, openJob, now } = useStore();
  const [over, setOver] = useState<Stage | null>(null);
  const [minPr, setMinPr] = useState<'A' | 'B' | 'C' | 'D'>('B');
  const [showRejected, setShowRejected] = useState(false);
  const cols: Stage[] = showRejected ? [...STAGES, 'Rejected'] : STAGES;
  const q = query.toLowerCase();
  const byStage = useMemo(() => {
    const m: Record<string, typeof jobs> = {};
    for (const s of cols) m[s] = [];
    for (const j of jobs) {
      if (q && !`${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q)) continue;
      if (j.stage === 'New' && j.priority > minPr) continue;
      m[j.stage as string]?.push(j);
    }
    return m;
  }, [jobs, q, minPr, showRejected]);

  return (
    <div className="page">
      <div className="toolbar">
        <span className="muted">Drag cards between stages. The New column shows priority</span>
        <div className="seg">{(['A', 'B', 'C', 'D'] as const).map((p) => <button key={p} className={cx(minPr === p && 'on')} onClick={() => setMinPr(p)}>{p === 'A' ? 'A only' : `A–${p}`}</button>)}</div>
        <label className="check"><input type="checkbox" checked={showRejected} onChange={(e) => setShowRejected(e.target.checked)} />Show rejected</label>
      </div>
      <div className="kanban">
        {cols.map((s) => (
          <div key={s} className={cx('kcol', over === s && 'over')}
            onDragOver={(e) => { e.preventDefault(); setOver(s); }} onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); const uid = e.dataTransfer.getData('text/plain'); if (uid) setStage(uid, s); setOver(null); }}>
            <header style={{ ['--c' as any]: STAGE_COLOR[s] }}><i />{s}<em>{byStage[s].length}</em></header>
            <div className="kcards">
              {byStage[s].slice(0, s === 'New' ? 60 : 200).map((j) => (
                <div key={j.uid} className="kcard" draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', j.uid)} onClick={() => openJob(j.uid)}>
                  <div className="kc-top"><Logo job={j} size={30} /><div><b>{j.title}</b><span>{j.company}</span></div><Score job={j} size="sm" /></div>
                  <div className="kc-meta"><span>{j.market}</span>{j.aiFlag && <Sparkles size={12} className="ai" />}<span>{timeAgo(j.updatedAt || j.postedAt, now)}</span><GripVertical size={14} className="grip" /></div>
                  {(s === 'New' || s === 'Ready') && <div className="kc-act"><ApplyButton url={j.url} /><button className="btn-ghost sm" onClick={(e) => { e.stopPropagation(); setStage(j.uid, s === 'New' ? 'Ready' : 'Applied'); }}>{s === 'New' ? '→ Ready' : '→ Applied'}</button></div>}
                </div>
              ))}
              {s === 'New' && byStage[s].length > 60 && <p className="muted pad">+{byStage[s].length - 60} more in Job Board</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
`````

### File: app/src/pages/ResumeCenter.tsx
`````tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Award, FileText, GraduationCap, Lightbulb, Pencil, Save, Target, TrendingUp, UploadCloud } from 'lucide-react';
import { ALL_TOOLS } from '../../../shared/taxonomy.js';
import { countTerm } from '../../../shared/resume-parser.js';
import { useStore, API_BASE } from '../store';
import { HBars } from '../components/charts';
import { Empty, Section } from '../components/ui';

export function ResumeCenter({ onUpload }: { onUpload: () => void }) {
  const { jobs, openJob, profile, saveProfile, toast, online } = useStore();
  const [edit, setEdit] = useState(false);
  const [titles, setTitles] = useState('');
  const [kws, setKws] = useState('');
  useEffect(() => { if (profile) { setTitles(profile.targetTitles.join('\n')); setKws(profile.keywords.join(', ')); } }, [profile]);

  const data = useMemo(() => {
    const byV: Record<string, typeof jobs> = {};
    for (const j of jobs) (byV[j.resumeVersion] ||= []).push(j);
    const withJD = jobs.filter((j) => (j.description || '').length > 300);
    const mine = new Set(profile?.tools || []);
    const demand = (ALL_TOOLS as string[]).map((t) => ({ label: t, value: withJD.filter((j) => countTerm(` ${(j.description || '').toLowerCase()} `, t)).length, gap: !mine.has(t) }))
      .filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
    return { byV, withJD: withJD.length, have: demand.filter((d) => !d.gap).slice(0, 10), gaps: demand.filter((d) => d.gap).slice(0, 8) };
  }, [jobs, profile]);

  if (!profile) return <div className="page"><Empty icon={<UploadCloud size={32} />} title="No resume uploaded yet" action={<button className="btn-primary" onClick={onUpload}>Upload resume</button>} /></div>;
  const P = profile;

  return (
    <div className="page">
      <div className="grid-2 top">
        <Section title="Candidate profile" sub={P.source === 'curated' ? 'Hand-tuned profile' : `Parsed from your resume${P.createdAt ? ` on ${new Date(P.createdAt).toLocaleDateString()}` : ''}`}
          right={<button className="btn-primary sm" onClick={onUpload} disabled={!online}><UploadCloud size={14} />Upload new resume</button>}>
          <div className="profile">
            <h3>{P.name}</h3>
            <p className="muted">{P.headline}</p>
            <div className="pf-grid">
              <div><span>Location</span><b>{P.city}{P.country ? `, ${P.country}` : ''}</b></div>
              <div><span>Experience</span><b>{P.yearsLabel}</b></div>
              <div><span>Availability</span><b>{P.availability}</b></div>
              <div><span>Contact</span><b>{P.email}<br />{P.phone}</b></div>
            </div>
            {P.education && <><h5><GraduationCap size={15} />Education</h5><p>{P.education}</p></>}
            {!!P.certifications.length && <><h5><Award size={15} />Certifications ({P.certifications.length})</h5><div className="kw">{P.certifications.map((c) => <span key={c}>{c}</span>)}</div></>}
            <h5>Resume files</h5>
            <div className="files">
              {Object.values(P.resumeFiles).map((f) => (
                <a key={f.file} className="file" href={`${API_BASE}/files/${encodeURIComponent(f.file)}`} target="_blank" rel="noreferrer"><FileText size={18} /><div><b>{f.label}</b><span>{f.file}</span></div></a>
              ))}
            </div>
          </div>
        </Section>
        <div className="stack">
          <Section title={<><Target size={17} /> Targeting</>} sub="Drives scraping queries and title matching. Edit it if the parser missed something."
            right={edit ? <button className="btn-primary sm" onClick={async () => {
              await saveProfile({ targetTitles: titles.split('\n').map((t) => t.trim()).filter(Boolean), keywords: kws.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean) });
              setEdit(false); toast({ kind: 'good', title: 'Profile saved', body: 'All jobs re-scored. Update search queries in Sources & Scrapers if needed.' });
            }}><Save size={14} />Save</button> : <button className="btn-ghost sm" onClick={() => setEdit(true)} disabled={!online}><Pencil size={13} />Edit</button>}>
            {edit ? (
              <div className="form">
                <label className="full"><span>Target titles (one per line)</span><textarea rows={6} value={titles} onChange={(e) => setTitles(e.target.value)} /></label>
                <label className="full"><span>Keywords (comma separated)</span><textarea rows={5} value={kws} onChange={(e) => setKws(e.target.value)} /></label>
              </div>
            ) : (
              <>
                <h5 className="first">Target titles</h5><div className="kw">{P.targetTitles.map((t) => <span key={t}>{t}</span>)}</div>
                <h5>Keywords ({P.keywords.length})</h5><div className="kw">{P.keywords.slice(0, 30).map((t) => <span key={t}>{t}</span>)}</div>
              </>
            )}
          </Section>
          <Section title={<><TrendingUp size={17} /> What the market asks for</>} sub={`Tool mentions across ${data.withJD} full job descriptions (tools you have)`}>
            <HBars data={data.have.map((d) => ({ label: d.label, value: d.value }))} />
          </Section>
          <Section title={<><Lightbulb size={17} /> Improvement themes</>} sub="In demand but missing from your resume. Add them if you have the exposure, or upskill">
            <HBars data={data.gaps.map((d) => ({ label: d.label, value: d.value, color: 'linear-gradient(90deg,var(--warn),#f97316)' }))} />
            {!data.gaps.length && <p className="muted">No recurring gaps detected. 🎯</p>}
          </Section>
        </div>
      </div>

      <h3 className="h-sec">Core competencies & proof points</h3>
      <div className="versions skills-grid">
        {P.skills.filter((s) => s.core || s.proof).slice(0, 12).map((s, i) => (
          <div key={s.key} className="version" style={{ ['--h' as any]: i * 30 }}>
            <div className="v-h"><span className="v-n">{String(i + 1).padStart(2, '0')}</span><div><b>{s.label}</b><em>{s.core ? 'core' : 'supporting'} · {s.domain}</em></div></div>
            {s.proof ? <p>“{s.proof}”</p> : <p className="muted">No quantified bullet found. Add one to your resume.</p>}
          </div>
        ))}
      </div>

      <h3 className="h-sec">Resume versions: which one to send where</h3>
      <div className="versions">
        {P.resumeVersions.map((v, i) => {
          const js = (data.byV[v.id] || []).sort((a, b) => b.match - a.match);
          return (
            <div key={v.id} className="version" style={{ ['--h' as any]: i * 40 }}>
              <div className="v-h"><span className="v-n">{String(i + 1).padStart(2, '0')}</span><div><b>{v.name}</b><em>{js.length} jobs</em></div></div>
              <p>{v.focus}</p>
              <p className="muted"><b>Best for:</b> {v.bestFor}</p>
              <p className="muted small">Base file: {P.resumeFiles[v.file]?.label || v.file}</p>
              <ul>{js.slice(0, 3).map((j) => <li key={j.uid} onClick={() => openJob(j.uid)}><b>{j.match}</b>{j.title} · {j.company}</li>)}</ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
`````

### File: app/src/pages/Sources.tsx
`````tsx
import React, { useEffect, useState } from 'react';
import { Fish, Globe, KeyRound, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import type { Settings } from '../types';
import { Section } from '../components/ui';
import { cx, timeAgo } from '../lib/util';

const SRC_INFO: Record<string, string> = {
  linkedin: 'LinkedIn guest job search + job detail pages (no login). Real linkedin.com/jobs/view links.',
  tinyfish: 'TinyFish Web Agent: Search finds postings across LinkedIn, Naukri, Bayt and Indeed; Fetch pulls full JDs when LinkedIn blocks. Free API key.',
  remotive: 'Remotive public API: remote tech jobs.',
  himalayas: 'Himalayas public API: remote jobs with location filters.',
  jobicy: 'Jobicy public API: remote sysadmin / IT support jobs.',
  remoteok: 'RemoteOK public API: remote jobs feed.',
};

export function Sources() {
  const { settings, saveSettings, online, meta, now, refresh, run, toast } = useStore();
  const [s, setS] = useState<Settings | null>(settings);
  const [key, setKey] = useState('');
  const [newQ, setNewQ] = useState('');
  useEffect(() => setS(settings), [settings]);
  if (!online || !s) return <div className="page"><Section title="Scraper server offline"><p>Start the local server to manage sources: double-click <code>start.bat</code> in <code>C:\myc\crm</code>, or run <code>npm start</code>. This page reconnects automatically.</p></Section></div>;
  const save = async (extra: any = {}) => { await saveSettings({ ...s, ...extra }); toast({ kind: 'good', title: 'Settings saved' }); };

  return (
    <div className="page">
      <div className="grid-2 top">
        <Section title="Scraper sources" sub="Toggle which sources run on Refresh" right={<button className="btn-refresh" disabled={run.running} onClick={refresh}><RefreshCw size={15} />{run.running ? 'Running…' : 'Refresh now'}</button>}>
          <div className="sources">
            {Object.entries(s.sources).map(([k, on]) => (
              <label key={k} className={cx('source', on && 'on')}>
                <input type="checkbox" checked={on} onChange={(e) => setS({ ...s, sources: { ...s.sources, [k]: e.target.checked } })} />
                <div className="s-i">{k === 'tinyfish' ? <Fish size={18} /> : <Globe size={18} />}</div>
                <div><b>{k === 'tinyfish' ? 'TinyFish Web Agent' : k[0].toUpperCase() + k.slice(1)}</b><span>{SRC_INFO[k]}</span>
                  {k === 'tinyfish' && <em className={s.hasTinyfishKey ? 'ok' : 'warn'}>{s.hasTinyfishKey ? '● API key configured' : '○ No API key yet. Seed postings from TinyFish are still verified each refresh.'}</em>}
                </div>
              </label>
            ))}
          </div>
          <div className="keybox">
            <KeyRound size={16} />
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={s.hasTinyfishKey ? '•••••••• (saved). Paste to replace' : 'Paste TinyFish API key (agent.tinyfish.ai/api-keys)'} />
            <button className="btn-primary sm" disabled={!key} onClick={async () => { await save({ tinyfishKey: key.trim() }); setKey(''); }}>Save key</button>
            {s.hasTinyfishKey && <button className="btn-ghost sm" onClick={() => save({ tinyfishKey: '' })}>Remove</button>}
          </div>
        </Section>

        <Section title="Schedule & filters">
          <div className="form">
            <label><span>Auto-refresh</span>
              <select value={s.autoRefreshMin} onChange={(e) => setS({ ...s, autoRefreshMin: +e.target.value })}>
                <option value={0}>Off (manual only)</option><option value={30}>Every 30 minutes</option><option value={60}>Every hour</option><option value={180}>Every 3 hours</option><option value={720}>Every 12 hours</option>
              </select></label>
            <label><span>Recency window</span>
              <select value={s.recencyDays} onChange={(e) => setS({ ...s, recencyDays: +e.target.value })}>
                {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>Last {d} day{d > 1 ? 's' : ''}</option>)}
              </select></label>
            <label><span>Min score to keep</span><input type="number" min={0} max={90} value={s.minScore} onChange={(e) => setS({ ...s, minScore: +e.target.value })} /></label>
            <label><span>JD enrich limit / run</span><input type="number" min={0} max={400} value={s.enrichLimit} onChange={(e) => setS({ ...s, enrichLimit: +e.target.value })} /></label>
          </div>
          <h5>Markets</h5>
          <div className="markets">
            {s.markets.map((m, i) => (
              <label key={m.id} className={cx('mkt-t', m.enabled && 'on')}>
                <input type="checkbox" checked={m.enabled} onChange={(e) => { const ms = [...s.markets]; ms[i] = { ...m, enabled: e.target.checked }; setS({ ...s, markets: ms }); }} />
                <b>{m.label}</b><em>{m.kind}</em>
              </label>
            ))}
          </div>
          <h5>Search queries <span className="muted">(core = also used for relocation markets)</span></h5>
          <div className="queries">
            {s.queries.map((q, i) => (
              <span key={q.q} className={cx('q', q.core && 'core')}>
                <button title="Toggle core" onClick={() => { const qs = [...s.queries]; qs[i] = { ...q, core: !q.core }; setS({ ...s, queries: qs }); }}>{q.core ? '★' : '☆'}</button>
                {q.q}<button onClick={() => setS({ ...s, queries: s.queries.filter((_, j) => j !== i) })}><Trash2 size={12} /></button>
              </span>
            ))}
            <span className="q add"><input value={newQ} onChange={(e) => setNewQ(e.target.value)} placeholder="Add query…" onKeyDown={(e) => { if (e.key === 'Enter' && newQ.trim()) { setS({ ...s, queries: [...s.queries, { q: newQ.trim(), core: false }] }); setNewQ(''); } }} /><Plus size={13} /></span>
          </div>
          <div className="row-end"><button className="btn-primary" onClick={() => save()}><Save size={15} />Save settings</button></div>
        </Section>
      </div>

      <Section title="Run history">
        <table className="tbl">
          <thead><tr><th>When</th><th>Trigger</th><th>Scanned</th><th>New</th><th>Updated</th><th>Per source</th></tr></thead>
          <tbody>
            {(meta.runs || []).map((r) => (
              <tr key={r.at}><td>{new Date(r.at).toLocaleString()} <span className="muted">({timeAgo(r.at, now)})</span></td><td>{r.trigger}</td><td>{r.found}</td><td><b>+{r.added}</b></td><td>{r.updated}</td>
                <td className="srcs">{Object.entries(r.sources || {}).map(([n, v]: any) => <span key={n} className={cx('mini', v.status)}>{n} {v.count}{v.errors ? ` ⚠${v.errors}` : ''}</span>)}</td></tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
`````

### File: app/src/store.tsx
`````tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { scoreJob, detectWorkMode } from '../../shared/scoring.js';
import seed from './seed.json';
import type { Contact, Job, LogEntry, MarketOption, Meta, PipelineEntry, Profile, Settings, SourceStatus, Stage } from './types';

// Server base: same origin when served by server.js, localhost when opened from disk.
const API = location.protocol.startsWith('http') ? '' : 'http://localhost:4321';
const LS_KEY = 'jobpilot-crm';

interface Local { profileKey?: string; pipeline: Record<string, PipelineEntry>; manual: Job[]; contacts: Contact[]; theme?: string; seen?: string }
const readLocal = (): Local => { try { return { pipeline: {}, manual: [], contacts: [], ...JSON.parse(localStorage.getItem(LS_KEY) || '{}') }; } catch { return { pipeline: {}, manual: [], contacts: [] }; } };
const writeLocal = (l: Local) => { try { localStorage.setItem(LS_KEY, JSON.stringify(l)); } catch { /* storage blocked */ } };

export interface Toast { id: number; kind: 'good' | 'info' | 'warn' | 'bad'; title: string; body?: string }
export interface RunState { running: boolean; progress: { done: number; total: number }; sources: Record<string, SourceStatus>; logs: LogEntry[]; startedAt?: string }

interface Ctx {
  jobs: Job[]; meta: Meta; settings: Settings | null; contacts: Contact[]; profile: Profile | null; marketOptions: MarketOption[]; loaded: boolean;
  uploadResume: (f: File, o: { relocation: string[]; remote: boolean; ai: boolean; recency: number }) => Promise<{ profile: Profile; samePerson: boolean }>;
  saveProfile: (p: Partial<Profile>) => Promise<void>;
  online: boolean; run: RunState; toasts: Toast[]; now: number; lastSeen: string;
  refresh: () => void; setStage: (uid: string, stage: Stage) => void; patchJob: (uid: string, p: PipelineEntry) => void;
  addJob: (j: Partial<Job> & { title: string; company: string; description: string; marketId: string }) => Promise<Job>;
  removeJob: (uid: string) => void; saveContacts: (c: Contact[]) => void; saveSettings: (s: Partial<Settings> & { tinyfishKey?: string }) => Promise<void>;
  toast: (t: Omit<Toast, 'id'>) => void; dismiss: (id: number) => void; openJob: (uid: string | null) => void; openUid: string | null;
  markSeen: () => void;
}
const C = createContext<Ctx>(null as any);
export const useStore = () => useContext(C);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const local = useRef<Local>(readLocal());
  const [profile, setProfile] = useState<Profile | null>((seed as any).profile || null);
  const [marketOptions, setMarketOptions] = useState<MarketOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [serverJobs, setServerJobs] = useState<Job[]>((seed as any).jobs || []);
  const [meta, setMeta] = useState<Meta>((seed as any).meta || { lastRefresh: null });
  const [settings, setSettings] = useState<Settings | null>(null);
  const [contacts, setContacts] = useState<Contact[]>(local.current.contacts.length ? local.current.contacts : (seed as any).contacts || []);
  const [pipeline, setPipeline] = useState<Record<string, PipelineEntry>>(local.current.pipeline);
  const [manual, setManual] = useState<Job[]>(local.current.manual);
  const [online, setOnline] = useState(false);
  const [run, setRun] = useState<RunState>({ running: false, progress: { done: 0, total: 0 }, sources: {}, logs: [] });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [now, setNow] = useState(Date.now());
  const [openUid, openJob] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState(local.current.seen || new Date(0).toISOString());
  const addedThisRun = useRef(0);

  const persistLocal = (p: Partial<Local>) => { local.current = { ...local.current, ...p }; writeLocal(local.current); };
  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x, { ...t, id }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 6000);
  }, []);
  const dismiss = (id: number) => setToasts((x) => x.filter((y) => y.id !== id));

  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(i); }, []);

  const loadState = useCallback(async () => {
    const r = await fetch(`${API}/api/state`);
    const d = await r.json();
    if (d.profile?.key && local.current.profileKey && d.profile.key !== local.current.profileKey) persistLocal({ pipeline: {}, manual: [], contacts: [], seen: undefined });
    if (d.profile?.key) persistLocal({ profileKey: d.profile.key });
    setProfile(d.profile); setMarketOptions(d.marketOptions || []);
    setServerJobs(d.jobs); setMeta(d.meta); setSettings(d.settings); setLoaded(true);
    if (d.contacts?.length || !local.current.contacts.length) setContacts(d.contacts || []);
    // merge pipeline: newer updatedAt wins; push local-only newer edits to server
    const merged: Record<string, PipelineEntry> = { ...local.current.pipeline };
    for (const j of d.jobs as Job[]) {
      const srv: PipelineEntry = { stage: j.stage, notes: j.notes, starred: j.starred, updatedAt: j.updatedAt, appliedAt: j.appliedAt, history: j.history };
      const loc = merged[j.uid];
      if (!loc || (srv.updatedAt && (!loc.updatedAt || srv.updatedAt >= loc.updatedAt))) { if (srv.updatedAt) merged[j.uid] = srv; }
      else if (loc.updatedAt && (!srv.updatedAt || loc.updatedAt > srv.updatedAt)) fetch(`${API}/api/pipeline/${encodeURIComponent(j.uid)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loc) }).catch(() => {});
    }
    setPipeline(merged); persistLocal({ pipeline: merged });
    return d;
  }, []);

  // Connect to server + live event stream (auto-reconnect)
  useEffect(() => {
    let es: EventSource | null = null; let stop = false; let retry: any;
    const connect = async () => {
      try {
        const d = await loadState();
        setOnline(true);
        if (d.running) setRun((r) => ({ ...r, running: true }));
      } catch { setOnline(false); setLoaded(true); retry = setTimeout(connect, 8000); return; }
      es = new EventSource(`${API}/api/events`);
      es.addEventListener('hello', (e: any) => { const d = JSON.parse(e.data); setRun((r) => ({ ...r, running: d.running, progress: d.progress, sources: d.sources || {}, logs: d.logs || [] })); });
      es.addEventListener('run-start', (e: any) => { addedThisRun.current = 0; setRun({ running: true, progress: { done: 0, total: 0 }, sources: {}, logs: [], startedAt: JSON.parse(e.data).startedAt }); });
      es.addEventListener('progress', (e: any) => { const p = JSON.parse(e.data); setRun((r) => ({ ...r, progress: p })); });
      es.addEventListener('source', (e: any) => { const s = JSON.parse(e.data); setRun((r) => ({ ...r, sources: { ...r.sources, [s.name]: s } })); });
      es.addEventListener('log', (e: any) => { const l = JSON.parse(e.data); setRun((r) => ({ ...r, logs: [...r.logs.slice(-250), l] })); });
      es.addEventListener('job', (e: any) => {
        const j = JSON.parse(e.data) as Job; addedThisRun.current++;
        setServerJobs((xs) => (xs.some((x) => x.uid === j.uid) ? xs : [j, ...xs]));
      });
      es.addEventListener('job-removed', (e: any) => { const { uid } = JSON.parse(e.data); setServerJobs((xs) => xs.filter((x) => x.uid !== uid)); });
      es.addEventListener('pipeline', (e: any) => { const { uid, entry } = JSON.parse(e.data); setPipeline((p) => { const n = { ...p, [uid]: entry }; persistLocal({ pipeline: n }); return n; }); });
      es.addEventListener('contacts', (e: any) => setContacts(JSON.parse(e.data)));
      es.addEventListener('settings', (e: any) => setSettings(JSON.parse(e.data)));
      es.addEventListener('profile', (e: any) => setProfile(JSON.parse(e.data)));
      es.addEventListener('reload', () => { loadState().catch(() => {}); });
      es.addEventListener('run-end', async (e: any) => {
        const d = JSON.parse(e.data);
        setRun((r) => ({ ...r, running: false }));
        await loadState().catch(() => {});
        if (d.error) toast({ kind: 'bad', title: 'Refresh failed', body: d.error });
        else toast({ kind: d.added ? 'good' : 'info', title: d.added ? `+${d.added} new jobs pulled` : 'You\'re up to date', body: `${d.updated} refreshed · ${d.total} jobs in your CRM` });
      });
      es.onerror = () => { setOnline(false); es?.close(); if (!stop) retry = setTimeout(connect, 5000); };
    };
    connect();
    return () => { stop = true; es?.close(); clearTimeout(retry); };
  }, [loadState, toast]);

  const jobs = useMemo(() => {
    const ids = new Set(serverJobs.map((j) => j.uid));
    const all = [...serverJobs, ...manual.filter((m) => !ids.has(m.uid))];
    return all.map((j) => ({ ...j, ...(pipeline[j.uid] || {}), stage: (pipeline[j.uid]?.stage || j.stage || 'New') as Stage }));
  }, [serverJobs, manual, pipeline]);

  const patchJob = useCallback((uid: string, p: PipelineEntry) => {
    setPipeline((cur) => {
      const prev = cur[uid] || { stage: 'New' as Stage, history: [] };
      const at = new Date().toISOString();
      const entry: PipelineEntry = { ...prev, ...p, updatedAt: at };
      if (p.stage && p.stage !== prev.stage) entry.history = [...(prev.history || []), { stage: p.stage, at }];
      if (p.stage === 'Applied' && !prev.appliedAt) entry.appliedAt = at;
      const n = { ...cur, [uid]: entry };
      persistLocal({ pipeline: n });
      fetch(`${API}/api/pipeline/${encodeURIComponent(uid)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).catch(() => {});
      return n;
    });
  }, []);
  const setStage = useCallback((uid: string, stage: Stage) => patchJob(uid, { stage }), [patchJob]);

  const refresh = useCallback(async () => {
    if (!online) { toast({ kind: 'warn', title: 'Scraper server is offline', body: 'Double-click start.bat (or run "npm start" in C:\\myc\\crm) and the app reconnects automatically.' }); return; }
    setRun((r) => ({ ...r, running: true, logs: [], sources: {}, progress: { done: 0, total: 0 } }));
    await fetch(`${API}/api/refresh`, { method: 'POST' }).catch(() => toast({ kind: 'bad', title: 'Could not reach the server' }));
  }, [online, toast]);

  const addJob: Ctx['addJob'] = async (j) => {
    if (online) {
      const r = await fetch(`${API}/api/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(j) });
      const job = await r.json();
      setServerJobs((xs) => (xs.some((x) => x.uid === job.uid) ? xs : [job, ...xs]));
      return job;
    }
    if (!profile) throw new Error('No profile loaded');
    const ms = settings?.markets || profile.markets;
    const market = ms.find((m: any) => m.id === j.marketId) || ms[0];
    const sc = scoreJob(j, market, profile);
    const now = new Date().toISOString();
    const job = { source: 'Manual', extId: now, url: j.url || '', location: j.location || market.label, tags: [], ...j, ...sc,
      uid: `Manual:${Date.now()}`, code: `ADD${String(manual.length + 1).padStart(2, '0')}`, market: market.kind === 'Relocation' ? market.label : market.kind, marketKind: market.kind,
      workMode: detectWorkMode(`${j.title} ${j.description}`, market), postedAt: now, firstSeenAt: now, lastSeenAt: now } as Job;
    const m = [job, ...manual]; setManual(m); persistLocal({ manual: m });
    return job;
  };
  const removeJob = (uid: string) => {
    if (uid.startsWith('Manual:') && manual.some((m) => m.uid === uid)) { const m = manual.filter((x) => x.uid !== uid); setManual(m); persistLocal({ manual: m }); }
    setServerJobs((xs) => xs.filter((x) => x.uid !== uid));
    if (online) fetch(`${API}/api/jobs/${encodeURIComponent(uid)}`, { method: 'DELETE' }).catch(() => {});
  };
  const saveContacts = (c: Contact[]) => {
    setContacts(c); persistLocal({ contacts: c });
    if (online) fetch(`${API}/api/contacts`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contacts: c }) }).catch(() => {});
  };
  const saveSettings: Ctx['saveSettings'] = async (s) => {
    const r = await fetch(`${API}/api/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) });
    setSettings(await r.json());
  };
  const uploadResume: Ctx['uploadResume'] = async (f, o) => {
    const q = new URLSearchParams({ relocation: o.relocation.join(','), remote: o.remote ? '1' : '0', ai: o.ai ? '1' : '0', recency: String(o.recency) });
    const r = await fetch(`${API}/api/resume?${q}`, { method: 'POST', headers: { 'X-Filename': encodeURIComponent(f.name), 'Content-Type': 'application/octet-stream' }, body: f });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Upload failed');
    if (!d.samePerson) { setPipeline({}); setManual([]); setContacts([]); persistLocal({ pipeline: {}, manual: [], contacts: [], profileKey: d.profile.key }); }
    setProfile(d.profile);
    await loadState().catch(() => {});
    return d;
  };
  const saveProfile: Ctx['saveProfile'] = async (p) => {
    const r = await fetch(`${API}/api/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
    setProfile(await r.json());
  };
  const markSeen = () => { const t = new Date().toISOString(); setLastSeen(t); persistLocal({ seen: t }); };

  return (
    <C.Provider value={{ jobs, meta, settings, contacts, profile, marketOptions, loaded, uploadResume, saveProfile, online, run, toasts, now, lastSeen, refresh, setStage, patchJob, addJob, removeJob, saveContacts, saveSettings, toast, dismiss, openJob, openUid, markSeen }}>
      {children}
    </C.Provider>
  );
}

export const API_BASE = API;
`````

### File: app/src/styles.css
`````css
:root {
  --font-head: 'Sora', 'IBM Plex Sans', sans-serif; --font-body: 'IBM Plex Sans', system-ui, sans-serif; --mono: 'IBM Plex Mono', ui-monospace, monospace;
  --sidebar: #0b1830; --sidebar-2: #12233f; --bg: #f0f4f8; --surface: #fff; --surface-2: #f6f8fb;
  --text: #0f1b2d; --muted: #5b6b82; --border: #e2e8f0; --accent: #2b6cf6; --accent-2: #06b6d4; --on-accent: #fff;
  --good: #10b981; --warn: #f59e0b; --bad: #ef4444; --purple: #8b5cf6; --cyan: #06b6d4;
  --track: color-mix(in srgb, var(--text) 9%, transparent);
  --shadow: 0 1px 2px rgba(15, 27, 45, .05), 0 8px 24px -12px rgba(15, 27, 45, .14);
  --shadow-lg: 0 30px 60px -20px rgba(8, 18, 38, .45);
  --r: 14px;
}
[data-dark='1'] { --shadow: 0 1px 2px rgba(0,0,0,.4), 0 10px 30px -14px rgba(0,0,0,.6); --track: rgba(255,255,255,.08); }
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font-body); font-size: 14px; -webkit-font-smoothing: antialiased; transition: background .3s; }
h1, h2, h3, h4, h5, h6 { font-family: var(--font-head); margin: 0; letter-spacing: -.01em; }
button { font: inherit; color: inherit; cursor: pointer; border: 0; background: none; }
button:disabled { opacity: .5; cursor: not-allowed; }
input, select, textarea { font: inherit; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 8px 11px; outline: none; transition: border .15s, box-shadow .15s; }
input:focus, select:focus, textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent); }
a { color: var(--accent); }
code { font-family: var(--mono); background: var(--surface-2); padding: 1px 6px; border-radius: 6px; }
.muted { color: var(--muted); } .small { font-size: 12px; } .pad { padding: 14px; } .spacer { flex: 1; } .grow { flex: 1; }
::-webkit-scrollbar { width: 10px; height: 10px; } ::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--muted) 35%, transparent); border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }

/* ---------- layout ---------- */
.app { display: grid; grid-template-columns: 264px 1fr; min-height: 100vh; }
main { min-width: 0; }
.content { padding: 22px 28px 60px; animation: pageIn .35s ease; }
@keyframes pageIn { from { opacity: 0; transform: translateY(6px); } }

/* ---------- sidebar ---------- */
.sidebar { position: sticky; top: 0; height: 100vh; overflow-y: auto; color: #dbe5f5; padding: 18px 14px; display: flex; flex-direction: column; gap: 16px;
  background: radial-gradient(120% 60% at 0% 0%, color-mix(in srgb, var(--accent) 28%, transparent), transparent 60%), linear-gradient(180deg, var(--sidebar), var(--sidebar-2)); }
.sidebar::before { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .35; background-image: radial-gradient(rgba(255,255,255,.09) 1px, transparent 1px); background-size: 18px 18px; mask-image: linear-gradient(180deg, #000, transparent 70%); }
.brand { display: flex; align-items: center; gap: 10px; padding: 4px 6px; position: relative; }
.brand-mark { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--accent), var(--accent-2)); box-shadow: 0 8px 24px -6px color-mix(in srgb, var(--accent) 70%, transparent); }
.brand b { font-family: var(--font-head); font-size: 19px; color: #fff; display: block; letter-spacing: -.02em; }
.brand span { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: color-mix(in srgb, var(--accent-2) 80%, #fff); }
.me { position: relative; display: flex; gap: 11px; align-items: center; padding: 12px; border-radius: 14px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08); }
.avatar { flex: none; width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; font-family: var(--font-head); font-weight: 700; color: #fff;
  background: linear-gradient(135deg, var(--accent), var(--accent-2)); box-shadow: 0 0 0 3px rgba(255,255,255,.12); }
.me b { color: #fff; font-size: 14px; display: block; } .me span { font-size: 11.5px; color: #9fb0cb; line-height: 1.35; display: block; margin-top: 2px; }
nav { display: flex; flex-direction: column; gap: 2px; position: relative; }
.nav { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 10px; color: #b7c5dc; font-weight: 500; text-align: left; transition: all .15s; position: relative; }
.nav:hover { background: rgba(255,255,255,.06); color: #fff; }
.nav.active { background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 38%, transparent), rgba(255,255,255,.04)); color: #fff; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
.nav.active::before { content: ''; position: absolute; left: -14px; top: 8px; bottom: 8px; width: 4px; border-radius: 0 4px 4px 0; background: var(--accent-2); box-shadow: 0 0 12px var(--accent-2); }
.nav span { flex: 1; } .nav em { font-style: normal; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; background: rgba(255,255,255,.1); }
.side-block { position: relative; } .side-block h6 { font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color: #7f93b3; margin: 4px 12px 6px; font-weight: 600; }
.mkt { display: flex; width: 100%; padding: 6px 12px; border-radius: 8px; color: #b7c5dc; font-size: 13px; } .mkt:hover { background: rgba(255,255,255,.06); color: #fff; }
.mkt span { flex: 1; text-align: left; } .mkt em { font-style: normal; font-weight: 600; color: color-mix(in srgb, var(--accent-2) 70%, #fff); }
.side-foot { margin-top: auto; display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 12px; background: rgba(0,0,0,.18); position: relative; }
.side-foot b { display: block; font-size: 12.5px; color: #fff; } .side-foot span { font-size: 11.5px; color: #8fa3c2; }
.pulse { width: 10px; height: 10px; border-radius: 50%; flex: none; background: #64748b; position: relative; }
.pulse.on { background: var(--good); } .pulse.busy { background: var(--warn); }
.pulse.on::after, .pulse.busy::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 2px solid currentColor; color: inherit; animation: ping 1.6s ease-out infinite; }
.pulse.on::after { border-color: var(--good); } .pulse.busy::after { border-color: var(--warn); }
@keyframes ping { from { transform: scale(.6); opacity: 1; } to { transform: scale(1.8); opacity: 0; } }

/* ---------- topbar ---------- */
.topbar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 18px; padding: 14px 28px; background: color-mix(in srgb, var(--bg) 82%, transparent); backdrop-filter: blur(14px) saturate(1.4); border-bottom: 1px solid var(--border); }
.topbar h1 { font-size: 21px; font-weight: 700; white-space: nowrap; }
.search { flex: 1; max-width: 520px; display: flex; align-items: center; gap: 8px; padding: 0 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; color: var(--muted); box-shadow: var(--shadow); }
.search input { border: 0; box-shadow: none !important; background: transparent; flex: 1; padding: 10px 0; }
.top-right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.synced { font-size: 12px; color: var(--muted); white-space: nowrap; }
.live-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 20px; font-size: 12px; font-weight: 600; border: 1px solid var(--border); background: var(--surface); }
.live-pill.on { color: var(--good); border-color: color-mix(in srgb, var(--good) 40%, var(--border)); } .live-pill.off { color: var(--muted); }
.btn-refresh { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px; font-weight: 600; color: var(--on-accent);
  background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, var(--accent-2))); box-shadow: 0 8px 20px -8px color-mix(in srgb, var(--accent) 80%, transparent), inset 0 1px 0 rgba(255,255,255,.25); transition: transform .15s, box-shadow .15s; }
.btn-refresh:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 26px -8px color-mix(in srgb, var(--accent) 90%, transparent); }
.btn-refresh.spinning svg, .spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.icon-btn { width: 36px; height: 36px; display: inline-grid; place-items: center; border-radius: 10px; color: var(--muted); } .icon-btn:hover { background: var(--surface-2); color: var(--text); }
.progress { position: absolute; left: 0; right: 0; bottom: -1px; height: 3px; background: transparent; overflow: hidden; }
.progress div { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-2), var(--accent)); background-size: 200% 100%; animation: shimmer 1.2s linear infinite; transition: width .4s; box-shadow: 0 0 10px var(--accent-2); }
@keyframes shimmer { to { background-position: -200% 0; } }
.theme-pick { position: relative; }
.theme-menu { position: absolute; right: 0; top: 44px; width: 250px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow-lg); padding: 8px; z-index: 40; animation: pop .15s ease; }
.theme-menu h6 { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: var(--muted); padding: 6px 8px; }
.theme-menu button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px; border-radius: 9px; text-align: left; }
.theme-menu button:hover { background: var(--surface-2); } .theme-menu button.on { background: color-mix(in srgb, var(--accent) 12%, transparent); font-weight: 600; }
.sw { display: flex; } .sw i { width: 14px; height: 14px; border-radius: 50%; margin-right: -4px; border: 2px solid var(--surface); }
@keyframes pop { from { opacity: 0; transform: translateY(-4px) scale(.98); } }

/* ---------- common ---------- */
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); box-shadow: var(--shadow); padding: 18px; min-width: 0; }
.card-h { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.card-h h3 { font-size: 15.5px; display: flex; align-items: center; gap: 7px; } .card-h p { margin: 3px 0 0; color: var(--muted); font-size: 12.5px; }
.grid-2 { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 18px; margin-bottom: 18px; }
.grid-2.top { align-items: start; }
.grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-bottom: 18px; }
.stack { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.link { color: var(--accent); font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.btn-primary { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-weight: 600; color: var(--on-accent); background: var(--accent); box-shadow: 0 6px 16px -8px var(--accent); }
.btn-primary:hover:not(:disabled) { filter: brightness(1.08); } .btn-primary.sm, .btn-ghost.sm { padding: 6px 11px; font-size: 12.5px; border-radius: 9px; }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 10px; font-weight: 600; border: 1px solid var(--border); background: var(--surface); text-decoration: none; color: var(--text); white-space: nowrap; }
.btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
.btn-danger { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 10px; color: var(--bad); border: 1px solid color-mix(in srgb, var(--bad) 35%, var(--border)); margin-top: 18px; }
.btn-apply { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 9px; font-weight: 700; font-size: 12.5px; letter-spacing: .04em; color: #fff; white-space: nowrap;
  background: linear-gradient(180deg, #3b7bff, #1f5de0); box-shadow: 0 6px 14px -6px rgba(43,108,246,.8), inset 0 1px 0 rgba(255,255,255,.25); transition: transform .12s; }
.btn-apply:hover { transform: translateY(-1px); } .btn-apply.big { padding: 13px 22px; font-size: 14px; border-radius: 12px; }
.btn-copy { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 9px; font-weight: 600; font-size: 12.5px; border: 1px solid var(--border); background: var(--surface); white-space: nowrap; transition: all .15s; }
.btn-copy:hover { border-color: var(--accent); color: var(--accent); } .btn-copy.compact { padding: 8px; }
.btn-copy.done { background: var(--good); border-color: var(--good); color: #fff; }
.btn-more { display: block; margin: 16px auto; padding: 10px 20px; border-radius: 10px; border: 1px dashed var(--border); color: var(--muted); font-weight: 600; } .btn-more:hover { color: var(--accent); border-color: var(--accent); }
.chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px; border-radius: 20px; font-size: 11.5px; font-weight: 600; background: var(--surface-2); color: var(--muted); border: 1px solid var(--border); white-space: nowrap; }
.chip-accent { background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent); border-color: color-mix(in srgb, var(--accent) 25%, transparent); }
.chip-ai { background: linear-gradient(90deg, rgba(139,92,246,.14), rgba(236,72,153,.14)); color: #9b5cf6; border-color: rgba(139,92,246,.3); }
.chip-new { background: var(--warn); color: #fff; border-color: transparent; animation: glow 1.8s ease-in-out infinite; }
.chip-good { background: color-mix(in srgb, var(--good) 12%, transparent); color: var(--good); border-color: color-mix(in srgb, var(--good) 30%, transparent); }
.chip-muted { opacity: .8; }
@keyframes glow { 50% { box-shadow: 0 0 0 4px rgba(245,158,11,.2); } }
.score { --c: var(--accent); flex: none; width: 54px; height: 54px; border-radius: 14px; display: grid; place-content: center; text-align: center; line-height: 1;
  background: color-mix(in srgb, var(--c) 12%, var(--surface)); border: 1.5px solid color-mix(in srgb, var(--c) 45%, transparent); color: var(--c); }
.score b { font-family: var(--font-head); font-size: 19px; font-weight: 800; } .score span { font-size: 10px; font-weight: 700; letter-spacing: .08em; margin-top: 3px; opacity: .9; }
.score.sm { width: 42px; height: 42px; border-radius: 11px; } .score.sm b { font-size: 15px; } .score.sm span { font-size: 9px; }
.logo { flex: none; border-radius: 11px; object-fit: cover; background: #fff; border: 1px solid var(--border); }
.logo-fallback { display: grid; place-items: center; color: #fff; font-family: var(--font-head); font-weight: 700; border: 0; }
.empty { text-align: center; padding: 40px 20px; color: var(--muted); } .empty svg { opacity: .5; } .empty h4 { color: var(--text); margin: 10px 0 4px; }
.kw { display: flex; flex-wrap: wrap; gap: 6px; } .kw span { font-size: 12px; padding: 4px 10px; border-radius: 8px; background: var(--surface-2); border: 1px solid var(--border); }
.toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; } .toolbar.wrap { flex-wrap: wrap; } .toolbar.tight { margin-bottom: 10px; }
.toolbar select { padding: 7px 10px; font-size: 13px; }
.count { font-weight: 600; color: var(--muted); font-size: 13px; }
.seg { display: inline-flex; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 3px; }
.seg button { padding: 5px 10px; border-radius: 7px; font-size: 12.5px; font-weight: 600; color: var(--muted); display: inline-flex; } .seg button.on { background: var(--accent); color: var(--on-accent); }
.tog { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 20px; border: 1px solid var(--border); background: var(--surface); font-size: 12.5px; font-weight: 600; color: var(--muted); }
.tog.on { background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent); border-color: var(--accent); }
.check { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); }
.row-end { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
.h-sec { font-size: 17px; margin: 8px 0 14px; }

/* ---------- job rows ---------- */
.list { display: flex; flex-direction: column; gap: 8px; }
.job-row { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 13px; background: var(--surface); border: 1px solid var(--border); cursor: pointer; transition: transform .15s, box-shadow .15s, border-color .15s; position: relative; }
.board .job-row { box-shadow: var(--shadow); }
.job-row:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--accent) 40%, var(--border)); box-shadow: 0 10px 28px -14px color-mix(in srgb, var(--accent) 50%, transparent); }
.job-row.is-new::before { content: ''; position: absolute; left: -1px; top: 10px; bottom: 10px; width: 3px; border-radius: 3px; background: var(--warn); box-shadow: 0 0 10px var(--warn); }
.job-row.dense { padding: 9px 11px; gap: 11px; }
.job-main { flex: 1; min-width: 0; }
.job-title { display: flex; align-items: center; gap: 8px; min-width: 0; }
.job-title .t { font-weight: 600; font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dense .job-title .t { font-size: 13.5px; }
.code { font-family: var(--mono); font-size: 11px; color: var(--muted); background: var(--surface-2); padding: 1px 6px; border-radius: 5px; flex: none; }
.job-sub { font-size: 12.5px; color: var(--muted); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .job-sub b { color: var(--text); font-weight: 600; } .dot { margin: 0 6px; opacity: .5; }
.job-chips { display: flex; gap: 6px; margin-top: 7px; flex-wrap: wrap; }
.job-actions { display: flex; gap: 6px; flex: none; }
.star { color: var(--border); padding: 4px; } .star:hover { color: var(--warn); } .star.on { color: var(--warn); } .star.on svg { fill: var(--warn); }
.fresh-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 8px; }
.fresh-grid .job-row .job-actions .btn-copy { display: none; }

/* ---------- dashboard ---------- */
.hero { position: relative; overflow: hidden; border-radius: 20px; padding: 30px 34px; color: #fff; display: flex; align-items: center; gap: 24px; margin-bottom: 18px;
  background: linear-gradient(125deg, var(--sidebar) 0%, var(--sidebar-2) 45%, color-mix(in srgb, var(--accent) 70%, var(--sidebar)) 100%); box-shadow: var(--shadow-lg); }
.hero-mesh { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(40% 70% at 85% 20%, color-mix(in srgb, var(--accent-2) 55%, transparent), transparent 70%), radial-gradient(35% 60% at 65% 110%, color-mix(in srgb, var(--accent) 70%, transparent), transparent 70%);
  animation: drift 14s ease-in-out infinite alternate; }
.hero-mesh::after { content: ''; position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px); background-size: 34px 34px; mask-image: radial-gradient(70% 90% at 80% 40%, #000, transparent); }
@keyframes drift { to { transform: translate(-3%, 4%) scale(1.06); } }
.hero-l { position: relative; flex: 1; } .hero-r { position: relative; }
.eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 5px 11px; border-radius: 20px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.18); }
.hero h2 { font-size: 34px; font-weight: 800; margin: 14px 0 8px; letter-spacing: -.03em; }
.hero p { font-size: 15.5px; color: rgba(255,255,255,.85); margin: 0 0 18px; max-width: 640px; line-height: 1.55; } .hero p b { color: #fff; } .hero .hl { background: var(--warn); color: #1b1300; padding: 1px 8px; border-radius: 6px; }
.hero-cta { display: flex; gap: 10px; flex-wrap: wrap; }
.hero .btn-primary { background: #fff; color: var(--sidebar); box-shadow: 0 10px 24px -10px rgba(0,0,0,.6); padding: 12px 18px; }
.btn-glass { display: inline-flex; align-items: center; gap: 7px; padding: 12px 16px; border-radius: 11px; font-weight: 600; color: #fff; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.22); backdrop-filter: blur(6px); }
.btn-glass:hover:not(:disabled) { background: rgba(255,255,255,.18); }
.hero-foot { display: block; margin-top: 16px; font-size: 12px; color: rgba(255,255,255,.6); }
.hero .ring-label b { color: #fff; font-size: 40px; } .hero .ring-label span { color: rgba(255,255,255,.7); } .hero .ring circle:first-child { stroke: rgba(255,255,255,.12); }
.kpis { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
.kpi { --t: var(--accent); position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px; padding: 15px; border-radius: var(--r); background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow); }
.kpi::after { content: ''; position: absolute; right: -30px; top: -30px; width: 90px; height: 90px; border-radius: 50%; background: var(--t); opacity: .07; }
.kpi.tone-good { --t: var(--good); } .kpi.tone-warn { --t: var(--warn); } .kpi.tone-purple { --t: var(--purple); } .kpi.tone-cyan { --t: var(--cyan); } .kpi.tone-accent { --t: var(--accent); }
.kpi-i { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; color: var(--t); background: color-mix(in srgb, var(--t) 13%, transparent); flex: none; }
.kpi span { font-size: 12px; color: var(--muted); font-weight: 500; display: block; } .kpi b { font-family: var(--font-head); font-size: 25px; font-weight: 800; }
.kpi > div { position: relative; z-index: 1; } .kpi .spark { position: absolute; right: 10px; top: 10px; opacity: .85; }
.runs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.runs li { display: flex; align-items: center; gap: 8px; font-size: 13px; } .runs time { margin-left: auto; color: var(--muted); font-size: 12px; }
.dotc { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); } .dotc.good { background: var(--good); }
.flame { color: #f97316; }

/* ---------- charts ---------- */
.ring { position: relative; display: inline-grid; place-items: center; flex: none; }
.ring svg { position: absolute; inset: 0; } .ring-arc { transition: stroke-dasharray 1s cubic-bezier(.2,.8,.2,1); animation: ringIn 1.1s cubic-bezier(.2,.8,.2,1); }
@keyframes ringIn { from { stroke-dasharray: 0 999; } }
.ring-label { position: relative; text-align: center; line-height: 1.05; } .ring-label b { font-family: var(--font-head); font-size: 22px; font-weight: 800; display: block; }
.ring-label span { font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
.donut-wrap { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
.legend { list-style: none; padding: 0; margin: 0; flex: 1; min-width: 140px; display: flex; flex-direction: column; gap: 7px; }
.legend li { display: flex; align-items: center; gap: 8px; font-size: 12.5px; } .legend i { width: 10px; height: 10px; border-radius: 3px; flex: none; }
.legend b { margin-left: auto; } .legend em { font-style: normal; color: var(--muted); width: 36px; text-align: right; font-size: 11.5px; }
.hbars { display: flex; flex-direction: column; gap: 9px; }
.hbar { display: grid; grid-template-columns: minmax(90px, 36%) 1fr 34px; align-items: center; gap: 10px; font-size: 12.5px; }
.hbar.click { cursor: pointer; } .hbar.click:hover .hbar-l { color: var(--accent); }
.hbar-l { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .hbar b { text-align: right; }
.hbar-t { height: 9px; border-radius: 9px; background: var(--track); overflow: hidden; }
.hbar-f { height: 100%; border-radius: 9px; animation: grow .9s cubic-bezier(.2,.8,.2,1) both; transform-origin: left; }
@keyframes grow { from { transform: scaleX(0); } }
.funnel { display: flex; flex-direction: column; gap: 6px; align-items: center; }
.funnel-row { width: 100%; display: flex; justify-content: center; }
.funnel-bar { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; border-radius: 9px; color: #fff; font-size: 12.5px; font-weight: 600;
  background: linear-gradient(90deg, var(--accent), var(--accent-2)); animation: grow .8s cubic-bezier(.2,.8,.2,1) both; transform-origin: center; min-width: 140px; }
.funnel-bar b { font-family: var(--font-head); font-size: 15px; }
.cols { display: flex; align-items: flex-end; gap: 8px; padding-top: 18px; }
.col { flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 6px; }
.col-b { width: 100%; border-radius: 7px 7px 3px 3px; position: relative; min-height: 2px; animation: rise .8s cubic-bezier(.2,.8,.2,1) both; transform-origin: bottom; opacity: .9; }
.col-b em { position: absolute; top: -17px; left: 0; right: 0; text-align: center; font-style: normal; font-size: 11px; font-weight: 700; color: var(--text); }
.col span { font-size: 11px; color: var(--muted); }
@keyframes rise { from { transform: scaleY(0); } }
.probs { display: flex; justify-content: space-around; gap: 10px; padding: 6px 0 14px; flex-wrap: wrap; }
.probs > div { display: flex; flex-direction: column; align-items: center; gap: 6px; } .probs > div > span { font-size: 12px; color: var(--muted); font-weight: 600; }
.probs.big { margin-bottom: 18px; padding: 22px; }

/* ---------- pipeline ---------- */
.kanban { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(250px, 1fr); gap: 12px; overflow-x: auto; padding-bottom: 10px; align-items: start; }
.kcol { background: color-mix(in srgb, var(--surface-2) 70%, var(--bg)); border: 1px solid var(--border); border-radius: 16px; padding: 10px; min-height: 60vh; transition: all .15s; }
.kcol.over { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, var(--bg)); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent); }
.kcol header { display: flex; align-items: center; gap: 8px; padding: 4px 6px 10px; font-family: var(--font-head); font-weight: 700; }
.kcol header i { width: 10px; height: 10px; border-radius: 50%; background: var(--c); box-shadow: 0 0 0 4px color-mix(in srgb, var(--c) 20%, transparent); }
.kcol header em { margin-left: auto; font-style: normal; font-size: 12px; padding: 1px 9px; border-radius: 20px; background: var(--surface); border: 1px solid var(--border); }
.kcards { display: flex; flex-direction: column; gap: 8px; max-height: 72vh; overflow-y: auto; padding-right: 2px; }
.kcard { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 10px; cursor: grab; box-shadow: var(--shadow); transition: transform .12s; }
.kcard:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--accent) 40%, var(--border)); } .kcard:active { cursor: grabbing; }
.kc-top { display: flex; gap: 9px; align-items: flex-start; } .kc-top > div:nth-child(2) { flex: 1; min-width: 0; }
.kc-top b { font-size: 13px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3; }
.kc-top span { font-size: 12px; color: var(--muted); }
.kc-meta { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--muted); margin-top: 8px; } .kc-meta .grip { margin-left: auto; opacity: .4; } .kc-meta .ai { color: #9b5cf6; }
.kc-act { display: flex; gap: 6px; margin-top: 9px; } .kc-act .btn-apply { padding: 6px 10px; font-size: 11.5px; }

/* ---------- table ---------- */
.table-wrap { padding: 0; overflow-x: auto; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); padding: 11px 12px; border-bottom: 1px solid var(--border); background: var(--surface-2); white-space: nowrap; }
.tbl td { padding: 9px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tbl tbody tr { cursor: pointer; } .tbl tbody tr:hover { background: color-mix(in srgb, var(--accent) 5%, transparent); }
.tbl .t { font-weight: 600; } .tbl .t .chip { margin-left: 6px; } .row-act { display: flex; gap: 6px; }
.srcs { display: flex; gap: 5px; flex-wrap: wrap; } .mini { font-size: 11px; padding: 2px 7px; border-radius: 6px; background: var(--surface-2); border: 1px solid var(--border); } .mini.error { color: var(--bad); } .mini.skipped { opacity: .6; }

/* ---------- drawer ---------- */
.drawer-wrap { position: fixed; inset: 0; z-index: 60; pointer-events: none; background: rgba(6, 12, 24, 0); transition: background .25s; }
.drawer-wrap.open { pointer-events: auto; background: rgba(6, 12, 24, .45); backdrop-filter: blur(2px); }
.drawer { position: absolute; right: 0; top: 0; bottom: 0; width: min(720px, 100%); background: var(--bg); box-shadow: var(--shadow-lg); display: flex; flex-direction: column; animation: slideIn .3s cubic-bezier(.2,.8,.2,1); }
@keyframes slideIn { from { transform: translateX(40px); opacity: 0; } }
.drawer-hero { --c: var(--accent); position: relative; padding: 24px 26px 18px; background: linear-gradient(160deg, color-mix(in srgb, var(--c) 14%, var(--surface)), var(--surface) 60%); border-bottom: 1px solid var(--border); }
.drawer-hero .close { position: absolute; right: 14px; top: 14px; }
.dh-top { display: flex; gap: 16px; align-items: flex-start; padding-right: 30px; }
.dh-t { flex: 1; min-width: 0; } .dh-t h2 { font-size: 21px; line-height: 1.25; margin: 6px 0 3px; } .dh-t p { margin: 0; font-size: 14.5px; }
.dh-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 9px; font-size: 12.5px; color: var(--muted); } .dh-meta span { display: inline-flex; align-items: center; gap: 5px; }
.dh-actions { display: flex; gap: 10px; margin-top: 18px; align-items: center; flex-wrap: wrap; }
.stage-select { padding: 11px 12px; font-weight: 600; border-radius: 11px; }
.url-box { display: block; width: 100%; margin-top: 12px; padding: 10px 12px; text-align: left; font-family: var(--mono); font-size: 12px; color: var(--accent); border: 1.5px dashed color-mix(in srgb, var(--accent) 45%, var(--border)); border-radius: 10px; background: color-mix(in srgb, var(--accent) 4%, var(--surface)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.url-box:hover { background: color-mix(in srgb, var(--accent) 9%, var(--surface)); } .url-box.done { color: var(--good); border-color: var(--good); }
.dh-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px; }
.tabs { display: flex; gap: 4px; padding: 0 22px; border-bottom: 1px solid var(--border); background: var(--surface); }
.tabs button { padding: 12px 12px; font-weight: 600; color: var(--muted); border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tabs button.on { color: var(--accent); border-color: var(--accent); }
.drawer-body { flex: 1; overflow-y: auto; padding: 20px 26px 40px; }
.drawer-body h4 { font-size: 13.5px; margin: 20px 0 10px; }
.why { display: flex; gap: 12px; padding: 14px 16px; border-radius: 13px; background: var(--surface); border: 1px solid var(--border); border-left: 4px solid var(--accent); }
.why svg { color: var(--accent); flex: none; margin-top: 2px; } .why p { margin: 0; line-height: 1.6; } .why.small { font-size: 12.5px; border-left-width: 1px; display: block; padding: 10px 12px; }
.breakdown { display: flex; flex-direction: column; gap: 8px; }
.bd { display: grid; grid-template-columns: 150px 1fr 52px; align-items: center; gap: 10px; font-size: 12.5px; text-transform: capitalize; }
.bd-t { height: 8px; background: var(--track); border-radius: 8px; overflow: hidden; } .bd-t div { height: 100%; border-radius: 8px; background: linear-gradient(90deg, var(--accent), var(--accent-2)); animation: grow .8s cubic-bezier(.2,.8,.2,1) both; transform-origin: left; }
.bd b { text-align: right; } .bd em { font-style: normal; color: var(--muted); font-weight: 400; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 18px; }
.note-card { padding: 13px 15px; border-radius: 13px; border: 1px solid var(--border); background: var(--surface); }
.note-card h5 { display: flex; align-items: center; gap: 6px; font-size: 13px; margin-bottom: 6px; } .note-card.warn h5 { color: #d97706; } .note-card.good h5 { color: var(--good); }
.note-card ul { margin: 0; padding-left: 18px; font-size: 12.5px; line-height: 1.55; } .note-card li { margin: 4px 0; }
.resume-pick { display: flex; align-items: center; gap: 12px; margin-top: 14px; padding: 13px 15px; border-radius: 13px; background: color-mix(in srgb, var(--accent) 7%, var(--surface)); border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border)); }
.resume-pick svg { color: var(--accent); } .resume-pick div { flex: 1; } .resume-pick b { display: block; font-size: 13.5px; } .resume-pick span { font-size: 12px; color: var(--muted); }
.draft-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.draft-tabs button { padding: 7px 12px; border-radius: 20px; font-size: 12.5px; font-weight: 600; border: 1px solid var(--border); background: var(--surface); color: var(--muted); }
.draft-tabs button.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
.draft { border: 1px solid var(--border); border-radius: 13px; background: var(--surface); overflow: hidden; }
.draft-h { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--border); background: var(--surface-2); }
.draft pre, .jd pre { margin: 0; padding: 16px; white-space: pre-wrap; word-wrap: break-word; font-family: var(--font-body); font-size: 13px; line-height: 1.65; max-height: 58vh; overflow-y: auto; }
.jd pre { background: var(--surface); border: 1px solid var(--border); border-radius: 13px; max-height: none; }
.notes { width: 100%; min-height: 150px; resize: vertical; }
.timeline { list-style: none; margin: 0; padding: 0 0 0 6px; border-left: 2px solid var(--border); }
.timeline li { position: relative; padding: 0 0 14px 16px; font-size: 13px; } .timeline li i { position: absolute; left: -7px; top: 3px; width: 12px; height: 12px; border-radius: 50%; background: var(--border); }
.timeline li i.on { background: var(--accent); } .timeline time { display: block; font-size: 11.5px; color: var(--muted); }

/* ---------- console / toasts ---------- */
.console { position: fixed; right: 20px; bottom: 20px; z-index: 55; width: 520px; max-height: 70vh; display: flex; flex-direction: column; border-radius: 16px; overflow: hidden;
  background: #0a1222; color: #cfe0f7; border: 1px solid #1d2b45; box-shadow: var(--shadow-lg); transform: translateY(20px) scale(.98); opacity: 0; pointer-events: none; transition: all .22s cubic-bezier(.2,.8,.2,1); }
.console.open { transform: none; opacity: 1; pointer-events: auto; }
.console header { display: flex; align-items: center; gap: 9px; padding: 12px 14px; background: #0f1a30; border-bottom: 1px solid #1d2b45; }
.console header b { font-family: var(--font-head); font-size: 14px; color: #fff; } .console header .icon-btn { margin-left: auto; color: #8ca2c4; } .console header .icon-btn:hover { background: #1a2742; color: #fff; }
.src-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; padding: 10px 12px; }
.src { display: flex; align-items: center; gap: 6px; padding: 7px 9px; border-radius: 9px; background: #111d35; font-size: 12px; } .src b { margin-left: auto; font-family: var(--mono); color: #fff; }
.src .ok { color: #34d399; } .src .err { color: #f87171; } .src .skip { color: #94a3b8; } .src .spin { color: #fbbf24; }
.logs { flex: 1; overflow-y: auto; padding: 8px 12px; font-family: var(--mono); font-size: 11.5px; min-height: 180px; max-height: 42vh; }
.log { display: flex; gap: 8px; padding: 2px 0; line-height: 1.45; } .log time { color: #5f7599; flex: none; } .log em { font-style: normal; color: #60a5fa; flex: none; min-width: 70px; }
.log.warn span { color: #fbbf24; } .log.error span { color: #f87171; } .log.success span { color: #34d399; font-weight: 600; } .log.muted { color: #6b7f9f; }
.console footer { padding: 10px 12px; border-top: 1px solid #1d2b45; display: flex; justify-content: flex-end; }
.console-fab { position: fixed; right: 20px; bottom: 20px; z-index: 50; display: flex; align-items: center; gap: 10px; padding: 11px 16px; border-radius: 30px; background: #0a1222; color: #fff; font-weight: 600; font-size: 13px; box-shadow: var(--shadow-lg); animation: pop .2s ease; }
.toasts { position: fixed; top: 76px; right: 22px; z-index: 80; display: flex; flex-direction: column; gap: 10px; }
.toast { display: flex; gap: 11px; align-items: flex-start; width: 340px; padding: 13px 15px; border-radius: 14px; background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-lg); cursor: pointer; animation: toastIn .35s cubic-bezier(.2,.8,.2,1); border-left: 4px solid var(--accent); }
.toast b { font-size: 14px; } .toast p { margin: 3px 0 0; font-size: 12.5px; color: var(--muted); }
.toast.good { border-left-color: var(--good); } .toast.good svg { color: var(--good); } .toast.warn { border-left-color: var(--warn); } .toast.warn svg { color: var(--warn); } .toast.bad { border-left-color: var(--bad); } .toast.bad svg { color: var(--bad); } .toast.info svg { color: var(--accent); }
@keyframes toastIn { from { transform: translateX(30px); opacity: 0; } }

/* ---------- resume / contacts / forms ---------- */
.profile h3 { font-size: 22px; } .profile h5 { display: flex; align-items: center; gap: 6px; margin: 16px 0 8px; font-size: 13px; } .profile p { margin: 4px 0; }
.pf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
.pf-grid div { padding: 10px 12px; border-radius: 11px; background: var(--surface-2); border: 1px solid var(--border); } .pf-grid span { font-size: 11.5px; color: var(--muted); display: block; } .pf-grid b { font-size: 13px; }
.files { display: grid; gap: 8px; } .file { display: flex; gap: 10px; align-items: center; padding: 10px 12px; border-radius: 11px; border: 1px solid var(--border); text-decoration: none; color: var(--text); }
.file:hover { border-color: var(--accent); } .file svg { color: var(--bad); } .file b { display: block; font-size: 13px; } .file span { font-size: 11.5px; color: var(--muted); }
.versions { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.version { --h: 0; position: relative; padding: 16px; border-radius: var(--r); background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow); overflow: hidden; }
.version::before { content: ''; position: absolute; left: 0; top: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--accent), var(--accent-2)); filter: hue-rotate(calc(var(--h) * 1deg)); }
.v-h { display: flex; gap: 11px; align-items: center; } .v-n { font-family: var(--font-head); font-weight: 800; font-size: 22px; color: color-mix(in srgb, var(--accent) 50%, var(--border)); }
.v-h b { display: block; font-family: var(--font-head); font-size: 14.5px; } .v-h em { font-style: normal; font-size: 12px; color: var(--accent); font-weight: 600; }
.version p { font-size: 12.5px; margin: 9px 0 0; line-height: 1.5; }
.version ul { list-style: none; padding: 0; margin: 12px 0 0; display: flex; flex-direction: column; gap: 5px; }
.version li { font-size: 12px; padding: 6px 8px; border-radius: 8px; background: var(--surface-2); cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.version li:hover { color: var(--accent); } .version li b { color: var(--accent); margin-right: 7px; }
.form, .contact-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form label, .contact-form label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; font-weight: 600; color: var(--muted); text-transform: capitalize; }
.form .full, .contact-form .full { grid-column: 1 / -1; } textarea { resize: vertical; }
.contact-form { padding: 14px; border-radius: 13px; background: var(--surface-2); border: 1px solid var(--border); margin-bottom: 14px; }
.contacts { display: flex; flex-direction: column; gap: 8px; }
.contact { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--border); cursor: pointer; } .contact:hover { border-color: var(--accent); }
.c-av { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent); }
.c-main { flex: 1; min-width: 0; } .c-main b { display: block; } .c-main span { font-size: 12px; color: var(--muted); } .c-main em { display: block; font-size: 12px; font-style: normal; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.c-act { display: flex; gap: 2px; align-items: center; }
.preview { display: flex; flex-direction: column; align-items: center; gap: 16px; } .preview .breakdown { width: 100%; }
.sources { display: flex; flex-direction: column; gap: 8px; }
.source { display: flex; gap: 12px; align-items: flex-start; padding: 12px; border-radius: 12px; border: 1px solid var(--border); cursor: pointer; transition: all .15s; }
.source.on { border-color: color-mix(in srgb, var(--accent) 45%, var(--border)); background: color-mix(in srgb, var(--accent) 5%, var(--surface)); }
.source input { margin-top: 10px; } .s-i { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: var(--surface-2); color: var(--accent); flex: none; }
.source b { display: block; } .source span { font-size: 12.5px; color: var(--muted); } .source em { display: block; font-style: normal; font-size: 12px; margin-top: 4px; font-weight: 600; } .source em.ok { color: var(--good); } .source em.warn { color: #d97706; }
.keybox { display: flex; gap: 8px; align-items: center; margin-top: 14px; padding: 10px 12px; border-radius: 12px; background: var(--surface-2); border: 1px dashed var(--border); } .keybox input { flex: 1; }
.markets { display: flex; flex-wrap: wrap; gap: 8px; } .mkt-t { display: flex; align-items: center; gap: 7px; padding: 7px 11px; border-radius: 10px; border: 1px solid var(--border); font-size: 13px; cursor: pointer; }
.mkt-t.on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 7%, transparent); } .mkt-t em { font-style: normal; font-size: 11px; color: var(--muted); }
.card h5 { margin: 18px 0 8px; font-size: 13px; }
.queries { display: flex; flex-wrap: wrap; gap: 7px; }
.q { display: inline-flex; align-items: center; gap: 6px; padding: 5px 8px; border-radius: 9px; border: 1px solid var(--border); font-size: 12.5px; background: var(--surface); }
.q.core { border-color: color-mix(in srgb, var(--warn) 50%, var(--border)); } .q button { color: var(--muted); display: inline-flex; } .q button:first-child { color: var(--warn); }
.q.add input { border: 0; padding: 0; width: 130px; box-shadow: none !important; background: transparent; }

@media (max-width: 1300px) { .kpis { grid-template-columns: repeat(3, 1fr); } .grid-3 { grid-template-columns: 1fr 1fr; } }
@media (max-width: 1050px) {
  .app { grid-template-columns: 1fr; } .sidebar { position: relative; height: auto; } .grid-2, .grid-3 { grid-template-columns: 1fr; }
  .synced { display: none; } .topbar { flex-wrap: wrap; } .fresh-grid { grid-template-columns: 1fr; } .hero { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 640px) {
  .content { padding: 16px; } .topbar { padding: 12px 16px; } .kpis { grid-template-columns: 1fr 1fr; } .job-row { flex-wrap: wrap; } .job-actions { width: 100%; }
  .console { left: 12px; right: 12px; width: auto; } .two, .form, .contact-form, .pf-grid { grid-template-columns: 1fr; } .bd { grid-template-columns: 100px 1fr 44px; }
}

/* ---------- onboarding / upload ---------- */
.onboard { min-height: 100vh; display: grid; place-items: center; padding: 40px 20px;
  background: radial-gradient(60% 60% at 15% 10%, color-mix(in srgb, var(--accent) 35%, transparent), transparent 60%), radial-gradient(50% 60% at 90% 90%, color-mix(in srgb, var(--accent-2) 30%, transparent), transparent 60%), linear-gradient(135deg, var(--sidebar), var(--sidebar-2)); }
.upload { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; max-width: 1080px; width: 100%; align-items: center; position: relative; }
.upload.compact { grid-template-columns: 1fr; max-width: 620px; gap: 0; }
.up-hero { color: #fff; } .up-hero h2 { font-size: 40px; line-height: 1.1; margin: 16px 0 14px; font-weight: 800; letter-spacing: -.03em; }
.up-hero p { color: rgba(255,255,255,.8); font-size: 15.5px; line-height: 1.6; }
.up-steps { list-style: none; padding: 0; margin: 22px 0 0; display: flex; flex-direction: column; gap: 10px; } .up-steps li { display: flex; gap: 9px; align-items: center; color: rgba(255,255,255,.9); } .up-steps svg { color: var(--accent-2); }
.up-card { background: var(--surface); border-radius: 20px; padding: 26px; box-shadow: var(--shadow-lg); border: 1px solid var(--border); }
.up-card h3 { font-size: 19px; margin-bottom: 14px; } .up-card h5 { display: flex; align-items: center; gap: 6px; margin: 18px 0 8px; font-size: 13px; }
.drop { border: 2px dashed var(--border); border-radius: 16px; padding: 30px 16px; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; text-align: center; color: var(--muted); transition: all .15s; background: var(--surface-2); }
.drop:hover, .drop.drag { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 7%, var(--surface)); color: var(--accent); }
.drop.has { border-style: solid; border-color: var(--good); color: var(--good); } .drop b { color: var(--text); font-size: 15px; } .drop span { font-size: 12.5px; }
.up-row { display: flex; flex-wrap: wrap; gap: 7px; }
.pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 20px; border: 1px solid var(--border); font-size: 12.5px; font-weight: 600; cursor: pointer; color: var(--muted); user-select: none; }
.pill input { display: none; } .pill.on { background: color-mix(in srgb, var(--accent) 12%, transparent); border-color: var(--accent); color: var(--accent); } .pill.fixed { cursor: default; }
.btn-primary.big { width: 100%; justify-content: center; padding: 14px; font-size: 15px; margin-top: 20px; border-radius: 13px; }
.err-msg { color: var(--bad); font-size: 13px; margin: 12px 0 0; }
.up-close { position: absolute; right: 12px; top: 12px; z-index: 2; }
.modal-wrap { position: fixed; inset: 0; z-index: 70; background: rgba(6,12,24,.55); backdrop-filter: blur(3px); display: grid; place-items: center; padding: 20px; animation: pageIn .2s ease; overflow-y: auto; }
.me { width: 100%; text-align: left; cursor: pointer; transition: background .15s; } .me:hover { background: rgba(255,255,255,.1); } .me .me-up { margin-left: auto; color: #8fa3c2; flex: none; }
.skills-grid { margin-bottom: 22px; } .card h5.first { margin-top: 0; }
@media (max-width: 900px) { .upload { grid-template-columns: 1fr; } .up-hero h2 { font-size: 30px; } }
`````

### File: app/src/types.ts
`````ts
export type Stage = 'New' | 'Ready' | 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Rejected';
export const STAGES: Stage[] = ['New', 'Ready', 'Applied', 'Screening', 'Interview', 'Offer'];
export const ALL_STAGES: Stage[] = [...STAGES, 'Rejected'];

export interface Breakdown { skills: number; experience: number; domain: number; tools: number; seniority: number; location: number; keyword: number }

export interface Job {
  uid: string; code: string; source: string; extId: string; url: string;
  title: string; company: string; location: string; logo?: string; salary?: string;
  postedAt: string; postedText?: string; description?: string; tags?: string[];
  seniority?: string; employmentType?: string; industries?: string; applicants?: string;
  market: string; marketKind: 'Local' | 'Remote' | 'Relocation'; marketId: string; workMode: string;
  match: number; breakdown: Breakdown; priority: 'A' | 'B' | 'C' | 'D';
  shortlistProb: number; interviewProb: number; offerProb: number; ats: number;
  resumeVersion: string; family: string; aiFlag: boolean;
  matchedKeywords: string[]; matchedSkills: string[]; toolsHit: string[];
  whyMatch: string; gaps: string[]; tailoring: string[];
  firstSeenAt: string; lastSeenAt: string; isNewRun?: boolean;
  // pipeline overlay
  stage?: Stage; notes?: string; starred?: boolean; updatedAt?: string; appliedAt?: string;
  history?: { stage: Stage; at: string }[];
}

export interface PipelineEntry { stage?: Stage; notes?: string; starred?: boolean; updatedAt?: string; appliedAt?: string; history?: { stage: Stage; at: string }[] }

export interface Contact { id: string; name: string; company: string; role: string; email?: string; linkedin?: string; phone?: string; lastContact?: string; notes?: string; jobUid?: string }

export interface Market { id: string; label: string; kind: string; prefix: string; linkedin: string; remote?: boolean; enabled: boolean; noSearch?: boolean; match?: string }

export interface Settings {
  markets: Market[]; queries: { q: string; core: boolean; ai?: boolean }[];
  recencyDays: number; autoRefreshMin: number; enrichLimit: number; minScore: number;
  sources: Record<string, boolean>; hasTinyfishKey?: boolean;
}

export interface SourceStatus { name: string; status: 'running' | 'done' | 'error' | 'skipped'; count: number; errors?: number; note?: string }
export interface LogEntry { t: string; level: 'info' | 'warn' | 'error' | 'success'; source: string; msg: string }
export interface RunRecord { at: string; trigger: string; added: number; updated: number; found: number; sources: Record<string, SourceStatus> }
export interface Meta { lastRefresh: string | null; runs?: RunRecord[]; counters?: Record<string, number> }

export interface SkillGroup { key: string; label: string; domain: string; terms: string[]; roles?: string[]; hits?: number; core: boolean; proof: string }
export interface ResumeVersion { id: string; name: string; focus: string; bestFor: string; file: string; keys?: string[] }
export interface Story { q?: string; s?: string; t?: string; a?: string; r?: string; bullet?: string; group?: string }
export interface Profile {
  version: number; source: 'parser' | 'curated'; key: string; createdAt?: string;
  name: string; firstName: string; headline: string; email: string; phone: string; linkedin: string;
  city: string; country: string; years: number; yearsLabel: string; availability: string; workAuth: string;
  education: string; summary?: string; topSkills: string[]; certifications: string[]; domains: string[];
  experience: { role: string; company: string; period: string; where: string }[];
  keywords: string[]; skills: SkillGroup[]; tools: string[]; targetTitles: string[];
  stories?: Story[]; resumeVersions: ResumeVersion[]; resumeFiles: Record<string, { label: string; file: string }>;
  markets: Market[]; queries: { q: string; core: boolean; ai?: boolean }[];
  salary?: Record<string, { range: string; stretch: string; note: string }>;
}
export interface MarketOption { id: string; label: string; prefix: string; linkedin: string }
`````
