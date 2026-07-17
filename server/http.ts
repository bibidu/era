import http from 'node:http'
import express from 'express'
import cors from 'cors'
import { WebSocketServer } from 'ws'
import { runtime } from './runtime.ts'
import type { HighlightRange } from '../src/agent/protocol.ts'

function asyncHandler(
  handler: (req: express.Request, res: express.Response) => Promise<void>,
): express.RequestHandler {
  return (req, res, next) => {
    handler(req, res).catch(next)
  }
}

export function createAgentApp() {
  const app = express()
  app.use(cors({ origin: true }))
  app.use(express.json({ limit: '32mb' }))

  app.get('/health', (_req, res) => {
    res.json({ ok: true, ...runtime.bridgeStatus() })
  })

  app.get('/v1/bridge/status', (_req, res) => {
    res.json(runtime.bridgeStatus())
  })

  app.get('/v1/fonts', (_req, res) => {
    res.json(runtime.listFonts())
  })

  app.get('/v1/highlight-styles', (_req, res) => {
    res.json(runtime.listHighlightStyles())
  })

  app.post(
    '/v1/projects',
    asyncHandler(async (req, res) => {
      const result = runtime.createProject({
        markdown: req.body?.markdown,
        configPartial: req.body?.config,
        meta: req.body?.meta,
      })
      res.status(201).json(result)
    }),
  )

  app.get(
    '/v1/projects/:projectId',
    asyncHandler(async (req, res) => {
      res.json(runtime.getProject(req.params.projectId))
    }),
  )

  app.put(
    '/v1/projects/:projectId/markdown',
    asyncHandler(async (req, res) => {
      const markdown = String(req.body?.markdown ?? '')
      res.json(runtime.setMarkdown(req.params.projectId, markdown))
    }),
  )

  app.put(
    '/v1/projects/:projectId/title',
    asyncHandler(async (req, res) => {
      const title = String(req.body?.title ?? '')
      if (!title.trim()) {
        res.status(400).json({ error: 'title 不能为空' })
        return
      }
      res.json(runtime.setTitle(req.params.projectId, title))
    }),
  )

  app.patch(
    '/v1/projects/:projectId/config',
    asyncHandler(async (req, res) => {
      res.json(runtime.updateConfig(req.params.projectId, req.body?.patch ?? req.body ?? {}))
    }),
  )

  app.post(
    '/v1/projects/:projectId/highlights',
    asyncHandler(async (req, res) => {
      const ranges = (req.body?.ranges ?? []) as HighlightRange[]
      res.json(runtime.applyHighlights(req.params.projectId, ranges))
    }),
  )

  app.post(
    '/v1/projects/:projectId/preview-layout',
    asyncHandler(async (req, res) => {
      res.json(await runtime.previewLayout(req.params.projectId))
    }),
  )

  app.post(
    '/v1/projects/:projectId/export',
    asyncHandler(async (req, res) => {
      res.json(
        await runtime.exportImages(
          req.params.projectId,
          req.body?.pages,
          req.body?.outDir,
        ),
      )
    }),
  )

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : String(error)
    const status = message.includes('不存在') ? 404 : message.includes('未连接') ? 503 : 500
    res.status(status).json({ error: message })
  })

  return app
}

export async function startAgentServer() {
  const app = createAgentApp()
  const server = http.createServer(app)
  const wss = new WebSocketServer({ server, path: '/bridge' })

  wss.on('connection', (socket) => {
    runtime.registerBridge(socket)
    socket.send(
      JSON.stringify({
        id: 'welcome',
        ok: true,
        data: { message: 'era bridge connected' },
      }),
    )
  })

  await new Promise<void>((resolve) => {
    server.listen(runtime.port, runtime.host, () => resolve())
  })

  console.log(`[era-agent] REST http://${runtime.host}:${runtime.port}`)
  console.log(`[era-agent] Bridge ws://${runtime.host}:${runtime.port}/bridge`)
  console.log(`[era-agent] Output ${runtime.outputDir}`)

  return server
}
