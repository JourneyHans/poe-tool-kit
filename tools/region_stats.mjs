import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const j = JSON.parse(fs.readFileSync(path.join(root, 'data', 'atlas.zh.json'), 'utf8'));
const byId = new Map(j.nodes.map(n => [n.id, n]));
const startId = j.meta.startNode.id;
const adj = new Map();
for (const [a, b] of j.meta.edges) {
  if (!adj.has(a)) adj.set(a, []);
  if (!adj.has(b)) adj.set(b, []);
  adj.get(a).push(b);
}
const dist = new Map([[startId, 0]]);
{
  const q = [startId];
  for (let i = 0; i < q.length; i++)
    for (const nb of adj.get(q[i]) || []) if (!dist.has(nb)) { dist.set(nb, dist.get(q[i]) + 1); q.push(nb); }
}
// region = nearest mastery anchor
const anchors = j.nodes.filter(n => n.deco);
const owner = new Map();
for (const n of j.nodes) {
  if (n.deco) continue;
  let best = null, bd = Infinity;
  for (const a of anchors) {
    const d = (a.x - n.x) ** 2 + (a.y - n.y) ** 2;
    if (d < bd) { bd = d; best = a; }
  }
  owner.set(n.id, best.id);
}
const anchorName = new Map(anchors.map(a => [a.id, a.cn]));

function pathTo(target, allocated) {
  const prev = new Map();
  const q = [startId, ...allocated];
  for (const id of q) prev.set(id, null);
  for (let i = 0; i < q.length && !prev.has(target); i++)
    for (const nb of adj.get(q[i]) || []) if (!prev.has(nb)) { prev.set(nb, q[i]); q.push(nb); }
  if (!prev.has(target)) return null;
  const out = [];
  for (let id = target; id !== startId && !allocated.has(id); id = prev.get(id)) out.push(id);
  return out.reverse();
}
function costOf(ids) {
  const sorted = [...new Set(ids)].sort((a, b) => (dist.get(a) ?? 999) - (dist.get(b) ?? 999));
  const alloc = new Set();
  for (const id of sorted) { if (alloc.has(id)) continue; for (const x of pathTo(id, alloc) || []) alloc.add(x); }
  return alloc.size;
}

const mechanics = [...new Set(anchors.map(a => a.cn))];
const rows = [];
for (const m of mechanics) {
  const aids = anchors.filter(a => a.cn === m).map(a => a.id);
  const ids = [...owner.entries()].filter(([id, aid]) => aids.includes(aid)).map(([id]) => id);
  const notables = ids.filter(id => byId.get(id).k === 'notable');
  const normals = ids.filter(id => byId.get(id).k === 'normal');
  const keys = ids.filter(id => byId.get(id).k === 'keystone');
  rows.push({
    m, total: ids.length, notables: notables.length, normals: normals.length, keystones: keys.length,
    costAllNotables: costOf(notables),
    costAll: costOf(ids),
  });
}
rows.sort((a, b) => b.notables - a.notables);
for (const r of rows) console.log(String(r.m).padEnd(8), 'nodes', String(r.total).padStart(3), 'not', String(r.notables).padStart(2), 'k', r.keystones, '| cost(notables)', String(r.costAllNotables).padStart(3), '| cost(all)', r.costAll);
