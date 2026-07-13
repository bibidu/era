export type GraphicTemplate = 'reference' | 'solid' | 'grid'
export type EdgeStyle = 'minimal' | 'bar' | 'outline'

export interface GraphicTextConfig {
  fontId: string
  fontFamily: string
  titleFontSize: number
  bodyFontSize: number
  themeColor: string
  template: GraphicTemplate
  topStyle: EdgeStyle
  bottomStyle: EdgeStyle
  topText: string
  bottomText: string
  backgroundUrl: string | null
}

export type MarkdownBlockType = 'title' | 'heading' | 'paragraph' | 'list' | 'quote'

export interface MarkdownBlock {
  id: string
  type: MarkdownBlockType
  text: string
}

export interface GraphicTextPage {
  index: number
  blocks: MarkdownBlock[]
}

export const DEFAULT_GRAPHIC_TEXT_CONFIG: GraphicTextConfig = {
  fontId: 'system',
  fontFamily: '"Noto Sans SC", system-ui, sans-serif',
  titleFontSize: 34,
  bodyFontSize: 20,
  themeColor: '#FACC15',
  template: 'reference',
  topStyle: 'bar',
  bottomStyle: 'minimal',
  topText: '图文笔记',
  bottomText: '滑动查看下一页',
  backgroundUrl: null,
}

export const DEFAULT_MARKDOWN = `# 多 Agent 如何并行工作

Git Worktree 可以让多个 Agent 在同一个仓库中并行开发，同时保持工作目录互相隔离。

## 1. 先拆分任务

- 每个 Agent 负责明确的功能范围
- 尽量避免同时修改同一个文件
- 为每个任务创建独立分支

## 2. 创建独立 Worktree

每个 Agent 都在自己的 worktree 中工作，拥有独立的文件目录、依赖状态和开发进度。

> 一个 Agent 对应一个分支和一个 worktree。

## 3. 并行执行

Agent A 开发界面，Agent B 实现业务逻辑，Agent C 编写测试。它们可以同时运行，互不阻塞。

## 4. 统一通过 PR 合并

任务完成后分别提交 Pull Request，通过代码审查和自动化测试后再合并到主分支。`
