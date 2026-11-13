import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PORT = 9263;
const ZIP = 'E:/personal/AI/流放之路1辅助/poe1-atlas-cn.zip';
const OUT = 'E:/personal/AI/流放之路1辅助/shots/netlify';
fs.mkdirSync(OUT, { recursive: true });

const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--window-size=1400,1000',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=C:/Users/hhz/AppData/Local/Temp/atlas-drop2',
  '--no-first-run', 'about:blank',
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 80 && !wsUrl; i++) {
  try {
    const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    wsUrl = l.find(t => t.type === 'page')?.webSocketDebuggerUrl;
  } catch {}
  if (!wsUrl) await sleep(250);
}
const ws = new WebSocket(wsUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 1; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p = {}) => { const i = id++; ws.send(JSON.stringify({ id: i, method: m, params: p })); return new Promise(r => pend.set(i, r)); };
const ev = async x => {
  const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true });
  return r.result?.exceptionDetails ? { err: r.result.exceptionDetails.exception?.description } : r.result?.result?.value;
};
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.result.data, 'base64')); };

await send('Page.enable');
await send('Runtime.enable');
await send('DOM.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'https://app.netlify.com/drop' });
await sleep(6000);

// find the single-file input (accepts .zip/.html)
const doc = await send('DOM.getDocument', { depth: -1 });
const q = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'input[type=file][accept*="zip"]' });
const nodeId = q.result.nodeId;
console.log('file input nodeId:', nodeId);
if (!nodeId) { console.log(await ev('document.body.innerText.slice(0,800)')); await shot('no-input'); process.exit(0); }

await send('DOM.setFileInputFiles', { nodeId, files: [ZIP] });
console.log('upload triggered');
await sleep(1500);

let last = '';
let url = null;
for (let i = 0; i < 60; i++) {
  await sleep(1500);
  const state = await ev(`(()=>({
    text: (document.body.innerText||'').slice(0,1200),
    url: location.href,
    links: [...document.querySelectorAll('a[href*="netlify.app"], a[href*="http"]')].map(a=>a.href).filter(h=>!h.includes('app.netlify.com')).slice(0,8)
  }))()`);
  const t = JSON.stringify(state);
  if (t !== last) { console.log('[' + i + ']', JSON.stringify(state).slice(0, 600)); last = t; }
  const m = (state.text || '').match(/https:\/\/[a-z0-9-]+\.netlify\.app/i);
  if (m) { url = m[0]; break; }
  if (/error|failed|something went wrong/i.test(state.text) && !/drop here/i.test(state.text)) {
    await shot('error-state');
  }
}
await shot('final');
console.log('RESULT_URL=' + (url || 'none'));
console.log((await ev('document.body.innerText')).slice(0, 1500));
ws.close(); child.kill(); process.exit(0);
