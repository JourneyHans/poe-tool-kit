import { spawn } from 'node:child_process';
import fs from 'node:fs';
const PORT = 9245;
const OUT = 'E:/personal/AI/流放之路1辅助/shots/compare';
fs.mkdirSync(OUT, { recursive: true });
const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--window-size=1600,1000', `--remote-debugging-port=${PORT}`, '--user-data-dir=C:/Users/hhz/AppData/Local/Temp/atlas-cdp12', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
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

// 1) original site, zoom to the same area near the start node
await send('Page.navigate', { url: 'https://hypostasis.faith/atlas/data.html' });
await sleep(4000);
await shot('orig-fit');
for (let i = 0; i < 8; i++) {
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 900, y: 520, deltaX: 0, deltaY: -240 });
  await sleep(120);
}
await shot('orig-zoom');
const info = await ev("({imgs:[...document.images].map(i=>({src:i.src.split('/').pop(),w:i.naturalWidth,h:i.naturalHeight})), nodes: typeof T!=='undefined' ? T.nodes.length : null})");
console.log(JSON.stringify(info));
ws.close(); child.kill(); process.exit(0);
