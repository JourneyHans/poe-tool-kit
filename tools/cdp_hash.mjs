import { spawn } from 'node:child_process';
import fs from 'node:fs';
const PORT = 9229, BASE = 'http://127.0.0.1:4173';
const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--window-size=1400,900',
  `--remote-debugging-port=${PORT}`, '--user-data-dir=C:/Users/hhz/AppData/Local/Temp/atlas-cdp4', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) { try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); wsUrl = l.find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch {} if (!wsUrl) await sleep(250); }
const ws = new WebSocket(wsUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 1; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p = {}) => { const i = id++; ws.send(JSON.stringify({ id: i, method: m, params: p })); return new Promise(r => pend.set(i, r)); };
const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); return r.result?.exceptionDetails ? { err: r.result.exceptionDetails.exception?.description } : r.result?.result?.value; };
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: BASE + '/index.html' }); await sleep(2000);
const res = {};
res.before = await ev('location.href');
res.apply = await ev(`(()=>{const A=window.__ATLAS__;A.applyPreset(A.PRESETS.find(p=>p.id==='ultimatum'),false);return A.picked.size;})()`);
await sleep(1000);
res.after = await ev('location.href');
res.len = await ev('location.hash.length');
res.err = await ev(`(()=>{try{history.replaceState(null,'',location.pathname+'#s=1,2,3');return location.hash;}catch(e){return 'ERR '+e.message;}})()`);
await sleep(300);
res.after2 = await ev('location.hash');
console.log(JSON.stringify(res, null, 1));
ws.close(); child.kill(); process.exit(0);
