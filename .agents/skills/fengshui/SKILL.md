---
name: fengshui
description: >-
  【风水skill】阳宅/风水主题社媒图文：Era 风水模板 + gc-minimal-zine-poster 底图、活学活用改写、4–6 页分篇（标题带（上篇）、多篇齐发、篇末预告下篇）、同篇共用一张封面底图、入库发图。
  当用户说「风水skill」、风水、风水风格、风水质感、阳宅，或要求出风水图时必须使用本 skill。
---

# 风水 Skill（阳宅图文 + gc-minimal 底图）

严格按下列流程执行。任何一步未获用户明确「继续 / 确认」前，不得跳步（用户明确说「按此内容直接出一版」时可合并确认步；**不得**擅自改走 OSS 临时 HTML，除非用户强烈要求）。

风水主题**不要**走图文 skill（`tuwen`）；图文 skill 只做非风水多页 + 封面。

## 改写方向（硬性）

目标：帮助更多人**活学活用**，不是照本宣科普及名词。

- **骨（必须保住）**：核心知识点、专名、方位、口诀、禁忌、流派依据（如「灶坐凶、灶口向吉」「火烧天门」）不得删改或稀释成空话。
- **皮肉（必须写出来）**：用亲和、像在当面教人的口吻——先点出「你回家怎么看、怎么做」，再落到为什么；少「教科书定义」，多「对照自家房屋的判断句」。
- 每段尽量带一句可操作提示或常见误区纠正；避免只堆古籍书名与术语解释。
- 缩减时先砍套话与重复，**不砍**可落地的判断标准与例外。

## 0. 前置：确认 Era 服务可用

1. 仓库根目录：`bash scripts/ensure-era-ready.sh`（可带 `--agent-port` / `--dev-port`）
2. `curl -s http://127.0.0.1:${ERA_AGENT_PORT:-3847}/health` → `ok: true` 且 `connected: true`
3. 优先 MCP `era_*`；否则 REST `http://127.0.0.1:${ERA_AGENT_PORT:-3847}/v1/...`

画幅固定抖音 **`9:16`**，不要询问平台。仅用户明确要求小红书时才改 `3:4`。

## 1. 固定配置（建工程必须写入）

**硬性 · 标题宋体（不可改）**：一级标题必须宋体。建工程 / PATCH config / 导出前都要写死下面三项，禁止 `heiti` / `shuheiti` / `pingfang` / `yahei` / 系统默认无衬线。导出后目测封面大字须有衬线（横细竖粗）；看起来像黑体就重导，不要入库。`titleFontFamily` 只写 `"Noto Serif SC"`，**不要**再加 `, serif`：出图会丢掉宋体、中文掉成系统黑体。

```json
{
  "pageOverlay": "fengshui",
  "aspectRatio": "9:16",
  "showWordCount": false,
  "topText": "连续观看、点赞、关注，你也是地理风水达人（阳宅篇）",
  "titleFontId": "song",
  "titleFontFamily": "\"Noto Serif SC\"",
  "headingFontId": "song",
  "headingFontFamily": "\"Noto Serif SC\"",
  "bodyFontId": "song",
  "bodyFontFamily": "\"Noto Serif SC\"",
  "headingFontSize": 22,
  "titleLineHeight": 1.1,
  "titleSecondaryFontSize": 56,
  "titlePrimaryColor": "#C41E3A"
}
```

- **不要**写 `shuheiti`；一级 / 二级 / 正文全部宋体（`titleFontId` / `headingFontId` / `bodyFontId` 均为 `song`）；二级字号 **22**（相对默认 20 大两号）。
- **一级标题全文朱红**：必须写 `titlePrimaryColor: "#C41E3A"`；多行标题（含 `（上篇）` 等）每一行都用该色，禁止只给首行着色或黑字标题。
- **次行字号**：`titleSecondaryFontSize` 必须与 `titleFontSize` 同为 **56**（默认 40 会让第二行变小；风水封面两行要同等权重）。
- 标题、导语、顶栏「阳宅篇」一律走 Era 叠字，**不要**画进底图。一级 / 二级 / 正文必须宋体（`titleFontId` / `headingFontId` / `bodyFontId` 均为 `song`），禁止数黑体。
- 有 zine reference 底图时：`overlayStacked: true`、`backgroundType: "reference"`、`backgroundUrl`；有 reference 时**不叠**风水村舍纹理（只保留风水顶栏气质）。

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
- **多行一级标题必须写在同一个 `#` 里，用 U+2028（行分隔符）分行**，禁止写成连续两个（或更多）`#` 标题块：

  ```
  # 床摆错了\u2028越睡越虚
  ```

  写入工程时中间必须是字面 U+2028（可用 JS/`"\u2028"` 生成），**整段仍是同一个 `#` 标题块**；不要拆成两个普通换行行，也不要写成两个 `#`。引擎对单个标题块内的 U+2028 / `\n` 按句段分行，行距只走 `titleLineHeight`（约 1.1）；若写成 `# 床摆错了` + `# 越睡越虚` 两个块，会各自吃一遍 `titleMarginTop` / `titleMarginBottom`，两行之间空出约一整行字高——封面会显得「空太多」。历史踩坑：`床摆错了 / 越睡越虚`、`家里六大煞 / 一件物就化`。正确样例见库内「三大文昌位」那篇（单 `#` + 多个 U+2028）。
- 一级标题下导语 **30–60 字**；超长只压表达、保留语义（见 G）。首页导语宜压到**约 1 行**（两行大标题几乎占满首页高度，导语过长会溢出到第 2 页产生孤行）。
- **分篇篇名必须写在标题上**，用全角括号包裹，如 `家里厨房怎么放才聚财（上篇）`；社媒标题、入库 `title` 同步带 `（上篇）` / `（中篇）` / `（下篇）`。禁止只把「上篇」写在导语或二级标题里、标题本体却不带。全自动（风大师）模式下**不要调 `era_set_title`**：它只替换第一个 `#` 块，和多行标题冲突；`title` 由入库脚本写。半自动可选 `era_set_title`，但传入的字符串若需分行须含 U+2028，且工程正文的 `#` 要同步成同一串。

### D. 二级标题字号

- 必须 `headingFontSize: 22`。

### E. 版面容量（除第一页）

- 第 2 页起：标题以下正文视觉占位 ≤ 版面约 **2/3**；`preview-layout` 或目测超出则缩减该页后再导。

### F. 页数 4–6；超出分篇（文案多篇齐发）

- 单篇目标 **4–6 页**（含第一页）。
- 总页数 &lt; 4：合并过碎小节或补必要小节，仍守版心规则。
- 总页数 &gt; 6：**分篇**（上篇 / 中篇 / 下篇…）；每篇各自 4–6 页，分别出图交付。
- **标题**：见 §2 C，篇名挂在 `#` 与社媒标题末尾，格式固定为 `……（上篇）`（全角括号）。
- **篇末预告（硬性）**：凡后面还有续篇的，必须在**本篇最后一页正文结尾**用 **单独一段**预告下一篇将讲的内容或下一篇标题（例：「下篇接着讲火烧天门等例外，以及四条实操心法。」）。末篇可不预告，改为收束句即可。预告要具体，避免空泛「敬请期待」。
- **预告高亮（硬性）**：若存在下一篇预告段，该段全文固定用**黄色刷子**高亮：`style: brush`，颜色 `#FACC15`（明黄）。出图前 `era_apply_highlights` 写入；勿改成下划线/画圈/其它颜色。

**分篇时的对话节奏（硬性）**：

1. 文案阶段：把**上 / 中 / 下各篇正文一次全部发出**（均去掉 page-break），方便用户检查分篇是否连贯、衔接与篇末预告是否对得上。禁止只丢上篇、藏着中下篇。
2. 用户确认整套文案（或改完再齐发一版）之前：禁止任一篇出图、上传 OSS、写入 `image_previews`、发预览链接。
3. 整套确认后：再按篇依次（或用户要求时同批）仅预告黄刷（若有）→ gc-minimal 底图 → 导出 → **入库** → 发自建站链接。
4. 各篇可各自抽一套纸色（见 §2 H），但**单篇内各页必须共用该篇封面底图**。

### G. 缩减原则

- **不得**删改或缩略核心概念、专名、神名、流派名、方位名（如「赵公明」「文财神」「灶口向吉」）。
- 只压缩套话、重复解释、过长定语与列举；缩减后须符合原语义，并保留「怎么判断 / 怎么做」。
- 仍须满足：导语 30–60 字、内容页 ≤ 2/3、分篇页数规则、§改写方向。

### H. 同篇共用一张底图（硬性）

约束对象是 **gc-minimal-zine-poster 出的底图**，不是高亮色 / 标题色。

对某一篇帖子（例如共 5–6 页），**全部页共用封面那一张底图**，不要每页换意象。纸色、墨色、角位物件保持同一张。禁止「封面镜子、第 2 页床、第 3 页门」这类换图。

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
2. 生成每张背景的 prompt 必须带上该统一纸色 + 统一辅色；各页直接复用封面底图文件，不要按页重生不同意象。
3. 导出前目测：各页底必须是同一张；不是就重新挂封面底。
4. 预告黄刷色与底图纸色**不必**绑定。

---

## 3. 主流程

1. **收集选题**：无标题/大纲则先问，拿到前不写正文。
2. **按 §改写方向 + §2 写 Markdown**（含 `#`、适量 `##`，每 `##` 前 `<!-- era:page-break -->`）→ **展示给用户前去掉 page-break** → 询问是否继续；改完再展示。
3. 若需分篇：按 **§2 F** 把各篇文案**一次齐发**请用户看连贯，确认后再出图入库。
4. 确认后 `era_create_project` / `era_set_markdown`（写入 §1 固定 config；工程内保留 page-break）。
5. **社媒标题**：给 5 个候选；分篇时每个候选都必须在标题末带 `（上篇）` 等（见 §2 C）；选定后 `era_set_title`（含括号篇名）。精细排版可发 `https://39.106.179.17.sslip.io/?tab=title&text=<标题>`（禁止裸 `?tab=title`）。
6. **高亮**：见 §高亮——**不发高亮设置页**；除下一篇预告黄色刷子外不加其它高亮。
7. **校验**：`era_preview_layout`；修告警；核对 §2 与 §输出前检查。
8. **底图**：见 §4 → 用 gc-minimal-zine-poster 只出一张没字的封面底，各页复用，再 Era 叠字导出。
9. **交付**：见 §发图（默认入库）。

---

## 4. 底图（gc-minimal-zine-poster，无文字）

页背景改走 [gc-minimal-zine-poster](https://github.com/LiamGvchi/gc-minimal-zine-poster)，**替代**旧的 poetic-ink-quote-poster / 诗意泥纸页流程。不要 AI 直出带字的整张封面。

### 分工（硬性）

- **技能只出底图**：零文字（无汉字/字母/数字/印章/水印/伪字/「阳宅篇」）。标题、导语、正文、顶栏全部留给 Era 叠。
- **图本身不必水平竖直**：意象可以歪、旋转、撕纸翘角；「居中」只指整块图在画面偏下的位置，不是内容必须笔直居中。
- **同一篇各页共用封面那一张底**，不换意象。
- 竖版 9:16；约 70%–85% 留白给叠字；角位物件约占 15%–28%。

### 视觉骨架

- 暖象牙 / 米奶油等泥纸底 + 一处小意象（镜子、灶口、门缝等），朱红只作点缀。
- 抽象克制，不画完整人物/山水/户型/可读罗盘。
- 色调见 §2 H：全篇就是同一张图，自然同色。

### 生成与挂载

1. 按 gc-minimal-zine-poster 出 **一张** 没字的 9:16 底图（可略歪）。模型若出横图，补成竖版后再用。
2. 压缩为 1080×1920 JPEG。各页都用这一张。
3. 使用：

```bash
node scripts/export-pages-with-bgs.mjs \
  --project <projectId> \
  --bg-dir <背景目录> \
  --plan <可选 plan.json> \
  --out <导出目录>
```

或等价：逐页 PATCH `overlayStacked` + `backgroundType: reference` + `backgroundUrl`（dataURL）后 `export` 单页。

4. 检查：底图零文字、留白够叠字、意象可歪但未摆成工程制图；各页是同一张底。失败只重生这一张底，再复用到各页。

---

## 5. 高亮

- **默认不加用户高亮，也不发高亮设置页**（勿调用 `era_create_highlight_setup_share`，勿把 `?tab=highlight` 链接发给用户）。
- **唯一例外——下一篇预告段**：若本篇末有预告下篇的单独段落，出图前用 `era_apply_highlights`（`replace: true`）对该段全文写入黄色刷子：`style: brush`，颜色 `#FACC15`（明黄）。勿改成下划线/画圈/其它颜色。
- 无下一篇预告（末篇）时：不写任何高亮。
- 一级标题不强制画圈；二级标题不要高亮。
- 高亮色与底图纸色**无强制绑定**。

---

## 6. 校验与导出

1. 确认 config 含 §1 固定项且 `headingFontSize: 22`、`titlePrimaryColor: "#C41E3A"`
2. `era_preview_layout`
3. 修告警：单行溢出、孤行、独行标点、行高过松、字号过小等（无用户高亮时忽略画圈/高亮密度类告警）
4. 目测第 2 页起是否超约 2/3 版面；页数是否 4–6 或已分篇并完成上篇确认
5. 底图：封面底已挂到各页；`titleFontId===song` 且目测封面大字是宋体衬线；导出各页 PNG

---

## 7. 发图（交付）

遵守 `.cursor/rules/image-preview-delivery.mdc`：

1. **禁止**对话框直发任意图片 OSS URL（含签名、永久封面链）
2. **默认（社媒）**：各页 `bash scripts/oss-upload.sh --cover` 上传后，**按序写入** `era_social_video_analyses.image_previews`（[0]=首页/封面 `__cover_keep__`，同步 `cover_url`），`work_type: 风水`；对话框**只发 HTTPS** `https://39.106.179.17.sslip.io/?tab=data`
3. **禁止**把 HTTP 裸 IP `http://39.106.179.17/` 当默认预览链发给用户——Safari「保存到相册」仅 HTTPS 可用（见 `image-preview-delivery.mdc`）
4. **OSS 临时 HTML**：仅当用户**强烈要求**「不要入库 / 只要临时 HTML」时才用 `make-oss-preview-html.mjs`；只发 HTML URL，并询问用完是否删除
5. 禁止用 HTML 预览代替默认入库交付

```bash
bash scripts/oss-upload.sh --cover <page.png>
# 写入业务库 image_previews 后：
# 只发 https://39.106.179.17.sslip.io/?tab=data
```

---

## 8. 输出前检查清单

1. 用户可见文本不含 `<!-- era:page-break -->` / `era:page-break`
2. 一级标题 ≤ 3 行且为**单个 `#`**（多行用 U+2028 分行，禁止连续多个 `#`）；`titleSecondaryFontSize===56`；导语 30–60 字（首页约 1 行）；词语尽量不拆行；一级标题全文朱红 `#C41E3A`（含多行）
3. `headingFontSize === 22`、`titlePrimaryColor === "#C41E3A"`；内容页「`##` + 正文」距顶一致
4. 第 2 页起内容未超约 2/3 版面
5. 本篇页数 4–6；若分篇：各篇文案已一次齐发并获确认后才预览/入库
6. 分篇时 `#` / 社媒标题已带 `（上篇）` 等；非末篇篇末已预告下一篇，且预告段为黄色刷子 `#FACC15`
7. 各页共用封面同一张 zine 底图；文案符合活学活用改写方向
8. 底图零文字；标题/顶栏走 Era；一级标题必须宋体朱红（`titleFontId===song`，禁止黑体/数黑体）
9. 已入库并只发自建站链接（或用户强烈要求时才发 HTML）；未直发 OSS 图链

---

## 工具速查

| 动作 | 工具 |
| --- | --- |
| 就绪 | `bash scripts/ensure-era-ready.sh` |
| 建工程 / 正文 / 标题 / 配置 | `era_create_project` / `era_set_markdown` / `era_set_title` / `era_update_config` |
| 高亮（仅预告黄刷） | `era_apply_highlights`（勿发高亮设置页） |
| 校验 / 导出 | `era_preview_layout`、`era_export_images` |
| 底图 | gc-minimal-zine-poster（只出没字的图） |
| 按页背景导出 | `node scripts/export-pages-with-bgs.mjs` |
| OSS（入库用） | `bash scripts/oss-upload.sh --cover …` |
| HTML 预览（仅强烈要求） | `node scripts/make-oss-preview-html.mjs` |
