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
