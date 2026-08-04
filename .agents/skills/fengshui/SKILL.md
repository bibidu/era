---
name: fengshui
description: >-
  【风水skill】阳宅/风水主题社媒图文：Era 风水模板 + 诗意泥纸页背景（左下/右下角意象）、每二级标题独占页、4–6 页分篇、排版缩减话术与导出发图。
  当用户说「风水skill」、风水、风水风格、风水质感、阳宅，或要求诗意泥纸页背景出风水图时必须使用本 skill。
---

# 风水 Skill（阳宅图文 + 诗意页背景）

严格按下列流程执行。任何一步未获用户明确「继续 / 确认」前，不得跳步（用户明确说「按此内容直接出一版 / 临时 HTML」时可合并确认步）。

风水主题**不要**走图文 skill（`tuwen`）；图文 skill 只做非风水多页 + 封面。

## 0. 前置：确认 Era 服务可用

1. 仓库根目录：`bash scripts/ensure-era-ready.sh`（可带 `--agent-port` / `--dev-port`）
2. `curl -s http://127.0.0.1:${ERA_AGENT_PORT:-3847}/health` → `ok: true` 且 `connected: true`
3. 优先 MCP `era_*`；否则 REST `http://127.0.0.1:${ERA_AGENT_PORT:-3847}/v1/...`

画幅固定抖音 **`9:16`**，不要询问平台。仅用户明确要求小红书时才改 `3:4`。

## 1. 固定配置（建工程必须写入）

```json
{
  "pageOverlay": "fengshui",
  "aspectRatio": "9:16",
  "showWordCount": false,
  "topText": "连续观看、点赞、关注，你也是地理风水达人（阳宅篇）",
  "headingFontId": "song",
  "headingFontFamily": "\"Noto Serif SC\", serif",
  "headingFontSize": 22,
  "titleLineHeight": 1.1
}
```

- **不要**写 `shuheiti`；二级标题宋体，字号 **22**（相对默认 20 大两号）。
- 标题随内容图一起出，**不另做封面 skill**。
- 有诗意 reference 底图时：`overlayStacked: true`、`backgroundType: "reference"`、`backgroundUrl`；有 reference 时**不叠**风水村舍纹理（只保留风水顶栏气质）。

---

## 2. 排版与内容话术（硬性）

### A. 分页标记对用户不可见

- 工程 Markdown 内可用 `<!-- era:page-break -->` 强制每个 `##` 独占页起（引擎不渲染该行）。
- **发给用户的确认正文 / 可见文案禁止出现该标记**：展示或交付前全文搜索 `era:page-break`，有则删除。
- 用户侧零命中后才能发确认稿或预览。

### B. 版心位置一致

- 第一页：`#` 一级标题 + 导语（单独版式）。
- 自第二页起结构统一：页顶安全区 → **`##` 二级标题** → 其下段落/列表；各页标题距顶、正文起始位置一致。
- 每个 `##` 前强制分页；禁止页首塞无关装饰；勿给标题加不对称额外 margin。

### C. 一级标题与导语

- `#` 最多 **3 行**；换行时完整词尽量同行（如「全方位」不拆开）；仅无法压进 3 行时才放开词内拆分。
- 一级标题下导语 **30–60 字**；超长只压表达、保留语义（见 G）。

### D. 二级标题字号

- 必须 `headingFontSize: 22`。

### E. 版面容量（除第一页）

- 第 2 页起：标题以下正文视觉占位 ≤ 版面约 **2/3**；`preview-layout` 或目测超出则缩减该页后再导。

### F. 页数 4–6；超出分篇

- 单篇目标 **4–6 页**（含第一页）。
- 总页数 &lt; 4：合并过碎小节或补必要小节，仍守版心规则。
- 总页数 &gt; 6：**分篇**（上篇 / 中篇 / 下篇…），成稿标题与社媒标题加后缀，如「……（上篇）」；每篇各自 4–6 页，分别出图交付。

### G. 缩减原则

- **不得**删改或缩略核心概念、专名、神名、流派名、方位名（如「赵公明」「文财神」「灶口向吉」）。
- 只压缩套话、重复解释、过长定语与列举；缩减后须符合原语义。
- 仍须满足：导语 30–60 字、内容页 ≤ 2/3、分篇页数规则。

---

## 3. 主流程

1. **收集选题**：无标题/大纲则先问，拿到前不写正文。
2. **按 §2 写 Markdown**（含 `#`、适量 `##`，每 `##` 前 `<!-- era:page-break -->`）→ **展示给用户前去掉 page-break** → 询问是否继续；改完再展示。
3. 确认后 `era_create_project` / `era_set_markdown`（写入 §1 固定 config；工程内保留 page-break）。
4. **社媒标题**：给 5 个候选；分篇时标题带（上篇）等；选定后 `era_set_title`。精细排版可发 `http://39.106.179.17/?tab=title&text=<标题>`（禁止裸 `?tab=title`）。
5. **高亮**：见 §高亮（一级标题默认至少一处画圈，或 `titlePrimaryColor` / 文字色）。
6. **校验**：`era_preview_layout`；修告警；核对 §2 与 §输出前检查。
7. **诗意页背景**：见 §诗意页背景 → 按页导出。
8. **交付**：见 §发图。

---

## 4. 诗意页背景（无文字泥纸）

每页一张背景；风格继承 [poetic-ink-quote-poster](https://github.com/Yuuhann1999/poetic-ink-quote-poster)。

### 视觉骨架（背景图模式）

- 竖版 9:16 泥纸；约 70%–85% 留白；**零文字**（无汉字/字母/数字/印章/水印/伪字）。
- 意象群仅在 **左下或右下**二选一（可随机，单张固定一角），约占 15%–28%；上半与中部留白叠字。
- Prompt 须写明 `bottom-left` 或 `bottom-right`。
- 2–4 层：主形 + 1–2 辅形 + 可选过程/气韵层；抽象克制，不画完整人物/山水/户型/可读罗盘。
- 宅居主题优先：灶火、烟缕、水线、方位开口、压煞墨石等抽象关系。
- 色：单色泥纸底 + 墨色 + 至多一种淡矿物辅助色。

### 生成与挂载

1. 按页提炼一个核心隐喻 → 内置 image generation 出图（可参考上游 examples）。
2. 可压缩为 1080×1920 JPEG 以减小 dataURL。
3. 使用：

```bash
node scripts/export-pages-with-bgs.mjs \
  --project <projectId> \
  --bg-dir <背景目录> \
  --plan <可选 plan.json> \
  --out <导出目录>
```

或等价：逐页 PATCH `overlayStacked` + `backgroundType: reference` + `backgroundUrl`（dataURL）后 `export` 单页。

4. 检查：零文字、角位正确、留白足够、风格克制；失败只针对性重生一次。

---

## 5. 高亮

- 优先发高亮设置页：`era_create_highlight_setup_share` → `http://39.106.179.17/?tab=highlight&shareId=…`（禁止对整段 query 二次 `encodeURIComponent`）。
- 用户回传后 `era_apply_highlights`（`replace: true`）。
- 色种类 ≤ 3；色板无灰；笔刷与下划线同色；二级标题不要高亮。
- **一级标题**：默认至少一处画圈；用户禁止画圈时用 `titlePrimaryColor` 或文字色。
- 一页计入密度的高亮 ≤ 3 处（li 子标题整组除外）。

---

## 6. 校验与导出

1. 确认 config 含 §1 固定项且 `headingFontSize: 22`
2. `era_preview_layout`
3. 修告警：单行溢出、孤行、独行标点、画圈跨行、高亮超限、行高过松、字号过小、标题缺画圈等
4. 目测第 2 页起是否超约 2/3 版面；页数是否 4–6 或已分篇
5. 诗意背景挂载后导出各页 PNG

---

## 7. 发图（交付）

遵守 `.cursor/rules/image-preview-delivery.mdc`：

1. **禁止**对话框直发 OSS 图片链接
2. **社媒帖子**：上传后写入 `image_previews`（[0]=封面/首页 `__cover_keep__`），只发 `http://39.106.179.17/?tab=data`
3. **临时确认 / 不入库**：`node scripts/make-oss-preview-html.mjs --title … --image …`，只发 HTML URL，并询问用完是否删除

```bash
bash scripts/oss-upload.sh --cover <page.png>
node scripts/make-oss-preview-html.mjs --title "风水图文预览" --image page-01.png --image page-02.png
```

---

## 8. 输出前检查清单

1. 用户可见文本不含 `<!-- era:page-break -->` / `era:page-break`
2. 一级标题 ≤ 3 行；导语 30–60 字；词语尽量不拆行
3. `headingFontSize === 22`；内容页「`##` + 正文」距顶一致
4. 第 2 页起内容未超约 2/3 版面
5. 本篇页数 4–6；否则已分篇并改好标题后缀
6. 诗意背景每页齐全；角位仅左下或右下；画面无文字
7. 未直发 OSS 图链

---

## 工具速查

| 动作 | 工具 |
| --- | --- |
| 就绪 | `bash scripts/ensure-era-ready.sh` |
| 建工程 / 正文 / 标题 / 配置 | `era_create_project` / `era_set_markdown` / `era_set_title` / `era_update_config` |
| 高亮 | `era_apply_highlights`、`era_create_highlight_setup_share` |
| 校验 / 导出 | `era_preview_layout`、`era_export_images` |
| 按页背景导出 | `node scripts/export-pages-with-bgs.mjs` |
| HTML 预览 | `node scripts/make-oss-preview-html.mjs` |
| OSS | `bash scripts/oss-upload.sh --cover …` |
