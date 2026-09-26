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
