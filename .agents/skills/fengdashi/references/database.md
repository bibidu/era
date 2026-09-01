# 业务库：era_social_video_analyses（风水号视角）

自建站 PostgREST（阿里云轻量 `39.106.179.17`），与蛇大师、前端社媒 Tab 共用同一张表。
读写走 `scripts/fengdashi-lib.mjs`（它复用 `scripts/shedashi-lib.mjs` 的通用 REST 与解析），不要在别处硬编码 base 与 key。

## 入口

| 用途 | 地址 |
| --- | --- |
| 交付给用户（必须 HTTPS） | `https://39.106.179.17.sslip.io/?tab=data` |
| 脚本读写（首选） | `https://39.106.179.17.sslip.io/rest/v1/…` |
| 脚本读写（Cloud Agent 回落） | `http://39.106.179.17/rest/v1/…`（出口到 sslip.io 的 TLS 常被中断，库会自动回落裸 IP） |

## 字段（与蛇大师同表，重点差异）

| 字段 | 说明 |
| --- | --- |
| `work_type` | 本 skill 只处理 **`风水`**（图文号是 `图文`，健身是 `健身`） |
| `title` | 社媒标题（＝封面各行连写；分篇带 `（上篇）` 等）。入库由 `fengdashi-publish.mjs` 写，不经 `era_set_title` |
| `outline` | 一句话大纲。**风水号不写「第N期」前缀**（那是图文号的期号机制）；风水靠分篇（上/中/下篇），无期号 |
| `markdown` | 帖子正文（用户可见版，**不含** `era:page-break`；风水正文保留 `#` 一级标题） |
| `cover_url` | 封面/首页永久链（`__cover_keep__`） |
| `image_previews` | 有序图片列表，`[0]` ＝封面/首页，其余为内容页 |
| `extract_data` | 智能提取的后台数据 JSON —— **复盘的唯一真实数据源** |
| `extract_status` | `未开始` / `提取中` / `提取成功` / `提取失败` |

## 可回收分析的必要条件（缺一不可）

| 条件 | 值 | 常量（fengdashi-lib.mjs） |
| --- | --- | --- |
| `work_type` | `风水` | `FENGSHUI_WORK_TYPE` |
| `extract_status` | `提取成功` | `ANALYSIS_EXTRACT_STATUS` |

判定统一用 `isFengAnalyzable(record)`。其余状态不参与任何结论，也不要拿标题去猜表现。
断更间隔用 `isPublishedRecord(record)` 取全部已发布风水记录（`风水号只发风水`，不与图文号混算）。

## extract_data 关键指标（风水号侧重）

| 键 | 复盘用途 |
| --- | --- |
| `播放量` | 可能是 `1.1万` 缩写，`toNumber` 会换算 |
| `划走率` | **命门**：与播放强负相关 → 判封面第一屏 |
| `流量来源_搜索页` | 风水号特有长尾 → 判标题可搜词 |
| `流量来源_推荐页` | 是否脱离互关（朋友页/个人主页）依赖 |
| `收藏量` / `点赞量` | 收藏 ≥ 点赞＝可抄型内容 |
| `吸粉率` / `涨粉量` | 判选题痛点与末页关注理由 |
| `平均浏览图片数` | 判页数与翻页钩子 |
| `观众年龄_最多` / `观众区域_最多` / `观众职业` | 判内容门槛（风水号受众偏年长） |
| `观众喜欢_关注的同类作者` | 找选题空白 |
| `流量激励文案` | 抖音同比评价，含「较往期上涨 X%」 |

低播放作品（<300）的比率类指标噪声极大，不要单独据此下结论。

## 写入

**现行成片**走风水竖版成片 skill（`.agents/skills/fengshui/SKILL.md`），交付 HTTPS/实验室预览链接；**不要**再为叠字多页图跑入库发图主路径。

历史脚本 `scripts/fengdashi-publish.mjs`（读 `publish.json`：上传 OSS → 写 `work_type: 风水` / `image_previews` → 推飞书）仍可能存在于仓内，**仅作旧数据兼容**，风大师主流程不要再调用它出图。复盘读写仍用 `fengdashi-lib.mjs` / `fengdashi-analyze.mjs`。
