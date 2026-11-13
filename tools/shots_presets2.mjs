import { spawn } from 'node:child_process';
import fs from 'node:fs';
const PORT = 9255, BASE = 'http://127.0.0.1:4173';
const OUT = 'E:/personal/AI/流放之路1辅助/shots/presets2';
const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--window-size=1600,1000', `--remote-debugging-port=${PORT}`, '--user-data-dir=C:/Users/hhz/AppData/Local/Temp/atlas-cdp17', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
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
await send('Page.navigate', { url: BASE + '/index.html' }); await sleep(2400);

// 1) cards view
await shot('02-preset-cards');

// 2) apply breach + zoom to the breach cluster via wheel
await ev(`(()=>{const A=window.__ATLAS__;document.getElementById('clear').click();A.applyPreset(A.PRESETS.find(p=>p.id==='breach'),false);A.fit();return 1;})()`);
await sleep(300);
for (let i = 0; i < 10; i++) {
  const p = await ev(`(()=>{const A=window.__ATLAS__;const n=A.byId.get(19729);const c=document.getElementById('c');const r=c.getBoundingClientRect();const s=A.screenOf(n);return {x:r.left+s[0],y:r.top+s[1]};})()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: p.x, y: p.y, deltaX: 0, deltaY: -200 });
  await sleep(90);
}
await sleep(400);
await shot('03-breach-zoom');
console.log('zoom', await ev('window.__ATLAS__.getCam().zoom'));
ws.close(); child.kill(); process.exit(0);
