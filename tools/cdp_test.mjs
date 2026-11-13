// Minimal Chrome DevTools Protocol driver for smoke-testing the atlas site.
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9223;
const URL = process.argv[2] || 'http://127.0.0.1:4173/index.html';
const OUT = process.argv[3] || 'E:/personal/AI/流放之路1辅助/shots/cdp';

fs.mkdirSync(OUT, { recursive: true });
const profile = 'C:/Users/hhz/AppData/Local/Temp/atlas-cdp-profile';

const child = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--window-size=1600,1000',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check',
  'about:blank',
], { stdio: 'ignore', detached: false });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getWs() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (e) {}
    await sleep(250);
  }
  throw new Error('no devtools target');
}

const wsUrl = await getWs();
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let nextId = 1;
const pending = new Map();
ws.onmessage = ev => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
};
function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise(res => pending.set(id, res));
}

async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) return { error: r.result.exceptionDetails.text + ' ' + (r.result.exceptionDetails.exception?.description || '') };
  return r.result?.result?.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64'));
  return name;
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL });
await sleep(2500);

const log = [];
log.push(['boot', await evalJs('({ok: !!window.__ATLAS__, nodes: window.__ATLAS__?.T.nodes.length, presets: window.__ATLAS__?.PRESETS.length, max: window.__ATLAS__?.MAX})')]);
log.push(['errors', await evalJs('window.__ERR__ || null')]);

// 1. apply the breach preset
log.push(['applyBreach', await evalJs(`(()=>{const A=window.__ATLAS__;const p=A.PRESETS.find(x=>x.id==='breach');A.applyPreset(p,false);return {picked:A.picked.size, choice:[...A.choice.entries()].length};})()`)]);
await sleep(400);
log.push(['shot', await shot('01-breach')]);

// 2. undo
log.push(['undo', await evalJs(`(()=>{document.getElementById('undo').click();return window.__ATLAS__.picked.size;})()`)]);
// 3. clear + explore a node via API
log.push(['clear', await evalJs(`(()=>{document.getElementById('clear').click();return window.__ATLAS__.picked.size;})()`)]);
await sleep(300);

// 4. click on a keystone location: find screen pos of node 20960 (The Paths Not Taken)
log.push(['click', await evalJs(`(()=>{const A=window.__ATLAS__;const T=A.T;const n=T.nodes.find(x=>x.en==='Destructive Play');if(!n)return 'no node';return {x:n.x,y:n.y};})()`)]);
// 5. preview preset
log.push(['preview', await evalJs(`(()=>{const A=window.__ATLAS__;const p=A.PRESETS.find(x=>x.id==='ritual');A.previewPreset(p);return document.getElementById('previewBar').className;})()`)]);
await sleep(500);
log.push(['shot', await shot('02-preview-ritual')]);

// 6. search
log.push(['search', await evalJs(`(()=>{const q=document.getElementById('q');q.value='裂隙';q.dispatchEvent(new Event('input'));return document.getElementById('hits').textContent;})()`)]);
await sleep(300);
log.push(['shot', await shot('03-search')]);

// 7. regions tab
log.push(['regions', await evalJs(`(()=>{document.querySelector('.tabs button[data-tab="regions"]').click();return document.querySelectorAll('.rgroup').length;})()`)]);
await sleep(300);
log.push(['shot', await shot('04-regions')]);

// 8. apply all presets and report costs
log.push(['allPresets', await evalJs(`(()=>{const A=window.__ATLAS__;const out=[];for(const p of A.PRESETS){document.getElementById('clear').click();A.applyPreset(p,false);out.push([p.id,A.picked.size,p.order.length]);}return out;})()`)]);

console.log(JSON.stringify(log, null, 1));
ws.close();
child.kill();
process.exit(0);
