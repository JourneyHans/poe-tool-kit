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
  adj.get(b).push(a);
}
const dist = new Map([[startId, 0]]);
{
  const q = [startId];
  for (let i = 0; i < q.length; i++)
    for (const nb of adj.get(q[i]) || []) if (!dist.has(nb)) { dist.set(nb, dist.get(q[i]) + 1); q.push(nb); }
}

// region = nearest mastery anchor; this is exactly how the tree is visually grouped
const anchors = j.nodes.filter(n => n.deco);
const owner = new Map();
for (const n of j.nodes) {
  if (n.deco) continue;
  let best = null, bd = Infinity;
  for (const a of anchors) {
    const d = (a.x - n.x) ** 2 + (a.y - n.y) ** 2;
    if (d < bd) { bd = d; best = a; }
  }
  owner.set(n.id, best.cn);
}
const regionOf = name => j.nodes.filter(n => !n.deco && owner.get(n.id) === name);
const nameIndex = new Map();
for (const n of j.nodes) if (!n.deco) nameIndex.set(n.cn, n);
const find = name => nameIndex.get(name) || null;

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
function allocate(ids) {
  const sorted = [...new Set(ids)].sort((a, b) => (dist.get(a) ?? 999) - (dist.get(b) ?? 999));
  const allocated = new Set();
  const order = [];
  const missing = [];
  for (const id of sorted) {
    if (!byId.has(id) || byId.get(id).deco) continue;
    if (allocated.has(id)) continue;
    const p = pathTo(id, allocated);
    if (!p) { missing.push(byId.get(id)?.cn || id); continue; }
    for (const x of p) { allocated.add(x); order.push(x); }
  }
  return { order, cost: allocated.size, missing };
}

const problems = [];
function build(spec) {
  const skip = new Set(spec.skip || []);
  const ids = new Set();
  for (const r of spec.regions) for (const n of regionOf(r)) if (!skip.has(n.cn)) ids.add(n.id);
  // explicit nodes (some mechanics' nodes are scattered and have no dedicated region)
  if (spec.mustAll) for (const nm of spec.mustAll) for (const n of j.nodes) if (n.cn === nm && !skip.has(nm)) ids.add(n.id);
  if (spec.extra) for (const r of spec.extra) for (const n of regionOf(r)) {
    if (skip.has(n.cn)) continue;
    if (n.k === 'notable' || n.k === 'keystone') ids.add(n.id);
  }
  let r = allocate([...ids]);
  while (r.cost > 148) {
    const far = [...ids].filter(id => byId.get(id).k === 'normal')
      .sort((a, b) => (dist.get(b) ?? 0) - (dist.get(a) ?? 0))[0];
    if (far == null) break;
    ids.delete(far);
    r = allocate([...ids]);
  }
  const choice = {};
  for (const [name, idx] of Object.entries(spec.choices || {})) {
    const n = find(name);
    if (!n) { problems.push(spec.id + ' choice-missing:' + name); continue; }
    choice[n.id] = idx;
  }
  for (const id of r.order) {
    const n = byId.get(id);
    if (n && n.v && n.v.length && choice[id] === undefined) {
      choice[id] = 0;
      problems.push(spec.id + ' auto-choice:' + n.cn);
    }
  }
  const notables = r.order.map(id => byId.get(id)).filter(n => n && (n.k === 'notable' || n.k === 'keystone'));
  const allowedNotable = new Set();
  for (const rname of [...spec.regions, ...(spec.extra || [])]) for (const n of regionOf(rname)) {
    if (n.k === 'notable' || n.k === 'keystone') allowedNotable.add(n.id);
  }
  const mainIds = new Set(spec.regions.flatMap(rname => regionOf(rname)).map(n => n.id));
  const extraIds = new Set((spec.extra || []).flatMap(rname => regionOf(rname)).map(n => n.id));
  const mainAll = new Set(spec.regions.flatMap(rname => regionOf(rname)).map(n => n.id));
  for (const nm of spec.mustAll || []) for (const n of j.nodes) if (n.cn === nm) mainAll.add(n.id);
  const extraAll = new Set((spec.extra || []).flatMap(rname => regionOf(rname)).map(n => n.id));
  const allocated = new Set(r.order);
  const mainPoints = [...allocated].filter(id => mainAll.has(id)).length;
  const extraPoints = [...allocated].filter(id => extraAll.has(id) && !mainAll.has(id)).length;
  return {
    ...spec, order: r.order, cost: r.cost, choice, missing: r.missing,
    mainPoints, extraPoints, pathPoints: r.cost - mainPoints - extraPoints,
    notableList: notables.map(n => n.cn),
    mainList: notables.filter(n => mainIds.has(n.id)).map(n => n.cn),
    extraList: notables.filter(n => extraIds.has(n.id) && !mainIds.has(n.id)).map(n => n.cn),
    onPath: notables.filter(n => !mainAll.has(n.id) && !extraAll.has(n.id)).map(n => n.cn),
  };
}

const SPECS = [
  {
    id: 'breach', icon: '裂', name: '裂隙专精 · 不稳定裂隙 + 线团定向', tag: '单机制', diff: '低门槛', focus: '裂隙',
    regions: ['裂隙', '线团'], skip: ['创造源泉', '左旋之线', '无丝之线'],
    summary: '整片裂隙区域 + 线团定向：右旋拉高裂隙、褴褛屏蔽驱灵。核心约 90 点，剩下的点留给你自己补生存或第二个玩法。',
    tips: [
      '「分而治之」必须选不稳定裂隙，配合大军集结 / 利爪撕裂 才是完整的裂隙流。',
      '线团只用右旋 + 褴褛，别碰左旋 / 无丝（那是深渊那一组的过滤）。',
      '「创造源泉」是通用防御基石（怪物减伤加血），专精流不点。',
    ],
    choices: { '分而治之': 1, '右旋之线': 0, '褴褛': 1, '肥沃之地': 3 },
  },
  {
    id: 'ritual', icon: '仪', name: '驱灵专精 · 四祭坛 + 祭品滚雪球', tag: '单机制', diff: '中等', focus: '驱灵仪式',
    regions: ['驱灵仪式', '线团'], skip: ['专断信条', '分而治之', '左旋之线', '无丝之线'],
    summary: '整片驱灵区域 + 线团定向：右旋拉高驱灵、褴褛屏蔽摧灭。祭坛、祭品、重掷一条龙，适合每天固定刷几张图。',
    tips: [
      '「神秘奉献」保证四祭坛，是这套的地基。',
      '「专断信条」祭品成本随机，稳定流不点；想赌再自己补。',
      '线团屏蔽摧灭，避免摧灭图浪费你的祭坛节奏。',
    ],
    choices: { '右旋之线': 1, '褴褛': 2 },
  },
  {
    id: 'ultimatum', icon: '摧', name: '摧灭专精 · 不动如山 + 奖励复制', tag: '单机制', diff: '中等', focus: '摧灭',
    regions: ['摧灭', '线团'], skip: ['摧灭豪赌', '煎熬试炼', '扭转命运', '分而治之', '左旋之线', '无丝之线'],
    summary: '整片摧灭区域 + 线团定向：右旋拉高摧灭、褴褛屏蔽裂隙。避开两个高风险基石，走稳定轮次收益。',
    tips: [
      '「不动如山」把额外一轮奖励直接结算，是纯收益节点。',
      '「受控混乱」默认选保护祭坛；按你能稳定完成的类型改。',
      '不点摧灭豪赌 / 煎熬试炼：一个上毁灭失败，一个取消词缀自选，都不是稳定流。',
    ],
    choices: { '受控混乱': 0, '试炼大师的恩赐': 0, '右旋之线': 2, '褴褛': 0 },
  },
  {
    id: 'legion', icon: '军', name: '军团专精 · 永战无休 + 碎片', tag: '单机制', diff: '中等', focus: '军团',
    regions: ['军团', '线团'], skip: ['分而治之', '右旋之线', '褴褛', '埋葬的感触'],
    summary: '整片军团区域 + 线团定向：左旋拉高军团、无丝屏蔽深渊。核心约 90 点，适合刷时间碎片与军团专属掉落。',
    tips: [
      '「永战无休」取消计时器改为裂变机制，节奏要重新适应。',
      '军团属于第二组线团类型，所以用左旋 / 无丝，而不是右旋 / 褴褛。',
      '将军双将与军团类型倾向按你要的碎片选。',
    ],
    choices: { '左旋之线': 4, '无丝之线': 0, '血仇': 0 },
  },
  {
    id: 'flora', icon: '花', name: '圣花 + 精华 · 鬼火养囚禁怪', tag: '双机制', diff: '低门槛', focus: '圣花 / 精华',
    regions: ['圣花', '精华'],
    summary: '圣花命能 + 精华囚禁怪：鬼火会优先强化囚禁怪物，相当于给精华怪白送词缀与掉落，两条线互补。',
    tips: [
      '圣花几率决定有没有、圣兽复制决定爆发，鬼火节点别漏。',
      '精华只保留囚禁怪 / 高阶精华相关，不追全部大点。',
      '不依赖线团，线团可以留着卖或换通货。',
    ],
    choices: { '林木栽培': 0, '不适感': 0, '失格情绪': 0, '压抑情绪': 0 },
  },
  {
    id: 'strongbox', icon: '箱', name: '保险箱 + 命运卡 · 低强度稳定流', tag: '双机制', diff: '低门槛', focus: '保险箱 / 命运卡',
    regions: ['保险箱', '命运卡'], extra: ['盗贼流放者'],
    summary: '保险箱几率 / 重开 / 额外怪群 + 命运卡三件套。不依赖角色强度，开荒或边看剧边刷都行。',
    tips: [
      '保险箱「至少稀有」+ 重开几率是稳定收益来源。',
      '命运卡的「被最终首领偷走」是双刃剑，能稳杀首领再点。',
      '两片区域点完约 110 点，剩下的点可以补一个附加玩法。',
    ],
    choices: { '预兆宝箱': 0 },
  },
  {
    id: 'expedition', icon: '祖', name: '先祖秘藏 + 卡古兰 · 炸药与矿脉', tag: '双机制', diff: '中等', focus: '先祖秘藏 / 卡古兰',
    regions: ['先祖秘藏', '卡古兰拓荒者'],
    summary: '秘藏炸药 + 卡古兰矿脉灌注：同一套「卡古兰」内容，跑图时秘藏点与矿脉经常同图，两套收益叠加。',
    tips: [
      '「极限考古」只留一发炸药但范围巨大，熟悉布局后再开。',
      '卡古兰只保留灌注与矿脉数量，不要 12 个大点全点。',
      '带队领袖按你要的商人服务选（默认罗格）。',
    ],
    choices: { '卡古兰友伴': 0, '受控引爆': 0 },
  },
  {
    id: 'eldritch', icon: '焚', name: '古灵祭坛 · 焚界者 + 稀有怪', tag: '主 + 辅', diff: '高收益高风险', focus: '古灵祭坛',
    regions: ['焚界者'], extra: ['稀有怪物', '传奇怪物', '地图'], skip: ['未行之路', '全面探险'],
    summary: '焚界者祭坛（宇宙之怒 + 三件祭坛增强）+ 稀有 / 传奇怪物。祭坛的稀有怪奖励与「严重畸变 / 恐怖之巅」直接叠加。',
    tips: [
      '两个祭坛基石只能玩一个：这套是焚界者；想刷灭世者就换成灭世者 + 古神凝视。',
      '「宇宙之怒」负面很重，脆皮 BD 慎点。',
      '稀有 / 传奇怪物区域只取与祭坛收益联动的几个大点。',
    ],
    choices: { '恶性词缀': 1 },
  },
  {
    id: 'maven', icon: '贤', name: '贤主首领 · 见证连战', tag: '主 + 辅', diff: '高门槛', focus: '贤主',
    regions: [], mustAll: ['贤主见证额外首领几率', '贤主钉几率', '毁灭游戏'], extra: ['征服者', '塑界者与裂界者', '传奇怪物', '地图'], skip: ['未行之路'],
    summary: '贤主见证（额外首领 + 凿刀）+ 征服者 / 守卫地图。做成一条「打完这张打下一张首领图」的连战线。',
    tips: [
      '「毁灭游戏」要求地图剩怪越少收益越高：清完图再打首领。',
      '贤主凿刀只有镶嵌仪庆虚空石才会掉。',
      '这套大点数少、路径长，剩余点数建议补地图供给。',
    ],
    choices: { '恶性词缀': 1 },
  },
  {
    id: 'merc', icon: '佣', name: '佣兵 + 盗贼流放者 · 恶名与野生', tag: '双机制', diff: '中等', focus: '佣兵 / 盗贼',
    regions: ['佣兵', '盗贼流放者'],
    summary: '佣兵（恶名 / 传奇装备 / 光环）+ 盗贼流放者：野生流放者会带野生佣兵，两套人形怪在同一张图里互相放大。',
    tips: [
      '恶名佣兵是主要目标：装备更好、掉落更多。',
      '「不可能的合作」让野生流放者带野生佣兵，是两套机制的连接点。',
      '这一区域离起点很近，80 多点就能点完，剩余点数很多，建议自己接一个主玩法。',
    ],
    choices: { '特拉特斯政策': 0, '家族霸权': 0 },
  },
  {
    id: 'delirium', icon: '雾', name: '惊悸迷雾 + 深渊 · 群怪密度流', tag: '双机制', diff: '高投入', focus: '惊悸迷雾 / 深渊',
    regions: ['惊悸迷雾', '深渊'], extra: ['裂隙'], skip: ['创造源泉'],
    summary: '迷雾（奖励进度 / 星团 / 拟像）+ 深渊（怪物数量 / 稀有 / 珠宝）。两套都吃怪物密度，适合高群规模清图 BD。',
    tips: [
      '先确认你能稳定清完迷雾，再点「坠入疯狂」。',
      '深渊的「深渊大军 / 黑暗崛起」直接放大迷雾奖励进度。',
      '主要产出是星团珠宝与拟像裂片。',
    ],
    choices: { '黑暗浸染': 1, '交融现实': 2, '肥沃之地': 3 },
  },
  {
    id: 'starter', icon: '启', name: '开荒 · 地图供给与群规模', tag: '开荒', diff: '极低', focus: '地图 / 群规模',
    regions: ['地图', '稀有怪物'], extra: ['保险箱'], skip: ['未行之路'],
    summary: '只解决「图不断 + 群规模」：地图掉落、词缀效果、稀有怪加成，再补一点保险箱。第一周用，确定玩法后直接换掉。',
    tips: [
      '先把地图掉落与群规模点满，保证图不断。',
      '「众词归一 / 倍增词缀」是词缀效果放大器，配高词缀图很强。',
      '这是唯一一套通用预设，不建议长期使用。',
    ],
    choices: { '预兆宝箱': 0, '恶性词缀': 1 },
  },
];

const P = [];
for (const spec of SPECS) {
  const p = build(spec);
  if (p.missing.length) problems.push(p.id + ' unreachable:' + p.missing.join(','));
  P.push(p);
  console.log(p.id.padEnd(11), 'cost', String(p.cost).padStart(3), '| 主', String(p.mainList.length).padStart(2),
    '辅', String(p.extraList.length).padStart(2), '顺路', p.onPath.length, '| spare', 150 - p.cost);
  if (p.onPath.length) console.log('    顺路:', p.onPath.join(', '));
}
if (problems.length) console.log('PROBLEMS:\n - ' + problems.join('\n - '));

fs.writeFileSync(path.join(root, 'data', 'presets.json'), JSON.stringify(P, null, 1));
const slim = P.map(p => ({
  id: p.id, icon: p.icon, name: p.name, tag: p.tag, diff: p.diff, focus: p.focus,
  summary: p.summary, tips: p.tips, cost: p.cost, order: p.order, choice: p.choice,
  notableList: p.notableList, mainList: p.mainList, extraList: p.extraList, onPath: p.onPath,
  mainPoints: p.mainPoints, extraPoints: p.extraPoints, pathPoints: p.pathPoints,
  targets: [...p.mainList, ...p.extraList],
}));
fs.writeFileSync(path.join(root, 'site', 'trees', 'presets.js'), 'window.ATLAS_PRESETS=' + JSON.stringify(slim) + ';');
