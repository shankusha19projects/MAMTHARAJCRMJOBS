// Extracts every "### File: <path>" block from SKILL.md into the current folder.
// Usage: node scripts/unpack-skill.mjs SKILL.md [targetDir]
import fs from 'node:fs';
import path from 'node:path';

const [src = 'SKILL.md', target = '.'] = process.argv.slice(2);
const md = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');
const re = /^### File: (.+)\n`{5}[a-z]*\n([\s\S]*?)\n`{5}$/gm;
let m, n = 0;
while ((m = re.exec(md))) {
  const out = path.join(target, m[1].trim());
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, m[2] + '\n');
  n++;
}
console.log(`Unpacked ${n} files into ${path.resolve(target)}`);
console.log('Next: npm install && cd app && npm install && npm run build && cd .. && npm start');
