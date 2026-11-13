import { spawn } from 'node:child_process';
import fs from 'node:fs';
const PORT = 9237, BASE = 'http://127.0.0.1:4173';
const OUT = 'E:/personal/AI/流放之路1辅助/shots/deliver';
const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--window-size=1600,1000', `--remote-debugging-port=${PORT}`, '--user-data-dir=C:/Users/hhz/AppData/Local/Temp/atlas-cdp8', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) { try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); wsUrl = l.find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch {} if (!wsUrl) await sleep(250); }
const ws = new WebSocket(wsUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 1; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p = {}) => { const i = id++; ws.send(JSON.stringify({ id: i, method: m, params: p })); return new Promise(r => pend.set(i, r)); };
const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); return r.result?.exceptionDetails ? { err: r.result.exceptionDetails.exception?.description } : r.result?.result?.value; };
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.result.data, 'base64')); };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE + '/index.html' }); await sleep(2200);

const out = {};
// click a notable by dispatching pointer events at its screen position
out.click = await ev(`(()=>{
  const A=window.__ATLAS__;const c=document.getElementById('c');const r=c.getBoundingClientRect();
  const n=A.T.nodes.find(x=>x.cn==='分而治之');
  // set camera to centre it at a known zoom by using the exposed API: apply a 1-node pick first
  A.applyPreset({order:[n.id],choice:{},cost:1,targets:[n.id],name:'t',id:'t',icon:'x',tag:'',diff:'',focus:'',summary:'',tips:[]},false);
  return {picked:A.picked.size};
})()`);
await sleep(400);
out.tooltip = await ev(`(()=>{const t=document.getElementById('tip');return {open:t.style.display, has:!!t.querySelector('b')};})()`);
// hover via CDP mouse move on the node
const pos = await ev(`(()=>{const A=window.__ATLAS__;const n=A.T.nodes.find(x=>x.cn==='分而治之');const c=document.getElementById('c');const r=c.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,x0:n.x,y0:n.y};})()`);
// compute screen pos from internal state is awkward; instead click canvas centre after fit
await ev(`window.__ATLAS__.fit()`);
await sleep(300);
await shot('07-fit-after-pick');

// open choice menu programmatically (openMenu is internal): simulate click at a choice node position after centring it
out.choiceNode = await ev(`(()=>{const A=window.__ATLAS__;const n=A.T.nodes.find(x=>x.v&&x.v.length>1&&x.en&&x.en.includes('Divide'));return n?{id:n.id,cn:n.cn}:null;})()`);
await sleep(200);
console.log(JSON.stringify(out, null, 1));
ws.close(); child.kill(); process.exit(0);
