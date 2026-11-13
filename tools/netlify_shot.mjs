import { spawn } from 'node:child_process';
import fs from 'node:fs';
const PORT = 9265;
const HOST = 'papaya-kitten-5ce2a1.netlify.app';
const OUT = 'E:/personal/AI/流放之路1辅助/shots/netlify';
const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--window-size=1440,900', `--remote-debugging-port=${PORT}`, '--user-data-dir=C:/Users/hhz/AppData/Local/Temp/atlas-drop3', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 80 && !wsUrl; i++) { try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); wsUrl = l.find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch {} if (!wsUrl) await sleep(250); }
const ws = new WebSocket(wsUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 1; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p = {}) => { const i = id++; ws.send(JSON.stringify({ id: i, method: m, params: p })); return new Promise(r => pend.set(i, r)); };
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.result.data, 'base64')); };
await send('Page.enable'); await send('Network.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

// password submitted once to obtain the cookie
await send('Page.navigate', { url: `https://${HOST}/` });
await sleep(2500);
const r = await send('Network.getCookies', { urls: [`https://${HOST}/`] });
console.log('cookies before:', r.result.cookies.map(c => c.name));
// fill the password form and submit it in-page
await send('Page.navigate', { url: `https://${HOST}/` });
await sleep(2000);
const filled = await send('Runtime.evaluate', {
  expression: `(async()=>{const i=document.querySelector('input[type=password]');if(!i)return 'no-form';i.value='My-Drop-Site';
    const f=i.closest('form'); if(f){f.submit();return 'submitted'} i.dispatchEvent(new Event('input',{bubbles:true}));
    const b=document.querySelector('button[type=submit],button');if(b){b.click();return 'clicked'} return 'none';})()`,
  awaitPromise: true, returnByValue: true,
});
console.log('form:', filled.result?.result?.value);
await sleep(6000);
const info = await send('Runtime.evaluate', { expression: `({title:document.title, url:location.href, hasApp: !!window.__ATLAS__, text:(document.body.innerText||'').slice(0,120)})`, returnByValue: true });
console.log(JSON.stringify(info.result?.result?.value));
await shot('live-site');
ws.close(); child.kill(); process.exit(0);
