import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const T = JSON.parse(fs.readFileSync(path.join(root, 'data', 'atlas.en.json'), 'utf8'));
const rows = JSON.parse(fs.readFileSync(path.join(root, 'data', 'poedb_rows.json'), 'utf8'));

const norm = s => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const slugify = s => s.replace(/['’]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const byNorm = new Map();
for (const r of rows) byNorm.set(norm(r.slug.replace(/_/g, ' ')), r);
for (const r of rows) if (!byNorm.has(norm(r.name))) byNorm.set(norm(r.name), r);

let hit = 0, miss = 0;
const missed = [];
for (const n of T.nodes) {
  const k = norm(n.n);
  const r = byNorm.get(k) || byNorm.get(norm(slugify(n.n).replace(/_/g, ' ')));
  if (r) { n.cnRow = r; hit++; } else { miss++; missed.push(n.n); }
}
console.log({ total: T.nodes.length, hit, miss });
fs.writeFileSync(path.join(root, 'data', 'missed_names.json'), JSON.stringify([...new Set(missed)], null, 1));
console.log([...new Set(missed)].slice(0, 80).join(' | '));
