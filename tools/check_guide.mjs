import fs from 'node:fs';
const h = fs.readFileSync('site/guide.html', 'utf8');
const ids = [...h.matchAll(/<h2 id="([^"]+)"/g)].map(m => m[1]);
const links = [...h.matchAll(/<a href="#([^"]+)"/g)].map(m => m[1]);
console.log('h2 ids:', ids);
console.log('broken anchors:', links.filter(l => !ids.includes(l)));
console.log('tables:', (h.match(/<table>/g) || []).length, 'sections:', ids.length);
