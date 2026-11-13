import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const site = path.join(root, 'site');
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });

const read = p => fs.readFileSync(p, 'utf8');
const app = read(path.join(site, 'index.html'));
const css = read(path.join(site, 'style.css'));
let guide = read(path.join(site, 'guide.html'));

// make the guide fully self-contained too (it normally pulls style.css)
guide = guide.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>');
// the guide's intro mentions the dev path; in the share build it's a sibling file
guide = guide.split('site/index.html').join('index.html');

const readme = `流放之路 1 · 舆图天赋树（中文版）
==================================

【怎么用】
1. 双击 index.html —— 这就是完整工具，不需要联网、不需要装任何东西。
2. 想看机制攻略 / 预设说明：打开 guide.html。
3. 加完点后点右上角「分享」，会复制一条带加点参数的链接；对方打开就是你现在的树。
   点「导出」可以复制一份「关键天赋 + 显著天赋 + 过路小点」的文字清单。

【发给朋友】
方式 A（最简单）：把 index.html 这一个文件发过去。图片、数据、预设全部内嵌在文件里（约 1.9 MB），
                  对方保存后双击即可，不用带别的文件。
方式 B（更稳）：把整个文件夹压缩成 zip 发过去，对方解压后双击 index.html。
方式 C（给链接）：把本文件夹拖到 Netlify Drop（https://app.netlify.com/drop）或 Cloudflare Pages，
                  几分钟就能得到一个网址，发链接最稳。
方式 D（同一 Wi-Fi）：在项目目录运行 node tools/serve.mjs，把打印出来的局域网地址发给朋友。

【微信/QQ 传输】
直接发 .html 有时会被拦截或当文本打开，建议发 zip（或把文件改名成 xxx.html.zip）。
手机打开：iOS 用「文件」App → 共享 → 用 Safari 打开；Android 用 Chrome 打开本地文件。

【注意】
- 这是玩家自制工具，与 Grinding Gear Games 无关。
- 天赋数据版本见页面左上角；游戏内天赋树若已更新，请以游戏内为准。
- 中文名与词缀优先取官方中文，新机制为人工校译，欢迎指正。
`;

fs.writeFileSync(path.join(dist, 'index.html'), app);
fs.writeFileSync(path.join(dist, 'guide.html'), guide);
fs.writeFileSync(path.join(dist, 'README.txt'), readme);
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log('dist ready:', fs.readdirSync(dist).map(f => `${f} ${(fs.statSync(path.join(dist, f)).size / 1024).toFixed(0)}KB`).join(', '));
