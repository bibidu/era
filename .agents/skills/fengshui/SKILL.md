---
name: fengshui
description: >-
  【风水skill】阳宅/风水主题社媒图文：Era 风水模板 + 诗意泥纸页背景（左下/右下角意象）、每二级标题独占页、4–6 页分篇（分篇须先确认上篇）、同篇诗意背景同色调、排版缩减话术与入库发图。
  当用户说「风水skill」、风水、风水风格、风水质感、阳宅，或要求诗意泥纸页背景出风水图时必须使用本 skill。
---

# 风水 Skill（阳宅图文 + 诗意页背景）

严格按下列流程执行。任何一步未获用户明确「继续 / 确认」前，不得跳步（用户明确说「按此内容直接出一版」时可合并确认步；**不得**擅自改走 OSS 临时 HTML，除非用户强烈要求）。

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

### F. 页数 4–6；超出分篇（须逐步确认）

- 单篇目标 **4–6 页**（含第一页）。
- 总页数 &lt; 4：合并过碎小节或补必要小节，仍守版心规则。
- 总页数 &gt; 6：**分篇**（上篇 / 中篇 / 下篇…），成稿标题与社媒标题加后缀，如「……（上篇）」；每篇各自 4–6 页，分别出图交付。

**分篇时的对话节奏（硬性）**：

1. 先只整理并展示**上篇**正文（无 page-break）→ 在对话窗口请用户确认上篇文案 / 标题。
2. **上篇未获明确确认前**：禁止上篇出图、禁止上传 OSS、禁止写入 `image_previews`、禁止发预览链接；也禁止提前生成中/下篇预览或入库。
3. 上篇确认后：仅对上篇走高亮 → 诗意背景 → 导出 → **入库** → 发自建站链接。
4. 上篇入库交付后，再在对话中引导确认中篇 / 下篇，重复上述节奏。各篇诗意背景可各自随机一套色调（见 §2 H），但**单篇内全部背景图必须同色调**。

### G. 缩减原则

- **不得**删改或缩略核心概念、专名、神名、流派名、方位名（如「赵公明」「文财神」「灶口向吉」）。
- 只压缩套话、重复解释、过长定语与列举；缩减后须符合原语义。
- 仍须满足：导语 30–60 字、内容页 ≤ 2/3、分篇页数规则。

### H. 同篇诗意背景色调一致（硬性）

约束对象是**诗意 skill 生成的页背景图**，不是高亮色 / 标题色。

对某一篇帖子（例如「……（上篇）」共 5 页），用诗意流程生成的 **全部 N 张背景图必须同一色调**：同一泥纸底色描述、同一墨色冷暖、同一种淡矿物辅助色。禁止出现「第 1 页暖象牙、第 2 页青绿、第 3 页冷灰蓝」这类页间换色。

色调可在下列**现有纸色**中随机选一套（用户指定则用指定），整篇复用；分篇时上/中/下篇可各自重抽，但篇内不变：

| 名 | prompt 用纸色（英文写入生成 prompt） |
| --- | --- |
| 暖象牙 | `warm ivory mud paper` |
| 米奶油 | `cream mud paper` |
| 浅青瓷 | `pale celadon mud paper` |
| 雾蓝 | `mist blue mud paper` |
| 冷灰蓝 | `cool grey-blue mud paper` |
| 暖灰尘 | `dusty warm grey paper` |

落地要求：

1. 写 `bg-plan.json`（或等价）时：全篇所有页的 `paper` 字段填**同一字符串**；辅色描述也全文统一。
2. 生成每张背景的 prompt 必须带上该统一纸色 + 统一辅色；意象/角位可按页变化，**色调不可变**。
3. 导出前目测：若某页明显跳色，只重生该页并强制沿用本篇纸色。
4. 高亮色板仍按 §高亮独立选择，**不必**与诗意纸色绑定。

---

## 3. 主流程

1. **收集选题**：无标题/大纲则先问，拿到前不写正文。
2. **按 §2 写 Markdown**（含 `#`、适量 `##`，每 `##` 前 `<!-- era:page-break -->`）→ **展示给用户前去掉 page-break** → 询问是否继续；改完再展示。
3. 若需分篇：按 **§2 F** 先确认上篇，再出图入库；勿一次抛多篇预览。
4. 确认后 `era_create_project` / `era_set_markdown`（写入 §1 固定 config；工程内保留 page-break）。
5. **社媒标题**：给 5 个候选；分篇时标题带（上篇）等；选定后 `era_set_title`。精细排版可发 `http://39.106.179.17/?tab=title&text=<标题>`（禁止裸 `?tab=title`）。
6. **高亮**：见 §高亮（一级标题默认至少一处画圈，或 `titlePrimaryColor` / 文字色）。
7. **校验**：`era_preview_layout`；修告警；核对 §2 与 §输出前检查。
8. **诗意页背景**：见 §诗意页背景 → 先为本篇选定统一纸色（§2 H）再逐页生成 → 按页导出。
9. **交付**：见 §发图（默认入库）。

---

## 4. 诗意页背景（无文字泥纸）

每页一张背景；风格继承 [poetic-ink-quote-poster](https://github.com/Yuuhann1999/poetic-ink-quote-poster)。

### 视觉骨架（背景图模式）

- 竖版 9:16 泥纸；约 70%–85% 留白；**零文字**（无汉字/字母/数字/印章/水印/伪字）。
- 意象群仅在 **左下或右下**二选一（可随机，单张固定一角），约占 15%–28%；上半与中部留白叠字。
- Prompt 须写明 `bottom-left` 或 `bottom-right`。
- 2–4 层：主形 + 1–2 辅形 + 可选过程/气韵层；抽象克制，不画完整人物/山水/户型/可读罗盘。
- 宅居主题优先：灶火、烟缕、水线、方位开口、压煞墨石等抽象关系。
- **色调**：见 §2 H——本篇全部背景图同一泥纸底 + 墨色冷暖 + 淡矿物辅色；意象可换，色调不换。

### 生成与挂载

1. 先为本篇随机/指定一套纸色（§2 H），写入 plan，再按页提炼核心隐喻 → 内置 image generation 出图（可参考上游 examples）。
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

4. 检查：零文字、角位正确、留白足够、风格克制、**全篇背景同色调**；失败只针对性重生一次（仍用本篇纸色）。

---

## 5. 高亮

- 优先发高亮设置页：`era_create_highlight_setup_share` → `http://39.106.179.17/?tab=highlight&shareId=…`（禁止对整段 query 二次 `encodeURIComponent`）。
- 用户回传后 `era_apply_highlights`（`replace: true`）。
- 色种类 ≤ 3；色板无灰；笔刷与下划线同色；二级标题不要高亮。
- **一级标题**：默认至少一处画圈；用户禁止画圈时用 `titlePrimaryColor` 或文字色。
- 一页计入密度的高亮 ≤ 3 处（li 子标题整组除外）。
- 高亮色与诗意背景纸色**无强制绑定**。

---

## 6. 校验与导出

1. 确认 config 含 §1 固定项且 `headingFontSize: 22`
2. `era_preview_layout`
3. 修告警：单行溢出、孤行、独行标点、画圈跨行、高亮超限、行高过松、字号过小、标题缺画圈等
4. 目测第 2 页起是否超约 2/3 版面；页数是否 4–6 或已分篇并完成上篇确认
5. 诗意背景：本篇纸色已统一写入 plan；挂载后导出各页 PNG

---

## 7. 发图（交付）

遵守 `.cursor/rules/image-preview-delivery.mdc`：

1. **禁止**对话框直发任意图片 OSS URL（含签名、永久封面链）
2. **默认（社媒）**：各页 `bash scripts/oss-upload.sh --cover` 上传后，**按序写入** `era_social_video_analyses.image_previews`（[0]=首页/封面 `__cover_keep__`，同步 `cover_url`），`work_type: 风水`；对话框**只发** `http://39.106.179.17/?tab=data`
3. **OSS 临时 HTML**：仅当用户**强烈要求**「不要入库 / 只要临时 HTML」时才用 `make-oss-preview-html.mjs`；只发 HTML URL，并询问用完是否删除
4. 禁止用 HTML 预览代替默认入库交付

```bash
bash scripts/oss-upload.sh --cover <page.png>
# 写入业务库 image_previews 后：
# 只发 http://39.106.179.17/?tab=data
```

---

## 8. 输出前检查清单

1. 用户可见文本不含 `<!-- era:page-break -->` / `era:page-break`
2. 一级标题 ≤ 3 行；导语 30–60 字；词语尽量不拆行
3. `headingFontSize === 22`；内容页「`##` + 正文」距顶一致
4. 第 2 页起内容未超约 2/3 版面
5. 本篇页数 4–6；若分篇：上篇已在对话确认后才预览/入库
6. 本篇全部诗意背景图同色调（同一 `paper` / 辅色；非高亮色）
7. 诗意背景每页齐全；角位仅左下或右下；画面无文字
8. 已入库并只发自建站链接（或用户强烈要求时才发 HTML）；未直发 OSS 图链

---

## 工具速查

| 动作 | 工具 |
| --- | --- |
| 就绪 | `bash scripts/ensure-era-ready.sh` |
| 建工程 / 正文 / 标题 / 配置 | `era_create_project` / `era_set_markdown` / `era_set_title` / `era_update_config` |
| 高亮 | `era_apply_highlights`、`era_create_highlight_setup_share` |
| 校验 / 导出 | `era_preview_layout`、`era_export_images` |
| 按页背景导出 | `node scripts/export-pages-with-bgs.mjs` |
| OSS（入库用） | `bash scripts/oss-upload.sh --cover …` |
| HTML 预览（仅强烈要求） | `node scripts/make-oss-preview-html.mjs` |
