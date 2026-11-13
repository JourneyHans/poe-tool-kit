import { spawn } from 'node:child_process';
import fs from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9227;
const BASE = 'http://127.0.0.1:4173';
const OUT = 'E:/personal/AI/流放之路1辅助/shots/final2';
fs.mkdirSync(OUT, { recursive: true });
const child = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1600,1000',
  `--remote-debugging-port=${PORT}`, '--user-data-dir=C:/Users/hhz/AppData/Local/Temp/atlas-cdp3',
  '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) {
  try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); wsUrl = l.find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch {}
  if (!wsUrl) await sleep(250);
}
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 1; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p = {}) => { const i = id++; ws.send(JSON.stringify({ id: i, method: m, params: p })); return new Promise(r => pend.set(i, r)); };
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.exceptionDetails ? { err: r.result.exceptionDetails.exception?.description } : r.result?.result?.value; };
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.result.data, 'base64')); };

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE + '/index.html' });
await sleep(2200);

const out = {};
// partial build: apply ritual, then preview merc on top
out.partial = await ev(`(()=>{const A=window.__ATLAS__;A.applyPreset(A.PRESETS.find(p=>p.id==='ritual'),false);const p=A.PRESETS.find(p=>p.id==='merc');A.previewPreset(p);return {picked:A.picked.size,bar:document.getElementById('pbMeta').textContent};})()`);
await sleep(600);
await shot('01-partial-preview');
out.steps = await ev(`(()=>{const b=document.getElementById('pbStep');b.click();b.click();b.click();return document.getElementById('pbMeta').textContent;})()`);
await sleep(300);
await shot('02-steps');
out.apply = await ev(`(()=>{document.getElementById('pbApply').click();const A=window.__ATLAS__;return {picked:A.picked.size,choice:A.choice.size,msg:document.getElementById('toast').textContent};})()`);
await sleep(300);
await shot('03-applied');
out.undo = await ev(`(()=>{document.getElementById('undo').click();return window.__ATLAS__.picked.size;})()`);
// hash roundtrip
out.hash = await ev(`(()=>{const A=window.__ATLAS__;document.getElementById('clear').click();A.applyPreset(A.PRESETS.find(p=>p.id==='ultimatum'),false);return location.hash.slice(0,30)+' | '+A.picked.size;})()`);
await sleep(400);

console.log(JSON.stringify(out, null, 1));
ws.close(); child.kill(); process.exit(0);
