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

## 图文 Skill（图文对话出图）

云端 / 本机 Agent 生成图文时，统一走 skill **图文skill**（`.cursor/skills/tuwen/SKILL.md`）：

- 对话里说 **「图文skill」** 即可触发
- 也可输入 `/tuwen`，或提到「用标题生成图文 / 小红书·抖音出图」
- 流程分支：
  - **风水**：确认服务 → 正文确认 → 5 个标题 → 高亮 → 校验 → 发图（封面标题与内容同图）
  - **非风水（默认）**：问大纲 → 生成并确认内容 → 确认标题＋封面信息 → 按封面 skill 出封面图 → 用户自设高亮 → 封面＋内容高亮页拼横版确认 → 逐张发图（内容图不含一级标题，需要配图时预览环节混排展示）

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
