---
name: era
description: >-
  用 Era 根据用户提供的标题/大纲生成社媒图文（小红书 3:4 / 抖音 9:16），含正文确认、5 个标题候选、高亮建议、布局校验与导出发图。
  在用户提到 era、图文、小红书/抖音出图、用标题生成图文、导出海报长图时必须使用本 skill。
---

# Era 图文生成 Skill

严格按下列流程执行。任何一步未获用户明确「继续 / 确认」前，不得跳步。

## 0. 前置：确认 Era 服务可用

每次开跑必须先确认服务：

1. 在仓库根目录执行：`bash scripts/ensure-era-ready.sh`（或 `npm run start:local-agent`）
2. 检查 `curl -s http://127.0.0.1:3847/health` 返回 `ok: true`
3. 检查 bridge 已连接（`connected: true`）。若未连接：确保前端 `http://127.0.0.1:5173/era/` 已在浏览器打开且出现 Agent 指示
4. 优先用 MCP 工具（`era_*`）；若无 MCP，用 REST `http://127.0.0.1:3847/v1/...`

云端 Agent：同样在本仓库拉起上述服务；导出后把 `output/` 下 PNG 作为附件发给用户。

画幅约定：`3:4` = 小红书；`9:16` = 抖音。

---

## 1. 收集选题

- 若用户**未**提供标题或大纲 → **主动询问**，拿到之前不要写正文。
- 若已提供 → 进入下一步。

---

## 2. 正文（多轮确认）

1. 根据标题/大纲写一版 Markdown 正文（含 `#` 一级标题与适量 `##`）。
2. 展示全文后**明确询问**：是否继续？
3. 用户提出修改 → 改完后再展示，并再次询问是否继续。
4. 只有用户明确说继续 / 确认正文后，才进入标题阶段。
5. 确认后：`era_create_project` / `era_set_markdown` 写入工程（先不必定死画幅）。

---

## 3. 社媒标题（5 个 + 确认）

1. 给出 **5 个**抓眼球、有亮点、贴合正文的社媒标题。
2. **标题里的技术名词首字母大写**（如 `Memory`、`Agent`、`Token`），不要写成 `memory`。
3. 询问是否继续（或选第几个 / 如何改）。
4. 多轮修改直到用户选定标题并说继续。
5. 执行 `era_set_title` 写入选定标题。

---

## 4. 高亮建议（确认后再写入）

主动给出高亮方案，规则：

- **标题必须有高亮**，且**标题必须至少有一处画圈（circle）**
- **禁止**对标题使用 `quote`（引用条）；标题可用 `brush` / `underline` / `circle`
- **任何画圈词语渲染时都不可折行**（圈住的连续文字必须落在同一视觉行；`preview_layout` 会报 `circle_wrapped` / `title_circle_wrapped`）。若折行：优先微调字号（标题**可以偏大，不要过小**，一般不要低于约 48），并**收紧标题行高**（`titleLineHeight` 建议 ≤ 1.12）
- **每一页尽量都有一些高亮**
- **全文高亮颜色种类 ≤ 3**（含所有 brush/underline/circle/quote）
- 用自然语言说明「哪段哪几个字 + 何种样式 + 颜色」
- **给用户看颜色时禁止只甩 hex**：必须用可读名称（如「明黄 / 警示红 / 天蓝」），括号里可附带 hex 供写入 API
- 推荐控制在 3 色内，例如：
  - 明黄 `#FACC15` · 警示红 `#EF4444` · 天蓝 `#3B82F6`
- 列出将调用的 range（`blockId/start/end/style/color`）；`blockId` 必须来自工程 blocks

询问是否继续。用户确认后执行 `era_apply_highlights`。

---

## 5. 导出平台

询问：导出抖音（`9:16`）、小红书（`3:4`），还是两个都要？

- **默认：两个都导出**
- 用户说继续且未改默认 → 按双平台执行

---

## 6. 校验（每种比例都要做）

对每个目标 `aspectRatio` 分别：

1. `era_update_config` 设 `aspectRatio`（并确认 `titleLineHeight` 不过松）
2. `era_preview_layout`
3. 若有告警必须先修再导出，包括：
   - 单行溢出、孤行、独行标点
   - **标题缺少画圈**
   - **画圈词语跨行**（`circle_wrapped` / `title_circle_wrapped`）
   - **高亮颜色超过 3 种**
   - **标题行高过松**
4. 通过后再对该比例 `era_export_images`

---

## 7. 发图与返工

1. 检测全部通过后，把**真正的 PNG**发给用户。
2. 若用户有改动意见 → 修改 → **重新校验 → 重新导出 → 再发图**。
3. 每次改完仍要问是否还要继续调整，直到用户满意。

---

## 工具速查

| 动作 | MCP / REST |
| --- | --- |
| 建工程 | `era_create_project` · `POST /v1/projects` |
| 写正文 | `era_set_markdown` · `PUT .../markdown` |
| 写标题 | `era_set_title` · `PUT .../title` |
| 画幅 | `era_update_config` · `PATCH .../config` |
| 高亮 | `era_apply_highlights` · `POST .../highlights` |
| 校验 | `era_preview_layout` · `POST .../preview-layout` |
| 导出 | `era_export_images` · `POST .../export` |
| 通道 | `era_bridge_status` · `GET /v1/bridge/status` |

更多协议见仓库 `docs/agent-mcp-design.md`。
