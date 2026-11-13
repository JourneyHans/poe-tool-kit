import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const T = JSON.parse(fs.readFileSync(path.join(root, 'data', 'atlas.en.json'), 'utf8'));
const cnMap = JSON.parse(fs.readFileSync(path.join(root, 'data', 'cn_from_poedb.json'), 'utf8'));
const missNames = JSON.parse(fs.readFileSync(path.join(root, 'data', 'miss_names2.json'), 'utf8'));
const missSet = new Set(missNames.map(s => s.replace(/ \[page\]$/, '')));

const lines = new Map();
for (const n of T.nodes) {
  if (!missSet.has(n.n)) continue;
  for (const s of n.s) if (!lines.has(s)) lines.set(s, []);
  for (const v of n.v || []) for (const s of v[1]) if (!lines.has(s)) lines.set(s, []);
  for (const s of n.r) if (!lines.has(s)) lines.set(s, []);
}
const all = [...lines.keys()];
console.log('unique lines among unmatched nodes:', all.length);

const keyOf = s => s.replace(/\d+(?:\.\d+)?/g, '#');
const knownKeys = new Map();
for (const [en, cn] of Object.entries(cnMap)) {
  const k = keyOf(en);
  if (!knownKeys.has(k)) knownKeys.set(k, { en, cn });
}
let derivable = 0; const rest = [];
for (const s of all) {
  if (knownKeys.has(keyOf(s))) derivable++; else rest.push(s);
}
console.log({ derivableByPattern: derivable, needManual: rest.length });
fs.writeFileSync(path.join(root, 'data', 'need_manual_lines.json'), JSON.stringify(rest, null, 1));
fs.writeFileSync(path.join(root, 'data', 'need_manual_names.json'), JSON.stringify([...missSet].sort(), null, 1));
console.log('--- sample need manual ---');
console.log(rest.slice(0, 40).join('\n'));
