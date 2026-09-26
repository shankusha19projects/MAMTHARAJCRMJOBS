import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UploadCloud, BarChart3, Briefcase, CheckCircle2, CircleAlert, FileText, Kanban, LayoutDashboard, Loader2, Palette, PlusCircle, Radio, RefreshCw, Search, Settings2, Terminal, Users, X, XCircle, Info, MinusCircle } from 'lucide-react';
import { useStore } from '../store';
import { cx, timeAgo } from '../lib/util';
import { THEMES, applyTheme } from '../lib/themes';

export type Page = 'dashboard' | 'pipeline' | 'board' | 'resume' | 'contacts' | 'analytics' | 'add' | 'sources';
export const NAV: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'pipeline', label: 'Pipeline', icon: <Kanban size={18} /> },
  { id: 'board', label: 'Job Board', icon: <Briefcase size={18} /> },
  { id: 'resume', label: 'Resume Center', icon: <FileText size={18} /> },
  { id: 'contacts', label: 'Contacts & Prep', icon: <Users size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { id: 'add', label: 'Add Job', icon: <PlusCircle size={18} /> },
  { id: 'sources', label: 'Sources & Scrapers', icon: <Settings2 size={18} /> },
];

export function Sidebar({ page, go, onMarket, onUpload }: { page: Page; go: (p: Page) => void; onMarket: (m: string) => void; onUpload: () => void }) {
  const { jobs, online, meta, now, run, profile } = useStore();
  const markets = useMemo(() => {
    const m: Record<string, number> = {};
    for (const j of jobs) m[j.market] = (m[j.market] || 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [jobs]);
  const counts: Partial<Record<Page, number>> = {
    board: jobs.length,
    pipeline: jobs.filter((j) => j.stage && j.stage !== 'New' && j.stage !== 'Rejected').length,
  };
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><svg viewBox="0 0 32 32" width="30" height="30"><path d="M4 22 L16 4 L28 22 L16 17 Z" fill="currentColor" /><path d="M10 26 L16 21 L22 26" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" /></svg></div>
        <div><b>JobPilot</b><span>CRM · live</span></div>
      </div>
      <button className="me" onClick={onUpload} title="Upload a new or updated resume">
        <div className="avatar">{(profile?.name || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('')}</div>
        <div><b>{profile?.name || 'No resume yet'}</b><span>{profile?.headline || 'Click to upload your resume'}</span></div>
        <UploadCloud size={15} className="me-up" />
      </button>
      <nav>
        {NAV.map((n) => (
          <button key={n.id} className={cx('nav', page === n.id && 'active')} onClick={() => go(n.id)}>
            {n.icon}<span>{n.label}</span>{counts[n.id] != null && <em>{counts[n.id]}</em>}
          </button>
        ))}
      </nav>
      <div className="side-block">
        <h6>Markets</h6>
        {markets.map(([m, c]) => (
          <button key={m} className="mkt" onClick={() => onMarket(m)}><span>{m}</span><em>{c}</em></button>
        ))}
      </div>
      <div className="side-foot">
        <span className={cx('pulse', online ? (run.running ? 'busy' : 'on') : 'off')} />
        <div>
          <b>{online ? (run.running ? 'Scraping live…' : 'Live · connected') : 'Offline snapshot'}</b>
          <span>{meta.lastRefresh ? `Synced ${timeAgo(meta.lastRefresh, now)}` : 'Never synced'}</span>
        </div>
      </div>
    </aside>
  );
}

export function Topbar({ title, query, setQuery, onConsole }: { title: string; query: string; setQuery: (s: string) => void; onConsole: () => void }) {
  const { refresh, run, online, meta, now } = useStore();
  const [themeOpen, setThemeOpen] = useState(false);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('jobpilot-theme') || 'jobpilot'; } catch { return 'jobpilot'; } });
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { applyTheme(THEMES.find((t) => t.id === theme) || THEMES[0]); try { localStorage.setItem('jobpilot-theme', theme); } catch { /* */ } }, [theme]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName);
      if (e.key === '/' && !typing) { e.preventDefault(); input.current?.focus(); }
      if (e.key.toLowerCase() === 'r' && !typing && !e.ctrlKey && !e.metaKey) refresh();
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [refresh]);
  const pct = run.progress.total ? Math.round((run.progress.done / run.progress.total) * 100) : 0;
  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div className="search">
        <Search size={16} />
        <input ref={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search jobs, companies, skills…  ( / )" />
        {query && <button onClick={() => setQuery('')}><X size={14} /></button>}
      </div>
      <div className="top-right">
        <button className={cx('live-pill', online ? 'on' : 'off')} onClick={onConsole} title="Open live scrape console">
          <Radio size={14} />{online ? (run.running ? `${pct}%` : 'Live') : 'Offline'}
        </button>
        <span className="synced">{meta.lastRefresh ? `Updated ${timeAgo(meta.lastRefresh, now)}` : ''}</span>
        <button className={cx('btn-refresh', run.running && 'spinning')} onClick={() => (run.running ? onConsole() : refresh())} title="Refresh: scrape and pull the latest jobs (R)">
          <RefreshCw size={16} /><span>{run.running ? 'Pulling latest…' : 'Refresh'}</span>
        </button>
        <div className="theme-pick">
          <button className="icon-btn" onClick={() => setThemeOpen((o) => !o)} title="Theme"><Palette size={18} /></button>
          {themeOpen && (
            <div className="theme-menu" onMouseLeave={() => setThemeOpen(false)}>
              <h6>Theme</h6>
              {THEMES.map((t) => (
                <button key={t.id} className={cx(theme === t.id && 'on')} onClick={() => setTheme(t.id)}>
                  <span className="sw">{t.swatch.map((c) => <i key={c} style={{ background: c }} />)}</span>{t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {run.running && <div className="progress"><div style={{ width: `${Math.max(4, pct)}%` }} /></div>}
    </header>
  );
}

const statusIcon = (s: string) => s === 'done' ? <CheckCircle2 size={14} className="ok" /> : s === 'error' ? <XCircle size={14} className="err" /> : s === 'skipped' ? <MinusCircle size={14} className="skip" /> : <Loader2 size={14} className="spin" />;

export function LiveConsole({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { run, online, refresh, meta } = useStore();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.scrollTo({ top: 1e9 }); }, [run.logs.length]);
  const sources = Object.values(run.sources);
  const lastRun = meta.runs?.[0];
  return (
    <div className={cx('console', open && 'open')}>
      <header>
        <Terminal size={16} /><b>Live scrape console</b>
        <span className={cx('pulse', online ? (run.running ? 'busy' : 'on') : 'off')} />
        <button className="icon-btn" onClick={onClose}><X size={16} /></button>
      </header>
      <div className="src-grid">
        {(sources.length ? sources : Object.values(lastRun?.sources || {}).map((s: any, i) => ({ ...s, name: Object.keys(lastRun!.sources)[i] }))).map((s: any) => (
          <div key={s.name} className={cx('src', s.status)}>{statusIcon(s.status)}<span>{s.name}</span><b>{s.count || 0}</b></div>
        ))}
        {!sources.length && !lastRun && <p className="muted">No runs yet. Press Refresh.</p>}
      </div>
      <div className="logs" ref={box}>
        {run.logs.map((l, i) => (
          <div key={i} className={cx('log', l.level)}>
            <time>{new Date(l.t).toLocaleTimeString()}</time><em>{l.source}</em><span>{l.msg}</span>
          </div>
        ))}
        {!run.logs.length && <div className="log muted"><span>{online ? 'Idle. Logs stream here in real time while scraping.' : 'Server offline. Run start.bat to enable live scraping.'}</span></div>}
      </div>
      <footer>
        <button className="btn-refresh" disabled={run.running || !online} onClick={refresh}><RefreshCw size={15} />{run.running ? 'Running…' : 'Run refresh now'}</button>
      </footer>
    </div>
  );
}

export function Toasts() {
  const { toasts, dismiss } = useStore();
  const icon = { good: <CheckCircle2 size={18} />, info: <Info size={18} />, warn: <CircleAlert size={18} />, bad: <XCircle size={18} /> };
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={cx('toast', t.kind)} onClick={() => dismiss(t.id)}>
          {icon[t.kind]}<div><b>{t.title}</b>{t.body && <p>{t.body}</p>}</div>
        </div>
      ))}
    </div>
  );
}
