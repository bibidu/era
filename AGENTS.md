# Agent 说明

本仓库图文出图流程由 skill **图文skill**（目录 `tuwen`）定义：

- `.cursor/skills/tuwen/SKILL.md`
- `.agents/skills/tuwen/SKILL.md`（兼容副本）

云端 Agent 与本机 Agent 在执行「图文skill / 用标题生成图文 / 小红书·抖音出图」类任务时，必须遵循该 skill 的逐步确认流程，并先通过 `scripts/ensure-era-ready.sh` 确认服务就绪。

高亮步骤：先用 `era_create_highlight_setup_share` 上传正文到 Supabase，再把返回的 GitHub Pages URL（`?highlightSetup=1&shareId=...`）发给用户；用户复制配置发回后 `era_apply_highlights(replace: true)`。
