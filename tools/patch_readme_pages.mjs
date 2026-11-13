import fs from 'node:fs';
const p = 'README.md';
let s = fs.readFileSync(p, 'utf8');
const start = s.indexOf('## 部署到 GitHub Pages（推荐）');
const end = s.indexOf('## 其他分享方式');
const block = `## 部署到 GitHub Pages

线上地址：**https://journeyhans.github.io/poe-tool-kit/**

仓库用 \`.github/workflows/pages.yml\` 做持续部署：

\`\`\`
push main ──▶ npm run build ──▶ 把 dist/ 强制推送到 gh-pages 分支 ──▶ Pages 自动发布
\`\`\`

- **无需手动配置 Pages**：第一次推送 \`gh-pages\` 分支后，GitHub 会自动启用 Pages（本仓库已启用）；
- 站点源是 **Deploy from a branch → \`gh-pages\` / (root)**；
- 以后只需要 push 到 \`main\`，Action 会自动重建并更新站点；
- 也可以用 Actions 页面的 **Run workflow** 手动触发。

克隆到新仓库时：

1. 推送到 \`main\`：
   \`\`\`bash
   git remote add origin https://github.com/<用户名>/<仓库名>.git
   git push -u origin main
   \`\`\`
2. 到 **Actions** 等 \`Build and deploy to GitHub Pages\` 跑完（它会创建/更新 \`gh-pages\`）；
3. 如果 Pages 没有自动启用：**Settings → Pages → Source** 选 *Deploy from a branch* → \`gh-pages\` / \`(root)\` → Save；
4. 访问 \`https://<用户名>.github.io/<仓库名>/\`。

> 私有仓库需要 GitHub Pro 才能用 Pages，建议 Public。

`;
s = s.slice(0, start) + block + s.slice(end);
fs.writeFileSync(p, s);
console.log('updated');
