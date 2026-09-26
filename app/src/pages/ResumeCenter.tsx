import React, { useEffect, useMemo, useState } from 'react';
import { Award, FileText, GraduationCap, Lightbulb, Pencil, Save, Target, TrendingUp, UploadCloud } from 'lucide-react';
import { ALL_TOOLS } from '../../../shared/taxonomy.js';
import { countTerm } from '../../../shared/resume-parser.js';
import { useStore, API_BASE } from '../store';
import { HBars } from '../components/charts';
import { Empty, Section } from '../components/ui';

export function ResumeCenter({ onUpload }: { onUpload: () => void }) {
  const { jobs, openJob, profile, saveProfile, toast, online } = useStore();
  const [edit, setEdit] = useState(false);
  const [titles, setTitles] = useState('');
  const [kws, setKws] = useState('');
  useEffect(() => { if (profile) { setTitles(profile.targetTitles.join('\n')); setKws(profile.keywords.join(', ')); } }, [profile]);

  const data = useMemo(() => {
    const byV: Record<string, typeof jobs> = {};
    for (const j of jobs) (byV[j.resumeVersion] ||= []).push(j);
    const withJD = jobs.filter((j) => (j.description || '').length > 300);
    const mine = new Set(profile?.tools || []);
    const demand = (ALL_TOOLS as string[]).map((t) => ({ label: t, value: withJD.filter((j) => countTerm(` ${(j.description || '').toLowerCase()} `, t)).length, gap: !mine.has(t) }))
      .filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
    return { byV, withJD: withJD.length, have: demand.filter((d) => !d.gap).slice(0, 10), gaps: demand.filter((d) => d.gap).slice(0, 8) };
  }, [jobs, profile]);

  if (!profile) return <div className="page"><Empty icon={<UploadCloud size={32} />} title="No resume uploaded yet" action={<button className="btn-primary" onClick={onUpload}>Upload resume</button>} /></div>;
  const P = profile;

  return (
    <div className="page">
      <div className="grid-2 top">
        <Section title="Candidate profile" sub={P.source === 'curated' ? 'Hand-tuned profile' : `Parsed from your resume${P.createdAt ? ` on ${new Date(P.createdAt).toLocaleDateString()}` : ''}`}
          right={<button className="btn-primary sm" onClick={onUpload} disabled={!online}><UploadCloud size={14} />Upload new resume</button>}>
          <div className="profile">
            <h3>{P.name}</h3>
            <p className="muted">{P.headline}</p>
            <div className="pf-grid">
              <div><span>Location</span><b>{P.city}{P.country ? `, ${P.country}` : ''}</b></div>
              <div><span>Experience</span><b>{P.yearsLabel}</b></div>
              <div><span>Availability</span><b>{P.availability}</b></div>
              <div><span>Contact</span><b>{P.email}<br />{P.phone}</b></div>
            </div>
            {P.education && <><h5><GraduationCap size={15} />Education</h5><p>{P.education}</p></>}
            {!!P.certifications.length && <><h5><Award size={15} />Certifications ({P.certifications.length})</h5><div className="kw">{P.certifications.map((c) => <span key={c}>{c}</span>)}</div></>}
            <h5>Resume files</h5>
            <div className="files">
              {Object.values(P.resumeFiles).map((f) => (
                <a key={f.file} className="file" href={`${API_BASE}/files/${encodeURIComponent(f.file)}`} target="_blank" rel="noreferrer"><FileText size={18} /><div><b>{f.label}</b><span>{f.file}</span></div></a>
              ))}
            </div>
          </div>
        </Section>
        <div className="stack">
          <Section title={<><Target size={17} /> Targeting</>} sub="Drives scraping queries and title matching. Edit it if the parser missed something."
            right={edit ? <button className="btn-primary sm" onClick={async () => {
              await saveProfile({ targetTitles: titles.split('\n').map((t) => t.trim()).filter(Boolean), keywords: kws.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean) });
              setEdit(false); toast({ kind: 'good', title: 'Profile saved', body: 'All jobs re-scored. Update search queries in Sources & Scrapers if needed.' });
            }}><Save size={14} />Save</button> : <button className="btn-ghost sm" onClick={() => setEdit(true)} disabled={!online}><Pencil size={13} />Edit</button>}>
            {edit ? (
              <div className="form">
                <label className="full"><span>Target titles (one per line)</span><textarea rows={6} value={titles} onChange={(e) => setTitles(e.target.value)} /></label>
                <label className="full"><span>Keywords (comma separated)</span><textarea rows={5} value={kws} onChange={(e) => setKws(e.target.value)} /></label>
              </div>
            ) : (
              <>
                <h5 className="first">Target titles</h5><div className="kw">{P.targetTitles.map((t) => <span key={t}>{t}</span>)}</div>
                <h5>Keywords ({P.keywords.length})</h5><div className="kw">{P.keywords.slice(0, 30).map((t) => <span key={t}>{t}</span>)}</div>
              </>
            )}
          </Section>
          <Section title={<><TrendingUp size={17} /> What the market asks for</>} sub={`Tool mentions across ${data.withJD} full job descriptions (tools you have)`}>
            <HBars data={data.have.map((d) => ({ label: d.label, value: d.value }))} />
          </Section>
          <Section title={<><Lightbulb size={17} /> Improvement themes</>} sub="In demand but missing from your resume. Add them if you have the exposure, or upskill">
            <HBars data={data.gaps.map((d) => ({ label: d.label, value: d.value, color: 'linear-gradient(90deg,var(--warn),#f97316)' }))} />
            {!data.gaps.length && <p className="muted">No recurring gaps detected. 🎯</p>}
          </Section>
        </div>
      </div>

      <h3 className="h-sec">Core competencies & proof points</h3>
      <div className="versions skills-grid">
        {P.skills.filter((s) => s.core || s.proof).slice(0, 12).map((s, i) => (
          <div key={s.key} className="version" style={{ ['--h' as any]: i * 30 }}>
            <div className="v-h"><span className="v-n">{String(i + 1).padStart(2, '0')}</span><div><b>{s.label}</b><em>{s.core ? 'core' : 'supporting'} · {s.domain}</em></div></div>
            {s.proof ? <p>“{s.proof}”</p> : <p className="muted">No quantified bullet found. Add one to your resume.</p>}
          </div>
        ))}
      </div>

      <h3 className="h-sec">Resume versions: which one to send where</h3>
      <div className="versions">
        {P.resumeVersions.map((v, i) => {
          const js = (data.byV[v.id] || []).sort((a, b) => b.match - a.match);
          return (
            <div key={v.id} className="version" style={{ ['--h' as any]: i * 40 }}>
              <div className="v-h"><span className="v-n">{String(i + 1).padStart(2, '0')}</span><div><b>{v.name}</b><em>{js.length} jobs</em></div></div>
              <p>{v.focus}</p>
              <p className="muted"><b>Best for:</b> {v.bestFor}</p>
              <p className="muted small">Base file: {P.resumeFiles[v.file]?.label || v.file}</p>
              <ul>{js.slice(0, 3).map((j) => <li key={j.uid} onClick={() => openJob(j.uid)}><b>{j.match}</b>{j.title} · {j.company}</li>)}</ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
