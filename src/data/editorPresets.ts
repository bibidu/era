import type { TextStylePreset } from '../types'

export const PRESET_COLORS = [
  '#FFFFFF',
  '#000000',
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#F5F0DC',
  '#86EFAC',
  '#14B8A6',
  '#3B82F6',
  '#A855F7',
  '#EC4899',
  '#6B7280',
]

export const TEXT_TEMPLATES = [
  { id: 'title', label: '大标题', content: '大标题' },
  { id: 'subtitle', label: '副标题', content: '副标题文字' },
  { id: 'slogan', label: '口号', content: '口号标语' },
  { id: 'date', label: '日期', content: '2026.07.11' },
  { id: 'quote', label: '金句', content: '一句话金句' },
  { id: 'name', label: '署名', content: '@署名' },
]

export interface StylePresetOption {
  id: TextStylePreset
  label: string
  previewColor: string
  previewBg?: string
  previewBorder?: string
}

export const STYLE_PRESETS: StylePresetOption[] = [
  { id: 'border', label: '白边', previewColor: '#fff', previewBorder: '2px solid #fff' },
  { id: 'plain', label: '常规', previewColor: '#fff' },
  { id: 'outline', label: '描边', previewColor: 'transparent', previewBorder: '2px solid #fff' },
  { id: 'box', label: '白底', previewColor: '#000', previewBg: '#fff' },
  { id: 'box-stroke', label: '白框', previewColor: '#000', previewBg: '#fff', previewBorder: '1px solid #000' },
  { id: 'fill', label: '灰底', previewColor: '#fff', previewBg: '#6B7280' },
]
