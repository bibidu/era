# Agent 说明

本仓库图文出图流程由 skill **`era`** 定义：

- `.cursor/skills/era/SKILL.md`
- `.agents/skills/era/SKILL.md`（兼容副本）

云端 Agent 与本机 Agent 在执行「用 era / 标题生成图文」类任务时，必须遵循该 skill 的逐步确认流程，并先通过 `scripts/ensure-era-ready.sh` 确认服务就绪。
