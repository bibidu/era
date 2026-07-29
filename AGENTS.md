# Agent 说明

## 图文skill（多页长图）

本仓库图文出图流程由 skill **图文skill**（目录 `tuwen`）定义：

- `.agents/skills/tuwen/SKILL.md`
- `.cursor/skills/tuwen`（指向上述目录的符号链接）

云端 Agent 与本机 Agent 在执行「图文skill / 用标题生成图文 / 小红书·抖音出图」类任务时，必须遵循该 skill 的逐步确认流程，并先通过 `scripts/ensure-era-ready.sh` 确认服务就绪。

非风水默认：二级标题（`##`）用阿里妈妈数黑体（`headingFontId`: `shuheiti`）；高亮色板不含灰色；**默认直接导出抖音 9:16**，无需询问平台（用户明确要求小红书时再用 3:4）。

高亮步骤：先用 `era_create_highlight_setup_share` 上传正文到 Supabase，再把返回的 **EdgeOne** URL（`?highlightSetup=1&shareId=...`）发给用户；用户复制配置发回后 `era_apply_highlights(replace: true)`。

出图步骤：导出并经用户确认拼图后，必须用 `era_create_export_share` 上传 Supabase，并把 Gallery 图文库链接（`/gallery/?shareId=...`）发给用户；支持 ZIP 整包下载。

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
