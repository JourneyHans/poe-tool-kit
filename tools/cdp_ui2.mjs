import { spawn } from 'node:child_process';
import fs from 'node:fs';
const PORT = 9257, BASE = 'http://127.0.0.1:4173';
const OUT = 'E:/personal/AI/流放之路1辅助/shots/presets2';
const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--window-size=1600,1000', `--remote-debugging-port=${PORT}`, '--user-data-dir=C:/Users/hhz/AppData/Local/Temp/atlas-cdp18', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 80 && !wsUrl; i++) { try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); wsUrl = l.find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch {} if (!wsUrl) await sleep(250); }
const ws = new WebSocket(wsUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 1; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p = {}) => { const i = id++; ws.send(JSON.stringify({ id: i, method: m, params: p })); return new Promise(r => pend.set(i, r)); };
const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); return r.result?.exceptionDetails ? { err: r.result.exceptionDetails.exception?.description } : r.result?.result?.value; };
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.result.data, 'base64')); };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE + '/index.html' }); await sleep(2200);
const card = await ev("(()=>{const c=document.querySelector('.pcard');return {cost:c.querySelector('.pc-cost').textContent, split:c.querySelector('.pc-split').textContent, name:c.querySelector('.pc-name').textContent};})()");
console.log(JSON.stringify(card));
// preview bar text
await ev("(()=>{const A=window.__ATLAS__;A.previewPreset(A.PRESETS.find(p=>p.id==='eldritch'));return 1;})()");
await sleep(500);
console.log(JSON.stringify(await ev("document.getElementById('pbMeta').textContent")));
await shot('04-preview-bar');

// guide section 6 names
await send('Page.navigate', { url: BASE + '/guide.html' }); await sleep(1400);
const guide = await ev("(()=>{const h=[...document.querySelectorAll('h2')].find(x=>x.textContent.startsWith('六'));const t=h.nextElementSibling;return {title:h.textContent, tableRows:t.querySelectorAll('tbody tr').length};})()");
console.log(JSON.stringify(guide));
await ev("window.scrollTo(0, document.querySelector('h2').offsetTop)");
await shot('05-guide-top');
ws.close(); child.kill(); process.exit(0);
