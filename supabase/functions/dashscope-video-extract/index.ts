const DASHSCOPE_ENDPOINT =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type DashScopeContentBlock =
  | string
  | {
      text?: string
      [key: string]: unknown
    }

interface DashScopeResponse {
  output?: {
    text?: string
    choices?: Array<{
      message?: {
        content?: string | DashScopeContentBlock[]
      }
    }>
  }
  message?: string
  request_id?: string
}

interface ExtractRequest {
  apiKey?: string
  model?: string
  video?: string
  fps?: number
  prompt?: string
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      ...init.headers,
    },
  })
}

function extractMarkdownFromResponse(data: DashScopeResponse) {
  const choiceContent = data.output?.choices?.[0]?.message?.content

  if (typeof choiceContent === 'string') {
    return choiceContent
  }

  if (Array.isArray(choiceContent)) {
    const parts = choiceContent
      .map((block) => {
        if (typeof block === 'string') {
          return block
        }
        if (typeof block.text === 'string') {
          return block.text
        }
        return JSON.stringify(block, null, 2)
      })
      .filter(Boolean)

    if (parts.length > 0) {
      return parts.join('\n\n')
    }
  }

  if (typeof data.output?.text === 'string') {
    return data.output.text
  }

  return JSON.stringify(data, null, 2)
}

function parseDashScopeResponse(text: string) {
  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text) as DashScopeResponse
  } catch {
    return { message: text }
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const body = (await request.json()) as ExtractRequest
    const apiKey = body.apiKey?.trim() || Deno.env.get('DASHSCOPE_API_KEY')?.trim()
    const model = body.model?.trim() || 'qwen3.7-flash'
    const video = body.video?.trim()
    const prompt = body.prompt?.trim()
    const fps = Number.isFinite(body.fps) && body.fps && body.fps > 0 ? body.fps : 2

    if (!apiKey) {
      return jsonResponse({ error: 'Missing DashScope API key' }, { status: 400 })
    }
    if (!video) {
      return jsonResponse({ error: 'Missing video input' }, { status: 400 })
    }
    if (!prompt) {
      return jsonResponse({ error: 'Missing extraction prompt' }, { status: 400 })
    }

    const dashscopeResponse = await fetch(DASHSCOPE_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: {
          messages: [
            {
              role: 'user',
              content: [
                {
                  video,
                  fps,
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
        },
      }),
    })

    const text = await dashscopeResponse.text()
    const data = parseDashScopeResponse(text)

    if (!dashscopeResponse.ok) {
      return jsonResponse(
        {
          error: data.message || text || `DashScope HTTP ${dashscopeResponse.status}`,
          requestId: data.request_id || null,
        },
        { status: dashscopeResponse.status },
      )
    }

    return jsonResponse({
      markdown: extractMarkdownFromResponse(data),
      requestId: data.request_id || null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse({ error: message }, { status: 500 })
  }
})
