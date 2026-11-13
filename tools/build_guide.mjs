import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const md = fs.readFileSync(path.join(root, 'docs', '舆图天赋指南.md'), 'utf8');

const inline = s => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

const slug = s => s.trim().toLowerCase()
  .replace(/[\u3000-\u303f\uff00-\uffef「」『』]/g, '')
  .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const lines = md.split(/\r?\n/);
const out = [];
const heads = [];
let i = 0;
let inCode = false;
let listType = null;
const closeList = () => { if (listType) { out.push('</' + listType + '>'); listType = null; } };

while (i < lines.length) {
  const line = lines[i];
  if (/^```/.test(line)) {
    if (inCode) { out.push('</code></pre>'); inCode = false; }
    else { closeList(); out.push('<pre><code>'); inCode = true; }
    i++; continue;
  }
  if (inCode) { out.push(line.replace(/&/g, '&amp;').replace(/</g, '&lt;')); i++; continue; }
  if (/^\s*$/.test(line)) { closeList(); i++; continue; }

  if (/^\|/.test(line) && /^\|[\s\-:|]+\|?\s*$/.test(lines[i + 1] || '')) {
    closeList();
    const cells = l => l.replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim()));
    const head = cells(line);
    out.push('<div class="tablewrap"><table><thead><tr>' + head.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>');
    i += 2;
    while (i < lines.length && /^\|/.test(lines[i])) {
      const row = lines[i].replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim()));
      out.push('<tr>' + row.map(c => '<td>' + c + '</td>').join('') + '</tr>');
      i++;
    }
    out.push('</tbody></table></div>');
    continue;
  }

  const h = /^(#{1,6})\s+(.*)$/.exec(line);
  if (h) {
    closeList();
    const lv = h[1].length;
    const id = slug(h[2]);
    out.push('<h' + lv + ' id="' + id + '">' + inline(h[2]) + '</h' + lv + '>');
    if (lv === 2) heads.push([id, h[2].replace(/[（(].*$/, '').trim()]);
    i++; continue;
  }

  if (/^>\s?/.test(line)) {
    closeList();
    const buf = [];
    while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
    out.push('<blockquote>' + inline(buf.join(' ')) + '</blockquote>');
    continue;
  }

  if (/^(-{3,}|\*{3,})$/.test(line)) { closeList(); out.push('<hr>'); i++; continue; }

  const ol = /^\s*(\d+)\.\s+(.*)$/.exec(line);
  if (ol) {
    if (listType !== 'ol') { closeList(); out.push('<ol>'); listType = 'ol'; }
    out.push('<li>' + inline(ol[2]) + '</li>');
    i++; continue;
  }
  const ul = /^\s*[-*]\s+(.*)$/.exec(line);
  if (ul) {
    if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul'; }
    out.push('<li>' + inline(ul[1]) + '</li>');
    i++; continue;
  }

  closeList();
  const buf = [line];
  i++;
  while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,6}\s|>\s?|\||```|\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) {
    buf.push(lines[i]); i++;
  }
  out.push('<p>' + inline(buf.join(' ')) + '</p>');
}
closeList();
if (inCode) out.push('</code></pre>');

const toc = heads.map(([id, t]) => '  <a href="#' + id + '">' + t + '</a>').join('\n');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>舆图天赋树完全指南 · 流放之路 1</title>
<link rel="stylesheet" href="style.css">
<style>
  body{overflow:auto;background:#08090c}
  .doc{max-width:920px;margin:0 auto;padding:26px 22px 120px}
  .doc h1{font-size:30px;color:#f0e0b8;margin:8px 0 18px;letter-spacing:.02em}
  .doc h2{font-size:22px;color:#e8c060;margin:38px 0 12px;padding-bottom:6px;border-bottom:1px solid #2a2e37}
  .doc h3{font-size:17px;color:#e0cfa0;margin:26px 0 8px}
  .doc h4{font-size:15px;color:#c8ccd4;margin:18px 0 6px}
  .doc p,.doc li{color:#b9bec8;line-height:1.85;font-size:14.5px}
  .doc strong{color:#f0e6c8}
  .doc code{background:#15181e;color:#a9b8ff;padding:1px 5px;border-radius:3px;font-size:13px}
  .doc pre{background:#0d1015;border:1px solid #23262d;border-radius:6px;padding:12px;overflow:auto}
  .doc pre code{background:none;padding:0;color:#c8ccd4}
  .doc a{color:#8fb8ff}
  .doc blockquote{margin:14px 0;padding:10px 14px;border-left:3px solid #6b5a3c;background:#111318;color:#c9b98f;border-radius:0 6px 6px 0}
  .doc hr{border:0;border-top:1px solid #23262d;margin:30px 0}
  .doc ul,.doc ol{padding-left:24px}
  .doc .tablewrap{overflow-x:auto;margin:14px 0}
  .doc table{border-collapse:collapse;width:100%;font-size:13.5px}
  .doc th,.doc td{border:1px solid #262a32;padding:7px 10px;text-align:left;vertical-align:top}
  .doc th{background:#14171d;color:#e8d8a8;white-space:nowrap}
  .doc td{color:#b9bec8}
  .topbar{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:14px;padding:10px 18px;
    background:rgba(12,13,17,.94);border-bottom:1px solid #23262d;backdrop-filter:blur(6px)}
  .topbar b{color:#e8d8a8}
  .topbar a{color:#9aa0aa;text-decoration:none;font-size:13px}
  .topbar a:hover{color:#e8c060}
  .topbar .sp{flex:1}
  .toc{background:#0e1014;border:1px solid #23262d;border-radius:8px;padding:14px 18px;margin:18px 0 8px;
    display:flex;flex-wrap:wrap;gap:4px 14px}
  .toc b{color:#e8c060;display:block;width:100%;margin-bottom:2px}
  .toc a{color:#9aa0aa;font-size:13px;text-decoration:none}
  .toc a:hover{color:#e8d8a8}
</style>
</head>
<body>
<div class="topbar">
  <b>舆图天赋树 · 完全指南</b>
  <a href="index.html">← 返回交互式天赋树</a>
  <span class="sp"></span>
  <a href="index.html">开始加点</a>
</div>
<div class="doc">
<div class="toc">
  <b>目录</b>
${toc}
</div>
${out.join('\n')}
</div>
</body>
</html>`;

fs.writeFileSync(path.join(root, 'site', 'guide.html'), html);
console.log('guide.html', html.length, 'bytes, h2:', heads.length);
