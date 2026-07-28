# Agent 说明

## 图文skill（多页长图）

本仓库图文出图流程由 skill **图文skill**（目录 `tuwen`）定义：

- `.cursor/skills/tuwen/SKILL.md`
- `.agents/skills/tuwen/SKILL.md`（兼容副本）

云端 Agent 与本机 Agent 在执行「图文skill / 用标题生成图文 / 小红书·抖音出图」类任务时，必须遵循该 skill 的逐步确认流程，并先通过 `scripts/ensure-era-ready.sh` 确认服务就绪。

非风水默认：二级标题（`##`）用阿里妈妈数黑体（`headingFontId`: `shuheiti`）；高亮色板不含灰色。

高亮步骤：先用 `era_create_highlight_setup_share` 上传正文到 Supabase，再把返回的 GitHub Pages URL（`?highlightSetup=1&shareId=...`）发给用户；用户复制配置发回后 `era_apply_highlights(replace: true)`。

出图步骤：导出并经用户确认拼图后，必须用 `era_create_export_share` 上传 Supabase，并把 Gallery 预览链接（`/gallery/?tab=preview&shareId=...`）发给用户；支持 ZIP 整包下载。

## 封面skill（单张 9:16 封面）

社媒封面由 skill **封面skill**（目录 `fengmian`）定义：

- `.agents/skills/fengmian/SKILL.md`
- `.cursor/skills/fengmian`（指向上述目录的符号链接）

用户说「封面skill / 生成封面 / 社媒封面」或传入大标题、小标题、描述、标签、二级标题、主题色并要求出封面时：读取该 skill，运行 `node scripts/generate-cover.mjs` 生成 `1080×1920` PNG 并发送给用户。主题色未指定则随机。不要与图文skill 的多页导出流程混淆。
