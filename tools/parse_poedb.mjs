import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'src_data', 'poedb_atlas_cn.html'), 'utf8');

const strip = s => s
  .replace(/<span class="item_description">([\s\S]*?)<\/span>/g, '（$1）')
  .replace(/<br\s*\/?>/g, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ')
  .replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/[ \t]+/g, ' ')
  .trim();

const rows = [];
const colRe = /<div class="flex-grow-1 ms-2">([\s\S]*?)<\/div><\/div><\/div>/g;
const anyRe = /<div class="flex-grow-1 ms-2">([\s\S]*?)<\/div><\/div>/g;
let m;
let guard = 0;
while ((m = anyRe.exec(html)) && guard++ < 3000) {
  const block = m[1];
  const nameM = /<a class="PassiveSkills"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(block);
  if (!nameM) continue;
  const slug = decodeURIComponent(nameM[1]);
  const name = strip(nameM[2]);
  const countM = /class="property">([\s\S]*?)<\/div>/.exec(block);
  const count = countM ? strip(countM[1]) : '';
  const mods = [];
  const modRe = /<div class="(implicitMod|explicitMod)">([\s\S]*?)<\/div>/g;
  let mm;
  while ((mm = modRe.exec(block))) mods.push(strip(mm[2]));
  rows.push({ slug, name, count, mods });
}
console.log('rows', rows.length);
console.log(JSON.stringify(rows.slice(0, 4), null, 2));
fs.writeFileSync(path.join(root, 'data', 'poedb_rows.json'), JSON.stringify(rows, null, 1));
