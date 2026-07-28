---
name: fengmian
description: >-
  【封面skill】按瑞士/技术编辑风生成 9:16 社媒封面。用户提供大标题（可多行、可指定颜色）、小标题、描述、标签、二级标题、主题色后，渲染并返回一张封面图。
  当用户说「封面skill」、封面、社媒封面、生成封面、cover skill、做一张封面时必须使用本 skill。
---

# 封面 Skill（社媒封面生成）

基于参考封面（Swiss / International Typographic + 技术蓝图感）提取的固定视觉系统。用户给出文案字段后，**直接出一张 9:16 PNG**，不要走图文 skill / Era 多页流程。

## 0. 触发条件

命中任一即启用本 skill：

- 「封面skill」/ `/fengmian` /「cover skill」
- 「生成封面」「做一张封面」「社媒封面」
- 用户明确按字段传入：大标题 +（小标题/描述/标签/二级标题/主题色）并要求出封面图

**不要**与「图文skill / era」混淆：封面是单张 9:16 封面，不是 Markdown 分页长图。

---

## 1. 收集字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `bigTitle` | ✅ | 大标题；可多行（`\\n` 换行，或 JSON 数组）；英文建议全大写、可叠行 |
| `bigTitleColor` | | 大标题默认颜色，默认 `#111111`（黑色） |
| `bigTitleLineColors` | | 按行覆盖颜色（数组/逗号分隔）；也可用 `bigTitle: [{text, color}]` 指定单行颜色 |
| `smallTitle` | 建议 | 中文小标题 |
| `description` | 建议 | 一行短描述 |
| `tags` | 建议 | 多个标签（数组或逗号分隔） |
| `secondaryTitles` | 建议 | 页脚二级标题，建议 2–4 个 |
| `themeColor` | | 主题色 hex；**未提供则随机**一个社媒友好色 |
| `badge` | | 左上角徽章，默认 `skill` |

缺必填大标题时先问用户；其它字段可缺省（对应区块不渲染）。

主题色未指定时：脚本会从焦橙 / 明黄 / 翠绿 / 宝蓝 / 紫靛 / 玫红 / 青绿 / 珊瑚中随机；出图后在回复里告知选用的颜色名与 hex。

---

## 2. 视觉规范（必须遵守）

复刻参考封面的感觉，禁止改成插画风、渐变炫光、卡片堆叠、或默认 AI 紫白风。

1. **画布**：固定 `1080×1920`（`9:16`），背景浅米白 `#F6F4EF`
2. **核心区（重要）**：除背景色与正方形网格外，**所有内容**落在上下居中、**左右各留 20px** 的 **3:4** 区域（`1040×1387`，左右内缩增强中心感）。因 9:16 社媒个人主页预览裁的是画面中心 3:4。正方形网格铺满整张 9:16。可用 `node scripts/generate-cover-layout-review.mjs <cover.png>` 生成标注对照图与 3:4 裁切预览。
3. **主题色**：只用于徽章底、强调短横线、细边框/十字线、大几何色块、页脚图标
4. **大标题**：超粗、高压缩无衬线（Anton / Impact 系），全大写，占核心区上半视觉重量；颜色用 `bigTitleColor`
5. **信息区**：主题色短横线 → 粗体小标题 → 常规描述 → 浅底圆角标签条（`·` 分隔）
6. **页脚**：二级标题横排，前缀线稿图标，竖线分隔
7. **装饰**：角落点阵、右侧大圆色块出血（**右上或右下随机**，直径约为原参考的 1.5 倍）、细同心圆弧（均在核心区内）
8. **留白**：核心区中部保持呼吸感；小标题相对上方主标题区需有明显间距（约 `96px`）

---

## 3. 出图（唯一推荐路径）

仓库根目录执行渲染脚本（Playwright + HTML 模板，保证风格稳定）：

```bash
node scripts/generate-cover.mjs --input cover.json
# 或直接传参：
node scripts/generate-cover.mjs \
  --bigTitle "WEBNOVEL\\nWRITER" \
  --bigTitleColor "#111111" \
  --smallTitle "AI 长篇网文系统" \
  --description "先建世界，再写几十章" \
  --tags "世界观,地域,力量体系,长期记忆" \
  --secondaryTitles "写作合约,审查闸门,章节提交" \
  --themeColor "#E85D04" \
  --out output/cover.png
```

`cover.json` 示例：

```json
{
  "bigTitle": "SEEDANCE",
  "bigTitleColor": "#111111",
  "smallTitle": "AI 视频导演流",
  "description": "不是堆词，是导演工作流",
  "tags": ["分镜叙事", "镜头控制"],
  "secondaryTitles": ["导演模式", "镜头语言", "成片导出"],
  "themeColor": "#6D28D9",
  "out": "output/cover.png"
}
```

成功时 stdout 为 JSON：`ok`、`path`、`themeColor`、`themeName`、`size`。

依赖：`npm install` 后需可用 Playwright Chromium（`npx playwright install chromium`）。若首次失败，先装浏览器再重跑。

---

## 4. 交付

1. 把生成的 PNG（`path`）作为图片发给用户
2. 简短说明：主题色、大标题颜色、输出尺寸 `1080×1920 / 9:16`
3. 询问是否要改文案或换主题色；若要改 → 改字段后重新跑脚本，再发新图
4. **禁止**用口头描述代替真实出图；**禁止**假装已生成

---

## 5. 与图文 skill 的边界

| | 封面skill | 图文skill |
| --- | --- | --- |
| 产物 | 单张 9:16 封面 | 多页图文长图 |
| 引擎 | `scripts/generate-cover.mjs` | Era + Bridge 导出 |
| 输入 | 标题/标签等短字段 | Markdown 正文 + 高亮 |
| 确认流 | 出图后可改 | 正文→标题→高亮逐步确认 |

用户只要封面时只用本 skill；只要图文分页时用图文skill。
