import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const T = JSON.parse(fs.readFileSync(path.join(root, 'data', 'atlas.en.json'), 'utf8'));

const isCJK = s => /[\u4e00-\u9fff]/.test(s);

const allStats = [];
const seen = new Set();
const names = [];
for (const n of T.nodes) {
  names.push(n.n);
  for (const s of n.s) { if (!seen.has(s)) { seen.add(s); allStats.push(s); } }
  for (const v of n.v || []) for (const s of v[1]) if (!seen.has(s)) { seen.add(s); allStats.push(s); }
  for (const s of n.r) if (!seen.has(s)) { seen.add(s); allStats.push(s); }
}

const words = new Map();
for (const s of allStats) for (const w of s.toLowerCase().match(/[a-z][a-z'\-]+/g) || []) words.set(w, (words.get(w) || 0) + 1);

const sorted = [...words.entries()].sort((a, b) => b[1] - a[1]);
console.log(JSON.stringify({
  nodes: T.nodes.length,
  uniqueNames: new Set(names).size,
  uniqueStatLines: allStats.length,
  uniqueWords: words.size,
  topWords: sorted.slice(0, 60),
}, null, 2));

fs.writeFileSync(path.join(root, 'data', 'statlines.json'), JSON.stringify(allStats, null, 1));
fs.writeFileSync(path.join(root, 'data', 'words.json'), JSON.stringify(sorted, null, 1));
