import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const rows = JSON.parse(fs.readFileSync(path.join(root, 'data', 'poedb_rows.json'), 'utf8'));
const outFile = path.join(root, 'data', 'poedb_node_pages.json');
const pages = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};

const slugs = [...new Set(rows.map(r => r.slug))].filter(s => !pages[s]);
console.log('to fetch', slugs.length, 'have', Object.keys(pages).length);

const dec = s => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');

async function one(slug) {
  const url = 'https://poedb.tw/cn/' + encodeURIComponent(slug);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const html = await r.text();
      const t = /<meta property="og:title" content="([^"]*)"/.exec(html)?.[1] || '';
      const d = /<meta property="og:description" content="([\s\S]*?)"\s*\/>/.exec(html)?.[1] || '';
      const img = /<meta property="og:image" content="([^"]*)"/.exec(html)?.[1] || '';
      return { title: dec(t), desc: dec(d), img };
    } catch (e) {
      if (attempt === 2) return { error: String(e) };
      await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
    }
  }
}

const queue = [...slugs];
let done = 0;
async function worker() {
  while (queue.length) {
    const s = queue.shift();
    pages[s] = await one(s);
    done++;
    if (done % 25 === 0) {
      console.log('done', done, 'remaining', queue.length);
      fs.writeFileSync(outFile, JSON.stringify(pages));
    }
    await new Promise(r => setTimeout(r, 120));
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
fs.writeFileSync(outFile, JSON.stringify(pages));
console.log('pages', Object.keys(pages).length);
