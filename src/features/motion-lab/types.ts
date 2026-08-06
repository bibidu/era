export const ERA_MOTION_SETUP_MARKER = 'ERA_MOTION_SETUP_V1'
export const ERA_MOTION_SETUP_TYPE = 'era_motion_setup' as const

export interface MotionSceneConfig {
  type: typeof ERA_MOTION_SETUP_TYPE
  version: 1
  sceneId: string
  title: string
  durationSec: number
  resolution: string
  videoUrl: string
  /** 给人读的运动轨迹描述（可在页面里改） */
  description: string
  updatedAt: string
}

export function serializeMotionSetup(config: MotionSceneConfig): string {
  const payload = {
    type: config.type,
    version: config.version,
    sceneId: config.sceneId,
    title: config.title,
    durationSec: config.durationSec,
    resolution: config.resolution,
    description: config.description,
    updatedAt: config.updatedAt,
  }
  return [
    ERA_MOTION_SETUP_MARKER,
    '请把下面整段发给 AI；AI 应按 description 更新运动预览视频，并把最新描述写回页面。',
    '```json',
    JSON.stringify(payload, null, 2),
    '```',
  ].join('\n')
}

export function parseMotionSetup(raw: string): Partial<MotionSceneConfig> | null {
  const text = raw.trim()
  if (!text) return null
  const tryParse = (candidate: string): Partial<MotionSceneConfig> | null => {
    try {
      const data = JSON.parse(candidate) as Partial<MotionSceneConfig>
      if (data?.type !== ERA_MOTION_SETUP_TYPE) return null
      if (typeof data.description !== 'string') return null
      return data
    } catch {
      return null
    }
  }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    const parsed = tryParse(fenced[1].trim())
    if (parsed) return parsed
  }
  const brace = text.indexOf('{')
  if (brace >= 0) return tryParse(text.slice(brace))
  return null
}
