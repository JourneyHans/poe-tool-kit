import { spawn } from 'node:child_process';
import fs from 'node:fs';
const PORT = 9241, BASE = 'http://127.0.0.1:4173';
const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--window-size=1600,1000', `--remote-debugging-port=${PORT}`, '--user-data-dir=C:/Users/hhz/AppData/Local/Temp/atlas-cdp10', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) { try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); wsUrl = l.find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch {} if (!wsUrl) await sleep(250); }
const ws = new WebSocket(wsUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 1; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p = {}) => { const i = id++; ws.send(JSON.stringify({ id: i, method: m, params: p })); return new Promise(r => pend.set(i, r)); };
const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); return r.result?.exceptionDetails ? { err: r.result.exceptionDetails.exception?.description } : r.result?.result?.value; };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE + '/index.html' }); await sleep(2200);

const out = {};
out.apply = await ev("(()=>{const A=window.__ATLAS__;A.applyPreset(A.PRESETS.find(p=>p.id==='breach'),false);return A.picked.size;})()");
out.text = await ev("window.__ATLAS__.buildText()");
out.link = await ev("window.__ATLAS__.writeHash()");
out.share = await ev("(()=>{document.getElementById('shareBtn').click();return true;})()");
await sleep(300);
out.shareToast = await ev("document.getElementById('toast').textContent");
out.export = await ev("(()=>{document.getElementById('exportBtn').click();return true;})()");
await sleep(300);
out.exportToast = await ev("document.getElementById('toast').textContent");
console.log(JSON.stringify(out, null, 1));
ws.close(); child.kill(); process.exit(0);
