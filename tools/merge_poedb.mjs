import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const T = JSON.parse(fs.readFileSync(path.join(root, 'data', 'atlas.en.json'), 'utf8'));
const rows = JSON.parse(fs.readFileSync(path.join(root, 'data', 'poedb_rows.json'), 'utf8'));
const pages = JSON.parse(fs.readFileSync(path.join(root, 'data', 'poedb_node_pages.json'), 'utf8'));

const norm = s => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const byNorm = new Map();
for (const r of rows) byNorm.set(norm(r.slug.replace(/_/g, ' ')), r);

const normCn = s => s.replace(/[\s，。、：；！？（）()"'“”‘’\-—]/g, '');

let nameHit = 0, statHit = 0, statMiss = 0;
const cnStatByEn = {}; // english stat line -> chinese
const missLines = new Map();
const missNames = [];

for (const n of T.nodes) {
  const r = byNorm.get(norm(n.n));
  if (!r) { missNames.push(n.n); continue; }
  const p = pages[r.slug];
  if (!p || p.error) { missNames.push(n.n + ' [page]'); continue; }
  n.cn = p.title;
  nameHit++;
  const cnLines = (p.desc || '').split('\n').map(s => s.trim()).filter(Boolean);
  const enLines = [];
  for (const s of n.s) enLines.push(s);
  // match line by line when counts align
  if (cnLines.length >= enLines.length && enLines.length) {
    if (enLines.length === cnLines.length) {
      enLines.forEach((en, i) => { cnStatByEn[en] = cnLines[i]; statHit++; });
    } else {
      // try to match by leading percentage or keyword, else positional
      enLines.forEach((en, i) => { cnStatByEn[en] = cnLines[cnLines.length - enLines.length + i]; statHit++; });
    }
  } else {
    for (const en of enLines) { if (!missLines.has(en)) missLines.set(en, []); missLines.get(en).push(cnLines.join(' ¶ ')); }
  }
}

console.log({ nameHit, missNames: missNames.length, statHit, missLines: missLines.size, cnStatByEn: Object.keys(cnStatByEn).length });
fs.writeFileSync(path.join(root, 'data', 'cn_from_poedb.json'), JSON.stringify(cnStatByEn, null, 1));
fs.writeFileSync(path.join(root, 'data', 'miss_lines.json'), JSON.stringify([...missLines.keys()], null, 1));
fs.writeFileSync(path.join(root, 'data', 'miss_names2.json'), JSON.stringify(missNames, null, 1));
