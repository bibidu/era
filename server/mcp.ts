import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { ERA_AGENT_DEFAULT_HOST, ERA_AGENT_DEFAULT_PORT } from '../src/agent/protocol.ts'

const BASE =
  process.env.ERA_AGENT_URL ??
  `http://${process.env.ERA_AGENT_HOST ?? ERA_AGENT_DEFAULT_HOST}:${process.env.ERA_AGENT_PORT ?? ERA_AGENT_DEFAULT_PORT}`

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : `${response.status} ${response.statusText}`
    throw new Error(message)
  }
  return data as T
}

function ok(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  }
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return {
    isError: true,
    content: [{ type: 'text' as const, text: message }],
  }
}

const highlightRangeSchema = z.object({
  style: z.enum(['underline', 'brush', 'quote', 'circle']),
  blockId: z.string(),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  color: z.string(),
})

async function main() {
  const server = new McpServer({
    name: 'era-agent',
    version: '1.0.0',
  })

  server.tool(
    'era_bridge_status',
    '检查本机 Era 浏览器控制通道是否已连接（方案 B）',
    {},
    async () => {
      try {
        return ok(await api('GET', '/v1/bridge/status'))
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.tool(
    'era_create_project',
    '创建图文工程。aspectRatio: 3:4=小红书，9:16=抖音',
    {
      markdown: z.string().optional().describe('初始 Markdown 正文'),
      topic: z.string().optional(),
      aspectRatio: z.enum(['3:4', '9:16']).optional(),
    },
    async ({ markdown, topic, aspectRatio }) => {
      try {
        return ok(
          await api('POST', '/v1/projects', {
            markdown,
            meta: topic ? { topic } : undefined,
            config: aspectRatio ? { aspectRatio } : undefined,
          }),
        )
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.tool(
    'era_get_project',
    '读取工程快照与 block 列表（含可用于高亮的 blockId）',
    { projectId: z.string() },
    async ({ projectId }) => {
      try {
        return ok(await api('GET', `/v1/projects/${projectId}`))
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.tool(
    'era_set_markdown',
    '写入/替换工程 Markdown 正文，返回 blockId 列表供高亮 range 使用',
    {
      projectId: z.string(),
      markdown: z.string(),
    },
    async ({ projectId, markdown }) => {
      try {
        return ok(await api('PUT', `/v1/projects/${projectId}/markdown`, { markdown }))
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.tool(
    'era_set_title',
    '设置或更新一级标题（# 标题）',
    {
      projectId: z.string(),
      title: z.string(),
    },
    async ({ projectId, title }) => {
      try {
        return ok(await api('PUT', `/v1/projects/${projectId}/title`, { title }))
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.tool(
    'era_update_config',
    '部分更新图文配置（字体、纸色、aspectRatio 等）。3:4 小红书 / 9:16 抖音',
    {
      projectId: z.string(),
      patch: z.record(z.string(), z.unknown()),
    },
    async ({ projectId, patch }) => {
      try {
        return ok(await api('PATCH', `/v1/projects/${projectId}/config`, { patch }))
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.tool(
    'era_apply_highlights',
    '按字符 range 批量应用高亮（blockId + start/end，end 不含）',
    {
      projectId: z.string(),
      ranges: z.array(highlightRangeSchema),
    },
    async ({ projectId, ranges }) => {
      try {
        return ok(await api('POST', `/v1/projects/${projectId}/highlights`, { ranges }))
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.tool(
    'era_preview_layout',
    '浏览器内分页预览并检测：单行溢出、孤行、独行标点（需已打开本地 Era）',
    { projectId: z.string() },
    async ({ projectId }) => {
      try {
        return ok(await api('POST', `/v1/projects/${projectId}/preview-layout`, {}))
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.tool(
    'era_export_images',
    '在已连接的浏览器中导出 PNG：生成各页图片，并额外生成纵向拼图 graphic-review-sheet.png（sheetPath）供用户先审阅确认',
    {
      projectId: z.string(),
      pages: z.array(z.number().int().nonnegative()).optional().describe('0-based 页码，默认全部'),
      outDir: z.string().optional(),
    },
    async ({ projectId, pages, outDir }) => {
      try {
        return ok(await api('POST', `/v1/projects/${projectId}/export`, { pages, outDir }))
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.tool('era_list_fonts', '列出可选字体', {}, async () => {
    try {
      return ok(await api('GET', '/v1/fonts'))
    } catch (error) {
      return fail(error)
    }
  })

  server.tool('era_list_highlight_styles', '列出高亮样式与画幅风格说明', {}, async () => {
    try {
      return ok(await api('GET', '/v1/highlight-styles'))
    } catch (error) {
      return fail(error)
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
