import fs from 'node:fs';

const p = 'README.md';
let s = fs.readFileSync(p, 'utf8');

const head = `## 快速开始

需要 Node.js ≥ 20，无第三方依赖。

\`\`\`bash
npm run build      # 数据 → 预设 → 指南 → 单文件 → dist/ 一键构建
npm run serve      # 本地预览 http://127.0.0.1:4173（同时打印局域网地址）
npm run audit      # 校验中英文数值一致性
\`\`\`

构建产物在 \`dist/\`：

| 文件 | 说明 |
| --- | --- |
| \`dist/index.html\` | 单文件版站点（图片/数据/预设全内嵌，约 1.9 MB） |
| \`dist/guide.html\` | 中文完全指南（样式已内嵌） |
| \`dist/README.txt\` | 给朋友的说明 |
| \`dist/.nojekyll\` | 静态托管用，跳过 Jekyll |

\`dist/\`、\`site/index.html\`、\`site/guide.html\`、\`*.zip\` 都是**构建产物，不入库**（见 \`.gitignore\`）；仓库里只有源码与原始数据。

## 工程结构

\`\`\`
site/                       站点源码
  index.template.html       页面骨架（引用 app.js / style.css / trees/*.js / assets）
  app.js                    渲染、加点、路径计算、预设预览、分享/导出
  style.css
  trees/data.zh.js          全量中文数据（构建生成，入库以便模板可直接跑）
  trees/presets.js          12 套预设（构建生成）
  assets/*.webp             5 张原版图集
docs/舆图天赋指南.md         指南源文件（Markdown → site/guide.html）
data/                       数据与中间结果（atlas.en.json / atlas.zh.json / presets.json …）
src_data/                   原始抓取快照（hypostasis data.js、poedb 页面）
tools/                      构建脚本（数据 / 预设 / 指南 / 单文件 / dist / 校验 / 截图测试）
.github/workflows/pages.yml GitHub Pages 自动部署
\`\`\`

### 构建流水线

\`\`\`
src_data/data.js
  └─ extract.mjs ─────────────▶ data/atlas.en.json
       └─ build_data.mjs（poedb 中文 + 人工词典 + 规则）
            └──────────────────▶ data/atlas.zh.json + site/trees/data.zh.js
              └─ build_presets.mjs（按区域 + 屏蔽逻辑）
                   └───────────▶ site/trees/presets.js
                     └─ build_guide.mjs ──▶ site/guide.html
                        └─ build_standalone.mjs（内嵌图集/数据/脚本）──▶ site/index.html
                           └─ build_dist.mjs ──▶ dist/
\`\`\`

## 部署到 GitHub Pages（推荐）

仓库已配好 \`.github/workflows/pages.yml\`：push 到 \`main\` 后自动构建并发布 \`dist/\`。

1. 在 GitHub 新建仓库（**Public**；私有仓库需 Pro 才可用 Pages）。
2. 推送：
   \`\`\`bash
   git remote add origin https://github.com/<用户名>/<仓库名>.git
   git push -u origin main
   \`\`\`
3. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**（只需设置一次）。
4. 打开 **Actions**，等 \`Deploy to GitHub Pages\` 跑完，访问：
   \`https://<用户名>.github.io/<仓库名>/\`

之后每次 push 到 \`main\` 都会自动重建发布；也可以在 Actions 里手动 \`Run workflow\`。

> 如果 \`deploy-pages\` 报 “Pages is not enabled”，就是第 3 步没设置。

## 其他分享方式

- **发文件**：\`npm run build\` 后发 \`dist/index.html\`（或把 \`dist\` 压成 zip），对方双击即用。
- **Netlify Drop**：把 \`dist\` 拖到 <https://app.netlify.com/drop>。匿名站点 1 小时有效；**登录后再拖是永久站**。
- **Cloudflare Pages**：Workers & Pages → Create → Pages → Upload assets，拖 \`dist\`。
- **临时公网链接**：\`npm run serve\` 后另开终端 \`npx cloudflared tunnel --url http://127.0.0.1:4173\`。
- **传输注意**：微信/QQ 直接传 \`.html\` 可能被拦，优先发 zip 或直接发链接。

`;

const start = s.indexOf('## 打开方式');
const end = s.indexOf('## 目录');
if (start < 0 || end < 0) throw new Error('marker not found');
s = s.slice(0, start) + head + s.slice(end);

// replace the directory block with the new structure reference
const dStart = s.indexOf('## 目录');
const dEnd = s.indexOf('## 功能');
const dirBlock = `## 目录

- \`site/\`：站点源码与图集（模板 + app.js + style.css + trees + assets）
- \`data/\`：中文数据、预设、翻译词典与中间结果
- \`docs/\`：指南 Markdown 与截图
- \`src_data/\`：原始抓取快照（可复现构建）
- \`tools/\`：全部构建 / 校验 / 测试脚本
- \`dist/\`：构建产物（不入库，CI 生成并发布）

`;
s = s.slice(0, dStart) + dirBlock + s.slice(dEnd);

// refresh the rebuild section if it exists
const rStart = s.indexOf('## 重新构建');
if (rStart >= 0) {
  const rEnd = s.indexOf('## 致谢与声明');
  const rebuild = `## 重新构建

\`\`\`bash
npm run build      # 全量构建
npm run audit      # 中英数值一致性校验
npm run test       # 无头浏览器端到端测试（需先 npm run serve）
\`\`\`

单独执行某一步：\`npm run build:data\` / \`build:presets\` / \`build:guide\` / \`build:site\` / \`build:dist\`。

`;
  s = s.slice(0, rStart) + rebuild + s.slice(rEnd);
}

fs.writeFileSync(p, s);
console.log('README updated');
