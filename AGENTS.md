# Agent 说明

## Git / PR（强制）

完成功能改动并创建 PR 后，**直接合入 `main`**，不要询问用户是否合并。合入后执行 `npm run deploy:swas`（SSH 到服务器 `git pull` + 构建，见 skill **swas-deploy**），并把**固定站点 URL**发给用户：优先 **HTTPS** `https://39.106.179.17.sslip.io/`（可带 `?tab=`）。仅当用户明确要求先别合并 / 保持 draft 审阅时例外。约定见 `.cursor/rules/auto-merge-pr.mdc`。

## 蛇大师 skill（抖音账号负责人 · 全自动）

抖音账号「AI提效实验室」的社媒负责人角色，由 skill **蛇大师**（目录 `shedashi`）定义：

- `.agents/skills/shedashi/SKILL.md`
- `.cursor/skills/shedashi`（符号链接）

用户说「使用蛇大师，开启今天的任务」「今天发什么」「下一期」时走本 skill。**全自动、零确认**：拉后台数据复盘 → 定选题/标题/档期 → 写正文 → 出封面与内容页 → 上传 OSS → 入库 → 飞书机器人推「第 N 期已就绪」。禁止向用户确认选题/标题/正文/封面/版面。数据结论见 `references/playbook.md`，账号档案见 `references/account.md`（名称/背景/简介/定位永不改动）。

三条硬规则：

- **异常也必须推飞书**：自己修不好 / 需用户拍板时，除对话说明外必须推红色告警卡 `node scripts/shedashi-notify.mjs --alert --stage … --detail … --action …`。这一轮没推出「已就绪」卡，就一定要推一张告警卡。
- **档期用脚本的 `nextSlot`，禁止自己拍**：抖音断更惩罚要求相邻两篇间隔 **≤ 2 天**（账号级，风水/健身也占位）；在此之上走固定周节律 **周一/二/三/四/六 早 07:40–08:00**。
- **可回收分析的必要条件**：`work_type === '图文'` **且** `extract_status === '提取成功'`，缺一不可；判定用 `isAnalyzable()`。断更间隔另用 `isPublishedRecord()` 取全部已发布作品。

## 图文 skill（多页长图 + 内联封面）

非风水社媒图文由 skill **图文skill**（目录 `tuwen`）定义：

- `.agents/skills/tuwen/SKILL.md`
- `.cursor/skills/tuwen`（符号链接）

执行「图文skill / 小红书·抖音出图 / 生成封面 / 封面skill」时遵循该 skill；先 `scripts/ensure-era-ready.sh`（仅封面单张时可只跑 `generate-cover.mjs`）。被蛇大师调用时走**全自动**模式（跳过所有确认步）；用户单篇讨论时走**半自动**模式。

默认：一级标题（封面大标题）与二级标题均数黑体（封面 `bigTitleFont: shuheiti`；`headingFontId`: `shuheiti`）；**默认导出抖音 9:16**；**默认不做高亮**；**每个 `##` 独占一页**；**封面 + 4 页封顶**；**期数 `每天一个提效实操·第N期` 与下期预告写在末页正文结尾两行**（`seriesLabel` 留空，每页顶栏都是「点赞关注不迷路～」）——第 2 页顶栏放期数已被后台数据证否（平均浏览图片数 2.7→1.9、吸粉率 0.32%→0.15%，见 shedashi playbook §版面）。封面步骤已内联（`scripts/generate-cover.mjs`），不再使用独立 fengmian 目录。

仅用户明确要求高亮时：`era_create_highlight_setup_share` → `highlightSetupPagesUrl(shareId)`；禁止对整段 query 再 `encodeURIComponent`。

出图：上传并写入 `image_previews`（[0]=封面永久链）；对话框只发 **HTTPS** `https://39.106.179.17.sslip.io/`（可带 `?tab=data`；勿发 HTTP 裸 IP）。

**风水 / 阳宅主题改走「风水 skill」，不要用本 skill。**

## 风水 skill（阳宅图文 + 诗意页背景）

- `.agents/skills/fengshui/SKILL.md`
- `.cursor/skills/fengshui`（符号链接）

固定 `pageOverlay: fengshui`、抖音 9:16、固定顶栏文案、`headingFontSize: 22`、一级标题全文朱红 `titlePrimaryColor: #C41E3A`；每 `##` 独占页；诗意泥纸背景（意象左下/右下随机）；单篇 4–6 页，超出分篇（**多篇文案一次齐发**；标题带 `（上篇）` 等；非末篇篇末预告下篇并用黄色刷子 `#FACC15`）；**同篇全部诗意背景图同色调**；改写方向为活学活用（知识点为骨、教导为皮肉）；用户可见文案不得含 `<!-- era:page-break -->`。按页背景导出：`scripts/export-pages-with-bgs.mjs`。

## 发图硬性规则（全局）

对话框**绝对禁止**直接发送 OSS 图片链接。见 `.cursor/rules/image-preview-delivery.mdc`。

- **图文 / 风水 / 社媒帖子（默认）**：写入 `image_previews` + 只发自建站 **HTTPS** `https://39.106.179.17.sslip.io/`（建议 `?tab=data`），确认阶段也走入库
- **为何 HTTPS**：Safari「保存到相册」依赖 Web Share，仅安全上下文可用；裸 IP `http://39.106.179.17/` 为 HTTP，无法调起系统分享
- **OSS 临时 HTML**：仅用户**强烈要求**时用 `make-oss-preview-html.mjs`；只发 HTML URL；用完后询问是否删除

## 云托管（强制）

- **图片存储**：阿里云 OSS（`scripts/oss-upload.sh`）。预览规则见 `image-preview-delivery.mdc` / `oss-image-delivery.mdc`。
- **封面永久**：key 含 `__cover_keep__`（或 `--cover`）；清理跳过；公共读。写入社媒 `cover_url` / 预览首图必须用此 URL。
- **预览 HTML**：`--public`；`scripts/make-oss-preview-html.mjs`。
- **过期清理**：存图前清理 `era/assets/` 下超过 **14 小时**旧对象；跳过 `__cover_keep__`。
- **Cloud Agent 上传**：美西→北京约 2–3 分钟/3MB；见 skill **oss-upload**。
- **前端 + 业务 REST**：`39.106.179.17`；**用户交付默认 HTTPS** `https://39.106.179.17.sslip.io/`；发布 `npm run deploy:swas`（skill **swas-deploy**）。
- **Edge Functions** 仍在旧 Supabase。
- 说明：`docs/cloud-hosting.md`、skill `references/cloud-hosting.md`。

## 标题排版设置页

精细控制标题时主动发 `https://39.106.179.17.sslip.io/?tab=title&text=当前帖子标题`。**禁止**只发裸 `?tab=title`。可用 `titleComposerPagesUrl(标题)`。复制配置后用 `generate-title-composer.mjs` 出图，按 image-preview-delivery 交付。见 `.cursor/rules/title-composer.mdc`。

## 前端 Tab（URL 可深链）

基址：`https://39.106.179.17.sslip.io/`（无参数时**默认社媒**）：

| 页面 | URL |
| --- | --- |
| 社媒（默认） | `?tab=data` |
| 图文（二级页） | `?tab=graphic` |
| 帖子详情（二级页） | `?tab=data&post=<id>` |

顶栏仅「图文 / 社媒」；点「图文」进入路由二级页（可边缘右滑返回）。高亮 / 标题 / 拼图 Tab 与复盘页已移除。
