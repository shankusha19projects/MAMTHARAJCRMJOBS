# JobPilot CRM — Personal Job-Search Command Center (Claude Skill)

**How to use this file:** Open Claude, upload this `.md` file **together with your resume** (PDF or DOCX), and send the message:

> "Build my JobPilot CRM using this skill file and my attached resume."

Claude will read your resume, scrape fresh job listings that fit your profile, score every one, and generate a single self-contained `JobPilot-CRM.html` file you can open in any browser. No setup, no accounts, no coding. Just upload and go.

---

## What you get

A single offline HTML app — a private job-search CRM tailored to **your** background — with eight sections:

1. **Dashboard** — today's application queue, jobs posted in the last 72 hours (apply first!), pipeline funnel, average match score.
2. **Pipeline** — Kanban board; move each job through New → Ready → Applied → Screening → Interview → Offer.
3. **Job Board** — every scraped job with a real **APPLY** button (opens the live posting) and a **Copy** button (share the link with friends).
4. **Resume Center** — which of your resume versions to fire at which job, plus improvement themes pulled from all the job descriptions.
5. **Contacts & Prep** — ready-to-send recruiter emails, LinkedIn DMs, referral asks, thank-you notes.
6. **Analytics** — priority mix, market split, work-mode breakdown, top companies, shortlist/interview/offer probabilities.
7. **Add Job** — paste any job description and it auto-scores against your profile.
8. **Job Drawer** (opens on any job) — full fit analysis, ATS score breakdown, gaps/talking points, and auto-generated cover letter, recruiter email, LinkedIn message, follow-up, interview prep, and salary guidance — all with one-click copy.

Everything saves to your browser automatically (localStorage), so your pipeline stage changes persist between sessions.

---

# INSTRUCTIONS FOR CLAUDE

You are building a personalized JobPilot CRM. Follow these steps exactly.

## Step 1 — Read the resume and build a candidate profile

Extract from the uploaded resume:

- **Name, phone, email, location** (city + country).
- **Target role(s)** and seniority (years of experience).
- **Core skills / tools / technologies** (the concrete hard skills — languages, platforms, products).
- **Certifications.**
- **Domains** (e.g. healthcare, fintech, endpoint/IT, data, cloud, security, PM/BA).
- **Work authorization** if stated (citizen, visa, needs sponsorship, open to relocation).
- **A `PROFILE_KEYWORDS` list** — 25–40 lowercase keywords drawn from the resume that define a strong job match. These drive the scoring and the Add Job feature.

Then define **2–8 resume versions** the candidate could tailor per job family (e.g. one per specialization, one seniority-lead variant, one remote variant). Give each a `name`, a one-line `focus`, and a `best for` note. If the resume only supports one angle, that's fine — create fewer.

**Ask the candidate** (one short message, tappable options if possible) for anything critical that's missing or ambiguous:
- Preferred locations / markets (local city, remote-from-home, relocation, specific countries).
- Whether to include AI-adjacent roles.
- Recency window (default: jobs posted within the last 30 days).

If they don't answer, proceed with sensible defaults: their resume city + remote, 30-day window, include AI-adjacent + all well-fitting roles.

## Step 2 — Scrape live job listings

Pull **real, currently-open** listings that fit the profile. Rules:

- **Only use real, verified, clickable job URLs.** Never fabricate or construct a URL from a pattern — every link must come from an actual scrape result and point to a live posting.
- **LinkedIn guest pages are the most reliable free source.** If you have a web-scraping/fetch tool (e.g. TinyFish `fetch_content`, or any browser/fetch capability), fetch LinkedIn guest job-search pages — they return real `linkedin.com/jobs/view/<slug>-<jobid>` URLs without login. Useful URL patterns:
  - `https://www.linkedin.com/jobs/search?keywords=<KEYWORDS>&location=<CITY>&f_TPR=r2592000` (last 30 days)
  - Add `&f_WT=2` for remote-only.
  - `https://in.linkedin.com/jobs/<role>-jobs-<city>` guest landing pages.
  - Replace `in.` with the candidate's country subdomain as appropriate.
- If a scraping tool reports **exhausted credits**, is **bot-blocked**, or errors, tell the candidate plainly and fall back to whatever source works. Indeed and Naukri often bot-block direct fetches — don't depend on them.
- Run **several searches** across the candidate's role titles, key tools, and each requested market (local / remote / relocation / AI-adjacent). Aim for **40–70 quality jobs**. De-duplicate by job ID.
- Capture per job: title, company, location, work mode, approximate posting date/recency, and the verified URL. Grab a full job description when the page provides one — it improves scoring and the "why this matches" text.

If you genuinely have **no** web access, say so and offer to build the CRM from a batch of job descriptions the candidate pastes in instead. Never silently invent listings.

## Step 3 — Score every job

For each job compute a **match score (0–100)** from seven weighted categories:

| Category | Weight |
|---|---|
| Skills match | 25 |
| Experience alignment | 25 |
| Domain fit | 15 |
| Tools / tech match | 15 |
| Seniority fit | 10 |
| Location / market fit | 5 |
| Keyword match | 5 |

Derive each subscore by comparing the job's title + description + tags against the candidate's `PROFILE_KEYWORDS`, tools, domains, and seniority. Then:

- **Priority:** A ≥ 85, B ≥ 70, C ≥ 55, D < 55.
- **shortlistProb** = round(match × 0.94) for local-market jobs, × 0.90 for relocation.
- **interviewProb** = round(shortlistProb × 0.76).
- **offerProb** = round(shortlistProb × 0.40).
- **ats** = match − 2 (a readability proxy).
- Pick the best-fit **resumeVersion** for each job.
- Write a custom **whyMatch** (2–4 sentences, specific to this company and the candidate's real experience — no generic filler).
- List 2–3 **gaps / talking points** and 2–3 **tailoring** tips.
- Flag **aiFlag: true** if the employer is an AI company or the JD emphasizes AI/automation tooling.
- Set **market** to one of the candidate's requested buckets (e.g. "Local", "Remote", "Relocation", or a country label).

Sort by priority then match, and assign sequential IDs (a short prefix from the candidate's city + a number, e.g. `BLR01`, `NYC01`).

## Step 4 — Build the app

Create a **React 18 + TypeScript single-page app, bundled with Parcel 2, then inlined into ONE self-contained `.html` file** (all JS and CSS embedded — no external files, works offline by double-clicking).

**Design system:**
- Fonts: `Sora` (headings) + `IBM Plex Sans` (body), loaded from Google Fonts.
- Colors: navy sidebar `#0b1830`, panels `#12233f`/`#0f2040`, accent blue `#2b6cf6`, content background `#f0f4f8`, plus green/amber/red/purple/cyan for status.
- Hand-rolled SVG charts (rings, bars, donut, funnel) — no chart library. Icons from `lucide-react` (pin version `0.383.0`).

**State:** persist all jobs to `localStorage` under a candidate-specific key (e.g. `jobpilot-<name>`). On load, restore saved data if present, else seed with the scraped jobs.

**The eight sections** exactly as described in "What you get" above. The sidebar shows the candidate's name, headline, and live badge counts per market.

### CRITICAL — links and clipboard must work from `file://`

The candidate will open this HTML **directly from disk**, where browser security blocks some APIs. You **must**:

1. **Big, obvious APPLY buttons** — not tiny icons. Every job row and the detail drawer get a filled blue `APPLY` / `APPLY ON LINKEDIN` button that opens the real URL in a new tab, with a same-tab fallback if pop-ups are blocked:
   ```js
   function openJobUrl(url){ const w=window.open(url,'_blank','noopener'); if(!w){ window.location.href=url; } }
   ```
2. **Robust copy-to-clipboard with fallbacks** — `navigator.clipboard` fails silently on `file://`. Use a three-tier helper: modern API → hidden-textarea `execCommand('copy')` → `prompt()` showing the URL. Show a green "Copied!" confirmation on success:
   ```js
   function copyText(txt){
     return new Promise(res=>{
       const fallback=()=>{try{
         const ta=document.createElement('textarea');ta.value=txt;
         ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);
         ta.focus();ta.select();const ok=document.execCommand('copy');
         document.body.removeChild(ta);res(ok);
       }catch(e){res(false);}};
       if(navigator.clipboard && window.isSecureContext){
         navigator.clipboard.writeText(txt).then(()=>res(true)).catch(fallback);
       } else fallback();
     });
   }
   ```
   Call sites should `prompt()` the text if `copyText` resolves `false`, so copy **always** works one way or another.
3. **Visible URL text** in the job drawer — show the raw `linkedin.com/jobs/view/...` link in a dashed box that copies on click, so links are never hidden behind an icon.
4. Copy buttons on: every job row, the job drawer (both a formatted snippet and the raw URL), and every outreach template in Contacts & Prep.

### Job Drawer auto-drafts

For each job, generate and one-click-copy: **cover letter, recruiter email, LinkedIn DM, follow-up message, interview prep (with STAR answers + questions to ask), and salary guidance** — all populated with the candidate's real name, contact info, top skills, and certifications, plus the specific company and role.

### Build & inline pipeline (Parcel quirk)

After `parcel build`, Parcel 2 outputs **unquoted** HTML attributes. When inlining, match without quotes:
```python
import re, glob
html=open('dist/index.html').read()
js=open(glob.glob('dist/*.js')[0]).read()
css=open(glob.glob('dist/*.css')[0]).read()
html=re.sub(r'<script type=module src=/[^>]*></script>',
            lambda m:'<script type="module">'+js.replace('</script>','<\\/script>')+'</script>', html)
html=re.sub(r'<link rel=stylesheet href=/[^>]*>',
            lambda m:'<style>'+css+'</style>', html)
open('JobPilot-CRM.html','w').write(html)
```
Also set `"ignoreDeprecations": "6.0"` in `tsconfig.json` compilerOptions, and run `npm install` before building.

## Step 5 — Deliver

Save the final single HTML file and present it for download. In your closing message:
- State how many jobs were scraped, the priority/market breakdown, and the count of AI-adjacent roles.
- List the top Priority-A and Priority-B jobs with their verified apply links.
- Note any sources that were blocked or any tool-credit limits hit.
- Remind the candidate: open the file in a browser, use **APPLY** to go to a posting and **Copy** to share a link; for the most reliable clipboard, hosting it or opening via a local server runs it in a secure context (though the fallback works from disk too).

---

## Notes for the candidate (your friend)

- **Refresh anytime:** come back and say "refresh my JobPilot with the latest jobs" and Claude re-scrapes.
- **Add a job manually:** use the Add Job tab, or paste a JD to Claude and ask it to score and add it.
- **Your data is private:** everything lives in your browser's local storage and the offline HTML file. Nothing is uploaded anywhere.
- **Different city or field?** It adapts automatically to whatever your resume says — this file isn't tied to any one profession.

*Built as a reusable JobPilot skill. Upload this file + your resume to Claude to generate your own.*
