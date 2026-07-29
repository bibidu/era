# 图文编辑器（Era）

移动端优先的编辑器：支持图文分页排版、高亮与导出图片。

在线预览（EdgeOne）：https://bibidu-era-0tdhv043.edgeone.cool/

社媒视频完整数据提取页：顶部「数据分析」Tab，或直达 https://bibidu-era-0tdhv043.edgeone.cool/?tool=social-video

## 功能

- 图文模式：Markdown 分页、字体/纸色/高亮、多页导出
- 社媒视频数据提取：上传视频抽帧或填写视频 URL，经 Supabase 代理调用 DashScope 返回 Markdown
- 画幅：`3:4` 小红书风格；`9:16` 抖音风格
- 导出图预览/下载：出图后上传 Supabase，在 Gallery 图文库查看（`/gallery/?shareId=...`），支持 ZIP 整包下载（MCP `era_create_export_share`）

## 开发（前端）

```bash
npm install
npm run dev
```

推送到 `main` 后会自动构建并部署到 **腾讯云 EdgeOne Makers**（项目 `bibidu-era`）。本地也可：

```bash
npm run deploy:edgeone
```

图片资源统一上传 **阿里云 OSS 私有桶**（bucket `agent-17718139319`），交付 **12 小时签名 URL**（防盗刷）。见 [docs/cloud-hosting.md](./docs/cloud-hosting.md)。

## 图文 Skill（图文对话出图）

云端 / 本机 Agent 生成图文时，统一走 skill **图文skill**（`.cursor/skills/tuwen/SKILL.md`）：

- 对话里说 **「图文skill」** 即可触发
- 也可输入 `/tuwen`，或提到「用标题生成图文 / 小红书·抖音出图」
- 流程分支：
  - **风水**：确认服务 → 正文确认 → 5 个标题 → 高亮 → 校验 → 发图（封面标题与内容同图）
  - **非风水（默认）**：问大纲 → 生成并确认内容 → 确认标题＋封面信息 → 按封面 skill 出封面图 → 用户自设高亮 → 封面＋内容高亮页拼横版确认 → 逐张发图（内容图不含一级标题，需要配图时预览环节混排展示）

技术方案：[docs/agent-mcp-design.md](./docs/agent-mcp-design.md)

## 封面 Skill（单张社媒封面）

瑞士/技术编辑风的 **9:16** 封面，走 skill **封面skill**（`.agents/skills/fengmian/SKILL.md`）：

- 对话里说 **「封面skill」** 即可触发（也可用 `/fengmian`）
- 字段：大标题（可多行、可指定颜色）、小标题、描述、多个标签、多个二级标题、主题色（可省略随机）
- 本地渲染：

```bash
node scripts/generate-cover.mjs \
  --bigTitle "SEEDANCE" \
  --smallTitle "AI 视频导演流" \
  --description "不是堆词，是导演工作流" \
  --tags "分镜叙事,镜头控制" \
  --secondaryTitles "导演模式,镜头语言,成片导出" \
  --themeColor "#6D28D9" \
  --out output/cover.png
```

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
