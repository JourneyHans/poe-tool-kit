import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.text();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise(res => setTimeout(res, 1200 * (i + 1)));
    }
  }
}

const html = await get('https://poedb.tw/cn/Atlas_passive_skill');
fs.writeFileSync(path.join(root, 'src_data', 'poedb_atlas_cn.html'), html);

// <a href="/cn/Slug" data-hover="..."> ... <div class="...">NAME</div>
const re = /<a href="\/cn\/([A-Za-z0-9_%.\-]+)"[^>]*>([\s\S]{0,700}?)<\/a>/g;
const rows = [];
let m;
while ((m = re.exec(html))) {
  const slug = decodeURIComponent(m[1]);
  const inner = m[2];
  const text = inner
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
  rows.push({ slug, lines: text });
}
console.log('rows', rows.length);
console.log(JSON.stringify(rows.slice(0, 6), null, 2));
fs.writeFileSync(path.join(root, 'data', 'poedb_rows.json'), JSON.stringify(rows, null, 1));
