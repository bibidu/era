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

## 本地 Agent / MCP（可选，不影响普通使用）

本机可用 MCP + REST 让 WorkBuddy / OpenClaw 参与图文生产；**GitHub Pages 静态站行为不变**。技术方案见：

- [docs/agent-mcp-design.md](./docs/agent-mcp-design.md)
- [docs/dify-local-setup.md](./docs/dify-local-setup.md)（本机 Dify）
- [docs/dify-workflow.md](./docs/dify-workflow.md)

### 启动

```bash
# 终端 1：Agent REST + 浏览器控制通道
npm run agent

# 终端 2：前端（必须用 localhost 打开，右上角出现 Agent 指示即已连通）
npm run dev
```

WorkBuddy / Cursor 等把 MCP 配成：

```json
{
  "mcpServers": {
    "era": {
      "command": "npx",
      "args": ["tsx", "server/mcp.ts"],
      "cwd": "/绝对路径/era",
      "env": {
        "ERA_AGENT_URL": "http://127.0.0.1:3847"
      }
    }
  }
}
```

默认服务：`http://127.0.0.1:3847`（仅本机）。导出目录默认 `./output`（可用 `ERA_OUTPUT_DIR` 覆盖）。
