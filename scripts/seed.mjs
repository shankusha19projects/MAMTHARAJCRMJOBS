// Snapshot data/*.json into app/src/seed.json so the HTML also works offline (file://) without the server.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (n, f) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', n), 'utf8')); } catch { return f; } };
const db = read('jobs.json', { jobs: [], meta: {} });
const pipeline = read('pipeline.json', {});
const profile = read('profile.json', null);
const jobs = db.jobs.map((j) => ({ ...j, ...(pipeline[j.uid] || {}), description: (j.description || '').slice(0, 4000) }));
fs.writeFileSync(path.join(ROOT, 'app', 'src', 'seed.json'), JSON.stringify({ profile, jobs, meta: db.meta, contacts: read('contacts.json', []), builtAt: new Date().toISOString() }));
console.log(`seed.json: ${jobs.length} jobs`);
