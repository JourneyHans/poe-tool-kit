import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = fs.readFileSync(path.join(root, 'tools', 'rules.mjs'), 'utf8');
const mod = await import('./rules.mjs');
const rules = mod.default;

const missing = JSON.parse(fs.readFileSync(path.join(root, 'data', 'missing_final.json'), 'utf8'));
const fixed = JSON.parse(fs.readFileSync(path.join(root, 'data', 'cn_lines_d.json'), 'utf8'));

let byRule = 0, byFixed = 0;
const rest = [];
for (const en of missing) {
  if (fixed[en]) { byFixed++; continue; }
  let out = null;
  for (const [re, rep] of rules) {
    if (re.test(en)) { out = en.replace(re, rep); break; }
  }
  if (out) byRule++; else rest.push(en);
}
console.log({ missing: missing.length, byFixed, byRule, rest: rest.length });
fs.writeFileSync(path.join(root, 'data', 'still_missing.json'), JSON.stringify(rest, null, 1));
console.log(rest.join('\n'));
