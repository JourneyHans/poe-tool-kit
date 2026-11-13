import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PORT = 9233, BASE = 'http://127.0.0.1:4173';
const OUT = 'E:/personal/AI/流放之路1辅助/shots/deliver';
fs.mkdirSync(OUT, { recursive: true });
const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--window-size=1600,1000', `--remote-debugging-port=${PORT}`, '--user-data-dir=C:/Users/hhz/AppData/Local/Temp/atlas-cdp6',
  '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) { try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); wsUrl = l.find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch {} if (!wsUrl) await sleep(250); }
const ws = new WebSocket(wsUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 1; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p = {}) => { const i = id++; ws.send(JSON.stringify({ id: i, method: m, params: p })); return new Promise(r => pend.set(i, r)); };
const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.result.data, 'base64')); };

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });

// 1. breach preset applied, zoomed to the region
await send('Page.navigate', { url: BASE + '/index.html' });
await sleep(2200);
await ev("(()=>{const A=window.__ATLAS__;document.getElementById('side').classList.remove('open');A.applyPreset(A.PRESETS.find(p=>p.id==='breach'),false);const ns=A.PRESETS.find(p=>p.id==='breach').order.map(i=>A.byId.get(i));let x0=9e9,y0=9e9,x1=-9e9,y1=-9e9;for(const n of ns){x0=Math.min(x0,n.x);y0=Math.min(y0,n.y);x1=Math.max(x1,n.x);y1=Math.max(y1,n.y);}})()");
await sleep(400);
await shot('01-breach-full');

// 2. zoom to breach area with labels
await ev("(()=>{const A=window.__ATLAS__;const ns=A.PRESETS.find(p=>p.id==='breach').targets.map(i=>A.byId.get(i));const n=ns[0];A.fit();})()");
await sleep(300);
// 3. merc preview with sidebar
await ev("(()=>{const A=window.__ATLAS__;document.getElementById('side').classList.add('open');document.querySelector('.tabs button[data-tab=\"presets\"]').click();document.getElementById('clear').click();A.previewPreset(A.PRESETS.find(p=>p.id==='merc'));})()");
await sleep(700);
await shot('02-merc-preview');

// 4. effects tab with ritual
await ev("(()=>{const A=window.__ATLAS__;document.getElementById('pbExit').click();document.getElementById('clear').click();A.applyPreset(A.PRESETS.find(p=>p.id==='ritual'),false);document.querySelector('.tabs button[data-tab=\"effects\"]').click();})()");
await sleep(500);
await shot('03-ritual-effects');

// 5. regions tab
await ev("document.querySelector('.tabs button[data-tab=\"regions\"]').click()");
await sleep(300);
await shot('04-regions');

// 6. guide
await send('Page.navigate', { url: BASE + '/guide.html' });
await sleep(1500);
await shot('05-guide');

console.log('ok');
ws.close(); child.kill(); process.exit(0);
