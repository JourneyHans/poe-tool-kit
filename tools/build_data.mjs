import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8'));
const T = read('atlas.en.json');
const cnMap = read('cn_from_poedb.json');
const names = read('cn_names.json');
const a = read('cn_lines_a.json');
const b = read('cn_lines_b.json');
const c = read('cn_lines_c.json');
const d = read('cn_lines_d.json');
const e = read('cn_lines_e.json');
const f = read('cn_lines_f.json');
const g = read('cn_lines_g.json');
const h = read('cn_lines_h.json');
const rules = (await import('./rules.mjs')).default;

const manualLines = {};
for (const src of [a, b, c, d, e, f, h])
  for (const [k, v] of Object.entries(src))
    for (const line of k.split('\n')) if (line.trim()) manualLines[line.trim()] = v;

// content noun dictionary used by rule replacements
const NOUN = {
  'Sacred Flora': '圣花', 'Sacred Fauna': '圣兽', 'Ore Deposits': '矿脉', 'Lost Shipments': '失落货船',
  'Strongbox': '保险箱', 'Rogue Exile': '盗贼流放者', 'Imprisoned Monster': '囚禁怪物', 'Shrine': '神殿',
  'Mirage': '幻影', 'Buried Sentinel': '埋藏哨兵', 'Demonic Evocator': '恶魔唤灵者', 'Viridian Wildwood': '翠绿荒野',
  'Tormented Spirit': '罪魂', 'Mercenary': '佣兵', 'Abyssal Depths': '绝望深渊', 'Abyssal Pit': '深渊之坑',
  'Mirror of Delirium': '惊悸之镜', 'Memory Tear': '记忆之泪', 'Atlas Anomaly': '舆图异象', 'Gateway': '跳跃点',
  'Trial of Ascendancy': '升华试炼', 'Blighted Map': '枯萎地图', 'Blight Chest': '枯萎宝箱',
  'Unstable Breach': '不稳定裂隙', 'Hive': '蜂巢', 'Pit': '深渊之坑', 'Chasm': '深渊之壑',
  'Flammable Burrow': '易燃地穴', 'Empowering Tower': '强化防御塔',
};
const nounSwap = s => {
  let t = s;
  for (const [en, cn] of Object.entries(NOUN)) t = t.split(en).join(cn);
  return t;
};

const splitLines = list => list.flatMap(s => s.split('\n').map(x => x.trim()).filter(Boolean));

// build authoritative map
const map = new Map();
// 1. rules first (they carry current-season numbers)
for (const en of splitLines(T.nodes.flatMap(n => [...n.s, ...(n.v || []).flatMap(v => v[1]), ...n.r]))) {
  for (const [re, rep] of rules) {
    if (re.test(en)) { map.set(en, nounSwap(en.replace(re, rep))); break; }
  }
}
// 2. manual overrides
for (const [en, cn] of Object.entries(manualLines)) map.set(en, cn);
// 2b. post-fixes keyed by (possibly broken) Chinese output
for (const [en, cn] of map) if (g[cn]) map.set(en, g[cn]);
// 3. verified poedb where numbers line up
const nums = s => (s.match(/\d+(?:\.\d+)?/g) || []);
for (const [en, cn] of Object.entries(cnMap)) {
  if (map.has(en)) continue;
  const a1 = nums(en), a2 = cn.match(/\d+(?:\.\d+)?/g) || [];
  let ok = a1.length === a2.length;
  if (ok) for (let i = 0; i < a1.length; i++) if (Math.abs(+a1[i] - +a2[i]) > 1e-9) ok = false;
  if (ok && a1.length) map.set(en, cn);
}

// names
const nameMap = new Map();
const nameNorm = s => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const poedbRows = read('poedb_rows.json');
const poedbPages = read('poedb_node_pages.json');
const rowByName = new Map();
for (const r of poedbRows) rowByName.set(nameNorm(r.slug.replace(/_/g, ' ')), r);
for (const n of T.nodes) {
  const key = n.n.trim();
  const r = rowByName.get(nameNorm(key));
  if (r && poedbPages[r.slug] && !poedbPages[r.slug].error) { nameMap.set(n.n, poedbPages[r.slug].title); continue; }
  for (const g of ['normal', 'notable', 'keystone', 'mastery']) if (names[g]?.[key]) { nameMap.set(n.n, names[g][key]); break; }
}

// output
const out = { meta: {}, nodes: [], lines: {} };
const idIndex = new Map();
T.nodes.forEach((n, i) => idIndex.set(n.id, i));
const lineKeys = new Map();
let lineId = 0;
const lineIdOf = s => { if (!lineKeys.has(s)) lineKeys.set(s, lineId++); return lineKeys.get(s); };

const missingNames = [];
const missingLines = new Set();
const outNodes = T.nodes.map(n => {
  const cn = nameMap.get(n.n);
  if (!cn) missingNames.push(n.n);
  const inline = [];
  for (const s of splitLines(n.s)) { if (!map.has(s)) missingLines.add(s); inline.push(lineIdOf(s)); }
  const o = { id: n.id, x: n.x, y: n.y, k: n.k, cn: cn || n.n, en: n.n, i: n.i, fr: n.fr, fa: n.fa };
  if (n.k === 'mastery') o.deco = 1;
  if (inline.length) o.s = inline;
  if (n.v) o.v = n.v.map(([label, lines]) => {
    const ids = splitLines(lines).map(s => { if (!map.has(s)) missingLines.add(s); return lineIdOf(s); });
    const first = map.get(splitLines(lines)[0]) || '';
    let cnLabel = map.get(label) || '';
    if (!cnLabel) {
      cnLabel = first;
      const seps = ['始终为', '为以下类型的几率提高', '不能为以下类型：', '为以下类型：'];
      for (const sep of seps) { const i = first.lastIndexOf(sep); if (i >= 0) { cnLabel = first.slice(i + sep.length).replace(/[：:]$/, ''); break; } }
      cnLabel = cnLabel.replace(/^在你地图中的?/, '').replace(/^你地图中的?/, '').replace(/的几率提高\d+%$/, '').trim();
      if (cnLabel.length > 14) cnLabel = cnLabel.slice(0, 14) + '…';
    }
    return { cn: cnLabel, en: label, lines: ids };
  });
  if (n.r.length) o.r = splitLines(n.r).map(s => lineIdOf(s));
  if (n.f.length) o.f = n.f;
  return o;
});

for (const [en, id] of lineKeys) {
  if (!map.has(en)) continue;
  out.lines[id] = map.get(en);
}

// terminology normalisation
const TERMS = (await import('./normalize_terms.mjs')).default;
const fix = s => { let t = s; for (const [a, b] of TERMS) t = t.split(a).join(b); return t; };
for (const n of outNodes) n.cn = fix(n.cn);
for (const id of Object.keys(out.lines)) out.lines[id] = fix(out.lines[id]);

out.meta = {
  bounds: T.bounds,
  sheets: T.sheets,
  bg: T.bg,
  start: T.start,
  startNode: { id: T.start[3], x: T.start[0], y: T.start[1], i: T.start[2], cn: '舆图起点', k: 'start' },
  edges: T.edges,
  groups: T.groups,
  linesGeo: T.lines,
  arcs: T.arcs,
  maxPoints: 150,
  nodes: outNodes.length,
  translatedNames: outNodes.length - missingNames.length,
  translatedLines: Object.keys(out.lines).length,
  totalLines: lineKeys.size,
  source: 'hypostasis.faith/atlas' + ' + poedb.tw/cn + 人工校译',
  version: '3.27/3.28 舆图天赋树（Threads / 塑造之域 / 舆图异象）',
};
out.nodes = outNodes;

fs.writeFileSync(path.join(root, 'data', 'atlas.zh.json'), JSON.stringify(out));
if (!fs.existsSync(path.join(root, 'site'))) fs.mkdirSync(path.join(root, 'site'));
fs.writeFileSync(path.join(root, 'site', 'trees', 'data.zh.js'), 'window.ATLAS_ZH=' + JSON.stringify(out) + ';');
console.log({
  nodes: outNodes.length,
  translatedNames: out.meta.translatedNames,
  missingNames: [...new Set(missingNames)].length,
  totalLineKeys: lineKeys.size,
  translatedLines: out.meta.translatedLines,
  missingLines: [...missingLines].length,
  outLines: Object.keys(out.lines).length,
});
fs.writeFileSync(path.join(root, 'data', 'missing_names_final.json'), JSON.stringify([...new Set(missingNames)], null, 1));
fs.writeFileSync(path.join(root, 'data', 'missing_lines_final.json'), JSON.stringify([...missingLines], null, 1));
if (missingLines.size) console.log([...missingLines].slice(0, 30).join('\n'));
