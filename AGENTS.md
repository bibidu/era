# Agent 说明

## Git / PR（强制）

完成功能改动并创建 PR 后，**直接合入 `main`**，不要询问用户是否合并。合入推送后须等待 EdgeOne Actions 部署成功，并把**完整预览 URL**（含 `eo_token` / `eo_time`）直接发给用户。仅当用户明确要求先别合并 / 保持 draft 审阅时例外。约定见 `.cursor/rules/auto-merge-pr.mdc`。

## 图文skill（多页长图）

本仓库图文出图流程由 skill **图文skill**（目录 `tuwen`）定义：

- `.agents/skills/tuwen/SKILL.md`
- `.cursor/skills/tuwen`（指向上述目录的符号链接）

云端 Agent 与本机 Agent 在执行「图文skill / 用标题生成图文 / 小红书·抖音出图」类任务时，必须遵循该 skill 的逐步确认流程，并先通过 `scripts/ensure-era-ready.sh` 确认服务就绪。

非风水默认：二级标题（`##`）用阿里妈妈数黑体（`headingFontId`: `shuheiti`）；高亮色板不含灰色；**默认直接导出抖音 9:16**，无需询问平台（用户明确要求小红书时再用 3:4）。

高亮步骤：先用 `era_create_highlight_setup_share` 上传正文到 Supabase，再用最新 EdgeOne 部署链（含 `eo_token` / `eo_time`）调用 `highlightSetupPagesUrl(shareId, edgeonePreviewUrl)` 合并后发给用户；**禁止**对整段 query 再 `encodeURIComponent`（会触发 EdgeOne Error -100）。打开后自动进入「高亮」Tab；用户复制配置发回后 `era_apply_highlights(replace: true)`。

出图步骤：导出后图片须上传（OSS / 约定存储）并**按序写入**业务库（如 Supabase `era_social_video_analyses.image_previews`，[0]=封面永久链）；**对话框里只发线上预览链接**（EdgeOne 完整 URL，含 `eo_token` / `eo_time`），**不要**再逐张发送各页图片、也不要为确认来回贴图。不要再发 Gallery / `/gallery/` 链接。

**发图硬性规则**：交付物须上传存储；社媒任务以写入 `image_previews` + **线上预览链接**为准，禁止在对话框堆各页独立图 URL，禁止用 HTML 嵌入代替。封面 skill 单张封面仍可直发一张签名 URL（用户明确要求逐张发图时除外）。

## 封面skill（单张 9:16 封面）

社媒封面由 skill **封面skill**（目录 `fengmian`）定义：

- `.agents/skills/fengmian/SKILL.md`
- `.cursor/skills/fengmian`（指向上述目录的符号链接）

用户说「封面skill / 生成封面 / 社媒封面」或传入大标题、小标题、描述、标签、二级标题、主题色并要求出封面时：读取该 skill，运行 `node scripts/generate-cover.mjs` 生成 `1080×1920` PNG；上传 OSS（封面自动带 `__cover_keep__` 标记、公共读、**查看无过期**）后在**对话框直接发送返回的 URL**。主题色未指定则随机。不要与图文skill 的多页导出流程混淆。

## 云托管（强制）

- **图片**：阿里云 OSS 私有读（`scripts/oss-upload.sh`），普通图交付 **12 小时签名 URL**（对话框直发）。全局规则：`.cursor/rules/oss-image-delivery.mdc`。
- **封面永久**：对象 key 含 `__cover_keep__`（`cover.png` 等会自动加标，或 `--cover`）；清理脚本跳过；公共读、查看无过期。写入社媒 `cover_url` / 预览首图必须用此 URL。
- **过期清理**：每次存图前自动删除 `era/assets/` 下超过 **14 小时**的旧对象（`scripts/oss-cleanup-expired.sh`），避免签名过期后仍占存储计费；跳过 `__cover_keep__` 封面。
- **Cloud Agent 上传**：Agent 常在美西、Bucket 在北京，约 3MB 需 2–3 分钟；`oss-upload.sh` 已加长读超时并在 `i/o timeout` 后 `stat` 兜底。排障见 skill **oss-upload**（`.agents/skills/oss-upload/SKILL.md`）。
- **前端**：腾讯云 EdgeOne Makers（`npm run deploy:edgeone`；`main` 推送由 Actions 部署），交付 EdgeOne 链接。
- 说明：`docs/cloud-hosting.md`、skill `references/cloud-hosting.md`。

## 标题排版设置页

用户需要精细控制标题换行 / 拉伸 / 字号 / 间距 / 字体 / 行内色时，**主动提供标题设置页**（顶栏「标题」或 `?tab=title&text=…`），发完整 EdgeOne URL（含 `eo_token` / `eo_time`、`tab=title` 与 **`text=当前帖子标题`**）。**禁止**只发裸 `?tab=title`（会显示固定 demo「西北绝不能…」）。可用 `titleComposerPagesUrl(标题)` 拼链接。

用户复制配置发回后，用 `node scripts/generate-title-composer.mjs --full --input <json>` 出完整 9:16 图，上传 OSS 后直发签名 URL。约定见 `.cursor/rules/title-composer.mdc`。

## 前端 Tab（URL 可深链）

顶栏 Tab，用 `?tab=` 打开并自动切换（无参数时**默认社媒**）：

| Tab | URL |
| --- | --- |
| 图文 | `?tab=graphic` |
| 社媒 | `?tab=data` |
| 高亮 | `?tab=highlight&shareId=<id>` |
| 标题 | `?tab=title&text=<当前帖子标题>` |
