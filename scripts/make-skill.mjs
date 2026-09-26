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
