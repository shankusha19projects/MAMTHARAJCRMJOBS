import React, { useEffect, useState } from 'react';
import { StoreProvider, useStore } from './store';
import { LiveConsole, NAV, Sidebar, Toasts, Topbar, type Page } from './components/Shell';
import { Drawer } from './components/Drawer';
import { Dashboard } from './pages/Dashboard';
import { Pipeline } from './pages/Pipeline';
import { JobBoard, type BoardFilter } from './pages/JobBoard';
import { ResumeCenter } from './pages/ResumeCenter';
import { Contacts } from './pages/Contacts';
import { Analytics } from './pages/Analytics';
import { AddJob } from './pages/AddJob';
import { Sources } from './pages/Sources';
import { UploadResume } from './components/Upload';

function Shell() {
  const [page, setPage] = useState<Page>(() => { try { return (sessionStorage.getItem('jp-page') as Page) || 'dashboard'; } catch { return 'dashboard'; } });
  const [query, setQuery] = useState('');
  const [boardFilter, setBoardFilter] = useState<BoardFilter | undefined>();
  const [consoleOpen, setConsoleOpen] = useState(false);
  const { run, profile, loaded } = useStore();
  const [uploadOpen, setUploadOpen] = useState(false);
  useEffect(() => { document.title = profile ? `JobPilot CRM · ${profile.name}` : 'JobPilot CRM'; }, [profile]);

  const go = (p: Page, filter?: BoardFilter & { q?: string }) => {
    if (filter?.q) { setQuery(filter.q); delete filter.q; }
    if (p === 'board') setBoardFilter(filter ? { ...filter } : undefined);
    setPage(p); try { sessionStorage.setItem('jp-page', p); } catch { /* */ }
    window.scrollTo({ top: 0 });
  };
  const title = NAV.find((n) => n.id === page)?.label || '';

  if (loaded && !profile) return (
    <div className="onboard"><UploadResume onDone={() => go('dashboard')} /><Toasts /><LiveConsole open={run.running} onClose={() => {}} /></div>
  );

  return (
    <div className="app">
      <Sidebar page={page} go={go} onMarket={(m) => go('board', { market: m })} onUpload={() => setUploadOpen(true)} />
      <main>
        <Topbar title={title} query={query} setQuery={(q) => { setQuery(q); if (q && (page === 'dashboard' || page === 'analytics')) go('board'); }} onConsole={() => setConsoleOpen((o) => !o)} />
        <div className="content" key={page}>
          {page === 'dashboard' && <Dashboard go={go} />}
          {page === 'pipeline' && <Pipeline query={query} />}
          {page === 'board' && <JobBoard query={query} initial={boardFilter} />}
          {page === 'resume' && <ResumeCenter onUpload={() => setUploadOpen(true)} />}
          {page === 'contacts' && <Contacts />}
          {page === 'analytics' && <Analytics onFilter={(f) => go('board', f)} />}
          {page === 'add' && <AddJob />}
          {page === 'sources' && <Sources />}
        </div>
      </main>
      <LiveConsole open={consoleOpen || false} onClose={() => setConsoleOpen(false)} />
      {run.running && !consoleOpen && <button className="console-fab" onClick={() => setConsoleOpen(true)}><span className="pulse busy" />Scraping live · {run.progress.done}/{run.progress.total}</button>}
      <Drawer />
      {uploadOpen && <div className="modal-wrap" onClick={() => setUploadOpen(false)}><div onClick={(e) => e.stopPropagation()}><UploadResume compact onCancel={() => setUploadOpen(false)} onDone={() => { setUploadOpen(false); go('dashboard'); }} /></div></div>}
      <Toasts />
    </div>
  );
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>;
}
