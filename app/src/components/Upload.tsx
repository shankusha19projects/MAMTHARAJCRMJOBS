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
