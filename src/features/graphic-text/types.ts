import type { GradientOverlayVariant } from './pageGradientOverlay'
import { DEFAULT_GRADIENT_VARIANT } from './pageGradientOverlay'

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
  gradientVariant: GradientOverlayVariant
  topText: string
  backgroundUrl: string | null
  underlineHighlightColors: Record<string, string>
  handUnderlineHighlightColors: Record<string, string>
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
  gradientVariant: DEFAULT_GRADIENT_VARIANT,
  topText: '',
  backgroundUrl: null,
  underlineHighlightColors: {},
  handUnderlineHighlightColors: {},
  brushHighlightColors: {},
  quoteHighlightColors: {},
  circleHighlightColors: {},
  highlightPickerColor: '#FACC15',
}

export const DEFAULT_MARKDOWN = `# 提示词的终极分水岭：为什么"可量化的测试方案"才是复杂任务的灵魂？

大家在调教 AI 执行复杂任务时，有没有遇到过这种令人抓狂的循环？

- 初见惊艳，再见拉胯：给了长篇大论的指令，AI 第一次跑得堪称完美，第二次换了个输入，就莫名其妙地开始"摆烂"和"降智"。
- 按下葫芦起了瓢：为了修补上一次输出的某个边缘漏洞（Corner Case），你又在提示词里塞了一堆限制条件。结果漏洞是堵上了，但整体输出却变得臃肿、生硬，甚至连原本能写好的地方也缩水了。
- 开盲盒式的 Debug：总觉得 AI 在和你玩"猜心游戏"，你只能像赌徒一样，无助地一遍遍点击那个弯曲的 "Regenerate" 按钮。

其实，写了这么多提示词，走过无数弯路后，我越来越意识到一个真相：在面对复杂任务时，最能拉开 Prompt 质量差距的，从来不是"如何行动"的步骤描述，而是"如何验货"的测试方案。

甚至可以说：一个真正成熟的 Prompt，本质上不是一段说明书，而是一个自带自测逻辑的微型自动化程序。

## 为什么"可量化的测试方案"是降本增效的终极武器？

现在很多厉害的 Agent 确实学会了自动帮你规划测试，但在 Prompt 层面由人类直接植入一套可量化的测试方案，依然是无法被替代的。它在三个维度上彻底改变了人机协作的效率：

### 1. 它是 AI 自我修正的"方向盘"

如果没有明确的测试标准，AI 在生成内容时就像是在蒙着眼睛开车。你写了再多的"你应该..."，它也只能凭感觉往前开。但一旦你给了它一套可量化的测试指标，它在将结果呈现给你之前，就可以在后台进行"自我比对"。如果测试不通过，它自己就知道往哪个方向修正，而不是瞎猜。

### 2. 它能省下惊人的 Token 与等待时间

在复杂任务或长链条的工作流中，人工反复 Debug 的成本极高。

试想一下：如果 AI 的第一步输出就偏离了方向，而你没有设置拦截，这个错误就会像滚雪球一样，带偏后面所有的调用环节。

一个量化的测试方案，相当于在第一关装了"红外线检测仪"。一旦不合格，立刻触发重试或报错熔断。这比你把一堆垃圾数据喂给后续工作流，结果卡死在半路上，要节省成百上千倍的时间和 Token。

### 3. 它是将主观需求"客观化"的唯一途径

"帮我写一篇生动的技术科普"，这里的"生动"是主观的，AI 根本无法衡量。

而"确保文中至少包含 2 个生活中的类比，且专业术语的占比小于 10%"，这就是客观且可量化的。AI 对后者的理解不会产生任何偏差，执行成功率几乎是 100%。`
