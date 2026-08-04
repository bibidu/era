# Agent 说明

## Git / PR（强制）

完成功能改动并创建 PR 后，**直接合入 `main`**，不要询问用户是否合并。合入后执行 `npm run deploy:swas`（SSH 到服务器 `git pull` + 构建，见 skill **swas-deploy**），并把**固定站点 URL**发给用户：`http://39.106.179.17/`（可带 `?tab=`）。仅当用户明确要求先别合并 / 保持 draft 审阅时例外。约定见 `.cursor/rules/auto-merge-pr.mdc`。

## 图文 skill（多页长图 + 内联封面）

非风水社媒图文由 skill **图文skill**（目录 `tuwen`）定义：

- `.agents/skills/tuwen/SKILL.md`
- `.cursor/skills/tuwen`（符号链接）

执行「图文skill / 小红书·抖音出图 / 生成封面 / 封面skill」时遵循该 skill；先 `scripts/ensure-era-ready.sh`（仅封面单张时可只跑 `generate-cover.mjs`）。

默认：二级标题数黑体（`headingFontId`: `shuheiti`）；高亮色板不含灰色；**默认导出抖音 9:16**。封面步骤已内联（`scripts/generate-cover.mjs`），不再使用独立 fengmian 目录。

高亮：`era_create_highlight_setup_share` → `highlightSetupPagesUrl(shareId)`；禁止对整段 query 再 `encodeURIComponent`。

出图：上传并写入 `image_previews`（[0]=封面永久链）；对话框只发 `http://39.106.179.17/`（可带 `?tab=data`）。

**风水 / 阳宅主题改走「风水 skill」，不要用本 skill。**

## 风水 skill（阳宅图文 + 诗意页背景）

- `.agents/skills/fengshui/SKILL.md`
- `.cursor/skills/fengshui`（符号链接）

固定 `pageOverlay: fengshui`、抖音 9:16、固定顶栏文案、`headingFontSize: 22`；每 `##` 独占页；诗意泥纸背景（意象左下/右下随机）；单篇 4–6 页，超出分篇（**多篇文案一次齐发**确认连贯后再出图入库）；**同篇全部诗意背景图同色调**；改写方向为活学活用（知识点为骨、教导为皮肉）；用户可见文案不得含 `<!-- era:page-break -->`。按页背景导出：`scripts/export-pages-with-bgs.mjs`。

## 发图硬性规则（全局）

对话框**绝对禁止**直接发送 OSS 图片链接。见 `.cursor/rules/image-preview-delivery.mdc`。

- **图文 / 风水 / 社媒帖子（默认）**：写入 `image_previews` + 只发自建站 `http://39.106.179.17/`（建议 `?tab=data`），确认阶段也走入库
- **OSS 临时 HTML**：仅用户**强烈要求**时用 `make-oss-preview-html.mjs`；只发 HTML URL；用完后询问是否删除

## 云托管（强制）

- **图片存储**：阿里云 OSS（`scripts/oss-upload.sh`）。预览规则见 `image-preview-delivery.mdc` / `oss-image-delivery.mdc`。
- **封面永久**：key 含 `__cover_keep__`（或 `--cover`）；清理跳过；公共读。写入社媒 `cover_url` / 预览首图必须用此 URL。
- **预览 HTML**：`--public`；`scripts/make-oss-preview-html.mjs`。
- **过期清理**：存图前清理 `era/assets/` 下超过 **14 小时**旧对象；跳过 `__cover_keep__`。
- **Cloud Agent 上传**：美西→北京约 2–3 分钟/3MB；见 skill **oss-upload**。
- **前端 + 业务 REST**：`39.106.179.17`；发布 `npm run deploy:swas`（skill **swas-deploy**）。
- **Edge Functions** 仍在旧 Supabase。
- 说明：`docs/cloud-hosting.md`、skill `references/cloud-hosting.md`。

## 标题排版设置页

精细控制标题时主动发 `http://39.106.179.17/?tab=title&text=当前帖子标题`。**禁止**只发裸 `?tab=title`。可用 `titleComposerPagesUrl(标题)`。复制配置后用 `generate-title-composer.mjs` 出图，按 image-preview-delivery 交付。见 `.cursor/rules/title-composer.mdc`。

## 前端 Tab（URL 可深链）

无参数时**默认社媒**：

| Tab | URL |
| --- | --- |
| 图文 | `?tab=graphic` |
| 社媒 | `?tab=data` |
| 高亮 | `?tab=highlight&shareId=<id>` |
| 标题 | `?tab=title&text=<当前帖子标题>` |
| 拼图 | `?tab=stitch` |
