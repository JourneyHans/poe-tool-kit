// Number-consistency audit between English source and Chinese output.
// Compares numeric values per stat line, ignoring "Tier N" ordering artefacts.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const j = JSON.parse(fs.readFileSync(path.join(root, 'data', 'atlas.zh.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(root, 'data', 'atlas.en.json'), 'utf8'));
const enById = new Map(en.nodes.map(n => [n.id, n]));

const nums = s => (s.match(/\d+(?:\.\d+)?/g) || []).map(Number);
// a line is "consistent" if every numeric token in EN also appears in ZH with the same count
const same = (a, b) => {
  const x = [...nums(a)].sort((m, n) => m - n), y = [...nums(b)].sort((m, n) => m - n);
  if (x.length !== y.length) return false;
  return x.every((v, i) => Math.abs(v - y[i]) < 1e-9);
};

const rows = [];
const check = (id, cn, el, zl, kind) => {
  if (el.length !== zl.length) { rows.push({ id, cn, kind: kind + '-count', en: el.length, zh: zl.length }); return; }
  for (let k = 0; k < el.length; k++) if (!same(el[k], zl[k])) rows.push({ id, cn, kind, en: el[k], zh: zl[k] });
};

for (const n of j.nodes) {
  const e = enById.get(n.id);
  if (!e) continue;
  const el = e.s.join('\n').split('\n').map(x => x.trim()).filter(Boolean);
  const zl = (n.s || []).map(i => j.lines[i]);
  check(n.id, n.cn, el, zl, 'line');
  if (e.v && n.v) for (let vi = 0; vi < Math.min(e.v.length, n.v.length); vi++)
    check(n.id, n.cn, e.v[vi][1].join('\n').split('\n').map(x => x.trim()).filter(Boolean), n.v[vi].lines.map(i => j.lines[i]), 'choice');
}

fs.writeFileSync(path.join(root, 'data', 'num_audit.json'), JSON.stringify(rows, null, 1));
console.log('number mismatches:', rows.length);
for (const r of rows) console.log('-', r.cn, '|', r.kind, '| en:', r.en, '| zh:', r.zh);
process.exit(rows.length ? 1 : 0);
