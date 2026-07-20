# Era Agent / MCP 技术方案

> 状态：已按用户确认落地（分支 `cursor/mcp-local-agent-be32`）  
> 范围：仅图文模式（graphic-text），不含海报  
> 交互流程：见项目 skill `.cursor/skills/tuwen/SKILL.md`（**图文skill** / `/tuwen`）

## 背景知识

| 画幅 `aspectRatio` | 平台风格 |
| --- | --- |
| `3:4` | 小红书 |
| `9:16` | 抖音 |

## 目标

在**不破坏现有前端与 gh-pages 静态部署**的前提下，让 Agent（云端 Cursor / 本机 WorkBuddy·OpenClaw）通过 **MCP + REST** 参与图文生产全流程。

## 架构（已确认）

```
用户（IM / Cursor 对话）
   ↕
Agent（严格执行 era skill）
   ├─ LLM：正文 / 标题 / 高亮建议（Agent 内生成）
   ├─ 人机确认：逐步「是否继续」
   └─ 出图：Era MCP / REST
              ↕ HTTP :3847
         Era Agent Server
              ↕ WebSocket /bridge
         浏览器中的 Era 页面（方案 B）
```

### 关键点确认摘要

| 项 | 选择 |
| --- | --- |
| 3.4 渲染 | **B**：浏览器打开 Era + WebSocket 控制通道 |
| 编排 | **Agent 主导** + **era skill** 固定流程 |
| 高亮定位 | **字符 range**（`blockId + start/end`） |
| REST | 与 MCP 共用，供脚本/无 MCP 环境调用 |
| 海报 | 本期不做 |

## 为何需要浏览器（方案 B）

现有导出依赖浏览器 Canvas、字体加载与 `exportGraphicPages`。Agent 命令经 Agent Server 推到已打开的 Era 页面执行，再把 PNG 回传/落盘。

- Agent 通道仅在 `localhost` / `127.0.0.1` 自动连接
- 云端可用 `scripts/ensure-era-ready.sh` + Playwright 保活页面

## MCP Tools

| Tool | 说明 |
| --- | --- |
| `era_create_project` | 新建工程 |
| `era_get_project` | 读取工程 |
| `era_set_markdown` | 写入正文 Markdown |
| `era_set_title` | 设置/更新一级标题 |
| `era_update_config` | 部分更新配置（含 `aspectRatio`） |
| `era_apply_highlights` | 按 range 批量高亮 |
| `era_preview_layout` | 分页预览 + 异常检测（需浏览器） |
| `era_export_images` | 导出各页 PNG + 纵向拼图 `graphic-review-sheet.png`（需浏览器）；skill 要求先发拼图确认、再发分图 |

| `era_list_fonts` | 可选字体 |
| `era_list_highlight_styles` | 高亮样式枚举 |
| `era_bridge_status` | 浏览器通道是否已连接 |

### 高亮 range

```json
{
  "style": "underline" | "brush" | "quote" | "circle",
  "blockId": "<markdown 解析后的 block id>",
  "start": 0,
  "end": 4,
  "color": "#FACC15"
}
```

标题高亮**禁止**使用 `quote`（由 era skill 约束）。

## 布局异常检测

1. 单行溢出  
2. 孤行  
3. 独行标点  

每种导出比例（3:4 / 9:16）都要分别检测。

## 目录

```
.cursor/skills/tuwen/      # 图文skill（云端/本机 Agent 自动发现）
.agents/skills/tuwen/      # 兼容副本
docs/agent-mcp-design.md   # 本文件
server/                    # Agent HTTP + WS + MCP
src/agent/                 # 浏览器控制通道
scripts/ensure-era-ready.sh
scripts/start-local-agent.sh
```

## 安全

- API Key 仅本机/密钥管理，不入库  
- Agent 服务默认只绑 `127.0.0.1`
