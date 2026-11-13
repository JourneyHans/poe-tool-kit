import { spawn } from 'node:child_process';
import fs from 'node:fs';
const PORT = 9235, BASE = 'http://127.0.0.1:4173';
const OUT = 'E:/personal/AI/流放之路1辅助/shots/deliver';
const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--window-size=1600,1000', `--remote-debugging-port=${PORT}`, '--user-data-dir=C:/Users/hhz/AppData/Local/Temp/atlas-cdp7', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
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
await send('Page.navigate', { url: BASE + '/index.html' }); await sleep(2200);
// zoom in on the breach notable cluster (targets of the breach preset)
await ev(`(()=>{const A=window.__ATLAS__;const p=A.PRESETS.find(x=>x.id==='breach');A.applyPreset(p,false);const n=A.byId.get(p.targets[0]);A.fit();})()`);
await sleep(300);
// simulate wheel zoom around the centre via the exposed fit + manual zoom
await ev(`(()=>{const c=document.getElementById('c');const r=c.getBoundingClientRect();for(let i=0;i<10;i++){c.dispatchEvent(new WheelEvent('wheel',{deltaY:-120,clientX:r.width*0.6,clientY:r.height*0.45,bubbles:true,cancelable:true}));}})()`);
await sleep(500);
await shot('06-zoom-labels');
console.log('ok', await ev('document.getElementById("pct").textContent'));
ws.close(); child.kill(); process.exit(0);
