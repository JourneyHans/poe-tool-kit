import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const site = path.join(root, 'site');
const read = p => fs.readFileSync(p, 'utf8');

const html = read(path.join(site, 'index.template.html'));
const css = read(path.join(site, 'style.css'));
const app = read(path.join(site, 'app.js'));
const data = read(path.join(site, 'trees', 'data.zh.js'));
const presets = read(path.join(site, 'trees', 'presets.js'));

// inline every atlas sprite sheet as a data URI so the page is fully self-contained
let dataInline = data;
const assets = [];
for (const f of fs.readdirSync(path.join(site, 'assets'))) {
  if (!/\.webp$/i.test(f)) continue;
  const b64 = fs.readFileSync(path.join(site, 'assets', f)).toString('base64');
  dataInline = dataInline.split(`assets/${f}`).join(`data:image/webp;base64,${b64}`);
  assets.push([f, b64.length]);
}

// guard against accidental </script> inside inlined sources
const safe = s => s.replace(/<\/script/gi, '<\\/script');

let out = html;
out = out.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>');
out = out.replace('<script src="trees/data.zh.js"></script>', '<script>' + safe(dataInline) + '</script>');
out = out.replace('<script src="trees/presets.js"></script>', '<script>' + safe(presets) + '</script>');
out = out.replace('<script src="app.js"></script>', '<script>' + safe(app) + '</script>');
out = out.replace('<title>流放之路 1 · 舆图天赋树（中文版）</title>',
  '<title>流放之路 1 · 舆图天赋树（中文版）</title>');

fs.writeFileSync(path.join(site, 'index.html'), out);
fs.writeFileSync(path.join(site, 'atlas-standalone.html'), out);
console.log('index.html / atlas-standalone.html:', (out.length / 1024 / 1024).toFixed(2), 'MB', '| assets inlined:', assets.length);
