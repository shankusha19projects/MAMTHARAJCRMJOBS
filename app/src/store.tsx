import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { scoreJob, detectWorkMode } from '../../shared/scoring.js';
import seed from './seed.json';
import type { Contact, Job, LogEntry, MarketOption, Meta, PipelineEntry, Profile, Settings, SourceStatus, Stage } from './types';

// Server base: same origin when served by server.js, localhost when opened from disk.
const API = location.protocol.startsWith('http') ? '' : 'http://localhost:4321';
const LS_KEY = 'jobpilot-crm';

interface Local { profileKey?: string; pipeline: Record<string, PipelineEntry>; manual: Job[]; contacts: Contact[]; theme?: string; seen?: string }
const readLocal = (): Local => { try { return { pipeline: {}, manual: [], contacts: [], ...JSON.parse(localStorage.getItem(LS_KEY) || '{}') }; } catch { return { pipeline: {}, manual: [], contacts: [] }; } };
const writeLocal = (l: Local) => { try { localStorage.setItem(LS_KEY, JSON.stringify(l)); } catch { /* storage blocked */ } };

export interface Toast { id: number; kind: 'good' | 'info' | 'warn' | 'bad'; title: string; body?: string }
export interface RunState { running: boolean; progress: { done: number; total: number }; sources: Record<string, SourceStatus>; logs: LogEntry[]; startedAt?: string }

interface Ctx {
  jobs: Job[]; meta: Meta; settings: Settings | null; contacts: Contact[]; profile: Profile | null; marketOptions: MarketOption[]; loaded: boolean;
  uploadResume: (f: File, o: { relocation: string[]; remote: boolean; ai: boolean; recency: number }) => Promise<{ profile: Profile; samePerson: boolean }>;
  saveProfile: (p: Partial<Profile>) => Promise<void>;
  online: boolean; run: RunState; toasts: Toast[]; now: number; lastSeen: string;
  refresh: () => void; setStage: (uid: string, stage: Stage) => void; patchJob: (uid: string, p: PipelineEntry) => void;
  addJob: (j: Partial<Job> & { title: string; company: string; description: string; marketId: string }) => Promise<Job>;
  removeJob: (uid: string) => void; saveContacts: (c: Contact[]) => void; saveSettings: (s: Partial<Settings> & { tinyfishKey?: string }) => Promise<void>;
  toast: (t: Omit<Toast, 'id'>) => void; dismiss: (id: number) => void; openJob: (uid: string | null) => void; openUid: string | null;
  markSeen: () => void;
}
const C = createContext<Ctx>(null as any);
export const useStore = () => useContext(C);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const local = useRef<Local>(readLocal());
  const [profile, setProfile] = useState<Profile | null>((seed as any).profile || null);
  const [marketOptions, setMarketOptions] = useState<MarketOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [serverJobs, setServerJobs] = useState<Job[]>((seed as any).jobs || []);
  const [meta, setMeta] = useState<Meta>((seed as any).meta || { lastRefresh: null });
  const [settings, setSettings] = useState<Settings | null>(null);
  const [contacts, setContacts] = useState<Contact[]>(local.current.contacts.length ? local.current.contacts : (seed as any).contacts || []);
  const [pipeline, setPipeline] = useState<Record<string, PipelineEntry>>(local.current.pipeline);
  const [manual, setManual] = useState<Job[]>(local.current.manual);
  const [online, setOnline] = useState(false);
  const [run, setRun] = useState<RunState>({ running: false, progress: { done: 0, total: 0 }, sources: {}, logs: [] });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [now, setNow] = useState(Date.now());
  const [openUid, openJob] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState(local.current.seen || new Date(0).toISOString());
  const addedThisRun = useRef(0);

  const persistLocal = (p: Partial<Local>) => { local.current = { ...local.current, ...p }; writeLocal(local.current); };
  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x, { ...t, id }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 6000);
  }, []);
  const dismiss = (id: number) => setToasts((x) => x.filter((y) => y.id !== id));

  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(i); }, []);

  const loadState = useCallback(async () => {
    const r = await fetch(`${API}/api/state`);
    const d = await r.json();
    if (d.profile?.key && local.current.profileKey && d.profile.key !== local.current.profileKey) persistLocal({ pipeline: {}, manual: [], contacts: [], seen: undefined });
    if (d.profile?.key) persistLocal({ profileKey: d.profile.key });
    setProfile(d.profile); setMarketOptions(d.marketOptions || []);
    setServerJobs(d.jobs); setMeta(d.meta); setSettings(d.settings); setLoaded(true);
    if (d.contacts?.length || !local.current.contacts.length) setContacts(d.contacts || []);
    // merge pipeline: newer updatedAt wins; push local-only newer edits to server
    const merged: Record<string, PipelineEntry> = { ...local.current.pipeline };
    for (const j of d.jobs as Job[]) {
      const srv: PipelineEntry = { stage: j.stage, notes: j.notes, starred: j.starred, updatedAt: j.updatedAt, appliedAt: j.appliedAt, history: j.history };
      const loc = merged[j.uid];
      if (!loc || (srv.updatedAt && (!loc.updatedAt || srv.updatedAt >= loc.updatedAt))) { if (srv.updatedAt) merged[j.uid] = srv; }
      else if (loc.updatedAt && (!srv.updatedAt || loc.updatedAt > srv.updatedAt)) fetch(`${API}/api/pipeline/${encodeURIComponent(j.uid)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loc) }).catch(() => {});
    }
    setPipeline(merged); persistLocal({ pipeline: merged });
    return d;
  }, []);

  // Connect to server + live event stream (auto-reconnect)
  useEffect(() => {
    let es: EventSource | null = null; let stop = false; let retry: any;
    const connect = async () => {
      try {
        const d = await loadState();
        setOnline(true);
        if (d.running) setRun((r) => ({ ...r, running: true }));
      } catch { setOnline(false); setLoaded(true); retry = setTimeout(connect, 8000); return; }
      es = new EventSource(`${API}/api/events`);
      es.addEventListener('hello', (e: any) => { const d = JSON.parse(e.data); setRun((r) => ({ ...r, running: d.running, progress: d.progress, sources: d.sources || {}, logs: d.logs || [] })); });
      es.addEventListener('run-start', (e: any) => { addedThisRun.current = 0; setRun({ running: true, progress: { done: 0, total: 0 }, sources: {}, logs: [], startedAt: JSON.parse(e.data).startedAt }); });
      es.addEventListener('progress', (e: any) => { const p = JSON.parse(e.data); setRun((r) => ({ ...r, progress: p })); });
      es.addEventListener('source', (e: any) => { const s = JSON.parse(e.data); setRun((r) => ({ ...r, sources: { ...r.sources, [s.name]: s } })); });
      es.addEventListener('log', (e: any) => { const l = JSON.parse(e.data); setRun((r) => ({ ...r, logs: [...r.logs.slice(-250), l] })); });
      es.addEventListener('job', (e: any) => {
        const j = JSON.parse(e.data) as Job; addedThisRun.current++;
        setServerJobs((xs) => (xs.some((x) => x.uid === j.uid) ? xs : [j, ...xs]));
      });
      es.addEventListener('job-removed', (e: any) => { const { uid } = JSON.parse(e.data); setServerJobs((xs) => xs.filter((x) => x.uid !== uid)); });
      es.addEventListener('pipeline', (e: any) => { const { uid, entry } = JSON.parse(e.data); setPipeline((p) => { const n = { ...p, [uid]: entry }; persistLocal({ pipeline: n }); return n; }); });
      es.addEventListener('contacts', (e: any) => setContacts(JSON.parse(e.data)));
      es.addEventListener('settings', (e: any) => setSettings(JSON.parse(e.data)));
      es.addEventListener('profile', (e: any) => setProfile(JSON.parse(e.data)));
      es.addEventListener('reload', () => { loadState().catch(() => {}); });
      es.addEventListener('run-end', async (e: any) => {
        const d = JSON.parse(e.data);
        setRun((r) => ({ ...r, running: false }));
        await loadState().catch(() => {});
        if (d.error) toast({ kind: 'bad', title: 'Refresh failed', body: d.error });
        else toast({ kind: d.added ? 'good' : 'info', title: d.added ? `+${d.added} new jobs pulled` : 'You\'re up to date', body: `${d.updated} refreshed · ${d.total} jobs in your CRM` });
      });
      es.onerror = () => { setOnline(false); es?.close(); if (!stop) retry = setTimeout(connect, 5000); };
    };
    connect();
    return () => { stop = true; es?.close(); clearTimeout(retry); };
  }, [loadState, toast]);

  const jobs = useMemo(() => {
    const ids = new Set(serverJobs.map((j) => j.uid));
    const all = [...serverJobs, ...manual.filter((m) => !ids.has(m.uid))];
    return all.map((j) => ({ ...j, ...(pipeline[j.uid] || {}), stage: (pipeline[j.uid]?.stage || j.stage || 'New') as Stage }));
  }, [serverJobs, manual, pipeline]);

  const patchJob = useCallback((uid: string, p: PipelineEntry) => {
    setPipeline((cur) => {
      const prev = cur[uid] || { stage: 'New' as Stage, history: [] };
      const at = new Date().toISOString();
      const entry: PipelineEntry = { ...prev, ...p, updatedAt: at };
      if (p.stage && p.stage !== prev.stage) entry.history = [...(prev.history || []), { stage: p.stage, at }];
      if (p.stage === 'Applied' && !prev.appliedAt) entry.appliedAt = at;
      const n = { ...cur, [uid]: entry };
      persistLocal({ pipeline: n });
      fetch(`${API}/api/pipeline/${encodeURIComponent(uid)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).catch(() => {});
      return n;
    });
  }, []);
  const setStage = useCallback((uid: string, stage: Stage) => patchJob(uid, { stage }), [patchJob]);

  const refresh = useCallback(async () => {
    if (!online) { toast({ kind: 'warn', title: 'Scraper server is offline', body: 'Double-click start.bat (or run "npm start" in C:\\myc\\crm) and the app reconnects automatically.' }); return; }
    setRun((r) => ({ ...r, running: true, logs: [], sources: {}, progress: { done: 0, total: 0 } }));
    await fetch(`${API}/api/refresh`, { method: 'POST' }).catch(() => toast({ kind: 'bad', title: 'Could not reach the server' }));
  }, [online, toast]);

  const addJob: Ctx['addJob'] = async (j) => {
    if (online) {
      const r = await fetch(`${API}/api/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(j) });
      const job = await r.json();
      setServerJobs((xs) => (xs.some((x) => x.uid === job.uid) ? xs : [job, ...xs]));
      return job;
    }
    if (!profile) throw new Error('No profile loaded');
    const ms = settings?.markets || profile.markets;
    const market = ms.find((m: any) => m.id === j.marketId) || ms[0];
    const sc = scoreJob(j, market, profile);
    const now = new Date().toISOString();
    const job = { source: 'Manual', extId: now, url: j.url || '', location: j.location || market.label, tags: [], ...j, ...sc,
      uid: `Manual:${Date.now()}`, code: `ADD${String(manual.length + 1).padStart(2, '0')}`, market: market.kind === 'Relocation' ? market.label : market.kind, marketKind: market.kind,
      workMode: detectWorkMode(`${j.title} ${j.description}`, market), postedAt: now, firstSeenAt: now, lastSeenAt: now } as Job;
    const m = [job, ...manual]; setManual(m); persistLocal({ manual: m });
    return job;
  };
  const removeJob = (uid: string) => {
    if (uid.startsWith('Manual:') && manual.some((m) => m.uid === uid)) { const m = manual.filter((x) => x.uid !== uid); setManual(m); persistLocal({ manual: m }); }
    setServerJobs((xs) => xs.filter((x) => x.uid !== uid));
    if (online) fetch(`${API}/api/jobs/${encodeURIComponent(uid)}`, { method: 'DELETE' }).catch(() => {});
  };
  const saveContacts = (c: Contact[]) => {
    setContacts(c); persistLocal({ contacts: c });
    if (online) fetch(`${API}/api/contacts`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contacts: c }) }).catch(() => {});
  };
  const saveSettings: Ctx['saveSettings'] = async (s) => {
    const r = await fetch(`${API}/api/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) });
    setSettings(await r.json());
  };
  const uploadResume: Ctx['uploadResume'] = async (f, o) => {
    const q = new URLSearchParams({ relocation: o.relocation.join(','), remote: o.remote ? '1' : '0', ai: o.ai ? '1' : '0', recency: String(o.recency) });
    const r = await fetch(`${API}/api/resume?${q}`, { method: 'POST', headers: { 'X-Filename': encodeURIComponent(f.name), 'Content-Type': 'application/octet-stream' }, body: f });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Upload failed');
    if (!d.samePerson) { setPipeline({}); setManual([]); setContacts([]); persistLocal({ pipeline: {}, manual: [], contacts: [], profileKey: d.profile.key }); }
    setProfile(d.profile);
    await loadState().catch(() => {});
    return d;
  };
  const saveProfile: Ctx['saveProfile'] = async (p) => {
    const r = await fetch(`${API}/api/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
    setProfile(await r.json());
  };
  const markSeen = () => { const t = new Date().toISOString(); setLastSeen(t); persistLocal({ seen: t }); };

  return (
    <C.Provider value={{ jobs, meta, settings, contacts, profile, marketOptions, loaded, uploadResume, saveProfile, online, run, toasts, now, lastSeen, refresh, setStage, patchJob, addJob, removeJob, saveContacts, saveSettings, toast, dismiss, openJob, openUid, markSeen }}>
      {children}
    </C.Provider>
  );
}

export const API_BASE = API;
