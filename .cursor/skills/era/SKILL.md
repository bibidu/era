---
name: tuwen
description: >-
  【图文skill】用 Era 根据用户提供的标题/大纲生成社媒图文（小红书 3:4 / 抖音 9:16），含正文确认、5 个标题候选、高亮设置页引导、布局校验与导出发图。
  当用户说「图文skill」、图文、小红书/抖音出图、用标题生成图文、导出海报长图时必须使用本 skill。
---

# 图文 Skill（Era 图文生成）

严格按下列流程执行。任何一步未获用户明确「继续 / 确认」前，不得跳步。

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

云端 Agent：同样在本仓库拉起上述服务；导出后的发图规则见对应流程的「发图」步骤。

画幅约定：`3:4` = 小红书；`9:16` = 抖音。

**模板**：默认优先使用 **像素模板**（`pageOverlay: 'pixel'`），除非用户明确指定其它纹理。

**字体（非风水默认）**：非风水生成时，**二级标题（`##` / heading）默认使用阿里妈妈数黑体**（`headingFontId`: `shuheiti`，`headingFontFamily`: `"Alimama ShuHeiTi", sans-serif`）。一级标题与正文保持工程默认（通常为宋体），除非用户另指定。建工程或改模板时用 `era_update_config` / `era_create_project` 的 `config` 一并写入。

**风水风格特例**：若用户提到「风水」「风水风格」「风水质感」等，**直接**使用风水模板（`pageOverlay: 'fengshui'`），并**固定抖音尺寸**（`aspectRatio: '9:16'`），同时 **关闭「全文 xxx 字」**（`showWordCount: false`），**顶部文案固定为** `连续观看、点赞、关注，你也是地理风水达人（阳宅篇）`（写入 `topText`）；无需再问导出平台（除非用户另指定小红书）。风水风格**不要**套用数黑体，二级标题保持宋体。

---

## 流程分支（先判定）

- **风水风格**：用户提到「风水」「风水风格」「风水质感」等 → 走 **§A 风水流程**（封面标题与内容同在一套 Era 图里）。
- **其它所有主题（非风水）** → 走 **§B 非风水标准流程**（封面图由「封面 skill」单独生成，Era 只出**不含一级标题**的内容图，最后拼合）。

---

## §A 风水流程（保持原样）

固定 **风水模板**（`pageOverlay: 'fengshui'`）+ **抖音尺寸**（`aspectRatio: '9:16'`）+ **关闭「全文 xxx 字」**（`showWordCount: false`）；标题随内容图一起出，无需另用封面 skill；除非用户另指定小红书，否则跳过导出平台询问。

1. **收集选题**：用户未给标题/大纲 → 主动询问，拿到前不要写正文。
2. **正文（多轮确认）**：据标题/大纲写含 `#` 一级标题与适量 `##` 的 Markdown，展示后明确询问是否继续；改完再展示再问；确认后 `era_create_project` / `era_set_markdown`（`pageOverlay: 'fengshui'` + `9:16` + `showWordCount: false` + `topText: '连续观看、点赞、关注，你也是地理风水达人（阳宅篇）'`，**不写** `shuheiti`）。
3. **社媒标题（5 个 + 确认）**：给 5 个抓眼球、贴合正文的标题；技术名词首字母大写（`Memory`/`Agent`/`Token`）；用户选定后 `era_set_title`。
4. **高亮**：按 **§高亮** 流程（优先设置页）。
5. **校验与导出**：按 **§校验与导出**。
6. **发图**：按 **§发图（先拼图确认，再发分图）**。

---

## §B 非风水标准流程（默认，封面与内容分离）

> 关键约束：
> 1. 本套流程**仅适用于非风水**主题。
> 2. **内容图不包含一级标题**（H1）。内容图只允许标题以外的部分：二级标题、正文、列表、图片、代码块等。一级标题只出现在**封面图**上，由封面 skill 负责。
> 3. **内容中若需要配图**：在正文里用 markdown 图片混排（见 **§图片混排**），并在**生成预览图的环节**把图片摆到合适位置展示给用户确认。

### B1. 询问大纲

- **先询问大纲 / 要点**。拿到大纲之前不要写正文。
- 用户已给大纲 → 进入下一步。

### B2. 根据大纲生成内容（多轮确认）

1. 依据大纲写 Markdown 内容，可含：`##` 二级标题、正文段落、`-` 列表、代码块、以及必要的图片占位（见 §图片混排、§开源社区仓库图文）。
2. 心里保留一个一级标题（供后续封面用），但**内容正文可不含 H1**；展示内容全文后**明确询问**：是否继续？
3. 用户提出修改 → 改完再展示、再询问，直到用户确认内容。

### B3. 确认标题 + 封面信息

内容确认后，与用户确认两类信息：

1. **标题**：给 **5 个**抓眼球、贴合内容的社媒标题；技术名词首字母大写（`Memory`/`Agent`/`Token`）；多轮修改到用户选定。
2. **封面所需信息**：从内容中提取并让用户确认——副标题 / 小标题、标签、以及封面 skill 需要的其它字段。**完整字段以仓库中的「封面 skill」为准**。

### B4. 生成封面图

用户确认标题 + 封面信息后，**按仓库中的「封面 skill」生成封面图**，把封面发给用户确认；用户要改 → 改完再确认。

### B5. 用户自行设置高亮（内容图）

封面确认后，进入内容图高亮：按 **§高亮** 流程（与现状一致，优先引导用户用高亮设置页点选，再回传配置）。

### B6. 拼合横版总览并确认

高亮效果确认后，把 **封面图 ＋ 各内容高亮页** 横向拼成**一张总览图**（横版拼图），发给用户确认整体效果；用户要改 → 回到相应步骤修改后重新拼图再确认。

### B7. 逐张发送

用户确认总览后，**逐张单独**发送封面图与每一页内容图（可直接发布的原图）。

### 内容图构建要点（Era）

- Era 工程的 markdown **不要写 `# 一级标题`**，从二级标题 / 正文开始，避免内容图出现标题。
- 画幅：默认像素模板 `pageOverlay: 'pixel'` + 用户选定的 `3:4`（小红书）/ `9:16`（抖音，默认优先）。
- 建工程时写入二级标题数黑体：`headingFontId`=`shuheiti`，`headingFontFamily`=`"Alimama ShuHeiTi", sans-serif`。
- 因内容图无一级标题，`title_missing_circle` / `title_circle_wrapped` / `title_*` 等标题类校验**不适用于内容图**；标题相关规则改由封面 skill 负责。其余布局告警仍须修复（见 §校验与导出）。

---

## §开源社区仓库图文（介绍开源项目时必做）

当正文主题是**介绍某个开源社区仓库**（如 `hugohe3/ppt-master`）时，除常规 B 流程外，内容图须包含以下两块：

### 1. 仓库首页预览卡片图

1. 运行仓库卡片脚本（拉取开源社区社交预览图 + Star 数，裁剪为 Era 内容区宽度）：
   ```bash
   node scripts/generate-github-repo-card.mjs --repo <owner>/<name> --out output/<name>-repo-card.png --dataurl-out output/<name>-repo-card.json
   ```
2. 从 JSON 读取 `markdown` 字段（内含 dataURL 与 `=宽x高` 尺寸提示），**插入内容靠前位置**（通常紧跟「仓库信息」段之后）。
3. 卡片图须展示：**完整仓库名**（`owner/repo`）与 **Star 数**；不要只用纯文字代替。

### 2. 仓库信息说明段

正文中须有独立段落说明仓库归属，推荐结构：

```markdown
## 仓库信息

本文介绍的仓库为 **hugohe3/ppt-master**（作者 Hugo He / 仓库名 ppt-master）。

下方卡片展示该仓库在开源社区的预览图与当前 Star 数。
```

- `## 仓库信息` 使用二级标题（会渲染为数黑体）。
- 文中至少一次以 `作者/仓库名` 格式写出全名（如 `hugohe3/ppt-master`），并简要说明作者与仓库名的对应关系。
- **不要**写「可在 GitHub 搜索…」类引导语；用「开源社区」表述即可。
- 若用户给了具体仓库链接或全名，以用户提供的为准，不要臆造 owner。
- 正文须足够充实（建议 **≥800 字**，含问题、能力、承诺、适合谁等），适当拆句分段，避免整段过长。

---

## §图片混排（Era markdown 插图）

- Era 支持整行 markdown 图片：`![alt](url =原始宽x高)`。
  - `url` 可为**远程链接**或 **dataURL**；`=宽x高` 为图片原始像素（用于等比排版），省略时按 16:9 估算。
  - 图片必须**单独成行**，前后留空行。
- 远程图片绘制到 canvas 导出时可能触发跨域污染，**建议先转成 dataURL 内嵌**再写入 markdown，确保导出成功。
- 在 **B 流程的预览环节**，把图片摆到合适位置渲染出来给用户看，位置不合适就调整。

---

## §高亮（优先引导用户用设置页，不静默自动生成）

### 何时进入高亮

- 进入高亮步骤后，**必须主动发送高亮设置页 URL**（见下），引导用户在页面上点选/滑动设置，再把剪贴板内容发回。
- **仅当用户明确说「你来自动高亮 / 按默认方案」** 时，才可跳过设置页，由你按「配色/密度」规则自动生成并 `era_apply_highlights`。
- 用户通过设置页写入后，仍应 `era_apply_highlights`（`replace: true`）按粘贴内容再写一遍，确保一致。

### 高亮设置页（必做）

1. 确认已有 `projectId`（内容已写入）。
2. **创建云端分享**（把正文存到 Supabase，避免 URL 过长）：
   - MCP：`era_create_highlight_setup_share`（`projectId`）
   - 或 REST：`POST /v1/projects/:projectId/highlight-setup-share`
   - 返回 `shareId`、`url`（GitHub Pages 链接）
3. **主动把 `url` 发给用户**（形如 `https://bibidu.github.io/era/?highlightSetup=1&shareId=<SHARE_ID>`）。云端 Agent **必须**发 GitHub Pages 链接，不要发 `127.0.0.1`。
4. 说明操作：打开链接 → 顶部选样式/颜色 → 在文字上点击或滑动标记 → 底部可翻页 → 完成后点 **「复制并应用高亮配置」**（写回 Supabase 并复制到剪贴板）→ 把剪贴板内容粘贴发回。
5. 收到粘贴后：识别 `ERA_HIGHLIGHT_SETUP_V1` / `"type":"era_highlight_setup"`，解析 `projectId` 与 `ranges`，调用 `era_apply_highlights`（`replace: true`），简要确认后继续。
6. 用户迟迟未回传或不会操作：可改用自动高亮（下），并说明你在代为设置。

### 配色

- 全文高亮颜色种类 **≤ 3**（brush/underline/circle/quote 合计）。
- **色板不含灰色**：高亮样式选择器已去掉灰色，请用明黄、橙、红、绿、蓝、紫等彩色；下划线与笔刷同色叠加。
- **笔刷与下划线同色**：同段叠加时下划线颜色必须与笔刷一致（禁止刷黄线红等混色）。
- 常用组合：2 色（明黄 `#FACC15` + 警示红 `#EF4444`）；3 色（明黄 `#FACC15` + 警示红 `#EF4444` + 橙色 `#FB923C`）。

### 密度与语义（自动高亮或代改时最重要）

- **宁少勿多**：不要整页刷满；每页有点睛即可，避免密集。
- **一页最多 3 处计入密度的高亮**（一处 = 一个连续高亮片段；含 brush/underline/circle 任一）。**列表 li 子标题整组高亮不计入**（见下条）。极个别页面信息密度极高时才可放宽。
- **必须结合段落语义**选词：只标真正改变理解的关键词/结论句；禁止机械均匀撒点或只标收尾几字充数。
- **二级标题（`##` / heading）不要任何高亮**。
- **列表 `ul/li` 子标题连同规则**：同一小节下连续的「子标题：说明」列表，若要高亮须**整组同开同关**（样式与颜色完全一致）；只高亮冒号前子标题；整组 li 子标题高亮**不计入**「一页最多 3 处」。
- **一句话/两句话重点**：可用下划线；不密时可下划线 + 笔刷叠加（**必须同色**）。
- **一级标题（风水）**：默认至少一处画圈；若用户禁止画圈，可用 `titlePrimaryColor` 或文字色 `color` 代替。
- （非风水封面标题的画圈规则由封面 skill 负责。）

写入：`era_apply_highlights`（建议 `replace: true` 先清空再写）。

---

## §校验与导出（每种比例都要做）

对每个目标 `aspectRatio` 分别：

1. `era_update_config` 设 `aspectRatio`（保持当前模板：默认 `pageOverlay: 'pixel'` + 二级标题 `shuheiti`；风水风格用 `fengshui` 且 `showWordCount: false`、二级标题不用数黑体；`titleLineHeight` 不过松）
2. `era_preview_layout`
3. 若有告警必须先修再导出（非风水内容图忽略标题类告警）：单行溢出、孤行、独行标点、画圈跨行、高亮颜色超 3 种、**一页计入密度的高亮超 3 处**（li 子标题整组除外）、行高过松、字号过小；标题缺画圈时可用 `titlePrimaryColor` / 文字色 `color` 豁免
4. 通过后再 `era_export_images`（写出各页 PNG + 横向拼图 `graphic-review-sheet.png`，返回 `sheetPath` / `reviewSheet`）

---

## §发图（先拼图确认，再发分图）

**硬性顺序，不得颠倒：**

1. 导出后**先只发拼图**（横版总览）给用户；非风水流程的拼图须为 **封面图 + 各内容页** 的拼合版。提醒可放大逐页查看，此步不附各页独立图。
2. **明确询问**：拼图效果是否 OK？要改高亮/内容/封面/画幅吗？
3. 用户要改 → 修改 → 重新校验/导出/拼图 → 仍先只发拼图再问。
4. **仅当用户明确确认后**，再**逐张单独**发送封面图与各页独立 PNG。
5. 双平台导出时：每个比例各自「先拼图确认 → 再分图」，不混发。

---

## §预览/下载页（Gallery 图文库，必做）

> **项目全局约定**：出图后必须把最终图**上传到 Supabase**，再把 **Gallery 图文库** 链接发给用户。支持全屏轮播预览与 **ZIP 整包下载**（iOS 走分享）。

1. 校验通过、且用户确认拼图后，调用 `era_create_export_share`（`projectId`）。返回 `shareId` 与 Gallery URL（形如 `https://bibidu.github.io/era/gallery/?shareId=<SHARE_ID>`）。
2. **主动把该 `url` 发给用户**：打开图文库可左右滑动逐页查看，点「下载 ZIP」一次打包全部原图。云端 Agent **必须**发 GitHub Pages 链接，不要发 `127.0.0.1`。
3. 旧链接 `?exportShare=1&shareId=...` 会自动跳转到图文库。
4. 内容/高亮/封面有改动、重新导出后，需**重新** `era_create_export_share` 生成新链接再发。

---

## 工具速查

| 动作 | MCP / REST |
| --- | --- |
| 建工程 | `era_create_project` · `POST /v1/projects` |
| 写正文（内容图去掉 H1） | `era_set_markdown` · `PUT .../markdown` |
| 写标题（风水流程） | `era_set_title` · `PUT .../title` |
| 画幅/模板/字体 | `era_update_config` · `PATCH .../config`（`pageOverlay: 'pixel'` + 二级标题 `shuheiti`；风水 `fengshui` + `9:16` + `showWordCount: false` + 固定 `topText`，二级标题保持宋体） |
| 顶部文案 | 风水模板 `topText` 固定为「连续观看、点赞、关注，你也是地理风水达人（阳宅篇）」 |
| 图片混排 | markdown 整行 `![alt](url =宽x高)`（url 支持远程或 dataURL） |
| 开源社区仓库卡片 | `node scripts/generate-github-repo-card.mjs --repo owner/name` |
| 高亮 | `era_apply_highlights` · `POST .../highlights`（可带 `replace: true`） |
| 高亮设置分享 | `era_create_highlight_setup_share` · `POST .../highlight-setup-share` → GitHub Pages `url` |
| 校验 | `era_preview_layout` · `POST .../preview-layout` |
| 导出 | `era_export_images` · `POST .../export`（含拼图 `sheetPath`） |
| 导出图预览/下载页 | `era_create_export_share` · `POST .../export-share` → Gallery `url`（`/gallery/?shareId=...`，轮播预览 + ZIP 下载，**必做**） |
| 封面图 | 见仓库中的 **封面 skill**（非风水流程） |
| 通道 | `era_bridge_status` · `GET /v1/bridge/status` |

更多协议见仓库 `docs/agent-mcp-design.md`。
