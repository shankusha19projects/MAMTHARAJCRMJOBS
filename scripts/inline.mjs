// Inline Parcel's dist output (JS + CSS) into ONE self-contained JobPilot-CRM.html (works from file:// too).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(ROOT, 'app', 'dist');
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const readAsset = (src) => fs.readFileSync(path.join(dist, src.replace(/^\.?\//, '').split('?')[0]), 'utf8');
// Parcel 2 emits unquoted attributes, so match quotes optionally.
html = html.replace(/<script([^>]*?)src=["']?([^"' >]+\.js)["']?([^>]*)><\/script>/g, (_, a, src, b) =>
  `<script${a.replace(/\s+$/, '')}${b}>${readAsset(src).replace(/<\/script>/g, '<\/script>')}</script>`);
html = html.replace(/<link([^>]*?)rel=["']?stylesheet["']?([^>]*?)href=["']?([^"' >]+\.css)["']?([^>]*)>/g, (_, a, b, href) => `<style>${readAsset(href)}</style>`);
html = html.replace(/<link([^>]*?)href=["']?([^"' >]+\.css)["']?([^>]*?)rel=["']?stylesheet["']?([^>]*)>/g, (_, a, href) => `<style>${readAsset(href)}</style>`);
const out = path.join(ROOT, 'JobPilot-CRM.html');
fs.writeFileSync(out, html);
console.log(`Wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
