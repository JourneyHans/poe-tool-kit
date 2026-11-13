# data/ 说明

这个目录同时存放**构建输入**与**构建输出**，方便复现；`npm run build` 会按顺序重写输出文件。

## 输入（需要保留）

| 文件 | 来源 |
| --- | --- |
| `atlas.en.json` | `tools/extract.mjs` 从 `src_data/data.js` 提取的英文原始数据 |
| `cn_from_poedb.json` | 从 poedb 抓取并匹配到节点的官方中文词缀 |
| `cn_names.json` | 人工校译的节点名（normal / notable / keystone / mastery） |
| `cn_lines_a…h.json` | 人工校译的词缀（按机制分批） |
| `poedb_rows.json` / `poedb_node_pages.json` | poedb 页面快照（中文名与描述的原始来源） |

## 输出（可重新生成）

| 文件 | 生成者 | 用途 |
| --- | --- | --- |
| `atlas.zh.json` | `tools/build_data.mjs` | 全量中文数据（1115 节点 / 609 条词缀） |
| `presets.json` | `tools/build_presets.mjs` | 12 套预设及点数拆分 |

`site/trees/data.zh.js`、`site/trees/presets.js` 是上面两个文件的浏览器版本（同一份构建写出）。

## 开发中间产物（可删，分析脚本会重建）

`miss_*.json`、`need_manual_*.json`、`groups.json`、`lines_flat.json`、`words.json`、`statlines.json`、`rest_lines.json`、`still_missing.json`、`missing_*.json`、`num_audit.json`、`manual_names.json`、`cn_map_sample.json`、`breach_notables.md` 等，仅用于翻译覆盖率分析与数值校验，不参与站点构建。
