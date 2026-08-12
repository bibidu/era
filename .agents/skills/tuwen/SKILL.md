---
name: tuwen
description: >-
  【图文skill】用 Era 根据标题/大纲生成社媒图文（小红书 3:4 / 抖音 9:16），含正文确认、封面标题两行、内联瑞士风封面、布局校验与导出发图。
  当用户说「图文skill」、图文、小红书/抖音出图、用标题生成图文、导出海报长图，或「封面skill」、生成封面、社媒封面、cover skill、做一张封面时必须使用本 skill。
  风水/阳宅主题改走「风水skill」（fengshui），不要用本 skill。
---

# 图文 Skill（Era 图文 + 内联封面）

严格按下列流程执行。

**风水 / 阳宅 / 风水风格** → 改用 [风水 skill](../fengshui/SKILL.md)，本 skill 不处理。

## 两种运行模式

| 模式 | 何时用 | 确认行为 |
| --- | --- | --- |
| **全自动**（默认，被 [蛇大师 skill](../shedashi/SKILL.md) 调用时） | 用户说「使用蛇大师」「今天发什么」「下一期」，或明确说「不用问我，直接出」 | **零确认**：选题、正文、标题、封面、版面全部自行定稿，一路跑到入库 + 飞书通知 |
| **半自动** | 用户就单篇内容与你来回讨论、或明确要求「先给我看看」 | 每步展示后等用户「继续 / 确认」，不得跳步 |

全自动模式下**禁止**：问「要哪个选题 / 标题选哪个 / 这样排版行吗」、发 5 个标题候选、发高亮设置页或标题排版设置页、写完文案就停下等确认。下文凡标注「（半自动）」的确认动作在全自动模式下跳过，其余技术要点两种模式都适用。

## 0. 前置：确认 Era 服务可用

> 端口可用 `--agent-port` / `--dev-port` 或 `ERA_AGENT_PORT` / `ERA_DEV_PORT`；默认后端 `3847`、前端 `5173`。

1. `bash scripts/ensure-era-ready.sh`（或 `npm run start:local-agent`）
2. `curl -s http://127.0.0.1:${ERA_AGENT_PORT:-3847}/health` → `ok: true` 且 `connected: true`
3. 优先 MCP `era_*`；否则 REST `http://127.0.0.1:${ERA_AGENT_PORT:-3847}/v1/...`

画幅：`3:4` = 小红书；`9:16` = 抖音。**默认直接导出 `9:16`**，不要询问平台；用户明确要求小红书再用 `3:4`。

**模板**：默认 **像素模板**（`pageOverlay: 'pixel'`），除非用户指定其它纹理。

**字体**：一级标题（封面大标题 / H1）与二级标题（`##`）均默认阿里妈妈数黑体（封面 `bigTitleFont: shuheiti`；内容 `headingFontId`: `shuheiti`，`headingFontFamily`: `"Alimama ShuHeiTi", sans-serif`；若正文含 H1 则 `titleFontId`: `shuheiti`）。正文保持宋体，除非用户另指定。

**顶部文案**：内容页默认 `点赞关注不迷路～`；`showWordCount: false`。

**分页**：每个二级标题（`##`）**必须独占一页**。工程 Markdown 在每个 `##`（首个除外）前加 `<!-- era:page-break -->`；**入库与发给用户的正文禁止出现该标记**。

**页数**：默认 **封面 + 4 个 `##`＝5 页封顶**。后台「平均浏览图片数」常年只有 1.8–2.7，多做的页没人看；内容超量就砍，不要靠加页装。

**系列期数放末页（硬性）**：`每天一个提效实操·第 N 期` 写在**最后一页正文结尾**，`seriesLabel` 配置留空（这样每页顶栏都是 `点赞关注不迷路～`）。**禁止**再写「下期：…」预告。

**禁止**把期数放在整套第 2 页的顶栏。依据是两篇播放量几乎相同（633 vs 662）的对照：期数在末页那篇平均浏览图片数 **2.7**、吸粉率 **0.32%**；期数占了第 2 页顶栏那篇只有 1.9 与 0.15%。第 2 页是全篇最贵的位置，必须直接进痛点。明细见 [蛇大师 playbook](../shedashi/references/playbook.md) §版面。

**末页三件套**：期数/系列标识（`每天一个提效实操·第 N 期`）+ 关注理由（一句身份认同）+ 一个提问。吸粉率的天花板在这一页。不要用连载承诺 / 下期预告凑三件套。

**翻页钩子**：每页结尾留一句悬念或提问，否则读者停在第 2 页。

**选题重心（被蛇大师调用时）**：正文围绕 **AI 实践与技巧**（Agent 协作、工作流、判断力、prompt/规则），不要做成裸 git / CLI 命令教程；git/CLI 仅可作服务实践点的小辅助。

**可抄页**：每篇至少一页是能直接抄走的东西（规则原文 / prompt / 判断清单；命令仅当服务 AI 实践点时附带）。本账号爆款的收藏量常大于点赞量。判断标准是**只截这一页就能用起来**；「我的目录长这样」这类结构示意不算——第 16 期这么做，浏览图片数达标但吸粉率与收藏率都是同播放量级最低（见 [playbook](../shedashi/references/playbook.md) §版面）。

`seriesLabel` 配置项仍然可用（会在内容首页渲染期数顶栏 + 朱红下划线，见 `SERIES_LABEL_GAP_LINES`），但**默认不用**；仅当用户明确要求把期数做成第 2 页顶栏时才写。

**高亮**：默认**不做高亮**。封面确认后直接布局校验 → 导出 → 入库；不要发高亮设置页，不要 `era_apply_highlights`。仅当用户明确要求「加高亮 / 打开高亮设置页」时才走 §高亮。

---

## 主流程（封面与内容分离）

约束：

1. **内容图不含一级标题**（H1）。只含二级标题、正文、列表、图片、代码块等。一级标题只出现在**封面图**上（见 §封面）。
2. 需要配图时用 markdown 混排（§图片混排），在预览环节确认位置。
3. 默认抖音 `9:16`。

### 1. 拿到大纲

- **全自动**：自行定选题与大纲（蛇大师模式下按 [playbook](../shedashi/references/playbook.md) 定）。
- **半自动**：先问大纲 / 要点；拿到前不写正文。用户已给大纲 → 下一步。

### 2. 生成内容

1. 写 Markdown：`##`、段落、列表、代码块、必要图片占位。
2. 心里保留一级标题供封面用，**正文可不含 H1**。
3. **（半自动）** 展示后明确询问是否继续；用户要改 → 改完再展示，直到确认。

### 3. 定封面标题 + 封面信息

1. **封面标题（即社媒标题）**：常见两行，可三行及以上。各行按顺序连在一起（无额外分隔）即为社媒 `title` / 入库标题；封面 `bigTitle` 按多行排版，默认数黑体。**不要**给 5 个标题候选。
   - **全自动**：直接定稿，不问用户，不发标题排版设置页。
   - **（半自动）** 缺哪行问哪行；精细排版可发 `https://39.106.179.17.sslip.io/?tab=title&text=<各行连写标题>`（多行可用 `%0A`；禁止裸 `?tab=title`）。
2. **封面字段**：从内容提取——见 §封面字段表（小标题、描述、标签、二级标题、主题色、`blobCorner`、按行配色等；大标题已由上一步各行确定）。

### 4. 生成封面图

按 **§封面** 出图。上传 OSS（`__cover_keep__`）后**默认写入** `image_previews` / `cover_url`，预览一律走自建站 **HTTPS** `https://39.106.179.17.sslip.io/?tab=data`（勿发 HTTP 裸 IP，否则 Safari 无法保存到相册）；**禁止**对话框直发 OSS 图链。仅当用户**强烈要求**临时 HTML 时才用 `make-oss-preview-html.mjs`。

### 5. 内容图校验与导出（默认跳过高亮）

1. 建工程 / 写正文 / `era_update_config`（见下方要点）
2. `era_preview_layout`，修非标题类告警
3. `era_export_images`（含拼图 `sheetPath`）

**不要**主动发高亮设置页；用户未点名高亮时整条链路无高亮。

### 6. 拼合横版总览

封面 + 各内容页拼成横版总览自查版面。**（半自动）** 入库后用自建站链接请用户确认；**禁止**直发 OSS 图链。

### 7. 入库交付

各页上传 OSS，**按序写入** `image_previews`（[0]=封面），对话框**只发** `https://39.106.179.17.sslip.io/?tab=data`。

- **全自动**：用 `node scripts/shedashi-publish.mjs --input publish.json` 一步完成上传 + 入库 + 飞书通知。
- OSS 临时 HTML 仅为用户强烈要求时的例外。

### 内容图构建要点（Era）

- Markdown **不要写 `#`**，从 `##` / 正文开始。
- **每个 `##` 独占页**：除首个 `##` 外，前插 `<!-- era:page-break -->`（入库与用户可见文案须去掉）。
- 页数默认 **封面 + 4 个 `##`＝5 页封顶**。
- 建工程：`pageOverlay: 'pixel'`、`9:16`（或用户指定 `3:4`）、`headingFontId: shuheiti`、`topText: '点赞关注不迷路～'`、`showWordCount: false`、`seriesLabel: ''`（留空——期数改放末页正文，见上方硬性规则）。
- **末页正文结尾**：关注理由 + 一个提问 + `每天一个提效实操·第 N 期`；**不要**再跟 `下期：…` 行。
- 导出前自查：每页顶栏都是 `点赞关注不迷路～`；每页以一个 `##` 起头；每页末尾有翻页钩子；至少一页可直接抄走；末页有三件套（期数 + 关注理由 + 提问，无下期预告）。
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
| `bigTitle` | ✅ | 大标题多行（`\\n` 或数组）；= 封面标题各行；各行连写即社媒标题；**默认数黑体**（`bigTitleFont: shuheiti`） |
| `bigTitleColor` | | 默认 `#111111` |
| `bigTitleLineColors` | | 按行颜色；或 `bigTitle: [{text, color}]` |
| `bigTitleFont` | | 默认 `shuheiti`（一级标题数黑体）；仅英文全大写海报可改 `anton` |
| `blobCorner` | | 主题色大圆：`top-right` / `bottom-right`；用户指定则固定，否则随机 |
| `smallTitle` | 建议 | 中文小标题 |
| `description` | 建议 | 一行短描述 |
| `tags` | 建议 | 数组或逗号分隔 |
| `secondaryTitles` | 建议 | 页脚二级标题，2–4 个；**每项 ≤4 字、禁止换行**（见下方检测） |
| `themeColor` | | hex；未提供则随机 |
| `badge` | | 左上角徽章，默认 `skill` |

主题色未指定时脚本随机（焦橙/明黄/翠绿等）；回复里告知色名与 hex。示例见 `references/cover-example.json`。

### 视觉规范

1. 画布 `1080×1920`（9:16），背景 `#F6F4EF`
2. 内容落在上下居中、左右各留 60px 的 **3:4** 核心区（`960×1280`）；网格铺满 9:16。可用 `node scripts/generate-cover-layout-review.mjs <cover.png>` 对照
3. 主题色用于徽章、短横线、细边框/十字、大色块、页脚图标
4. 大标题：**一级标题默认阿里妈妈数黑体**（`bigTitleFont: shuheiti`）；仅纯英文全大写海报可用 Anton / Impact 系
5. 信息区：短横线 → 小标题 → 描述 → 标签条
6. 页脚：二级标题 + 线稿图标；**每项单行展示，禁止换行**；文案宜短（**≤4 字/项**），过长先缩字再出图
7. 装饰：点阵、主题色大圆出血（右上或右下；用户指定则固定）、细圆弧；禁止插画风/霓虹/默认 AI 紫白风

### 页脚二级标题检测（强制）

出图前 / 出图时必须满足，否则重写 `secondaryTitles` 后重跑，不得交付换行页脚：

1. **字数**：每项按 Unicode 码点计 **≤4**（如「旧习惯」「重算账」「用法」「收尾」）
2. **禁换行**：不得含 `\n`；渲染后 `.foot-item` 文案必须单行（`white-space: nowrap`）
3. **脚本门禁**：`generate-cover.mjs` 对超长或含换行直接 `exit 1`；截图前检测页脚换行/裁切，失败不写 PNG
4. Agent 拟封面字段时主动缩字；用户原稿过长时先改短再出图，不要用缩小字号硬塞多字换行

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
# 默认：写入 cover_url / image_previews 后只发自建站
# 仅用户强烈要求临时 HTML 时：
# node scripts/make-oss-preview-html.mjs --title "封面预览" --image <path>
```

社媒**必须**写入 `cover_url` / `image_previews[0]` 后只发自建站。**禁止**对话框直发 OSS 图链；禁止默认走 HTML 预览。

---

## §图片混排

- 整行：`![alt](url =原始宽x高)`；单独成行，前后空行。
- url 可为远程或 dataURL；导出建议先转 dataURL 防跨域污染。
- 在预览环节确认摆放。

---

## §高亮（仅用户明确要求时）

默认跳过本节。仅当用户说「加高亮 / 要高亮设置页 / 帮我标高亮」等时才执行。

### 设置页

1. 已有 `projectId`
2. `era_create_highlight_setup_share` → `https://39.106.179.17.sslip.io/?tab=highlight&shareId=…`
3. **禁止**对整段 query 二次 `encodeURIComponent`
4. 引导用户点选后复制配置发回 → `era_apply_highlights`（`replace: true`）

### 配色与密度

- 颜色种类 ≤ 3；色板无灰；笔刷与下划线同色
- 宁少勿多；一页计入密度 ≤ 3 处（li 子标题整组除外）
- **二级标题不要高亮**
- 封面大标题画圈/强调由封面视觉承担，不在内容图做 H1 画圈

---

## §校验与导出

1. `era_update_config`：`aspectRatio`（默认 `9:16`）、`pageOverlay: 'pixel'`、二级标题 `shuheiti`、`titleLineHeight` 不过松
2. `era_preview_layout`
3. 修告警（内容图忽略标题类告警）：单行溢出、孤行、独行标点、画圈跨行、行高过松、字号过小等
4. `era_export_images`（含拼图 `sheetPath`）

---

## §发图

1. 上传并**必须写入** `image_previews`（[0]=封面永久链，同步 `cover_url`）
2. 对话框**只发 HTTPS** `https://39.106.179.17.sslip.io/?tab=data`，让用户在社媒 Tab 查看并可保存到相册
3. **禁止**发 HTTP 裸 IP 作默认预览链（Safari Web Share 仅 HTTPS 可用）
4. **禁止**对话框直发 OSS 图链；**禁止**默认用 OSS 临时 HTML 代替入库
5. 仅当用户**强烈要求**「不要入库 / 只要临时 HTML」时才用 `make-oss-preview-html.mjs`，并询问用完是否删除
6. 禁止只发本地路径

```bash
bash scripts/oss-upload.sh --cover <本地png>
# 写入业务库后只发 https://39.106.179.17.sslip.io/?tab=data
```

合入 `main` 后如需前端：`npm run deploy:swas`，回传 `https://39.106.179.17.sslip.io/`。

---

## 工具速查

| 动作 | 工具 |
| --- | --- |
| 建工程 / 正文 | `era_create_project` · `era_set_markdown`（内容去掉 H1） |
| 配置 | `era_update_config`（`9:16` + `pixel` + `shuheiti` + topText；`seriesLabel` 留空） |
| 高亮（可选） | `era_apply_highlights` · `era_create_highlight_setup_share`（仅用户点名时） |
| 标题页（仅半自动） | `?tab=title&text=<标题>` |
| 校验 / 导出 | `era_preview_layout` · `era_export_images` |
| 封面 | `node scripts/generate-cover.mjs` |
| 上传 + 入库 + 通知（全自动） | `node scripts/shedashi-publish.mjs --input publish.json` |
| HTML 预览 | `node scripts/make-oss-preview-html.mjs` |
| 通道 | `era_bridge_status` |
