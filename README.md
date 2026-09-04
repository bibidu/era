# 图文编辑器（Era）

移动端优先的编辑器：支持图文分页排版、高亮与导出图片。

在线预览（自建站 HTTPS）：[https://39.106.179.17.sslip.io/](https://39.106.179.17.sslip.io/)，见 [docs/cloud-hosting.md](./docs/cloud-hosting.md)。

顶栏仅「图文 / 社媒」（可用 `?tab=` 深链；**默认社媒** `?tab=data`）：

- 社媒：`?tab=data`（默认）
- 图文：`?tab=graphic`（路由二级页，可边缘右滑返回）
- 帖子详情：`?tab=data&post=<id>`（二级页）

「亏否」已拆为独立应用：[https://39.106.179.17.sslip.io/kuifou/](https://39.106.179.17.sslip.io/kuifou/)（仓库 [bibidu/kuifou](https://github.com/bibidu/kuifou)），不再作为 Era 内 Tab。

## 功能

- 社媒：分析列表与帖子详情（详情 / 数据 Tab）
- 图文：Markdown 分页、字体/纸色、多页导出（二级页）
- 画幅：`3:4` 小红书风格；`9:16` 抖音风格
- 发图：阿里云 OSS；社媒入库后走自建站 HTTPS 预览

## 开发（前端）

```bash
npm install
npm run dev
```

前端发布到阿里云轻量自建站（先 push `main`，再服务器 git pull + 构建）：

```bash
npm run deploy:swas
```

配置见 `deploy/swas/server.env`；Agent 流程见 skill **swas-deploy**。

图片资源统一上传 **阿里云 OSS 私有桶**（bucket `agent-17718139319`），交付 **12 小时签名 URL**（防盗刷）；存图前会自动清理超过 14 小时的旧对象。见 [docs/cloud-hosting.md](./docs/cloud-hosting.md)。

## 图文 Skill（已废弃）

Era 多页图文（`.agents/skills/tuwen/SKILL.md`）**已彻底停用**。提「图文skill / tuwen / 封面skill」时告知已废弃，不要再走叠字出图。前端 `?tab=graphic` 编辑器可仍打开，但 Agent 生产流程不再入口。

技术方案（历史）：[docs/agent-mcp-design.md](./docs/agent-mcp-design.md)

## 风水 Skill（竖版口播成片）

风水 / 阳宅 / 口播成片 / 抖音链接做视频 → skill **风水竖版成片**（`.agents/skills/fengshui/SKILL.md`）：

- 对话里说 **「风水skill」** / 「风水竖版成片」/ 阳宅 / 丢来抖音链接即可触发（也可用 `/fengshui`）
- 流程：抽中文口播（改词 &lt; 5%）→ 按 CosyVoice > VoxCPM2 > VoxCPM 0.5 选择/安装机器可运行的最高优先级引擎 → 老者克隆逐字/音质门禁 → 用户确认 10 秒真实克隆音频 + 最终首帧 → cinematic 9:16 山水静图 → 片头 2 秒毛笔标题+锦垣印 → 宋体 100 字幕 → 1080×1920 成片
- 交付：实验室 / HTTPS 预览链接（单独一行）；不要聊天塞视频附件、不要只丢 OSS 裸链
- **已废弃**：阳宅图文、gc-minimal 底图、4–6 页分篇叠字出图

历史封面脚本 `scripts/generate-cover.mjs` 仍可能留在仓内，**不要**当作风水成片或图文生产主路径。

## 本地 Agent / MCP（可选，不影响普通使用）

### 启动

一键：

```bash
cd /path/to/era
npm run start:local-agent
# 或仅检查/拉起服务：
bash scripts/ensure-era-ready.sh
```

会拉起 Agent（`:3847`）与前端（`http://127.0.0.1:5173/era/`）。看到右上角 **Agent** 后可操作**前端图文编辑器**（生产 skill 已废弃出图）。

风水竖版成片不依赖本 Bridge，见 `.agents/skills/fengshui/SKILL.md`。

WorkBuddy / Cursor MCP 配置示例见 [docs/mcp.example.json](./docs/mcp.example.json)。

默认服务：`http://127.0.0.1:3847`（仅本机）。导出目录默认 `./output`。
