---
name: tuwen
description: >-
  【图文skill】用 Era 根据标题/大纲生成社媒图文（小红书 3:4 / 抖音 9:16），含正文确认、5 个标题候选、内联瑞士风封面、高亮设置页、布局校验与导出发图。
  当用户说「图文skill」、图文、小红书/抖音出图、用标题生成图文、导出海报长图，或「封面skill」、生成封面、社媒封面、cover skill、做一张封面时必须使用本 skill。
  风水/阳宅主题改走「风水skill」（fengshui），不要用本 skill。
---

# 图文 Skill（Era 图文 + 内联封面）

严格按下列流程执行。任何一步未获用户明确「继续 / 确认」前，不得跳步。

**风水 / 阳宅 / 风水风格** → 改用 [风水 skill](../fengshui/SKILL.md)，本 skill 不处理。

## 0. 前置：确认 Era 服务可用

> 端口可用 `--agent-port` / `--dev-port` 或 `ERA_AGENT_PORT` / `ERA_DEV_PORT`；默认后端 `3847`、前端 `5173`。

1. `bash scripts/ensure-era-ready.sh`（或 `npm run start:local-agent`）
2. `curl -s http://127.0.0.1:${ERA_AGENT_PORT:-3847}/health` → `ok: true` 且 `connected: true`
3. 优先 MCP `era_*`；否则 REST `http://127.0.0.1:${ERA_AGENT_PORT:-3847}/v1/...`

画幅：`3:4` = 小红书；`9:16` = 抖音。**默认直接导出 `9:16`**，不要询问平台；用户明确要求小红书再用 `3:4`。

**模板**：默认 **像素模板**（`pageOverlay: 'pixel'`），除非用户指定其它纹理。

**字体**：二级标题（`##`）默认阿里妈妈数黑体（`headingFontId`: `shuheiti`，`headingFontFamily`: `"Alimama ShuHeiTi", sans-serif`）。一级标题与正文保持宋体，除非用户另指定。

**顶部文案**：固定 `点赞关注不迷路～`；`showWordCount: false`。

---

## 主流程（封面与内容分离）

约束：

1. **内容图不含一级标题**（H1）。只含二级标题、正文、列表、图片、代码块等。一级标题只出现在**封面图**上（见 §封面）。
2. 需要配图时用 markdown 混排（§图片混排），在预览环节确认位置。
3. 默认抖音 `9:16`。

### 1. 询问大纲

- 先问大纲 / 要点；拿到前不写正文。用户已给大纲 → 下一步。

### 2. 根据大纲生成内容（多轮确认）

1. 写 Markdown：`##`、段落、列表、代码块、必要图片占位。
2. 心里保留一级标题供封面用，**正文可不含 H1**；展示后明确询问是否继续。
3. 用户要改 → 改完再展示，直到确认。

### 3. 确认标题 + 封面信息

1. **标题**：给 **5 个**社媒标题；技术名词首字母大写；选定后可发标题设置页 `http://39.106.179.17/?tab=title&text=<选定标题>`（禁止裸 `?tab=title`）。
2. **封面字段**：从内容提取并确认——见 §封面字段表（大标题、小标题、描述、标签、二级标题、主题色等）。

### 4. 生成封面图

按 **§封面** 出图并请用户确认；要改则重跑。上传 OSS（`__cover_keep__`）后：未入库用 `make-oss-preview-html.mjs` 发 HTML 预览；**禁止**对话框直发 OSS 图链。也可先写入 `image_previews` 再发自建站。

### 5. 高亮（内容图）

按 **§高亮**（优先设置页）。

### 6. 拼合横版总览并确认

封面 + 各内容高亮页拼成横版总览；确认用 HTML 预览或入库后自建站链接；**禁止**直发 OSS 图链。

### 7. 入库交付

各页上传 OSS，**按序写入** `image_previews`（[0]=封面），对话框**只发** `http://39.106.179.17/?tab=data`。

### 内容图构建要点（Era）

- Markdown **不要写 `#`**，从 `##` / 正文开始。
- 建工程：`pageOverlay: 'pixel'`、`9:16`（或用户指定 `3:4`）、`headingFontId: shuheiti`、`topText: '点赞关注不迷路～'`、`showWordCount: false`。
- 内容图无 H1，标题类校验（`title_missing_circle` 等）不适用；其余布局告警须修。

---

## §封面（原封面 skill，已内联）

用户只要封面、或图文流程走到封面步时，用本节。引擎：`scripts/generate-cover.mjs`（非 Era 多页）。

### 触发

- 「封面skill」/「cover skill」/「生成封面」「做一张封面」「社媒封面」
- 或主流程 §3–§4

只要封面时可跳过 Era 多页，直接收集字段出图；只要图文分页则走完整主流程。

### 字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `bigTitle` | ✅ | 大标题；可多行（`\\n` 或数组）；英文建议全大写 |
| `bigTitleColor` | | 默认 `#111111` |
| `bigTitleLineColors` | | 按行颜色；或 `bigTitle: [{text, color}]` |
| `smallTitle` | 建议 | 中文小标题 |
| `description` | 建议 | 一行短描述 |
| `tags` | 建议 | 数组或逗号分隔 |
| `secondaryTitles` | 建议 | 页脚二级标题，2–4 个 |
| `themeColor` | | hex；未提供则随机 |
| `badge` | | 左上角徽章，默认 `skill` |

主题色未指定时脚本随机（焦橙/明黄/翠绿等）；回复里告知色名与 hex。示例见 `references/cover-example.json`。

### 视觉规范

1. 画布 `1080×1920`（9:16），背景 `#F6F4EF`
2. 内容落在上下居中、左右各留 60px 的 **3:4** 核心区（`960×1280`）；网格铺满 9:16。可用 `node scripts/generate-cover-layout-review.mjs <cover.png>` 对照
3. 主题色用于徽章、短横线、细边框/十字、大色块、页脚图标
4. 大标题：超粗高压缩无衬线（Anton / Impact 系），全大写
5. 信息区：短横线 → 小标题 → 描述 → 标签条
6. 页脚：二级标题 + 线稿图标
7. 装饰：点阵、右侧大圆出血（右上或右下随机）、细圆弧；禁止插画风/霓虹/默认 AI 紫白风

### 出图

```bash
node scripts/generate-cover.mjs --input cover.json
# 或：
node scripts/generate-cover.mjs \
  --bigTitle "SEEDANCE" \
  --smallTitle "AI 视频导演流" \
  --description "不是堆词，是导演工作流" \
  --tags "分镜叙事,镜头控制" \
  --secondaryTitles "导演模式,镜头语言,成片导出" \
  --themeColor "#6D28D9" \
  --out output/cover.png
```

stdout JSON：`ok`、`path`、`themeColor`、`themeName`、`size`。需 Playwright Chromium。

### 封面交付

见 `.cursor/rules/image-preview-delivery.mdc`。

```bash
bash scripts/oss-upload.sh --cover <path>
# 仅预览：
node scripts/make-oss-preview-html.mjs --title "封面预览" --image <path>
```

社媒写入 `cover_url` / `image_previews[0]` 后只发自建站；临时预览只发 HTML URL 并询问是否删除。**禁止**对话框直发 OSS 图链。

---

## §图片混排

- 整行：`![alt](url =原始宽x高)`；单独成行，前后空行。
- url 可为远程或 dataURL；导出建议先转 dataURL 防跨域污染。
- 在预览环节确认摆放。

---

## §高亮

### 何时

- 必须主动发高亮设置页；仅当用户说「你来自动高亮 / 按默认方案」才可跳过。
- 设置页回传后仍 `era_apply_highlights`（`replace: true`）。

### 设置页

1. 已有 `projectId`
2. `era_create_highlight_setup_share` → `http://39.106.179.17/?tab=highlight&shareId=…`
3. **禁止**对整段 query 二次 `encodeURIComponent`
4. 引导用户点选后复制配置发回 → `era_apply_highlights`

### 配色与密度

- 颜色种类 ≤ 3；色板无灰；笔刷与下划线同色
- 宁少勿多；一页计入密度 ≤ 3 处（li 子标题整组除外）
- **二级标题不要高亮**
- 封面大标题画圈/强调由封面视觉承担，不在内容图做 H1 画圈

---

## §校验与导出

1. `era_update_config`：`aspectRatio`（默认 `9:16`）、`pageOverlay: 'pixel'`、二级标题 `shuheiti`、`titleLineHeight` 不过松
2. `era_preview_layout`
3. 修告警（内容图忽略标题类告警）：单行溢出、孤行、独行标点、画圈跨行、高亮超限、行高过松、字号过小等
4. `era_export_images`（含拼图 `sheetPath`）

---

## §发图

1. 上传并写入 `image_previews`（[0]=封面永久链，同步 `cover_url`）
2. 最终只发 `http://39.106.179.17/?tab=data`
3. **禁止**对话框直发 OSS 图链；确认阶段可用 HTML 预览
4. 禁止只发本地路径

```bash
bash scripts/oss-upload.sh --cover <本地png>
node scripts/make-oss-preview-html.mjs --title "…" --image <png>
```

合入 `main` 后如需前端：`npm run deploy:swas`，回传 `http://39.106.179.17/`。

---

## 工具速查

| 动作 | 工具 |
| --- | --- |
| 建工程 / 正文 | `era_create_project` · `era_set_markdown`（内容去掉 H1） |
| 配置 | `era_update_config`（`9:16` + `pixel` + `shuheiti` + 固定 topText） |
| 高亮 / 分享 | `era_apply_highlights` · `era_create_highlight_setup_share` |
| 标题页 | `?tab=title&text=<标题>` |
| 校验 / 导出 | `era_preview_layout` · `era_export_images` |
| 封面 | `node scripts/generate-cover.mjs` |
| HTML 预览 | `node scripts/make-oss-preview-html.mjs` |
| 通道 | `era_bridge_status` |
