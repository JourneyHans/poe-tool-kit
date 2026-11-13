import { spawn } from 'node:child_process';
import fs from 'node:fs';
const PORT = 9253, BASE = 'http://127.0.0.1:4173';
const OUT = 'E:/personal/AI/流放之路1辅助/shots/presets2';
fs.mkdirSync(OUT, { recursive: true });
const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--window-size=1600,1000', `--remote-debugging-port=${PORT}`, '--user-data-dir=C:/Users/hhz/AppData/Local/Temp/atlas-cdp16', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
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

const boot = await ev('({n:window.__ATLAS__?.T.nodes.length, p:window.__ATLAS__?.PRESETS.length})');
console.log('boot', JSON.stringify(boot));

const ids = await ev('window.__ATLAS__.PRESETS.map(p=>p.id)');
const rows = [];
for (const pid of ids) {
  const r = await ev(`(()=>{const A=window.__ATLAS__;const p=A.PRESETS.find(x=>x.id==='${pid}');
    document.getElementById('clear').click();A.applyPreset(p,false);
    const names=[...A.picked.values()].filter(n=>n.k==='notable'||n.k==='keystone').map(n=>n.cn);
    const hub=['神秘集会','探勘者的好运','小巧封地','祈求','高产精华','庄园的呼唤','双重诱惑','异域储藏','大玩具'];
    return JSON.stringify({id:p.id,cost:A.picked.size,decl:p.cost,choices:A.choice.size,
      notables:names.length, same:names.slice().sort().join('|')===p.notableList.slice().sort().join('|'),
      hub:names.filter(n=>hub.includes(n))});})()`);
  const o = typeof r === 'string' ? JSON.parse(r) : r;
  rows.push(o);
  console.log(JSON.stringify(o));
}
console.log('mismatch', JSON.stringify(rows.filter(x => x.cost !== x.decl || !x.same)));

// screenshot: breach focused, fit to its region
await ev(`(()=>{const A=window.__ATLAS__;document.getElementById('clear').click();A.applyPreset(A.PRESETS.find(p=>p.id==='breach'),false);
  const ns=[...A.picked.keys()].map(i=>A.byId.get(i));let x0=9e9,y0=9e9,x1=-9e9,y1=-9e9;
  for(const n of ns){x0=Math.min(x0,n.x);y0=Math.min(y0,n.y);x1=Math.max(x1,n.x);y1=Math.max(y1,n.y);}
  window.__BB__={x0,y0,x1,y1};return 1;})()`);
await sleep(500);
await shot('01-breach-applied');
console.log('zoom', JSON.stringify(await ev('window.__ATLAS__.getCam()')));
ws.close(); child.kill(); process.exit(0);
