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
