import { spawn } from 'node:child_process';
import fs from 'node:fs';
const PORT = 9239, BASE = 'http://127.0.0.1:4173';
const OUT = 'E:/personal/AI/流放之路1辅助/shots/deliver';
const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--window-size=1600,1000', `--remote-debugging-port=${PORT}`, '--user-data-dir=C:/Users/hhz/AppData/Local/Temp/atlas-cdp9', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) { try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); wsUrl = l.find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch {} if (!wsUrl) await sleep(250); }
const ws = new WebSocket(wsUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 1; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p = {}) => { const i = id++; ws.send(JSON.stringify({ id: i, method: m, params: p })); return new Promise(r => pend.set(i, r)); };
const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); return r.result?.exceptionDetails ? { err: r.result.exceptionDetails.exception?.description } : r.result?.result?.value; };
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.result.data, 'base64')); };
const move = (x, y) => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' });
const click = async (x, y) => {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE + '/index.html' }); await sleep(2200);

const out = {};
// centre the choice node at high zoom
out.center = await ev(`(()=>{const A=window.__ATLAS__;const n=A.T.nodes.find(x=>x.id===19729);
  // emulate centring: fit then zoom toward the node by setting camera via repeated wheel is complex; use fit + manual
  A.fit(); return A.screenOf(n);})()`);
// zoom in using wheel at the node position until zoom > 0.3
for (let i = 0; i < 12; i++) {
  const p = await ev(`(()=>{const A=window.__ATLAS__;const n=A.T.nodes.find(x=>x.id===19729);const c=document.getElementById('c');const r=c.getBoundingClientRect();const s=A.screenOf(n);return {x:r.left+s[0],y:r.top+s[1]};})()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: p.x, y: p.y, deltaX: 0, deltaY: -120 });
  await sleep(60);
}
out.zoom = await ev('window.__ATLAS__.getCam().zoom');
out.pos = await ev(`(()=>{const A=window.__ATLAS__;const n=A.T.nodes.find(x=>x.id===19729);const c=document.getElementById('c');const r=c.getBoundingClientRect();const s=A.screenOf(n);return {x:r.left+s[0],y:r.top+s[1]};})()`);
await move(out.pos.x, out.pos.y);
await sleep(300);
out.tip = await ev(`(()=>{const t=document.getElementById('tip');return {display:t.style.display,text:t.textContent.slice(0,80)};})()`);
await shot('08-hover-tooltip');
await click(out.pos.x, out.pos.y);
await sleep(400);
out.menu = await ev(`(()=>{const m=document.getElementById('menu');return {display:m.style.display,buttons:[...m.querySelectorAll('button')].map(b=>b.textContent.slice(0,20))};})()`);
await shot('09-choice-menu');
// pick the second option
const btn = await ev(`(()=>{const b=document.querySelectorAll('#menu button')[1];if(!b)return null;const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
if (btn) { await click(btn.x, btn.y); await sleep(400); }
out.after = await ev(`(()=>{const A=window.__ATLAS__;return {picked:A.picked.size,choice:[...A.choice.entries()],has:A.picked.has(19729)};})()`);
await shot('10-after-choice');
console.log(JSON.stringify(out, null, 1));
ws.close(); child.kill(); process.exit(0);
