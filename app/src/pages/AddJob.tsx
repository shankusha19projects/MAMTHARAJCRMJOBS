import React, { useMemo, useState } from 'react';
import { Wand2 } from 'lucide-react';
import { scoreJob } from '../../../shared/scoring.js';
import { useStore } from '../store';
import { Ring } from '../components/charts';
import { Section } from '../components/ui';
import { prColor } from '../lib/util';

export function AddJob() {
  const { addJob, settings, openJob, toast, profile } = useStore();
  const markets = settings?.markets || profile?.markets || [];
  const [f, setF] = useState({ title: '', company: '', url: '', location: '', marketId: 'local', description: '' });
  const market = markets.find((m: any) => m.id === f.marketId) || markets[0];
  const live = useMemo(() => (f.title && profile && market ? scoreJob(f, market, profile) : null), [f, market, profile]);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="page">
      <div className="grid-2 top addjob">
        <Section title="Add a job" sub={`Paste any job description. It is scored live against ${profile?.firstName || 'your'}'s profile`}>
          <div className="form">
            <label><span>Job title *</span><input value={f.title} onChange={set('title')} placeholder="e.g. Senior Engineer" /></label>
            <label><span>Company *</span><input value={f.company} onChange={set('company')} placeholder="e.g. Microsoft" /></label>
            <label><span>Posting URL</span><input value={f.url} onChange={set('url')} placeholder="https://…" /></label>
            <label><span>Location</span><input value={f.location} onChange={set('location')} placeholder="City / Remote" /></label>
            <label><span>Market</span><select value={f.marketId} onChange={set('marketId')}>{markets.map((m: any) => <option key={m.id} value={m.id}>{m.label} ({m.kind})</option>)}</select></label>
            <label className="full"><span>Job description</span><textarea rows={12} value={f.description} onChange={set('description')} placeholder="Paste the full JD here…" /></label>
            <div className="full row-end">
              <button className="btn-primary" disabled={!f.title || !f.company} onClick={async () => {
                const j = await addJob(f as any);
                toast({ kind: 'good', title: `Added ${j.code}: match ${j.match}`, body: `${j.title} @ ${j.company}` });
                setF({ ...f, title: '', company: '', url: '', description: '' });
                openJob(j.uid);
              }}><Wand2 size={16} />Score & add to CRM</button>
            </div>
          </div>
        </Section>
        <Section title="Live score preview">
          {!live ? <p className="muted">Start typing a title to see the score.</p> : (
            <div className="preview">
              <Ring value={live.match} size={150} stroke={13} color={prColor(live.priority)} sub={`Priority ${live.priority}`} />
              <div className="breakdown">
                {Object.entries(live.breakdown).map(([k, v]) => (
                  <div key={k} className="bd"><span>{k}</span><div className="bd-t"><div style={{ width: `${((v as number) / ({ skills: 25, experience: 25, domain: 15, tools: 15, seniority: 10, location: 5, keyword: 5 } as any)[k]) * 100}%` }} /></div><b>{v as number}</b></div>
                ))}
              </div>
              <p className="why small">{live.whyMatch}</p>
              {!!live.matchedKeywords.length && <div className="kw">{live.matchedKeywords.map((k: string) => <span key={k}>{k}</span>)}</div>}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
