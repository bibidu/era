import type { MotionSceneConfig } from './types'

/** 当前线上预览用的默认纵深场景（改视频时同步改这里） */
export const DEFAULT_MOTION_SCENE: MotionSceneConfig = {
  type: 'era_motion_setup',
  version: 1,
  sceneId: 'desk-depth',
  title: '纵深 PC 工作台',
  durationSec: 4,
  resolution: '1280x720',
  videoUrl: `${import.meta.env.BASE_URL}motion/desk-depth-preview.mp4`,
  updatedAt: '2026-08-06T02:00:00.000Z',
  description: [
    '场景：夜间书房，斜后方俯视一台亮屏 PC 工作台（键盘、显示器、台灯、书架）。',
    '时长：约 4 秒｜分辨率：1280×720｜节奏：缓慢、稳定、有呼吸感。',
    '',
    '运动轨迹（镜头）：',
    '1. 起点：稍远、略偏左上，能看到桌面全貌与窗边夜色。',
    '2. 路径：沿桌面中线向前推进（dolly in / 纵深推进），同时轻微右移、轻微下沉，像人走到显示器前。',
    '3. 终点：停在显示器与键盘之间的工作区，屏幕代码区占画面中心偏上。',
    '4. 缩放：整体等效推进约 22%，前景键盘放大更明显，背景书架视差更弱。',
    '5. 速度：ease-in-out，前 0.4s 很慢起势，中间匀速前推，末 0.6s 缓停。',
    '',
    '分层视差：',
    '- 远景（窗/夜空）：几乎不动，只轻微反向漂移',
    '- 中景（书架/墙）：慢于镜头一半',
    '- 主体（显示器+桌面）：跟镜头推进',
    '- 前景（键盘/杯）：推进幅度最大，制造纵深',
    '',
    '禁止：抖动、甩镜、突然拉远、过曝闪白。',
  ].join('\n'),
}
