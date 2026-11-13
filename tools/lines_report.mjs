import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const T = JSON.parse(fs.readFileSync(path.join(root, 'data', 'atlas.en.json'), 'utf8'));

// gather lines per node, dedupe, count
const lines = new Map(); // text -> {count, kinds:Set, examples:[]}
function add(s, kind, n) {
  if (!lines.has(s)) lines.set(s, { count: 0, kinds: new Set(), examples: [] });
  const r = lines.get(s);
  r.count++; r.kinds.add(kind);
  if (r.examples.length < 3) r.examples.push(n.n);
}
for (const n of T.nodes) {
  for (const s of n.s) add(s, n.k, n);
  for (const v of n.v || []) for (const s of v[1]) add(s, n.k + ':choice', n);
  for (const s of n.r) add(s, 'reminder', n);
}
const arr = [...lines.entries()].map(([text, r]) => ({ text, count: r.count, kinds: [...r.kinds], ex: r.examples }));
arr.sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
fs.writeFileSync(path.join(root, 'data', 'lines_flat.json'), JSON.stringify(arr, null, 1));

// normal single-line patterns: how many normal nodes are single-line
let single = 0, multi = 0;
const singleLines = new Map();
for (const n of T.nodes) {
  if (n.k !== 'normal') continue;
  if (n.s.length === 1) { single++; singleLines.set(n.s[0], (singleLines.get(n.s[0]) || 0) + 1); }
  else multi++;
}
console.log({ totalLines: arr.length, normalSingle: single, normalMulti: multi, distinctNormalSingle: singleLines.size });
console.log('--- top normal lines ---');
for (const [k, v] of [...singleLines.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(v, '|', k);
console.log('--- multi-line normals (sample) ---');
for (const n of T.nodes.filter(x => x.k === 'normal' && x.s.length > 1).slice(0, 25)) console.log('*', n.n, '::', n.s.join(' || '));
