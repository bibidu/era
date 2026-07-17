# 海报 / 图文编辑器（Era）

移动端优先的编辑器：支持海报合成，以及图文分页排版、高亮与导出图片。

在线预览：https://bibidu.github.io/era/

## 功能

- 上传固定海报底图，添加文本素材并导出
- 图文模式：Markdown 分页、字体/纸色/高亮、多页导出
- 画幅：`3:4` 小红书风格；`9:16` 抖音风格

## 开发（前端）

```bash
npm install
npm run dev
```

推送到 `main` 后会自动构建部署到 `gh-pages`。

## Era Skill（图文对话出图）

云端 / 本机 Agent 生成图文时，统一走 skill **`era`**（`.cursor/skills/era/SKILL.md`）：

- 对话里可输入 `/era`
- 提到「用 era + 标题生成图文」时会自动匹配该 skill
- 流程：确认服务 → 正文确认 → 5 个标题 → 高亮建议 → 选抖音/小红书（默认都要）→ 校验 → 发图

技术方案：[docs/agent-mcp-design.md](./docs/agent-mcp-design.md)

## 本地 Agent / MCP（可选，不影响普通使用）

### 启动

一键：

```bash
cd /path/to/era
npm run start:local-agent
# 或仅检查/拉起服务：
bash scripts/ensure-era-ready.sh
```

会拉起 Agent（`:3847`）与前端（`http://127.0.0.1:5173/era/`）。看到右上角 **Agent** 后即可对话出图。

WorkBuddy / Cursor MCP 配置示例见 [docs/mcp.example.json](./docs/mcp.example.json)。

默认服务：`http://127.0.0.1:3847`（仅本机）。导出目录默认 `./output`。
