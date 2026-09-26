import React, { useMemo, useState } from 'react';
import { Mail, Linkedin, Phone, Plus, Trash2, UserRound } from 'lucide-react';
import { useStore } from '../store';
import type { Contact } from '../types';
import { DRAFTS } from '../lib/drafts';
import { CopyButton, Empty, Section } from '../components/ui';
import { cx } from '../lib/util';

const blank = (): Contact => ({ id: String(Date.now()), name: '', company: '', role: 'Recruiter', email: '', linkedin: '', phone: '', lastContact: new Date().toISOString().slice(0, 10), notes: '' });

export function Contacts() {
  const { jobs, contacts, saveContacts, profile } = useStore();
  const targets = useMemo(() => jobs.filter((j) => j.stage !== 'Rejected').sort((a, b) => (b.stage !== 'New' ? 1 : 0) - (a.stage !== 'New' ? 1 : 0) || b.match - a.match).slice(0, 80), [jobs]);
  const [uid, setUid] = useState(targets[0]?.uid || '');
  const [tpl, setTpl] = useState('email');
  const [form, setForm] = useState<Contact | null>(null);
  const job = jobs.find((j) => j.uid === uid) || targets[0];
  const d = DRAFTS.find((x) => x.id === tpl)!;
  const contact = contacts.find((c) => c.jobUid === job?.uid) || contacts.find((c) => job && c.company.toLowerCase() === job.company.toLowerCase());
  const text = job && profile ? d.fn(job, profile).replace(/\{\{(Recruiter name|Name|Interviewer)\}\}/g, contact?.name?.split(' ')[0] || '$&') : '';

  return (
    <div className="page">
      <div className="grid-2 top">
        <Section title="Outreach studio" sub="Pick a job and a template. Everything is pre-filled with your profile and the role">
          {!job ? <Empty icon={<Mail size={30} />} title="No jobs yet" /> : (
            <>
              <div className="toolbar tight">
                <select value={job.uid} onChange={(e) => setUid(e.target.value)} className="grow">
                  {targets.map((j) => <option key={j.uid} value={j.uid}>{j.code} · {j.title} @ {j.company} ({j.stage})</option>)}
                </select>
              </div>
              <div className="draft-tabs">{DRAFTS.filter((x) => x.id !== 'salary').map((x) => <button key={x.id} className={cx(tpl === x.id && 'on')} onClick={() => setTpl(x.id)}>{x.label}</button>)}</div>
              <div className="draft">
                <div className="draft-h"><b>{d.label} · {job.company}</b><CopyButton text={text} label="Copy" /></div>
                <pre>{text}</pre>
              </div>
            </>
          )}
        </Section>

        <Section title="Contacts" sub="Recruiters, referrers and hiring managers" right={<button className="btn-primary sm" onClick={() => setForm({ ...blank(), company: job?.company || '', jobUid: job?.uid })}><Plus size={14} />Add</button>}>
          {form && (
            <div className="contact-form">
              {(['name', 'company', 'role', 'email', 'linkedin', 'phone', 'lastContact'] as const).map((k) => (
                <label key={k}><span>{k === 'lastContact' ? 'Last contact' : k}</span><input type={k === 'lastContact' ? 'date' : 'text'} value={(form as any)[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
              ))}
              <label className="full"><span>Notes</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
              <div className="full row-end">
                <button className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
                <button className="btn-primary" disabled={!form.name} onClick={() => { saveContacts([form, ...contacts.filter((c) => c.id !== form.id)]); setForm(null); }}>Save contact</button>
              </div>
            </div>
          )}
          <div className="contacts">
            {contacts.map((c) => (
              <div key={c.id} className="contact" onClick={() => setForm(c)}>
                <div className="c-av"><UserRound size={18} /></div>
                <div className="c-main"><b>{c.name}</b><span>{c.role} · {c.company}</span>{c.notes && <em>{c.notes}</em>}</div>
                <div className="c-act" onClick={(e) => e.stopPropagation()}>
                  {c.email && <CopyButton text={c.email} compact />}
                  {c.email && <a className="icon-btn" href={`mailto:${c.email}`} title="Email"><Mail size={15} /></a>}
                  {c.linkedin && <a className="icon-btn" href={c.linkedin.startsWith('http') ? c.linkedin : `https://${c.linkedin}`} target="_blank" rel="noreferrer"><Linkedin size={15} /></a>}
                  {c.phone && <a className="icon-btn" href={`tel:${c.phone}`}><Phone size={15} /></a>}
                  <button className="icon-btn" onClick={() => saveContacts(contacts.filter((x) => x.id !== c.id))}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
            {!contacts.length && !form && <Empty icon={<UserRound size={30} />} title="No contacts yet" body="Add recruiters you reach out to. The outreach templates auto-fill their first name." />}
          </div>
        </Section>
      </div>
    </div>
  );
}
