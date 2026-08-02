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
  model?: string
  media?: MediaInput[]
  video?: string
  fps?: number
  prompt?: string
}

interface MediaInput {
  type?: 'image' | 'video'
  url?: string
  fps?: number
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

function normalizeMedia(body: ExtractRequest, defaultFps: number) {
  const inputs = Array.isArray(body.media)
    ? body.media
    : body.video
      ? [{ type: 'video' as const, url: body.video, fps: defaultFps }]
      : []

  return inputs
    .map((item) => {
      const url = item.url?.trim()
      if (!url) {
        return null
      }

      if (item.type === 'image') {
        return { image: url }
      }

      return {
        video: url,
        fps: Number.isFinite(item.fps) && item.fps && item.fps > 0 ? item.fps : defaultFps,
      }
    })
    .filter((item): item is { image: string } | { video: string; fps: number } => Boolean(item))
}

/** 过大请求体易触发 WORKER_RESOURCE_LIMIT；约 3.5MB 字符提前拒绝 */
const MAX_REQUEST_CHARS = 3_500_000
const MAX_MEDIA_ITEMS = 12

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_CHARS) {
      return jsonResponse(
        {
          error:
            'Request payload too large for Edge Function. Shorten the video, lower FPS, or use a public video URL.',
          code: 'PAYLOAD_TOO_LARGE',
        },
        { status: 413 },
      )
    }

    const rawBody = await request.text()
    if (rawBody.length > MAX_REQUEST_CHARS) {
      return jsonResponse(
        {
          error:
            'Request payload too large for Edge Function. Shorten the video, lower FPS, or use a public video URL.',
          code: 'PAYLOAD_TOO_LARGE',
        },
        { status: 413 },
      )
    }

    let body: ExtractRequest
    try {
      body = JSON.parse(rawBody) as ExtractRequest
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const apiKey = Deno.env.get('DASHSCOPE_API_KEY')?.trim()
    const model = body.model?.trim() || 'qwen3.7-flash'
    const prompt = body.prompt?.trim()
    const fps = Number.isFinite(body.fps) && body.fps && body.fps > 0 ? body.fps : 1
    let mediaContent = normalizeMedia(body, fps)

    if (!apiKey) {
      return jsonResponse({ error: 'Server missing DashScope API key' }, { status: 500 })
    }
    if (mediaContent.length === 0) {
      return jsonResponse({ error: 'Missing video input' }, { status: 400 })
    }
    if (mediaContent.length > MAX_MEDIA_ITEMS) {
      mediaContent = mediaContent.slice(0, MAX_MEDIA_ITEMS)
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
                ...mediaContent,
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