---
name: era
description: >-
  用 Era 根据用户提供的标题/大纲生成社媒图文（小红书 3:4 / 抖音 9:16），含正文确认、5 个标题候选、高亮设置页引导、布局校验与导出发图。
  在用户提到 era、图文、小红书/抖音出图、用标题生成图文、导出海报长图时必须使用本 skill。
---

# Era 图文生成 Skill

严格按下列流程执行。任何一步未获用户明确「继续 / 确认」前，不得跳步（**高亮步骤见 §4：须主动发设置页 URL，等用户回传剪贴板配置**）。

## 0. 前置：确认 Era 服务可用

> **端口约定**：后端/前端端口可在启动时通过命令行参数指定，例如
> `bash scripts/ensure-era-ready.sh --agent-port 3848 --dev-port 5174`
> （或环境变量 `ERA_AGENT_PORT` / `ERA_DEV_PORT`）。未指定时默认后端 `3847`、前端 `5173`。
> 下文以默认端口为例；若以其它端口启动，请把 URL 中的 `3847`/`5173` 替换为实际端口。
> 实际端口可从启动脚本输出、或 `~/.workbuddy/mcp.json` 的 `ERA_AGENT_URL` 读取。

每次开跑必须先确认服务：

1. 在仓库根目录执行：`bash scripts/ensure-era-ready.sh`（或 `npm run start:local-agent`），可带 `--agent-port`/`--dev-port`
2. 检查 `curl -s http://127.0.0.1:${ERA_AGENT_PORT:-3847}/health` 返回 `ok: true`
3. 检查 bridge 已连接（`connected: true`）。若未连接：确保前端 `http://127.0.0.1:${ERA_DEV_PORT:-5173}/era/` 已在浏览器打开且出现 Agent 指示
4. 优先用 MCP 工具（`era_*`）；若无 MCP，用 REST `http://127.0.0.1:${ERA_AGENT_PORT:-3847}/v1/...`

云端 Agent：同样在本仓库拉起上述服务；导出后**先**把 `output/` 下的拼图 `graphic-review-sheet.png` 作为附件发给用户确认，**确认后再**发各页独立 PNG。

画幅约定：`3:4` = 小红书；`9:16` = 抖音。

**模板**：默认优先使用 **像素模板**（`pageOverlay: 'pixel'`），除非用户明确指定其它纹理。

**风水风格特例**：若用户提到「风水」「风水风格」「风水质感」等，**直接**使用风水模板（`pageOverlay: 'fengshui'`），并**固定抖音尺寸**（`aspectRatio: '9:16'`），同时 **关闭「全文 xxx 字」**（`showWordCount: false`），无需再问导出平台（除非用户另指定小红书）。

---

## 1. 收集选题

- 若用户**未**提供标题或大纲 → **主动询问**，拿到之前不要写正文。
- 若已提供 → 进入下一步。

---

## 2. 正文（多轮确认）

1. 根据标题/大纲写一版 Markdown 正文（含 `#` 一级标题与适量 `##`）。
2. 展示全文后**明确询问**：是否继续？
3. 用户提出修改 → 改完后再展示，并再次询问是否继续。
4. 只有用户明确说继续 / 确认正文后，才进入标题阶段。
5. 确认后：`era_create_project` / `era_set_markdown` 写入工程（默认 `pageOverlay: 'pixel'`；若用户已指定风水风格则用 `pageOverlay: 'fengshui'` + `aspectRatio: '9:16'` + `showWordCount: false`）。

---

## 3. 社媒标题（5 个 + 确认）

1. 给出 **5 个**抓眼球、有亮点、贴合正文的社媒标题。
2. **标题里的技术名词首字母大写**（如 `Memory`、`Agent`、`Token`），不要写成 `memory`。
3. 询问是否继续（或选第几个 / 如何改）。
4. 多轮修改直到用户选定标题并说继续。
5. 执行 `era_set_title` 写入选定标题。

---

## 4. 高亮（优先引导用户用设置页，不再静默自动生成）

### 4.1 何时进入高亮

- 标题确认并「继续」后：进入高亮步骤。
- **必须主动发送高亮设置页 URL**（见 §4.1.1），引导用户在页面上点选/滑动设置，再把剪贴板内容发回给你。
- **仅当用户明确说「你来自动高亮 / 按默认方案」**时，才可跳过设置页，由你按 §4.2–4.3 自动生成并 `era_apply_highlights`。
- 用户已通过设置页写入后，仍应用 `era_apply_highlights`（`replace: true`）按粘贴内容再写一遍，确保与用户配置一致。

### 4.1.1 高亮设置页（必做）

1. 确认已有 `projectId`（正文 + 标题已写入）。
2. **创建云端分享**（把正文/标题存到 Supabase，避免 URL 过长）：
   - MCP：`era_create_highlight_setup_share`（`projectId`）
   - 或 REST：`POST /v1/projects/:projectId/highlight-setup-share`
   - 返回字段：`shareId`、`url`（GitHub Pages 链接）
3. **主动把返回的 `url` 发给用户**（形如）：
   ```
   https://bibidu.github.io/era/?highlightSetup=1&shareId=<SHARE_ID>
   ```
   云端 Agent **必须**发 GitHub Pages 链接，不要发 `127.0.0.1`。
4. 说明操作：
   - 打开链接 → 顶部选样式/颜色 → 在标题与正文上**点击或滑动**标记；
   - 底部可**翻页**查看各页；
   - 完成后点底部 **「复制并应用高亮配置」**（会写回 Supabase，并把配置复制到剪贴板）；
   - **把剪贴板已复制的内容粘贴发回给 AI**。
5. 收到用户粘贴后：
   - 识别标记 `ERA_HIGHLIGHT_SETUP_V1` / `"type":"era_highlight_setup"`；
   - 解析 JSON 中的 `projectId` 与 `ranges`；
   - 调用 `era_apply_highlights`，传入 `ranges` 且 **`replace: true`**；
   - 简要确认已应用（可复述几处关键词），再进入导出平台询问。
6. 若用户迟迟未回传、或说不会操作：可改用自动高亮（§4.2–4.3），并说明你在代为设置。

### 4.2 配色

- 全文高亮颜色种类 **≤ 3**（brush/underline/circle/quote 合计）。
- **若用满 3 种颜色，其中必须有一种是灰色**（必须用明确灰色，推荐深灰 `#525252` 或中灰 `#737373`；**禁止**用偏蓝的灰如 `#9CA3AF` 充数，避免被看成蓝）。
- **笔刷与下划线同色**：若某段文字已有笔刷（brush），再叠加下划线（underline）时，**下划线颜色必须与笔刷颜色一致**（例如笔刷为淡黄/明黄 `#FACC15`，下划线也用 `#FACC15`；禁止刷黄线红等混色叠加）。
- 给用户说明颜色时用可读名（明黄 / 警示红 / 深灰等），括号可附 hex。
- 推荐常用组合：
  - 2 色：明黄 `#FACC15` + 深灰 `#525252`
  - 3 色：明黄 `#FACC15` + 警示红 `#EF4444` + 深灰 `#525252`

### 4.3 密度与语义（自动高亮或代改时最重要）

- **宁少勿多**：不要整页刷满；每页有点睛即可，避免密集。
- **一页最多 4 处高亮**（一处 = 一个连续高亮片段/range；含 brush/underline/circle 任一）。极个别页面信息密度极高时才可略放宽，并在说明里写明原因。
- **必须结合段落语义**选词：只标真正改变理解的关键词/结论句，禁止机械均匀撒点；**禁止**只标收尾几个字充数（例如总结段不应只高亮「伪装成智能」这类非核心尾巴，应标决策系统能力或核心判断）。
- **二级标题（`##` / heading）不要任何高亮**。
- **列表 `ul/li`**：若需要高亮，**样式必须用笔刷（brush）**，且**整篇文章所有列表项高亮样式与颜色统一**（不得对 li 使用 underline/circle/quote）。**只刷 li 的短标题/名称段，禁止整段 li 全刷**（全刷太炸眼）。典型写法是「标题：说明」——只高亮冒号前的标题，冒号后的解释一律不刷。例：`- 分析报告，结果证明：这是一份分析报告` → 只刷 `分析报告，结果证明`。无冒号时，只刷开头最短可辨认的专名/标签（如 `Session State`），不要连带后文。
- **一句话或两句话的重点**：优先用 **下划线**；若当前页还不密（未近 4 处上限），可 **下划线 + 笔刷叠加**（叠加计为 2 处，慎用；**两种样式必须同色**，见 §4.2）。
- **一级标题**：必须有高亮，且至少一处 **画圈（circle）**；禁止对标题用 `quote`。
- **标题字号不能太小**：封面/正文一级标题区域应**至少占据图片内容高度的二分之一**；过小则调大字号（可偏大、勿过小，一般 ≥48），必要时缩短标题文案或收紧 `titleLineHeight`（≤ 1.12）。
- **画圈词语不可折行**（`circle_wrapped` / `title_circle_wrapped`）。折行则调字号并收紧 `titleLineHeight`（同上）。

写入：`era_apply_highlights`（用户设置页回传或自动生成时均建议 `replace: true` 先清空再写入）。

---

## 5. 导出平台

询问：导出抖音（`9:16`）、小红书（`3:4`），还是两个都要？

- **默认：优先导出抖音（`9:16`）**
- 用户说继续且未改默认 → 按抖音比例执行
- **例外**：已按风水风格锁定 `fengshui` + `9:16` 时，可跳过本步直接校验导出

---

## 6. 校验与导出（每种比例都要做）

对每个目标 `aspectRatio` 分别：

1. `era_update_config` 设 `aspectRatio`（保持当前模板：默认 `pageOverlay: 'pixel'`，风水风格用 `fengshui` 且 `showWordCount: false`；`titleLineHeight` 不过松）
2. `era_preview_layout`
3. 若有告警必须先修再导出，包括：
   - 单行溢出、孤行、独行标点
   - **标题缺少画圈**
   - **画圈词语跨行**
   - **高亮颜色超过 3 种**
   - **标题行高过松**
   - **标题字号过小**（标题区域未至少占图片内容高度的二分之一）
4. 通过后再对该比例 `era_export_images`（会同时写出各页 PNG + 一张横向拼图 `graphic-review-sheet.png`，返回字段含 `sheetPath` / `reviewSheet`）

---

## 7. 发图：先拼图确认，再发分图

**硬性顺序，不得颠倒：**

1. 检测全部通过并导出后，**先只把拼图** `graphic-review-sheet.png`（`sheetPath`）发给用户。  
   - 这是多页横向拼成的一整张总览图；提醒用户可放大查看每一页内容。  
   - **此步不要附带各页独立 PNG**，避免来回切换。
2. **明确询问**：拼图效果是否 OK？要改高亮/正文/画幅吗？
3. 若用户要改 → 修改 → **重新校验 → 重新导出 → 仍先只发拼图**，再问确认。
4. **仅当用户明确确认没问题后**，再把该比例下的各页独立 PNG（`paths` / `graphic-page-XX.png`）发给用户。
5. 双平台导出时：每个比例各自「先拼图确认 → 再分图」；不要把两个平台的分图提前混发。
6. 每次改完仍要问是否还要继续调整，直到用户满意。

---

## 工具速查

| 动作 | MCP / REST |
| --- | --- |
| 建工程 | `era_create_project` · `POST /v1/projects` |
| 写正文 | `era_set_markdown` · `PUT .../markdown` |
| 写标题 | `era_set_title` · `PUT .../title` |
| 画幅/模板 | `era_update_config` · `PATCH .../config`（优先 `pageOverlay: 'pixel'`；风水风格用 `fengshui` + `9:16` + `showWordCount: false`） |
| 顶部文案 | `era_update_config` · `PATCH .../config`（`topText` 自定义；`showWordCount: false` 隐藏「全文 xxx 字」） |
| 高亮 | `era_apply_highlights` · `POST .../highlights`（可带 `replace: true`） |
| 高亮设置分享 | `era_create_highlight_setup_share` · `POST .../highlight-setup-share` → GitHub Pages `url` |
| 高亮设置页 | `https://bibidu.github.io/era/?highlightSetup=1&shareId=<id>` |
| 校验 | `era_preview_layout` · `POST .../preview-layout` |
| 导出 | `era_export_images` · `POST .../export`（含拼图 `sheetPath`） |
| 通道 | `era_bridge_status` · `GET /v1/bridge/status` |

更多协议见仓库 `docs/agent-mcp-design.md`。
