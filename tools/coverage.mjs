import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const T = JSON.parse(fs.readFileSync(path.join(root, 'data', 'atlas.en.json'), 'utf8'));
const cnMap = JSON.parse(fs.readFileSync(path.join(root, 'data', 'cn_from_poedb.json'), 'utf8'));
const a = JSON.parse(fs.readFileSync(path.join(root, 'data', 'cn_lines_a.json'), 'utf8'));
const b = JSON.parse(fs.readFileSync(path.join(root, 'data', 'cn_lines_b.json'), 'utf8'));
const c = JSON.parse(fs.readFileSync(path.join(root, 'data', 'cn_lines_c.json'), 'utf8'));

const manual = { ...a, ...b, ...c };

// every english line used in the tree
const all = new Set();
for (const n of T.nodes) {
  for (const s of n.s) all.add(s);
  for (const v of n.v || []) for (const s of v[1]) all.add(s);
  for (const s of n.r) all.add(s);
}

const nums = s => (s.match(/\d+(?:\.\d+)?/g) || []);
const cnNums = s => (s.match(/\d+(?:\.\d+)?/g) || []);

const verified = new Map();
const ambiguous = new Map();
for (const [en, cn] of Object.entries(cnMap)) {
  const enN = nums(en), cnN = cnNums(cn);
  // Chinese should contain exactly the english numbers (order preserved) to be usable
  if (enN.length === cnN.length) {
    let ok = true;
    for (let i = 0; i < enN.length; i++) if (Math.abs(+enN[i] - +cnN[i]) > 1e-9) ok = false;
    if (ok) { verified.set(en, cn); continue; }
  }
  ambiguous.set(en, cn);
}

const missing = [...all].filter(s => !manual[s] && !verified.has(s));
console.log({
  allLines: all.size,
  manual: Object.keys(manual).filter(k => all.has(k)).length,
  verifiedFromPoedb: [...verified.keys()].filter(k => all.has(k)).length,
  missing: missing.length,
});
fs.writeFileSync(path.join(root, 'data', 'missing_final.json'), JSON.stringify(missing, null, 1));
fs.writeFileSync(path.join(root, 'data', 'verified_map.json'), JSON.stringify(Object.fromEntries([...verified].filter(([k]) => all.has(k))), null, 1));
console.log(missing.slice(0, 80).join('\n'));
