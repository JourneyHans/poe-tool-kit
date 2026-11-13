// Final verification: apply every preset, check counts & choices, capture screenshots.
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9225;
const BASE = 'http://127.0.0.1:4173';
const OUT = 'E:/personal/AI/流放之路1辅助/shots/final';
fs.mkdirSync(OUT, { recursive: true });

const child = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1600,1000',
  `--remote-debugging-port=${PORT}`, '--user-data-dir=C:/Users/hhz/AppData/Local/Temp/atlas-cdp2',
  '--no-first-run', '--no-default-browser-check', 'about:blank',
], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    wsUrl = list.find(t => t.type === 'page')?.webSocketDebuggerUrl;
  } catch {}
  if (!wsUrl) await sleep(250);
}
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 1; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = id++; ws.send(JSON.stringify({ id: i, method, params })); return new Promise(r => pend.set(i, r)); };
const evalJs = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) return { error: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text };
  return r.result?.result?.value;
};
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64')); };
const goto = async url => { await send('Page.navigate', { url }); await sleep(2200); };

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });

await goto(BASE + '/index.html');
const report = {};
report.boot = await evalJs('({nodes:window.__ATLAS__.T.nodes.length,presets:window.__ATLAS__.PRESETS.length,max:window.__ATLAS__.MAX,lines:Object.keys(window.__ATLAS__.T.lines).length})');
report.allPresets = await evalJs(`(()=>{const A=window.__ATLAS__;const out=[];for(const p of A.PRESETS){document.getElementById('clear').click();A.applyPreset(p,false);out.push({id:p.id,cost:A.picked.size,declared:p.cost,choices:A.choice.size});}return out;})()`);
report.overBudget = report.allPresets.filter(p => p.cost > 150);
report.choiceMismatch = report.allPresets.filter(p => p.choices === 0).map(p => p.id);

// breach applied screenshot + effects tab
await evalJs(`(()=>{const A=window.__ATLAS__;document.getElementById('clear').click();A.applyPreset(A.PRESETS.find(p=>p.id==='breach'),false);document.querySelector('.tabs button[data-tab="effects"]').click();})()`);
await sleep(500);
await shot('01-breach-effects');

// picked tab
await evalJs(`document.querySelector('.tabs button[data-tab="picked"]').click()`);
await sleep(300);
await shot('02-breach-picked');

// preview + step
await evalJs(`(()=>{const A=window.__ATLAS__;document.getElementById('clear').click();A.previewPreset(A.PRESETS.find(p=>p.id==='merc'));})()`);
await sleep(400);
await evalJs(`document.getElementById('pbStep').click();document.getElementById('pbStep').click();`);
await sleep(400);
await shot('03-preview-step');

// manual click on a keystone via canvas coordinates
report.click = await evalJs(`(()=>{const A=window.__ATLAS__;document.getElementById('clear').click();A.fit();const n=A.T.nodes.find(x=>x.cn==='坚决凝望');return {id:n.id};})()`);
await sleep(300);
// open guide
await goto(BASE + '/guide.html');
report.guide = await evalJs(`({title:document.title,h2:document.querySelectorAll('h2').length,tables:document.querySelectorAll('table').length,broken:[...document.querySelectorAll('.toc a')].filter(a=>!document.querySelector(a.getAttribute('href'))).length})`);
await shot('04-guide');
await evalJs('window.scrollTo(0,1400)');
await sleep(300);
await shot('05-guide-scroll');

console.log(JSON.stringify(report, null, 1));
ws.close(); child.kill(); process.exit(0);
