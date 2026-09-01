# Era Agent / MCP 技术方案

> 状态：图文 MCP 生产流程 **已废弃**（`tuwen` DEPRECATED；风水改走竖版成片 skill）  
> 本文保留供理解本地 Agent Bridge / graphic-text 运行时；**代理不得再按本文出新帖多页图**。  
> 现行风水成片：`.agents/skills/fengshui/SKILL.md`  
> 交互（废弃）：`.agents/skills/tuwen/SKILL.md`（仅 DEPRECATED 说明）  

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
Agent（**勿再**按已废弃图文 skill 出新帖；风水成片见 fengshui）
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
| 编排 | **Agent 主导** + **图文 skill（tuwen）** 固定流程 |
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
| `era_create_highlight_setup_share` | 上传正文到自建库，返回高亮设置页 URL |
| `era_preview_layout` | 分页预览 + 异常检测（需浏览器） |
| `era_export_images` | 导出各页 PNG + 纵向拼图 `graphic-review-sheet.png`（需浏览器）；skill 要求先发拼图确认、再发分图 |
| `era_create_export_share` | 导出各页 PNG + 拼图并上传 Supabase（可选存储）；Gallery 已下线，交付以对话框 OSS 签名 URL 为准 |

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

`POST /v1/projects/:id/highlights` 可带 `replace: true`（先清空再写入）。

### 高亮设置页

云端流程：

1. `POST /v1/projects/:id/highlight-setup-share`（或 MCP `era_create_highlight_setup_share`）把正文/标题写入自建库，返回 `shareId` + `url`
2. 用户打开（自动切到「高亮」Tab）：
   ```
   https://39.106.179.17.sslip.io/?tab=highlight&shareId=<SHARE_ID>
   ```
3. 用户点选/滑动后点「复制并应用」：写回 `result_ranges`，并复制 `ERA_HIGHLIGHT_SETUP_V1` JSON 给 Agent

本机调试仍可用 `?tab=highlight&projectId=<id>` 直连 Agent。

### 导出图交付

Gallery 图文库已下线。出图后：

1. （可选）`POST /v1/projects/:id/export-share` 仍可将 PNG dataURL 写入 Supabase `era_export_shares`
2. **交付以对话框直发阿里云 OSS 12 小时签名 URL 为准**（见 `docs/cloud-hosting.md`）
3. 实现要点：若写库，图片体积大，用显式 `id` + `Prefer: return=minimal`，避免回显整行导致网关超时

`POST /v1/projects/:id/highlights` 可带 `replace: true`（先清空再写入）。

标题高亮**禁止**使用 `quote`（由图文 skill 约束）。

## 布局异常检测

1. 单行溢出  
2. 孤行  
3. 独行标点  

每种导出比例（3:4 / 9:16）都要分别检测。

## 目录

```
.cursor/skills/fengshui/   # 风水竖版成片（现行）
.cursor/skills/tuwen/      # DEPRECATED 说明
.agents/skills/fengshui/
.agents/skills/tuwen/
docs/agent-mcp-design.md   # 本文件（图文 Bridge 历史）
server/                    # Agent HTTP + WS + MCP（前端编辑器用）
src/agent/
scripts/ensure-era-ready.sh
scripts/start-local-agent.sh
```

## 安全

- API Key 仅本机/密钥管理，不入库  
- Agent 服务默认只绑 `127.0.0.1`
