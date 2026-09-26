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
