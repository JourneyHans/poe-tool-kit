import { spawn } from 'node:child_process';
const PORT = 9231, BASE = 'http://127.0.0.1:4173';
const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--window-size=1400,900',
  `--remote-debugging-port=${PORT}`, '--user-data-dir=C:/Users/hhz/AppData/Local/Temp/atlas-cdp5', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
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

// install error hook, then apply a preset
await ev("window.__E__=[];window.addEventListener('error',e=>window.__E__.push(String(e.message)));");
const out = {};
out.apply = await ev("(()=>{const A=window.__ATLAS__;A.applyPreset(A.PRESETS.find(p=>p.id==='ultimatum'),false);return A.picked.size;})()");
await sleep(900);
out.errors = await ev('window.__E__');
out.hash = await ev('location.hash.length');
// call internal save indirectly: click a node? instead re-check after another change
out.click = await ev("(()=>{const A=window.__ATLAS__;document.getElementById('undo').click();return A.picked.size;})()");
await sleep(600);
out.hash2 = await ev('location.hash.length');
console.log(JSON.stringify(out, null, 1));
ws.close(); child.kill(); process.exit(0);
