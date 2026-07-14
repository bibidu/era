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

export interface StylePresetOption {
  id: TextStylePreset
  label: string
  previewColor: string
  previewBg?: string
  previewBorder?: string
}

export const STYLE_PRESETS: StylePresetOption[] = [
  { id: 'border', label: '白边', previewColor: '#000', previewBorder: '2px solid #000' },
  { id: 'plain', label: '常规', previewColor: '#000' },
  { id: 'outline', label: '描边', previewColor: 'transparent', previewBorder: '2px solid #000' },
  { id: 'box', label: '白底', previewColor: '#000', previewBg: '#fff' },
  { id: 'box-stroke', label: '白框', previewColor: '#000', previewBg: '#fff', previewBorder: '1px solid #000' },
  { id: 'fill', label: '灰底', previewColor: '#fff', previewBg: '#6B7280' },
]
