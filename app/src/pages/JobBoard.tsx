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
