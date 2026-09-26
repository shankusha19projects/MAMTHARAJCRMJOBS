import React, { useEffect, useState } from 'react';
import { Fish, Globe, KeyRound, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import type { Settings } from '../types';
import { Section } from '../components/ui';
import { cx, timeAgo } from '../lib/util';

const SRC_INFO: Record<string, string> = {
  linkedin: 'LinkedIn guest job search + job detail pages (no login). Real linkedin.com/jobs/view links.',
  tinyfish: 'TinyFish Web Agent: Search finds postings across LinkedIn, Naukri, Bayt and Indeed; Fetch pulls full JDs when LinkedIn blocks. Free API key.',
  remotive: 'Remotive public API: remote tech jobs.',
  himalayas: 'Himalayas public API: remote jobs with location filters.',
  jobicy: 'Jobicy public API: remote sysadmin / IT support jobs.',
  remoteok: 'RemoteOK public API: remote jobs feed.',
};

export function Sources() {
  const { settings, saveSettings, online, meta, now, refresh, run, toast } = useStore();
  const [s, setS] = useState<Settings | null>(settings);
  const [key, setKey] = useState('');
  const [newQ, setNewQ] = useState('');
  useEffect(() => setS(settings), [settings]);
  if (!online || !s) return <div className="page"><Section title="Scraper server offline"><p>Start the local server to manage sources: double-click <code>start.bat</code> in <code>C:\myc\crm</code>, or run <code>npm start</code>. This page reconnects automatically.</p></Section></div>;
  const save = async (extra: any = {}) => { await saveSettings({ ...s, ...extra }); toast({ kind: 'good', title: 'Settings saved' }); };

  return (
    <div className="page">
      <div className="grid-2 top">
        <Section title="Scraper sources" sub="Toggle which sources run on Refresh" right={<button className="btn-refresh" disabled={run.running} onClick={refresh}><RefreshCw size={15} />{run.running ? 'Running…' : 'Refresh now'}</button>}>
          <div className="sources">
            {Object.entries(s.sources).map(([k, on]) => (
              <label key={k} className={cx('source', on && 'on')}>
                <input type="checkbox" checked={on} onChange={(e) => setS({ ...s, sources: { ...s.sources, [k]: e.target.checked } })} />
                <div className="s-i">{k === 'tinyfish' ? <Fish size={18} /> : <Globe size={18} />}</div>
                <div><b>{k === 'tinyfish' ? 'TinyFish Web Agent' : k[0].toUpperCase() + k.slice(1)}</b><span>{SRC_INFO[k]}</span>
                  {k === 'tinyfish' && <em className={s.hasTinyfishKey ? 'ok' : 'warn'}>{s.hasTinyfishKey ? '● API key configured' : '○ No API key yet. Seed postings from TinyFish are still verified each refresh.'}</em>}
                </div>
              </label>
            ))}
          </div>
          <div className="keybox">
            <KeyRound size={16} />
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={s.hasTinyfishKey ? '•••••••• (saved). Paste to replace' : 'Paste TinyFish API key (agent.tinyfish.ai/api-keys)'} />
            <button className="btn-primary sm" disabled={!key} onClick={async () => { await save({ tinyfishKey: key.trim() }); setKey(''); }}>Save key</button>
            {s.hasTinyfishKey && <button className="btn-ghost sm" onClick={() => save({ tinyfishKey: '' })}>Remove</button>}
          </div>
        </Section>

        <Section title="Schedule & filters">
          <div className="form">
            <label><span>Auto-refresh</span>
              <select value={s.autoRefreshMin} onChange={(e) => setS({ ...s, autoRefreshMin: +e.target.value })}>
                <option value={0}>Off (manual only)</option><option value={30}>Every 30 minutes</option><option value={60}>Every hour</option><option value={180}>Every 3 hours</option><option value={720}>Every 12 hours</option>
              </select></label>
            <label><span>Recency window</span>
              <select value={s.recencyDays} onChange={(e) => setS({ ...s, recencyDays: +e.target.value })}>
                {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>Last {d} day{d > 1 ? 's' : ''}</option>)}
              </select></label>
            <label><span>Min score to keep</span><input type="number" min={0} max={90} value={s.minScore} onChange={(e) => setS({ ...s, minScore: +e.target.value })} /></label>
            <label><span>JD enrich limit / run</span><input type="number" min={0} max={400} value={s.enrichLimit} onChange={(e) => setS({ ...s, enrichLimit: +e.target.value })} /></label>
          </div>
          <h5>Markets</h5>
          <div className="markets">
            {s.markets.map((m, i) => (
              <label key={m.id} className={cx('mkt-t', m.enabled && 'on')}>
                <input type="checkbox" checked={m.enabled} onChange={(e) => { const ms = [...s.markets]; ms[i] = { ...m, enabled: e.target.checked }; setS({ ...s, markets: ms }); }} />
                <b>{m.label}</b><em>{m.kind}</em>
              </label>
            ))}
          </div>
          <h5>Search queries <span className="muted">(core = also used for relocation markets)</span></h5>
          <div className="queries">
            {s.queries.map((q, i) => (
              <span key={q.q} className={cx('q', q.core && 'core')}>
                <button title="Toggle core" onClick={() => { const qs = [...s.queries]; qs[i] = { ...q, core: !q.core }; setS({ ...s, queries: qs }); }}>{q.core ? '★' : '☆'}</button>
                {q.q}<button onClick={() => setS({ ...s, queries: s.queries.filter((_, j) => j !== i) })}><Trash2 size={12} /></button>
              </span>
            ))}
            <span className="q add"><input value={newQ} onChange={(e) => setNewQ(e.target.value)} placeholder="Add query…" onKeyDown={(e) => { if (e.key === 'Enter' && newQ.trim()) { setS({ ...s, queries: [...s.queries, { q: newQ.trim(), core: false }] }); setNewQ(''); } }} /><Plus size={13} /></span>
          </div>
          <div className="row-end"><button className="btn-primary" onClick={() => save()}><Save size={15} />Save settings</button></div>
        </Section>
      </div>

      <Section title="Run history">
        <table className="tbl">
          <thead><tr><th>When</th><th>Trigger</th><th>Scanned</th><th>New</th><th>Updated</th><th>Per source</th></tr></thead>
          <tbody>
            {(meta.runs || []).map((r) => (
              <tr key={r.at}><td>{new Date(r.at).toLocaleString()} <span className="muted">({timeAgo(r.at, now)})</span></td><td>{r.trigger}</td><td>{r.found}</td><td><b>+{r.added}</b></td><td>{r.updated}</td>
                <td className="srcs">{Object.entries(r.sources || {}).map(([n, v]: any) => <span key={n} className={cx('mini', v.status)}>{n} {v.count}{v.errors ? ` ⚠${v.errors}` : ''}</span>)}</td></tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
