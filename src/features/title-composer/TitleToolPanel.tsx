import {
  BetweenHorizonalStart,
  Baseline,
  MoveHorizontal,
  AlignVerticalSpaceAround,
  Type,
  Palette,
} from 'lucide-react'
import type { TitleTool } from './types'

const TOOLS: { id: TitleTool; label: string; icon: typeof Type }[] = [
  { id: 'break', label: '换行', icon: BetweenHorizonalStart },
  { id: 'size', label: '字号', icon: Baseline },
  { id: 'stretch', label: '拉伸', icon: MoveHorizontal },
  { id: 'gap', label: '间距', icon: AlignVerticalSpaceAround },
  { id: 'font', label: '字体', icon: Type },
  { id: 'color', label: '颜色', icon: Palette },
]

interface TitleToolDockProps {
  activeTool: TitleTool
  onChange: (tool: TitleTool) => void
}

export function TitleToolDock({ activeTool, onChange }: TitleToolDockProps) {
  return (
    <div className="title-tool-dock" role="toolbar" aria-label="标题排版工具">
      {TOOLS.map((tool) => {
        const Icon = tool.icon
        const active = activeTool === tool.id
        return (
          <button
            key={tool.id}
            type="button"
            className={`title-tool-dock__btn ${active ? 'is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(tool.id)}
          >
            <Icon size={18} strokeWidth={1.75} />
            <span>{tool.label}</span>
          </button>
        )
      })}
    </div>
  )
}
