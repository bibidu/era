# Dify 工作流节点说明（Agent 主导）

入口变量在开始节点声明，后续节点透传。

## 入口变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `topic_or_outline` | 是 | 选题关键词或大纲 |
| `tone` | 否 | 语气 |
| `audience` | 否 | 受众 |
| `aspect_ratio` | 否 | `3:4` 小红书 / `9:16` 抖音，默认 `9:16` |

## 节点拆分

```
[开始]
  topic_or_outline, tone?, audience?, aspect_ratio?
    ↓
[LLM·生成内容] DeepSeek
  → draft_markdown
    ↓
（Agent/IM 人工确认内容 → confirmed_markdown）
    ↓
[LLM·生成标题] DeepSeek
  → title_candidates（3～5 个）
    ↓
（Agent/IM 人工确认标题 → confirmed_title）
    ↓
[LLM·生成高亮方案] DeepSeek
  输入：confirmed_markdown + blocks(含 blockId) + 样式枚举
  → highlight_ranges JSON
    ↓
（高亮默认自动，不强制人工）
    ↓
[HTTP] POST http://host.docker.internal:3847/v1/projects
  body: { markdown, config: { aspectRatio }, meta: { topic, title } }
    ↓
[HTTP] PUT .../title
[HTTP] POST .../highlights  { ranges }
[HTTP] POST .../preview-layout
[HTTP] POST .../export
    ↓
[结束] image paths
```

> 人工确认节点不放在 Dify 内（方案 2）：由 WorkBuddy/OpenClaw 在 IM 完成后再把确认结果写入后续变量或直接调 Era REST/MCP。

## HTTP 节点示例

### 创建工程

`POST /v1/projects`

```json
{
  "markdown": "{{confirmed_markdown}}",
  "meta": { "topic": "{{topic_or_outline}}", "title": "{{confirmed_title}}" },
  "config": { "aspectRatio": "{{aspect_ratio}}" }
}
```

### 应用高亮

`POST /v1/projects/{{project_id}}/highlights`

```json
{
  "ranges": [
    {
      "style": "brush",
      "blockId": "…::0::paragraph",
      "start": 0,
      "end": 6,
      "color": "#FACC15"
    }
  ]
}
```

### 布局检测 / 导出

- `POST /v1/projects/{{project_id}}/preview-layout`
- `POST /v1/projects/{{project_id}}/export`

二者都要求本机浏览器已连接 Era Agent Bridge。

## 高亮 LLM 输出约定

模型应只输出 JSON 数组，字段与 `HighlightRange` 一致；`blockId` 必须来自 `era_set_markdown` / `GET /v1/projects/:id` 返回的 `blocks[].id`。
