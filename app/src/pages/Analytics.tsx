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
