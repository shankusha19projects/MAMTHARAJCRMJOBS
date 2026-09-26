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
