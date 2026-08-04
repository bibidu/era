# 第 10 期：AGENTS.md 写到 200 行，我的 Agent 反而变笨了

状态：**已定稿，可直接发布**（封面 + 6 页内容，1080×1920）

## 发布配置

| 项 | 值 |
| --- | --- |
| 作品名称 | AGENTS.md 写到 200 行，我的 Agent 反而变笨了 |
| 话题 | #ai编程 #cursor #claudecode #ai学习 #如何用好ai |
| 平台 / 尺寸 | 抖音图文，9:16（1080×1920），7 张 |
| 发布时间 | 2026-07-30 07:30–08:30 |
| 置顶评论 | 我从 200 砍到 18 行。你的多少行？报个数，我帮你看哪些能搬走 |

## 成品图（Supabase Storage 公开桶，长期有效）

前缀：`https://kzoxyextxjwscrpjowud.supabase.co/storage/v1/object/public/era-preview/20260729-131737/`

- `00-cover.png` 封面
- `01-page.png` ~ `06-page.png` 正文 6 页

拼图总览：`https://kzoxyextxjwscrpjowud.supabase.co/storage/v1/object/public/era-preview/20260729-130409/review-sheet-final.png`

## 源文件

- `content.md`：正文，`<!-- era:page-break -->` 为分页符
- `cover.json`：封面参数，重出用 `node scripts/generate-cover.mjs`（入参见 `.agents/skills/tuwen/SKILL.md` §封面）


正文改动后需重新导出：Era 项目 id `f70f7829-8432-4bec-b528-a1045aa71720`（本地 Era 服务状态，跨机器需重建项目）。

## 本期实验假设

第 6 页改成提问式收尾 + 置顶评论引导，验证能否拉起评论率。目标单篇评论数 ≥ 5（历史 9 篇累计仅 6 条）。
