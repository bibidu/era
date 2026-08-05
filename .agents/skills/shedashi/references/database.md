# 业务库：era_social_video_analyses

自建站 PostgREST（阿里云轻量 `39.106.179.17`），前端社媒 Tab 与蛇大师脚本共用同一张表。
读写请走 `scripts/shedashi-lib.mjs`，不要在别处硬编码 base 与 key。

## 入口

| 用途 | 地址 |
| --- | --- |
| 交付给用户（必须 HTTPS） | `https://39.106.179.17.sslip.io/?tab=data` |
| 脚本读写（首选） | `https://39.106.179.17.sslip.io/rest/v1/…` |
| 脚本读写（Cloud Agent 回落） | `http://39.106.179.17/rest/v1/…` |

Cloud Agent 出口到 `sslip.io` 的 TLS 握手常被中断（`SSL_ERROR_SYSCALL`），`shedashi-lib.mjs`
会自动按顺序试 base 并记住可用的那个。**但发给用户的预览链必须是 HTTPS** —— Safari
「保存到相册」依赖 Web Share，只在安全上下文可用。

anon key 是公开的 RLS key，已内联在 `scripts/shedashi-lib.mjs`，可用 `SUPABASE_URL` /
`SUPABASE_ANON_KEY` 覆盖。

## 字段

| 字段 | 说明 |
| --- | --- |
| `id` | uuid |
| `title` | 社媒标题（＝封面两行连写） |
| `published_at` | 手填 `2026-08-03 07:55` ＝已发布；ISO 带 `T` ＝入库时自动写的草稿时间 |
| `cover_url` | 封面永久链（`__cover_keep__`） |
| `markdown` | 帖子正文（用户可见版，**不含** `era:page-break`） |
| `outline` | 大纲。蛇大师在此写期号前缀：`第16期 \| …`，是期号的**权威来源** |
| `image_previews` | 有序图片列表，`[0]` ＝封面，其余为内容页 |
| `extract_images` | 后台数据截图（用户上传） |
| `extract_data` | 智能提取出的后台数据 JSON —— **复盘的唯一真实数据源** |
| `extract_status` | `未开始` / `提取中` / `提取成功` / `提取失败` |
| `temp_govern_status` | 临时数据治理状态（`未治理` / `正在治理` / `治理成功` / `治理失败`） |
| `work_type` | `图文` / `风水` / `健身` |

## 可回收分析的必要条件（缺一不可）

| 条件 | 值 | 常量 |
| --- | --- | --- |
| `work_type` | `图文` | `ANALYSIS_WORK_TYPE` |
| `extract_status` | `提取成功` | `ANALYSIS_EXTRACT_STATUS` |

判定统一用 `isAnalyzable(record)`，不要在别处另写过滤条件。其余状态（`未开始` / `提取中` /
`提取失败`）**不参与任何结论计算**，也不要拿标题去猜它的表现。

例外：**断更间隔是账号级的**，`风水` / `健身` 也占发布位，必须一起算——那一步用
`isPublishedRecord(record)` 取全部已发布记录，不受上面两个条件限制。

## extract_data 里的关键指标

| 键 | 复盘用途 |
| --- | --- |
| `播放量` | 可能是 `1.1万` 这种缩写，需换算 |
| `划走率` | 第一张就走掉的比例，与播放量强负相关 → 判封面 |
| `封面点击率` | 判封面模板是否生效（低播放时常为 0%/未知，不可信） |
| `平均浏览图片数` | 判页内钩子与页数 → 判版面 |
| `吸粉率` / `涨粉量` | 判末页关注理由 |
| `收藏率` / `收藏量` | 判内容是否「可抄」 |
| `流量来源_*` | 判分发结构（本账号推荐页 93%–99%） |
| `观众年龄_最多` / `观众职业` / `观众区域_最多` | 判内容门槛 |
| `观众喜欢_关注的同类作者` | 找选题空白 |
| `流量激励文案` | 抖音给的同比评价，含「较往期上涨 X%」 |

低播放作品（<300）的比率类指标噪声极大，不要单独据此下结论。

## 注意

- 历史上有几条记录的 `markdown` 被智能提取结果**误覆盖**成了 JSON（07-30、07-23、07-16 等），
  复盘时若 `markdown` 以 `{"话题"` 开头，说明正文已丢，只当数据看。
- 写入新作品统一用 `scripts/shedashi-publish.mjs`，它会保证 `image_previews[0] === cover_url`
  并把期号写进 `outline`。
