# Agent 说明

## Git / PR（强制）

完成功能改动并创建 PR 后，**直接合入 `main`**，不要询问用户是否合并。合入推送后须等待 EdgeOne Actions 部署成功，并把**完整预览 URL**（含 `eo_token` / `eo_time`）直接发给用户。仅当用户明确要求先别合并 / 保持 draft 审阅时例外。约定见 `.cursor/rules/auto-merge-pr.mdc`。

## 图文skill（多页长图）

本仓库图文出图流程由 skill **图文skill**（目录 `tuwen`）定义：

- `.agents/skills/tuwen/SKILL.md`
- `.cursor/skills/tuwen`（指向上述目录的符号链接）

云端 Agent 与本机 Agent 在执行「图文skill / 用标题生成图文 / 小红书·抖音出图」类任务时，必须遵循该 skill 的逐步确认流程，并先通过 `scripts/ensure-era-ready.sh` 确认服务就绪。

非风水默认：二级标题（`##`）用阿里妈妈数黑体（`headingFontId`: `shuheiti`）；高亮色板不含灰色；**默认直接导出抖音 9:16**，无需询问平台（用户明确要求小红书时再用 3:4）。

高亮步骤：先用 `era_create_highlight_setup_share` 上传正文到 Supabase，再把返回的 **EdgeOne** URL（`?tab=highlight&shareId=...`）发给用户；打开后自动进入「高亮」Tab；用户复制配置发回后 `era_apply_highlights(replace: true)`。

出图步骤：导出并经用户确认拼图后，在对话框逐张发送 OSS **12 小时签名 URL**。不要再发 Gallery / `/gallery/` 链接。

**发图硬性规则**：凡交付图片（拼图总览、封面、各内容页），都必须上传阿里云 OSS，并在**对话框直接发送 12 小时签名 URL**。禁止用 HTML 嵌入图片链接代替对话框发图。

## 封面skill（单张 9:16 封面）

社媒封面由 skill **封面skill**（目录 `fengmian`）定义：

- `.agents/skills/fengmian/SKILL.md`
- `.cursor/skills/fengmian`（指向上述目录的符号链接）

用户说「封面skill / 生成封面 / 社媒封面」或传入大标题、小标题、描述、标签、二级标题、主题色并要求出封面时：读取该 skill，运行 `node scripts/generate-cover.mjs` 生成 `1080×1920` PNG；上传 OSS 后在**对话框直接发送 12 小时签名 URL**。主题色未指定则随机。不要与图文skill 的多页导出流程混淆。

## 云托管（强制）

- **图片**：阿里云 OSS 私有读（`scripts/oss-upload.sh`），交付 **12 小时签名 URL**（对话框直发）。全局规则：`.cursor/rules/oss-image-delivery.mdc`。
- **过期清理**：每次存图前自动删除 `era/assets/` 下超过 **14 小时**的旧对象（`scripts/oss-cleanup-expired.sh`），避免签名过期后仍占存储计费。
- **前端**：腾讯云 EdgeOne Makers（`npm run deploy:edgeone`；`main` 推送由 Actions 部署），交付 EdgeOne 链接。
- 说明：`docs/cloud-hosting.md`、skill `references/cloud-hosting.md`。

## 前端 Tab（URL 可深链）

三个顶栏 Tab，用 `?tab=` 打开并自动切换：

| Tab | URL |
| --- | --- |
| 图文 | `?tab=graphic` |
| 社媒 | `?tab=data` |
| 高亮 | `?tab=highlight&shareId=<id>` |
