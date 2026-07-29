const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const ALLOWED_HOST_SUFFIXES = [
  '.aliyuncs.com',
  '.supabase.co',
  '.supabase.in',
] as const

function isAllowedImageUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
    const host = url.hostname.toLowerCase()
    return ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix.slice(1) || host.endsWith(suffix))
  } catch {
    return false
  }
}

function extensionFromUrlOrType(url: string, contentType: string | null): string {
  const type = (contentType || '').toLowerCase()
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg'
  if (type.includes('png')) return 'png'
  if (type.includes('webp')) return 'webp'
  if (type.includes('gif')) return 'gif'
  if (type.includes('svg')) return 'svg'
  try {
    const pathname = new URL(url).pathname
    const match = pathname.match(/\.([a-zA-Z0-9]{2,5})(?:$|\?)/)
    if (match) return match[1].toLowerCase()
  } catch {
    // ignore
  }
  return 'jpg'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const requestUrl = new URL(req.url)
  const target = requestUrl.searchParams.get('url')?.trim() || ''
  if (!target || !isAllowedImageUrl(target)) {
    return new Response(JSON.stringify({ error: 'Invalid or disallowed url' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const upstream = await fetch(target, {
      redirect: 'follow',
      headers: {
        // Some CDNs behave better with a normal browser UA
        'User-Agent': 'EraImageProxy/1.0',
        Accept: 'image/*,*/*;q=0.8',
      },
    })

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: `Upstream ${upstream.status}` }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    if (!contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
      return new Response(JSON.stringify({ error: 'Upstream is not an image' }), {
        status: 415,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const bytes = await upstream.arrayBuffer()
    const ext = extensionFromUrlOrType(target, contentType)
    const filename = `image.${ext}`

    return new Response(bytes, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': contentType.startsWith('image/') ? contentType : `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Proxy fetch failed',
      }),
      {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      },
    )
  }
})
