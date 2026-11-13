/* 流放之路 1 · 舆图天赋树（中文交互版）
   数据：hypostasis.faith/atlas（英文原始数据）+ poedb.tw/cn（官方中文）+ 人工校译
   交互逻辑参考原站 viewer.js 的加点 / 连通性算法并做了中文化与扩展。 */
(() => {
  'use strict';

  const T = window.ATLAS_ZH;
  const PRESETS = window.ATLAS_PRESETS || [];
  if (!T) { document.body.innerHTML = '<p style="padding:40px">数据加载失败：缺少 trees/data.zh.js</p>'; return; }

  const MAX = T.meta.maxPoints || 150;
  const START = T.meta.startNode;
  const SHEETS = T.meta.sheets;
  const byId = new Map(T.nodes.map(n => [n.id, n]));
  const nodeList = T.nodes;
  const realNodes = nodeList.filter(n => !n.deco);
  byId.set(START.id, { ...START, deco: 0, s: [], r: [], f: [] });

  const adj = new Map();
  for (const [a, b] of T.meta.edges) {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push(b);
    adj.get(b).push(a);
  }

  // room assignment (nearest mastery anchor) for region index + hover highlight
  const anchors = T.nodes.filter(n => n.deco);
  const ownerOf = new Map();
  for (const n of realNodes) {
    let best = null, bd = Infinity;
    for (const a of anchors) {
      const d = (a.x - n.x) * (a.x - n.x) + (a.y - n.y) * (a.y - n.y);
      if (d < bd) { bd = d; best = a; }
    }
    ownerOf.set(n.id, best ? best.id : null);
  }
  const members = new Map();
  for (const [id, a] of ownerOf) {
    if (!a) continue;
    if (!members.has(a)) members.set(a, []);
    members.get(a).push(id);
  }
  const anchorById = new Map(anchors.map(a => [a.id, a]));

  // ---------- state ----------
  const picked = new Map();     // id -> node
  const choice = new Map();     // id -> option index
  const undoStack = [];           // snapshots for undo
  let preview = null;           // { name, cost, add:Set, remove:Set, preset? }
  let hover = null;
  let selected = null;          // inspected node
  let searchMatches = [];
  let searchCursor = -1;
  let toastTimer = 0;

  // ---------- helpers ----------
  const statLines = n => (n.s || []).map(i => T.lines[i]).filter(s => !/始终为$|以下类型：$|类型：$|几率提高200%：$/.test(s));
  const choiceLines = (n, i) => (n.v && n.v[i]) ? n.v[i].lines.map(x => T.lines[x]) : [];
  const nodeLines = n => (n.v && n.v.length && choice.has(n.id)) ? [...statLines(n), ...choiceLines(n, choice.get(n.id))] : statLines(n);
  const radius = n => ((n.fr ? n.fr[5] : n.i ? n.i[5] : 60) * 0.45);
  const isKey = n => n.k === 'keystone';
  const isNotable = n => n.k === 'notable';

  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // BFS shortest path from start or any picked node to target
  function pathTo(target) {
    const prev = new Map();
    const q = [START.id, ...picked.keys()];
    for (const id of q) prev.set(id, null);
    for (let i = 0; i < q.length && !prev.has(target); i++) {
      for (const nb of adj.get(q[i]) || []) if (!prev.has(nb)) { prev.set(nb, q[i]); q.push(nb); }
    }
    if (!prev.has(target)) return null;
    const out = [];
    for (let id = target; id !== START.id && !picked.has(id); id = prev.get(id)) out.push(id);
    return out.reverse();
  }

  // allocations that would be orphaned if `without` is removed
  function cut(without) {
    const reach = new Set([START.id]);
    const stack = [START.id];
    while (stack.length) {
      const cur = stack.pop();
      for (const nb of adj.get(cur) || []) {
        if (nb === without || !picked.has(nb) || reach.has(nb)) continue;
        reach.add(nb); stack.push(nb);
      }
    }
    return [...picked.keys()].filter(id => !reach.has(id));
  }

  function snapshot() {
    undoStack.push({ p: [...picked.keys()], c: [...choice.entries()] });
    if (undoStack.length > 120) undoStack.shift();
  }

  function restore(s) {
    picked.clear(); choice.clear();
    for (const id of s.p) if (byId.has(id)) picked.set(id, byId.get(id));
    for (const [id, i] of s.c) if (picked.has(id)) choice.set(id, i);
  }

  function allocatePath(ids) {
    let left = MAX - picked.size;
    for (const id of ids) {
      if (picked.has(id)) continue;
      if (left <= 0) return false;
      picked.set(id, byId.get(id));
      left--;
    }
    return true;
  }

  function toggle(n) {
    if (!n || n.deco) return;
    snapshot();
    if (picked.has(n.id)) {
      for (const id of cut(n.id)) { picked.delete(id); choice.delete(id); }
      picked.delete(n.id); choice.delete(n.id);
    } else {
      const path = pathTo(n.id);
      if (!path) return;
      if (picked.size + path.length > MAX) { toast(`这条路径需要 ${path.length} 点，只剩 ${MAX - picked.size} 点`); return; }
      allocatePath(path);
    }
    changed();
  }

  function chooseOption(n, i) {
    snapshot();
    if (!picked.has(n.id)) {
      const path = pathTo(n.id);
      if (!path || picked.size + path.length > MAX) { toast('点数不足'); return; }
      allocatePath(path);
    }
    choice.set(n.id, i);
    changed();
  }

  function changed() {
    preview = null;
    saveHash();
    updateCount();
    renderPicked();
    renderEffects();
    hidePreviewBar();
    draw();
  }

  // ---------- canvas ----------
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const tip = document.getElementById('tip');
  const menu = document.getElementById('menu');
  const stage = document.getElementById('stage');

  let zoom = 0.1, camX = 0, camY = 0, dpr = 1, W = 0, H = 0;
  const MIN_ZOOM = 0.02, MAX_ZOOM = 1.6;
  let showBg = true;

  const sheets = SHEETS.map(src => {
    const im = new Image();
    im.onload = () => { draw(); checkAssets(); };
    im.onerror = () => { checkAssets(true); };
    im.src = src;
    return im;
  });

  // if any sheet is missing, say so loudly instead of silently drawing a bare tree
  function checkAssets(failed) {
    const bad = sheets.filter(im => im.error || (im.complete && !im.naturalWidth));
    if (!bad.length) return;
    const el = document.getElementById('assetWarn');
    if (!el || !el.classList.contains('hidden')) return;
    el.innerHTML = '<b>图片资源加载失败：' + bad.length + ' / ' + sheets.length + ' 张图集没有加载。</b><br>' +
      '节点图标、区域底图、天赋框都来自 <code>assets/*.webp</code>，它们必须和 <code>index.html</code> 放在同一目录。' +
      '如果你只拿到了一个 HTML 文件，请改用单文件版 <code>atlas-standalone.html</code>（图片已内嵌，可单独分享）。';
    el.classList.remove('hidden');
    if (failed) console.warn('[atlas] sprite sheet failed to load', bad);
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    draw();
  }

  // keep the view's world centre stable when the stage changes size (sidebar toggle / window resize)
  let lastW = 0, lastH = 0;
  function keepView(resizeFn) {
    const beforeX = camX, beforeY = camY;
    resizeFn();
    if (lastW && lastH && W && H && (lastW !== W || lastH !== H)) {
      camX = beforeX - (W - lastW) / 2 / zoom;
      camY = beforeY - (H - lastH) / 2 / zoom;
      draw();
    }
    lastW = W; lastH = H;
  }

  function fit() {
    const [x0, y0, x1, y1] = T.meta.bounds;
    // keep the tree readable: never zoom out below ~6%, let the user pan instead
    zoom = Math.max(0.06, Math.min(W / (x1 - x0 + 1400), H / (y1 - y0 + 2200)));
    camX = (x0 + x1) / 2;
    camY = (y0 + y1) / 2;
    draw();
  }

  function lookAt(x, y) { camX = x; camY = y; draw(); }

  function centerOn(n) {
    zoom = Math.max(zoom, 0.34);
    lookAt(n.x, n.y);
  }

  function zoomAt(factor, sx, sy) {
    const nz = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
    const wx = (sx - W / 2) / zoom + camX;
    const wy = (sy - H / 2) / zoom + camY;
    camX = wx - (sx - W / 2) / nz;
    camY = wy - (sy - H / 2) / nz;
    zoom = nz;
    draw();
  }

  function toWorld(sx, sy) {
    return [(sx - W / 2) / zoom + camX, (sy - H / 2) / zoom + camY];
  }

  function sprite(r, x, y, scale = 1) {
    if (!r) return;
    const im = sheets[r[0]];
    if (!im || !im.complete || !im.naturalWidth) return;
    const w = r[5] * scale, h = r[6] * scale;
    ctx.drawImage(im, r[1], r[2], r[3], r[4], x - w / 2, y - h / 2, w, h);
  }

  // same as sprite() but keeps a minimum on-screen size, so icons stay recognisable
  // when the whole tree is zoomed out (the original site draws them sub-pixel there)
  function spriteMin(r, x, y, minPx) {
    if (!r) return;
    const im = sheets[r[0]];
    if (!im || !im.complete || !im.naturalWidth) return;
    let w = r[5], h = r[6];
    if (w * zoom < minPx) { const k = minPx / (w * zoom); w *= k; h *= k; }
    ctx.drawImage(im, r[1], r[2], r[3], r[4], x - w / 2, y - h / 2, w, h);
  }

  function ring(n, color, width, gap) {
    const r = radius(n) + gap / Math.max(zoom, 0.05);
    ctx.strokeStyle = color;
    ctx.lineWidth = width / Math.max(zoom, 0.04) * Math.min(1, zoom / 0.12);
    ctx.beginPath();
    ctx.arc(n.x, n.y, Math.max(r, 7 / Math.max(zoom, 0.04)), 0, Math.PI * 2);
    ctx.stroke();
  }

  let pending = false;
  function draw() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(render);
  }

  function render() {
    pending = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#08090c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * (W / 2 - camX * zoom), dpr * (H / 2 - camY * zoom));
    ctx.imageSmoothingQuality = 'high';

    // background art
    if (showBg && T.meta.bg) {
      const [x0, y0, x1, y1] = T.meta.bounds, [sx, sy] = T.meta.start;
      const size = 2.3 * Math.max(sx - x0, x1 - sx, sy - y0, y1 - sy);
      const im = sheets[T.meta.bg[0]];
      if (im && im.complete && im.naturalWidth) {
        ctx.drawImage(im, T.meta.bg[1], T.meta.bg[2], T.meta.bg[3], T.meta.bg[4], sx - size / 2, sy - size / 2, size, size);
      }
    }

    // group frames
    for (const [x, y, r] of T.meta.groups) sprite(r, x, y);

    // links
    ctx.strokeStyle = '#4a3f2c';
    ctx.lineWidth = Math.max(8, 1.5 / zoom);
    ctx.beginPath();
    for (const [ax, ay, bx, by] of T.meta.linesGeo) { ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
    for (const [cx, cy, r, a, d] of T.meta.arcs) {
      ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      ctx.arc(cx, cy, r, a, a + d, d < 0);
    }
    ctx.stroke();

    const on = id => id === START.id || picked.has(id);
    const soon = id => on(id) || (preview && preview.add && preview.add.has(id));
    linkPass((a, b) => on(a) && on(b), '#e8c060', 3.2);
    if (preview && preview.add) linkPass((a, b) => soon(a) && soon(b) && !(on(a) && on(b)), '#8fd080', 2.6);

    sprite(START.i, START.x, START.y);

    // room highlight for hover / selected
    const focus = hover || selected;
    if (focus && focus.deco === undefined) {
      const aid = ownerOf.get(focus.id);
      const ms = aid ? members.get(aid) : null;
      if (ms) {
        ctx.save();
        for (const id of ms) {
          const m = byId.get(id);
          if (!m) continue;
          ctx.beginPath();
          ctx.arc(m.x, m.y, radius(m) + 6 / zoom, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(232,192,96,.07)';
          ctx.fill();
        }
        ctx.restore();
      }
    }

    for (const n of nodeList) {
      spriteMin(n.i, n.x, n.y, 6);
      const frame = (picked.has(n.id) && n.fa) ? n.fa : n.fr;
      spriteMin(frame, n.x, n.y, 10);
    }

    // node name labels for keystones/notables at readable zoom
    if (zoom > 0.14) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (const n of nodeList) {
        if (n.k !== 'keystone' && n.k !== 'notable') continue;
        if (zoom < 0.26 && n.k !== 'keystone') continue;
        const fs = Math.min(30, Math.max(15, 15 / Math.max(zoom, 0.05)));
        ctx.font = `${n.k === 'keystone' ? 600 : 400} ${fs}px "Microsoft YaHei",system-ui,sans-serif`;
        ctx.fillStyle = picked.has(n.id) ? '#f0e2b8' : (n.k === 'keystone' ? '#d8b06a' : '#9a917d');
        ctx.shadowColor = 'rgba(0,0,0,.9)';
        ctx.shadowBlur = 6;
        ctx.globalAlpha = 0.95;
        ctx.fillText(n.cn, n.x, n.y + radius(n) + 8 / Math.max(zoom, 0.05));
      }
      ctx.restore();
    }

    // rings
    for (const n of picked.values()) ring(n, n.v && !choice.has(n.id) ? '#e07a30' : '#e8c060', 2.6, 3);
    if (preview) {
      if (preview.add) for (const id of preview.add) if (!picked.has(id)) ring(byId.get(id), '#8fd080', 2.6, 3);
      if (preview.remove) for (const id of preview.remove) ring(byId.get(id), '#e07050', 2.6, 3);
    }
    for (const n of searchMatches) ring(n, n === searchMatches[searchCursor] ? '#ffffff' : '#4fc3ff', 2.4, 7);
    if (hover && !hover.deco) ring(hover, '#f0e6c8', 2, 5);
    if (selected && !selected.deco && selected !== hover) ring(selected, '#9fd0ff', 1.6, 9);

    document.getElementById('pct').textContent = (Math.round(zoom * 1000) / 10) + '%';
  }

  function linkPass(test, color, widthScale) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(10, widthScale / zoom);
    ctx.beginPath();
    for (const [ax, ay, bx, by, a, b] of T.meta.linesGeo)
      if (test(a, b)) { ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
    for (const [cx, cy, r, s, d, a, b] of T.meta.arcs)
      if (test(a, b)) { ctx.moveTo(cx + r * Math.cos(s), cy + r * Math.sin(s)); ctx.arc(cx, cy, r, s, s + d, d < 0); }
    ctx.stroke();
  }

  function pick(sx, sy) {
    const [wx, wy] = toWorld(sx, sy);
    let best = null, bd = Infinity;
    for (const n of nodeList) {
      const d = Math.hypot(n.x - wx, n.y - wy);
      if (d < radius(n) && d < bd) { best = n; bd = d; }
    }
    return best;
  }

  // ---------- tooltip ----------
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function showTip(n, sx, sy) {
    let html = `<b>${esc(n.cn)}</b>`;
    if (n.k === 'keystone') html += '<div class="hint" style="margin:0 0 4px">关键天赋 · 只能点一处分支</div>';
    if (n.k === 'notable') html += '<div class="hint" style="margin:0 0 4px">显著天赋</div>';
    if (n.deco) html += '<div class="hint" style="margin:0 0 4px">区域标记（不可点）</div>';
    for (const s of statLines(n)) html += `<div class="stat">${esc(s)}</div>`;
    if (n.v) {
      const cur = choice.get(n.id);
      html += '<div class="choices">' + n.v.map((v, i) => {
        const lines = v.lines.map(x => T.lines[x]).join('<br>');
        return `<div${i === cur ? ' class="on"' : ''}>${esc(v.cn)}${i === cur ? ' ✔' : ''}<br><span style="opacity:.75">${esc(lines)}</span></div>`;
      }).join('') + '</div>';
    }
    if ((n.r || []).length) for (const i of n.r) html += `<div class="rem">${esc(T.lines[i])}</div>`;
    if ((n.f || []).length) html += `<div class="fl">${n.f.map(esc).join('<br>')}</div>`;
    if (!n.deco) {
      if (picked.has(n.id)) html += '<div class="hint">点击移除（连带的孤立节点会一起移除）</div>';
      else {
        const p = pathTo(n.id);
        if (p) {
          const left = MAX - picked.size;
          html += `<div class="hint">点击加点：需要 ${p.length} 点${p.length > left ? '，点数不足' : `，剩余 ${left} 点`}${n.v ? '；多选一天赋会先让你选择' : ''}</div>`;
        }
      }
    }
    tip.innerHTML = html;
    tip.style.display = 'block';
    const r = tip.getBoundingClientRect();
    tip.style.left = Math.min(sx + 18, window.innerWidth - r.width - 10) + 'px';
    tip.style.top = Math.min(sy + 18, window.innerHeight - r.height - 10) + 'px';
  }

  function hideTip() { tip.style.display = 'none'; }

  // ---------- choice menu ----------
  const menuOpen = () => menu.style.display === 'block';
  function closeMenu() { menu.style.display = 'none'; }
  function openMenu(n, sx, sy) {
    hideTip();
    menu.innerHTML = '';
    const t = document.createElement('b');
    t.textContent = n.cn;
    menu.append(t);
    for (const s of statLines(n)) { const d = document.createElement('div'); d.className = 'stat'; d.textContent = s; menu.append(d); }
    const cur = choice.get(n.id);
    n.v.forEach((v, i) => {
      const b = document.createElement('button');
      b.textContent = v.cn + (v.lines.length > 1 ? '（多词缀）' : '');
      if (i === cur) b.className = 'on';
      b.onclick = () => { closeMenu(); chooseOption(n, i); };
      menu.append(b);
    });
    if (picked.has(n.id)) {
      const b = document.createElement('button');
      b.className = 'rm';
      b.textContent = '移除这个节点';
      b.onclick = () => { closeMenu(); toggle(n); };
      menu.append(b);
    } else {
      const d = document.createElement('div');
      d.className = 'hint';
      const p = pathTo(n.id);
      d.textContent = p ? `选择后加点（共 ${p.length} 点）` : '当前无法到达';
      menu.append(d);
    }
    menu.style.display = 'block';
    const r = menu.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(sx + 14, window.innerWidth - r.width - 8)) + 'px';
    menu.style.top = Math.max(56, Math.min(sy + 14, window.innerHeight - r.height - 8)) + 'px';
  }
  window.addEventListener('pointerdown', e => {
    if (menuOpen() && !menu.contains(e.target) && e.target !== canvas) closeMenu();
  });

  // ---------- pointer ----------
  let drag = null;
  canvas.addEventListener('pointerdown', e => {
    const swallow = menuOpen();
    closeMenu();
    drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: false, swallow };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (drag) {
      if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
      drag.moved = true;
      canvas.classList.add('drag');
      camX -= (e.clientX - drag.x) / zoom;
      camY -= (e.clientY - drag.y) / zoom;
      drag.x = e.clientX; drag.y = e.clientY;
      hideTip(); draw();
      return;
    }
    const n = pick(e.clientX - stage.getBoundingClientRect().left, e.clientY - stage.getBoundingClientRect().top);
    if (n !== hover) {
      hover = n;
      if (n && !n.deco && !picked.has(n.id)) {
        const p = pathTo(n.id);
        preview = p ? { add: new Set(p) } : null;
      } else preview = null;
      draw();
    }
    if (n && !menuOpen()) showTip(n, e.clientX, e.clientY); else hideTip();
  });
  canvas.addEventListener('pointerup', e => {
    const click = drag && !drag.moved && !drag.swallow;
    drag = null;
    canvas.classList.remove('drag');
    if (!click) return;
    const r = stage.getBoundingClientRect();
    const n = pick(e.clientX - r.left, e.clientY - r.top);
    if (!n || n.deco) { selected = null; hideTip(); draw(); return; }
    selected = n;
    if (n.v) { openMenu(n, e.clientX, e.clientY); return; }
    toggle(n);
    if (e.pointerType === 'mouse') showTip(n, e.clientX, e.clientY);
    draw();
  });
  canvas.addEventListener('pointerleave', () => { hideTip(); if (hover) { hover = null; preview = null; draw(); } });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    closeMenu();
    const r = stage.getBoundingClientRect();
    zoomAt(Math.pow(1.0015, -e.deltaY), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  const center = () => [W / 2, H / 2];
  document.getElementById('in').onclick = () => zoomAt(1.25, ...center());
  document.getElementById('out').onclick = () => zoomAt(0.8, ...center());
  document.getElementById('fit').onclick = fit;
  document.getElementById('bg').onclick = () => {
    showBg = !showBg;
    document.getElementById('bg').classList.toggle('on', showBg);
    draw();
  };

  // ---------- panel rendering ----------
  function updateCount() {
    const c = document.getElementById('count');
    c.textContent = `${picked.size} / ${MAX} 点`;
    c.classList.toggle('full', picked.size >= MAX);
    document.getElementById('hintEmpty').style.display = picked.size ? 'none' : '';
  }

  function renderPicked() {
    const ul = document.getElementById('pickedList');
    ul.innerHTML = '';
    const order = { keystone: 0, notable: 1, normal: 2 };
    const arr = [...picked.values()].sort((a, b) => (order[a.k] ?? 3) - (order[b.k] ?? 3) || a.cn.localeCompare(b.cn, 'zh'));
    for (const n of arr) {
      const li = document.createElement('li');
      li.className = n.k + (n.v ? ' choice' : '');
      const nm = document.createElement('span');
      nm.className = 'nm';
      nm.textContent = n.cn;
      nm.title = '在树上定位';
      nm.onclick = () => centerOn(n);
      li.append(nm);
      if (n.v) {
        const sel = document.createElement('select');
        if (!choice.has(n.id)) sel.append(new Option('选择…', '', true, true));
        n.v.forEach((v, i) => sel.append(new Option(v.cn, i, false, choice.get(n.id) === i)));
        sel.onchange = () => chooseOption(n, +sel.value);
        li.append(sel);
      }
      const rm = document.createElement('button');
      rm.className = 'rm';
      rm.textContent = '×';
      rm.title = '移除';
      rm.onclick = () => toggle(n);
      li.append(rm);
      ul.append(li);
    }
  }

  // effect summary with numeric stacking
  const NUM = /\d+(?:\.\d+)?/g;
  function summable(s) {
    const pct = []; let count = 0;
    s.replace(NUM, (m, off) => { if (s[off + m.length] === '%') pct.push(count); count++; return m; });
    return pct.length ? pct : count === 1 ? [0] : [];
  }
  function summarize(nodes) {
    const groups = new Map();
    for (const n of nodes) for (const s of nodeLines(n)) {
      const key = s.replace(NUM, '#');
      const nums = (s.match(NUM) || []).map(Number);
      const g = groups.get(key);
      if (!g) groups.set(key, { text: s, nums, count: 1, sum: summable(s) });
      else { g.count++; for (const i of g.sum) g.nums[i] += nums[i]; }
    }
    return [...groups.values()].map(g => {
      let i = 0;
      const text = g.count > 1 && g.sum.length
        ? g.text.replace(NUM, m => g.sum.includes(i) ? String(Math.round(g.nums[i++] * 100) / 100) : (i++, m))
        : g.text;
      return { text, count: g.count };
    }).sort((a, b) => a.text.localeCompare(b.text, 'zh'));
  }

  function renderEffects() {
    const ul = document.getElementById('effectList');
    ul.innerHTML = '';
    if (!picked.size) {
      ul.innerHTML = '<li style="color:#6a6f79">还没有加点。</li>';
      return;
    }
    for (const e of summarize(picked.values())) {
      const li = document.createElement('li');
      const sp = document.createElement('span');
      sp.textContent = e.text;
      li.append(sp);
      if (e.count > 1) { const x = document.createElement('span'); x.className = 'x'; x.textContent = '×' + e.count; li.append(x); }
      ul.append(li);
    }
  }

  function renderRegions() {
    const wrap = document.getElementById('regionList');
    wrap.innerHTML = '';
    const groups = new Map();
    for (const [aid, ids] of members) {
      const a = anchorById.get(aid);
      if (!a) continue;
      const key = a.cn;
      if (!groups.has(key)) groups.set(key, { name: key, anchors: [], ids: [] });
      const g = groups.get(key);
      g.anchors.push(a); g.ids.push(...ids);
    }
    const arr = [...groups.values()].sort((x, y) => y.ids.length - x.ids.length || x.name.localeCompare(y.name, 'zh'));
    for (const g of arr) {
      const box = document.createElement('div');
      box.className = 'rgroup';
      const btn = document.createElement('button');
      const left = document.createElement('span');
      left.textContent = g.name;
      const right = document.createElement('span');
      right.className = 'n';
      right.textContent = g.ids.length + ' 节点';
      btn.append(left, right);
      btn.onclick = () => {
        box.classList.toggle('open');
      };
      const list = document.createElement('div');
      list.className = 'rnodes';
      const ns = g.ids.map(id => byId.get(id)).filter(Boolean).sort((a, b) => (a.k === 'notable' ? -1 : 1) - (b.k === 'notable' ? -1 : 1) || a.cn.localeCompare(b.cn, 'zh'));
      for (const n of ns) {
        if (n.k === 'normal') continue;
        const b = document.createElement('button');
        b.textContent = n.cn + (n.v ? ' ·多选' : '');
        b.onclick = ev => {
          ev.stopPropagation();
          centerOn(n);
          selected = n;
          draw();
        };
        list.append(b);
      }
      const a0 = g.anchors[0];
      const loc = document.createElement('button');
      loc.textContent = '定位到该区域';
      loc.style.color = '#c9a35a';
      loc.onclick = ev => { ev.stopPropagation(); zoom = Math.max(zoom, 0.3); lookAt(a0.x, a0.y - 400); };
      list.prepend(loc);
      box.append(btn, list);
      wrap.append(box);
    }
  }

  // ---------- presets ----------
  let activePreset = null;
  let stepIdx = -1;

  function renderPresets() {
    const list = document.getElementById('presetList');
    list.innerHTML = '';
    for (const p of PRESETS) {
      const card = document.createElement('div');
      card.className = 'pcard' + (activePreset && activePreset.id === p.id ? ' on' : '');
      card.dataset.id = p.id;
      const top = document.createElement('div');
      top.className = 'pc-top';
      const ic = document.createElement('div'); ic.className = 'pc-icon'; ic.textContent = p.icon;
      const nm = document.createElement('div'); nm.className = 'pc-name'; nm.textContent = p.name;
      const cost = document.createElement('div');
      cost.className = 'pc-cost';
      cost.textContent = `${p.cost} 点 · 余 ${MAX - p.cost}`;
      top.append(ic, nm, cost);
      const tags = document.createElement('div');
      tags.className = 'pc-tags';
      for (const t of [p.tag, p.diff, p.focus]) {
        const c = document.createElement('span');
        c.className = 'chip' + (t === p.focus ? ' f' : '');
        c.textContent = t;
        tags.append(c);
      }
      const split = document.createElement('div');
      split.className = 'pc-split';
      split.textContent = `玩法核心 ${p.mainPoints + p.extraPoints} 点` +
        (p.extraPoints ? `（含附加 ${p.extraPoints}）` : '') +
        ` · 过路 ${p.pathPoints} 点`;
      const sum = document.createElement('div'); sum.className = 'pc-sum'; sum.textContent = p.summary;
      const tips = document.createElement('ul'); tips.className = 'pc-tips';
      for (const t of p.tips) { const li = document.createElement('li'); li.textContent = t; tips.append(li); }
      const acts = document.createElement('div'); acts.className = 'pc-actions';
      const b1 = document.createElement('button'); b1.className = 'ghost'; b1.textContent = '预览';
      b1.onclick = () => previewPreset(p);
      const b2 = document.createElement('button'); b2.className = 'accent'; b2.textContent = '应用';
      b2.onclick = () => applyPreset(p, true);
      acts.append(b1, b2);
      card.append(top, tags, split, sum, tips, acts);
      list.append(card);
    }
  }

  function showPreviewBar(p) {
    const bar = document.getElementById('previewBar');
    bar.classList.remove('hidden');
    document.getElementById('pbIcon').textContent = p.icon;
    document.getElementById('pbName').textContent = p.name;
    document.getElementById('pbMeta').textContent =
      `核心 ${p.cost} 点（玩法 ${p.mainPoints + p.extraPoints} / 过路 ${p.pathPoints}）· 剩余 ${MAX - p.cost} 点自由分配`;
  }
  function hidePreviewBar() {
    document.getElementById('previewBar').classList.add('hidden');
  }

  // simulate allocating the preset on top of what the user already has,
  // returning the incremental path and the set of nodes it would add
  const pathSim = p => {
    const sim = new Set();
    const add = new Set();
    for (const id of p.order) {
      if (picked.has(id)) continue;
      const prev = new Map();
      const q = [START.id, ...picked.keys(), ...sim];
      for (const x of q) prev.set(x, null);
      for (let i = 0; i < q.length && !prev.has(id); i++)
        for (const nb of adj.get(q[i]) || []) if (!prev.has(nb)) { prev.set(nb, q[i]); q.push(nb); }
      if (!prev.has(id)) continue;
      const path = [];
      for (let x = id; x !== START.id && !picked.has(x) && !sim.has(x); x = prev.get(x)) path.push(x);
      for (const x of path.reverse()) { sim.add(x); add.add(x); }
    }
    return { sim, add, delta: sim.size };
  };

  function previewPreset(p) {
    activePreset = p;
    stepIdx = -1;
    const { add, delta } = pathSim(p);
    preview = { add, preset: p };
    showPreviewBar(p);
    document.getElementById('side').classList.add('open');
    document.querySelector('.tabs button[data-tab="presets"]').click();
    renderPresetsHighlight();
    document.getElementById('pbMeta').textContent =
      `核心 ${p.cost} 点（玩法 ${p.mainPoints + p.extraPoints} / 过路 ${p.pathPoints}）· 当前 ${picked.size} 点，本次 +${delta}，应用后 ${picked.size + delta} / ${MAX}`;
    const ids = [...new Set([...add, ...[...picked.keys()]])];
    if (ids.length) zoomToNodes(ids.map(id => byId.get(id)).filter(Boolean));
    const card = document.querySelector('.pcard[data-id="' + p.id + '"]');
    if (card) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    draw();
  }

  function renderPresetsHighlight() {
    document.querySelectorAll('.pcard').forEach(c => c.classList.toggle('on', activePreset && c.dataset.id === activePreset.id));
  }

  function zoomToNodes(ns) {
    if (!ns.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of ns) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }
    const pad = 900;
    zoom = Math.min(MAX_ZOOM, Math.max(0.08, Math.min(W / (x1 - x0 + pad * 2), H / (y1 - y0 + pad * 2))));
    camX = (x0 + x1) / 2; camY = (y0 + y1) / 2;
    draw();
  }

  function applyPreset(p, notify) {
    snapshot();
    const before = picked.size;
    let added = 0;
    for (const id of p.order) {
      if (picked.has(id)) continue;
      const path = pathTo(id);
      if (!path) continue;
      if (picked.size + path.length > MAX) { toast('点数不足以完整载入该方案'); break; }
      for (const x of path) { picked.set(x, byId.get(x)); added++; }
    }
    for (const [id, i] of Object.entries(p.choice || {})) {
      if (picked.has(Number(id))) choice.set(Number(id), i);
    }
    activePreset = p;
    hidePreviewBar();
    changed();
    if (notify) toast(`已载入「${p.name}」：新增 ${added} 点，当前 ${picked.size}/${MAX}`);
  }

  // ---------- hash sharing ----------
  let hashTimer = 0;
  function writeHash() {
    const ids = [...picked.keys()].map(id => choice.has(id) ? id + ':' + choice.get(id) : id).join(',');
    try { window.history.replaceState(null, '', ids ? '#s=' + ids : location.pathname + location.search); } catch (e) {}
    return location.href;
  }
  function saveHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(writeHash, 120);
  }

  // copy helper with a clipboard-API fallback (file:// and older browsers)
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {}
    try {
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  const choiceLabel = n => (n.v && choice.has(n.id)) ? '（' + n.v[choice.get(n.id)].cn + '）' : '';

  // clipboard blocked (file:// or permission denied) -> show a select-all modal instead
  function showCopyBox(text) {
    const box = document.getElementById('copyBox');
    const ta = document.getElementById('copyText');
    ta.value = text;
    box.classList.remove('hidden');
    ta.focus();
    ta.select();
  }
  document.getElementById('copyClose').onclick = () => document.getElementById('copyBox').classList.add('hidden');
  document.getElementById('copyBox').addEventListener('pointerdown', e => {
    if (e.target.id === 'copyBox') e.currentTarget.classList.add('hidden');
  });

  async function copyOrShow(text) {
    const ok = await copyText(text);
    if (!ok) showCopyBox(text);
    return ok;
  }

  function buildText() {
    const keys = [...picked.values()].filter(n => n.k === 'keystone');
    const nots = [...picked.values()].filter(n => n.k === 'notable');
    const norms = picked.size - keys.length - nots.length;
    const out = [`【流放之路 · 舆图天赋】${picked.size} / ${MAX} 点`];
    if (keys.length) {
      out.push('', '关键天赋：');
      for (const n of keys) out.push('- ' + n.cn + choiceLabel(n));
    }
    if (nots.length) {
      out.push('', '显著天赋：');
      for (const n of nots) out.push('- ' + n.cn + choiceLabel(n));
    }
    if (norms) out.push('', `过路小点：${norms} 个`);
    out.push('', '加点链接：', writeHash());
    return out.join('\n');
  }
  function loadHash() {
    picked.clear(); choice.clear();
    const m = /#s=([\d,:]+)/.exec(location.hash);
    if (!m) return;
    for (const item of m[1].split(',')) {
      const [id, c] = item.split(':').map(Number);
      const n = byId.get(id);
      if (!n || n.deco || picked.size >= MAX) continue;
      picked.set(n.id, n);
      if (n.v && Number.isFinite(c) && n.v[c]) choice.set(n.id, c);
    }
    // drop anything unreachable from start (edited URLs)
    const reach = new Set([START.id]); const st = [START.id];
    while (st.length) for (const nb of adj.get(st.pop()) || []) if (picked.has(nb) && !reach.has(nb)) { reach.add(nb); st.push(nb); }
    for (const id of [...picked.keys()]) if (!reach.has(id)) { picked.delete(id); choice.delete(id); }
  }

  // ---------- search ----------
  function buildSearchIndex() {
    for (const n of nodeList) {
      n._text = [n.cn, n.en, ...(n.s || []).map(i => T.lines[i]), ...(n.v || []).flatMap(v => v.lines.map(i => T.lines[i]))].join(' ').toLowerCase();
    }
  }
  const q = document.getElementById('q');
  function search() {
    const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    searchMatches = words.length ? nodeList.filter(n => words.every(w => n._text.includes(w))) : [];
    searchCursor = -1;
    document.getElementById('hits').textContent = words.length ? (searchMatches.length ? searchMatches.length + ' 个结果' : '无结果') : '';
    draw();
  }
  q.addEventListener('input', search);
  q.addEventListener('keydown', e => {
    if (e.key === 'Enter' && searchMatches.length) {
      searchCursor = (searchCursor + (e.shiftKey ? searchMatches.length - 1 : 1)) % searchMatches.length;
      const n = searchMatches[searchCursor];
      document.getElementById('hits').textContent = `${searchCursor + 1} / ${searchMatches.length}`;
      centerOn(n);
      selected = n;
      draw();
    } else if (e.key === 'Escape') {
      q.value = ''; search(); q.blur();
    }
  });

  // ---------- tabs ----------
  document.querySelectorAll('.tabs button').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.id === 'tab-' + b.dataset.tab));
    };
  });
  document.getElementById('presetBtn').onclick = () => {
    document.getElementById('side').classList.add('open');
    document.querySelector('.tabs button[data-tab="presets"]').click();
  };
  document.getElementById('presetClose').onclick = () => document.getElementById('side').classList.remove('open');
  document.getElementById('helpBtn').onclick = () => toast('点击节点加点 · 拖动平移 · 滚轮缩放 · +/- 缩放 · 0 适应 · B 背景 · Ctrl+Z 撤销');

  document.getElementById('shareBtn').onclick = async () => {
    const ok = await copyOrShow(writeHash());
    toast(ok ? '已复制分享链接（含当前加点）' : '已打开手动复制面板');
  };
  document.getElementById('exportBtn').onclick = async () => {
    if (!picked.size) return toast('还没有加点，先点几个节点或套用预设');
    const ok = await copyOrShow(buildText());
    toast(ok ? '已复制加点清单，可直接粘贴分享' : '已打开手动复制面板');
  };

  document.getElementById('undo').onclick = () => {
    if (!undoStack.length) return toast('没有可撤销的操作');
    restore(undoStack.pop());
    changed();
  };
  document.getElementById('clear').onclick = () => {
    if (!picked.size) return;
    snapshot();
    picked.clear(); choice.clear();
    hidePreviewBar(); activePreset = null;
    changed();
  };
  document.getElementById('pbApply').onclick = () => { if (activePreset) applyPreset(activePreset, true); };
  document.getElementById('pbExit').onclick = () => { hitExit(); };
  document.getElementById('pbStep').onclick = () => stepPreview();

  function hitExit() {
    preview = null; activePreset = null; stepIdx = -1;
    hidePreviewBar();
    document.querySelectorAll('.pcard').forEach(c => c.classList.remove('on'));
    draw();
  }

  function stepPreview() {
    if (!activePreset) return;
    const { add } = pathSim(activePreset);
    const seq = [...add];
    if (stepIdx < 0) stepIdx = 0;
    else stepIdx = (stepIdx + 1) % (seq.length + 1);
    preview = { add: new Set(seq.slice(0, stepIdx)), preset: activePreset };
    document.getElementById('pbMeta').textContent = `逐点回放 ${stepIdx} / ${seq.length} 点（本次新增）· 当前已用 ${picked.size} / ${MAX}`;
    const n = byId.get(seq[stepIdx - 1]);
    if (n) lookAt(n.x, n.y);
    draw();
  }

  // ---------- keyboard ----------
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === 'Escape') { closeMenu(); hideTip(); }
    if (e.key === '+' || e.key === '=') zoomAt(1.25, ...center());
    if (e.key === '-') zoomAt(0.8, ...center());
    if (e.key === '0') fit();
    if (e.key === 'b' || e.key === 'B') document.getElementById('bg').click();
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); document.getElementById('undo').click(); }
    if ((e.key === '/' || (e.key === 'f' && (e.ctrlKey || e.metaKey)))) { e.preventDefault(); q.focus(); q.select(); }
    if (e.key === 'ArrowRight') stepPreview();
    if (e.key === 'ArrowLeft') stepPreview();
  });

  // ---------- boot ----------
  document.getElementById('ver').textContent = 'v' + (T.meta.version ? T.meta.version.split(' ')[0] : '') + ' 中文';
  buildSearchIndex();
  loadHash();
  renderPresets();
  renderRegions();
  updateCount();
  renderPicked();
  renderEffects();
  new ResizeObserver(() => keepView(resize)).observe(stage);
  resize();
  lastW = W; lastH = H;
  loadHash(); // after sizes
  updateCount(); renderPicked(); renderEffects();
  fit();
  setTimeout(() => checkAssets(), 2600);
  window.addEventListener('resize', () => setTimeout(() => keepView(resize), 30));

  // expose for debugging / tests
  window.__ATLAS__ = { T, picked, choice, MAX, byId, pathTo, fit, applyPreset, PRESETS, previewPreset, buildText, writeHash, screenOf: n => [W / 2 + (n.x - camX) * zoom, H / 2 + (n.y - camY) * zoom], getCam: () => ({ camX, camY, zoom }) };
})();
