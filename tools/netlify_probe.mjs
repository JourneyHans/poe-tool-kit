import { spawn } from 'node:child_process';
import fs from 'node:fs';
const PORT = 9261;
const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--window-size=1400,900',
  `--remote-debugging-port=${PORT}`, '--user-data-dir=C:/Users/hhz/AppData/Local/Temp/atlas-drop', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 80 && !wsUrl; i++) { try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); wsUrl = l.find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch {} if (!wsUrl) await sleep(250); }
const ws = new WebSocket(wsUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 1; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p = {}) => { const i = id++; ws.send(JSON.stringify({ id: i, method: m, params: p })); return new Promise(r => pend.set(i, r)); };
const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); return r.result?.exceptionDetails ? { err: r.result.exceptionDetails.exception?.description } : r.result?.result?.value; };
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(n, Buffer.from(r.result.data, 'base64')); };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'https://app.netlify.com/drop' }); await sleep(5000);
const info = await ev(`(()=>({
  title: document.title,
  url: location.href,
  text: (document.body.innerText||'').slice(0,600),
  inputs: [...document.querySelectorAll('input')].map(i=>({type:i.type,accept:i.accept,webkit:i.webkitdirectory,cls:i.className})),
  buttons: [...document.querySelectorAll('button,a')].slice(0,30).map(b=>(b.innerText||'').trim()).filter(Boolean),
  scripts: [...document.querySelectorAll('script[src]')].map(s=>s.src)
}))()`);
console.log(JSON.stringify(info, null, 1));
await shot('E:/personal/AI/流放之路1辅助/shots/netlify-drop.png');
ws.close(); child.kill(); process.exit(0);
