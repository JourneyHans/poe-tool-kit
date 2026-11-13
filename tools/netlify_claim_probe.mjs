import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PORT = 9269;
const ZIP = 'E:/personal/AI/流放之路1辅助/poe1-atlas-cn.zip';
const OUT = 'E:/personal/AI/流放之路1辅助/shots/netlify';
const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--window-size=1400,1000',
  `--remote-debugging-port=${PORT}`, '--user-data-dir=C:/Users/hhz/AppData/Local/Temp/atlas-drop4', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 80 && !wsUrl; i++) { try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); wsUrl = l.find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch {} if (!wsUrl) await sleep(250); }
const ws = new WebSocket(wsUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 1; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p = {}) => { const i = id++; ws.send(JSON.stringify({ id: i, method: m, params: p })); return new Promise(r => pend.set(i, r)); };
const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); return r.result?.exceptionDetails ? { err: r.result.exceptionDetails.exception?.description } : r.result?.result?.value; };
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.result.data, 'base64')); };
await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'https://app.netlify.com/drop' }); await sleep(6000);
const doc = await send('DOM.getDocument', { depth: -1 });
const q = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'input[type=file][accept*="zip"]' });
await send('DOM.setFileInputFiles', { nodeId: q.result.nodeId, files: [ZIP] });
for (let i = 0; i < 40; i++) {
  await sleep(1200);
  const url = await ev('location.href');
  if (/netlify\.app/.test(url) || (await ev('document.body.innerText')).includes('Claim this site')) break;
}
const url = await ev('location.href');
console.log('deployed page:', url);
// click the first Claim button and see where it goes
const clicked = await ev(`(()=>{const b=[...document.querySelectorAll('button,a')].find(x=>/Claim this site/i.test(x.innerText||''));if(!b)return 'no-claim';b.scrollIntoView({block:'center'});b.click();return 'clicked';})()`);
console.log('claim click:', clicked);
await sleep(4000);
console.log('after click url:', await ev('location.href'));
console.log('after click text:', (await ev('document.body.innerText')).slice(0, 500));
await shot('claim-next');
ws.close(); child.kill(); process.exit(0);
