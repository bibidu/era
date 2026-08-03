# 图文编辑器（Era）

移动端优先的编辑器：支持图文分页排版、高亮与导出图片。

在线预览（自建站）：[http://39.106.179.17/](http://39.106.179.17/)，见 [docs/cloud-hosting.md](./docs/cloud-hosting.md)。

顶栏 Tab（可用 `?tab=` 深链自动切换；**默认社媒** `?tab=data`）：

- 图文：`?tab=graphic`
- 社媒：`?tab=data`
- 高亮：`?tab=highlight&shareId=...`
- 标题：`?tab=title&text=当前帖子标题`（必须带 `text=`，否则落回 demo）

## 功能

- 图文模式：Markdown 分页、字体/纸色/高亮、多页导出
- 社媒：「社媒」Tab 展示分析列表；右上角「智能提取」进入视频数据提取页（上传抽帧或填写视频 URL，经 Supabase 代理调用 DashScope 返回 Markdown）
- 高亮设置：「高亮」Tab；`?tab=highlight&shareId=...` 自动打开并加载分享内容
- 画幅：`3:4` 小红书风格；`9:16` 抖音风格
- 发图：阿里云 OSS 私有桶 + 对话框直发 **12 小时签名 URL**（无 Gallery 页）

## 开发（前端）

```bash
npm install
npm run dev
```

前端发布到阿里云轻量自建站：

```bash
npm run deploy:swas
```

图片资源统一上传 **阿里云 OSS 私有桶**（bucket `agent-17718139319`），交付 **12 小时签名 URL**（防盗刷）；存图前会自动清理超过 14 小时的旧对象。见 [docs/cloud-hosting.md](./docs/cloud-hosting.md)。

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
