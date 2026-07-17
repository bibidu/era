# Era Agent / MCP / Dify 技术方案

> 状态：已按用户确认落地（分支 `cursor/mcp-local-agent-be32`）  
> 范围：仅图文模式（graphic-text），不含海报

## 背景知识

| 画幅 `aspectRatio` | 平台风格 |
| --- | --- |
| `3:4` | 小红书 |
| `9:16` | 抖音 |

## 目标

在**不破坏现有前端与 gh-pages 静态部署**的前提下，让本机 Agent（OpenClaw / WorkBuddy）通过 **MCP + REST** 参与图文生产全流程，并可用本机 Dify 做 LLM 子步骤。

## 架构（已确认）

```
手机 IM  ↔  WorkBuddy / OpenClaw（本机）
              ├─ LLM 步骤 → 本机 Dify（可选）或直接 DeepSeek
              ├─ 人机确认 → IM（Agent 主导，方案 2）
              └─ 出图控制 → Era MCP / REST
                              ↕ HTTP :3847
                         Era Agent Server
                              ↕ WebSocket /bridge
                         本机浏览器中的 Era 页面（方案 B）
                              → 复用现有分页 / 高亮 / exportGraphicPages
```

### 关键点确认摘要

| 项 | 选择 |
| --- | --- |
| 3.4 渲染 | **B**：浏览器打开 Era + WebSocket 控制通道 |
| 编排 | **Agent 主导**；Dify 只做 LLM；确认走 IM |
| 人工确认 | 内容、标题需确认；高亮默认自动；出图后抽检 |
| 高亮定位 | **字符 range**（`blockId + start/end`） |
| REST | 提供，供 Dify HTTP 节点复用同一套能力 |
| 海报 | 本期不做 |
| Dify | 本机 Docker 安装（见 `docs/dify-local-setup.md`） |

## 为何必须本机浏览器（方案 B）

现有导出依赖浏览器 Canvas、字体加载与 `exportGraphicPages`。为与 UI 视觉一致，Agent 命令经本机 Agent Server 推到**已打开的 Era 页面**执行，再把 PNG 回传/落盘。

约束：

- Agent 通道仅在 `localhost` / `127.0.0.1` 下自动连接（避免影响 GitHub Pages HTTPS）。
- 未连接浏览器时，`preview_layout` / `export_images` 返回明确错误，提示先打开本地 Era。

## 工程快照

```ts
interface EraProject {
  version: 1
  document: GraphicDocument
  config: GraphicTextConfig
  meta?: { title?: string; topic?: string }
}
```

高亮存储与编辑器一致：`{blockId}:{charIndex}` → color，写入  
`underlineHighlightColors` / `brushHighlightColors` / `quoteHighlightColors` / `circleHighlightColors`。

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
| `era_export_images` | 导出 PNG 到本机目录（需浏览器） |
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

`era_set_markdown` 的响应会返回 block 列表（含 id 与纯文本），供后续 range 引用。

## 布局异常检测（`era_preview_layout`）

检测（**不含** max_pages、**不含**标题跨页）：

1. **单行溢出**：某行测量宽度超过内容区
2. **孤行**：同一段落跨页后，落在后一页仅剩 1 行
3. **独行标点**：某一行只有标点（如 `。` / `！`）而无其他文字

## REST（供 Dify HTTP 节点）

默认 `http://127.0.0.1:3847`，与 MCP 共用 handler。详见 README「本地 Agent」一节。

## 人机交互（Agent 主导）

1. 用户 IM 发选题/大纲  
2. Agent（或 Dify）生成正文 → IM 确认  
3. 生成标题候选 → IM 确认  
4. 自动高亮 → `era_apply_highlights`  
5. `era_preview_layout`；有告警则修复或提示  
6. `era_export_images` → IM 发图抽检  

## 目录

```
docs/agent-mcp-design.md   # 本文件
docs/dify-local-setup.md   # 本机 Dify
docs/dify-workflow.md      # 工作流节点说明
server/                    # Agent HTTP + WS + MCP
src/agent/                 # 浏览器控制通道（仅 localhost）
```

## 安全

- DeepSeek / Dify Key 仅本机环境变量，不入库  
- Agent 服务默认只绑 `127.0.0.1`
