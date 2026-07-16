export type GraphicBackgroundType = 'reference' | 'solid'
export type GraphicAspectRatio = '3:4' | '9:16'
export type GraphicPageOverlay = 'none' | 'grid' | 'pixel' | 'gradient'

export const GRAPHIC_ASPECT_RATIO_OPTIONS: { id: GraphicAspectRatio; label: string }[] = [
  { id: '9:16', label: '9:16' },
  { id: '3:4', label: '3:4' },
]

export interface GraphicTextConfig {
  titleFontId: string
  titleFontFamily: string
  headingFontId: string
  headingFontFamily: string
  bodyFontId: string
  bodyFontFamily: string
  codeFontId: string
  codeFontFamily: string
  titleFontSize: number
  headingFontSize: number
  bodyFontSize: number
  codeFontSize: number
  titleLineHeight: number
  bodyLineHeight: number
  headingLineHeight: number
  codeLineHeight: number
  titleMarginTop: number
  titleMarginBottom: number
  headingMarginTop: number
  headingMarginBottom: number
  codeBackgroundColor: string
  paperColor: string
  aspectRatio: GraphicAspectRatio
  backgroundType: GraphicBackgroundType
  pageOverlay: GraphicPageOverlay
  overlayStacked: boolean
  topText: string
  backgroundUrl: string | null
  underlineHighlightColors: Record<string, string>
  brushHighlightColors: Record<string, string>
  quoteHighlightColors: Record<string, string>
  circleHighlightColors: Record<string, string>
  highlightPickerColor: string
}

export type MarkdownBlockType = 'title' | 'heading' | 'paragraph' | 'list' | 'quote' | 'code' | 'image'

export interface MarkdownBlock {
  id: string
  type: MarkdownBlockType
  styleType?: MarkdownBlockType
  text: string
  isBlockEnd?: boolean
  sourceBlockId?: string
  charOffset?: number
  imageUrl?: string
  imageWidth?: number
  imageHeight?: number
}

export interface GraphicTextPage {
  index: number
  blocks: MarkdownBlock[]
}

const DEFAULT_SONG_FONT_ID = 'song'
const DEFAULT_SONG_FONT_FAMILY = '"Noto Serif SC", serif'
const DEFAULT_CODE_FONT_ID = 'menlo'
const DEFAULT_CODE_FONT_FAMILY = 'Menlo, monospace'

export const DEFAULT_GRAPHIC_TEXT_CONFIG: GraphicTextConfig = {
  titleFontId: DEFAULT_SONG_FONT_ID,
  titleFontFamily: DEFAULT_SONG_FONT_FAMILY,
  headingFontId: DEFAULT_SONG_FONT_ID,
  headingFontFamily: DEFAULT_SONG_FONT_FAMILY,
  bodyFontId: DEFAULT_SONG_FONT_ID,
  bodyFontFamily: DEFAULT_SONG_FONT_FAMILY,
  codeFontId: DEFAULT_CODE_FONT_ID,
  codeFontFamily: DEFAULT_CODE_FONT_FAMILY,
  titleFontSize: 56,
  headingFontSize: 20,
  bodyFontSize: 13,
  codeFontSize: 12,
  titleLineHeight: 1.18,
  bodyLineHeight: 1.64,
  headingLineHeight: 1.18,
  codeLineHeight: 1.5,
  titleMarginTop: 1.2,
  titleMarginBottom: 0.32,
  headingMarginTop: 0.88,
  headingMarginBottom: 0.32,
  codeBackgroundColor: '#F2F2F2',
  paperColor: '#FBF7ED',
  aspectRatio: '9:16',
  backgroundType: 'solid',
  pageOverlay: 'grid',
  overlayStacked: false,
  topText: '',
  backgroundUrl: null,
  underlineHighlightColors: {},
  brushHighlightColors: {},
  quoteHighlightColors: {},
  circleHighlightColors: {},
  highlightPickerColor: '#FACC15',
}

export const DEFAULT_MARKDOWN = `# 工程团队想抄 Dynamic Workflows ，我把它拆透了

> Git Worktree 可以让多个 Agent 在同一个仓库中并行开发，同时保持工作目录互相隔离。

## 1. 先拆分任务

- 每个 Agent 负责明确的功能范围
- 尽量避免同时修改同一个文件
- 为每个任务创建独立分支

## 2. 创建独立 Worktree

每个 Agent 都在自己的 worktree 中工作，拥有独立的文件目录、依赖状态和开发进度。

\`\`\`bash
git worktree add ../agent-a-ui -b feature/ui agent/main
cd ../agent-a-ui && npm install
\`\`\`

> 一个 Agent 对应一个分支和一个 worktree。

## 3. 并行执行

Agent A 开发界面，Agent B 实现业务逻辑，Agent C 编写测试。它们可以同时运行，互不阻塞。

## 4. 统一通过 PR 合并

任务完成后分别提交 Pull Request，通过代码审查和自动化测试后再合并到主分支。`
