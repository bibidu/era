# Agent 说明

## Git / PR（强制）

完成功能改动并创建 PR 后，**直接合入 `main`**，不要询问用户是否合并。合入后执行 `npm run deploy:swas`（SSH 到服务器 `git pull` + 构建，见 skill **swas-deploy**），并把**固定站点 URL**发给用户：优先 **HTTPS** `https://39.106.179.17.sslip.io/`（可带 `?tab=`）。仅当用户明确要求先别合并 / 保持 draft 审阅时例外。约定见 `.cursor/rules/auto-merge-pr.mdc`。

## 蛇大师 skill（抖音账号负责人 · 复盘与文案）

抖音账号「AI提效实验室」的社媒负责人角色，由 skill **蛇大师**（目录 `shedashi`）定义：

- `.agents/skills/shedashi/SKILL.md`
- `.cursor/skills/shedashi`（符号链接）

用户说「使用蛇大师，开启今天的任务」「今天发什么」「下一期」时走本 skill。**全自动、零确认**：拉后台数据复盘 → 定选题/标题/档期 → 写正文（若需要）→ 飞书通知。**不再**出 Era 封面/内容页、不再走 `tuwen`。数据结论见 `references/playbook.md`，账号档案见 `references/account.md`（名称/背景/简介/定位永不改动）。

三条硬规则：

- **异常也必须推飞书**：自己修不好 / 需用户拍板时，除对话说明外必须推红色告警卡 `node scripts/shedashi-notify.mjs --alert --stage … --detail … --action …`。
- **档期用脚本的 `nextSlot`，禁止自己拍**：抖音断更惩罚要求相邻两篇间隔 **≤ 2 天**（账号级，风水/健身也占位）；在此之上走固定周节律 **周一/二/三/四/六 早 07:40–08:00**。
- **可回收分析的必要条件**：`work_type === '图文'` **且** `extract_status === '提取成功'`，缺一不可；判定用 `isAnalyzable()`。断更间隔另用 `isPublishedRecord()` 取全部已发布作品。

## 风大师 skill（抖音风水号负责人 · 全自动）

抖音**风水号（阳宅篇）**的社媒负责人角色，由 skill **风大师**（目录 `fengdashi`）定义——**两个账号、两套数据、两套结论，推同一个飞书群**：

- `.agents/skills/fengdashi/SKILL.md`
- `.cursor/skills/fengdashi`（符号链接）

用户说「使用风大师，开启今天的任务」「风水号今天发什么」「风水下一篇」时走本 skill。选题/标题/档期全自动；**有抖音/视频链接则**走 **风水竖版成片**（`fengshui`），先让用户确认通过门禁的 10 秒真实克隆音频与最终首帧，确认后成片 → 飞书「风水号下一篇已就绪」。**禁止**再走 Era 叠字 / gc-minimal 多页出图。

三条硬规则：

- **异常也必须推飞书**：`node scripts/fengdashi-notify.mjs --alert --stage … --detail … --action …`。这一轮没推出「已就绪」卡，就一定要推一张告警卡。
- **档期用脚本的 `nextSlot`，禁止自己拍**：断更间隔 **≤ 2 天**（只按风水已发布记录）；只投早 07:40–08:00。
- **可回收分析的必要条件**：`work_type === '风水'` **且** `extract_status === '提取成功'`，缺一不可；判定用 `isFengAnalyzable()`。

## 图文 skill（已废弃）

`.agents/skills/tuwen/SKILL.md` 仅为 **DEPRECATED** 说明。提「图文 / tuwen / 出风水图 / gc-minimal 叠字」时告知已废弃：**风水走 fengshui 视频 skill**；其他内容不要再出 Era 多页图。`graphic-text` 运行时代码可留仓，skill/rules 已切断入口。路由见 `.cursor/rules/era-skill.mdc`。

## 风水 skill（竖版口播成片）

- `.agents/skills/fengshui/SKILL.md`
- `.cursor/skills/fengshui`（符号链接）

**一个抖音/视频链接启动**：抽中文口播（改词 &lt; 5%）→ 按 **CosyVoice > VoxCPM2 > VoxCPM 0.5** 选择/安装机器可运行的最高优先级引擎 → 克隆「老者」→ 逐字与音质门禁 → 用户确认 10 秒真实克隆音频 + 最终首帧 → cinematic 9:16 山水静图 → 片头 2 秒毛笔标题+锦垣印 → 宋体 100 字幕 → 拼 1080×1920 成片。确认门不能被“全自动”跳过；禁 MiniMax。交付只发绑定本次 MP4 的实验室 HTTPS 专属预览链接。读音见 `references/voice-reading.md`，资源预检见 `references/local-runtime.md`。

**禁止**再走阳宅图文、gc-minimal、4–6 页分篇叠字出图。

## 发图 / 成片交付（全局）

对话框**绝对禁止**只丢 OSS 裸链当唯一交付；成片**不要**往聊天塞视频附件。见 `.cursor/rules/image-preview-delivery.mdc`。

- **风水竖版成片**：上传后发实验室 / **HTTPS** 预览链（默认 `https://39.106.179.17.sslip.io/`），链接单独一行
- **历史社媒图帖**：仍可通过 `?tab=data` 查看；勿发 HTTP 裸 IP
- **OSS 临时 HTML**：仅用户**强烈要求**时用 `make-oss-preview-html.mjs`

## 云托管（强制）

- **对象存储**：阿里云 OSS（`scripts/oss-upload.sh`）。预览规则见 `image-preview-delivery.mdc` / `oss-image-delivery.mdc`。
- **封面永久**（历史图帖）：key 含 `__cover_keep__`；清理跳过。
- **过期清理**：存图前清理 `era/assets/` 下超过 **14 小时**旧对象；跳过 `__cover_keep__`。
- **前端 + 业务 REST**：`39.106.179.17`；**用户交付默认 HTTPS** `https://39.106.179.17.sslip.io/`；发布 `npm run deploy:swas`（skill **swas-deploy**）。
- 说明：`docs/cloud-hosting.md`、skill `references/cloud-hosting.md`。

## 前端 Tab（URL 可深链）

基址：`https://39.106.179.17.sslip.io/`（无参数时**默认社媒**）：

| 页面 | URL |
| --- | --- |
| 社媒（默认） | `?tab=data` |
| 图文编辑器（二级页，运行时保留） | `?tab=graphic` |
| 帖子详情（二级页） | `?tab=data&post=<id>` |

顶栏仅「图文 / 社媒」。Agent **生产流程**不再用图文 Tab 出新帖；风水成片走视频 skill。

「亏否」已拆出 Era：独立站 [https://39.106.179.17.sslip.io/kuifou/](https://39.106.179.17.sslip.io/kuifou/)（仓库 `bibidu/kuifou`）。Era 发版须保留 Caddy `kuifou_routes` 与 `/opt/kuifou-web` 挂载，且勿 drop `kuifou_assets` 表。
