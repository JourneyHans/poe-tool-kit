import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = fs.readFileSync(path.join(root, 'src_data', 'data.js'), 'utf8');
const jsonText = src.replace(/^\s*const\s+T\s*=\s*/, '').replace(/;\s*$/, '');
const T = JSON.parse(jsonText);

const outDir = path.join(root, 'data');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'atlas.en.json'), JSON.stringify(T));

const kinds = {};
for (const n of T.nodes) kinds[n.k] = (kinds[n.k] || 0) + 1;

const keystones = T.nodes.filter(n => n.k === 'keystone');
const notables = T.nodes.filter(n => n.k === 'notable');
const mastery = T.nodes.filter(n => n.k === 'mastery');

console.log(JSON.stringify({
  bounds: T.bounds,
  sheets: T.sheets,
  counts: {
    nodes: T.nodes.length,
    edges: T.edges.length,
    groups: T.groups.length,
    lines: T.lines.length,
    arcs: T.arcs.length,
    kinds,
  },
  start: T.start,
  masterySample: mastery.slice(0, 3),
  notableSample: notables.slice(0, 3),
  multipleChoice: T.nodes.filter(n => n.v).length,
  multipleChoiceSample: T.nodes.filter(n => n.v).slice(0, 3),
}, null, 2));
