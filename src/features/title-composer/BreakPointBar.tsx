import type { ReactNode } from 'react'
import type { TitleDocument, TitleTool } from './types'
import { lineText } from './model'

interface BreakPointBarProps {
  doc: TitleDocument
  selectedLineId: string | null
  activeTool: TitleTool
  onSelectLine: (lineId: string) => void
  onSplitAt: (globalIndex: number) => void
  onMergeAt: (lineIndex: number) => void
}

/**
 * 断点条：字符横滑，字符间点「+」断行；行末「×」可与下一行合并。
 * 手机上比在键盘里敲回车更准。
 */
export function BreakPointBar({
  doc,
  selectedLineId,
  activeTool,
  onSelectLine,
  onSplitAt,
  onMergeAt,
}: BreakPointBarProps) {
  const breakMode = activeTool === 'break'
  let globalIndex = 0

  return (
    <div className="title-break-bar" data-active={breakMode ? 'true' : 'false'}>
      <div className="title-break-bar__hint">
        {breakMode ? '点字符间的竖线断行；点行末 × 合并' : '点下方工具「换行」后可改断点'}
      </div>
      <div className="title-break-bar__scroll component-scroll-row">
        {doc.lines.map((line, lineIndex) => {
          const selected = line.id === selectedLineId
          const nodes: ReactNode[] = []

          nodes.push(
            <button
              key={`line-tag-${line.id}`}
              type="button"
              className={`title-break-bar__line-tag ${selected ? 'is-selected' : ''}`}
              onClick={() => onSelectLine(line.id)}
            >
              {lineIndex + 1}
            </button>,
          )

          line.chars.forEach((char, charIndex) => {
            if (charIndex > 0) {
              const splitIndex = globalIndex
              nodes.push(
                <button
                  key={`split-${line.id}-${char.id}`}
                  type="button"
                  className="title-break-bar__split"
                  aria-label={`在「${lineText(line).slice(0, charIndex)}」后断行`}
                  disabled={!breakMode}
                  onClick={() => onSplitAt(splitIndex)}
                >
                  <span />
                </button>,
              )
            }
            nodes.push(
              <button
                key={char.id}
                type="button"
                className="title-break-bar__char"
                style={{ color: char.color ?? line.color }}
                onClick={() => onSelectLine(line.id)}
              >
                {char.ch}
              </button>,
            )
            globalIndex += 1
          })

          if (lineIndex < doc.lines.length - 1) {
            nodes.push(
              <button
                key={`merge-${line.id}`}
                type="button"
                className="title-break-bar__merge"
                aria-label="与下一行合并"
                disabled={!breakMode}
                onClick={() => onMergeAt(lineIndex)}
              >
                ×
              </button>,
            )
          }

          return (
            <div key={line.id} className="title-break-bar__group">
              {nodes}
            </div>
          )
        })}
      </div>
    </div>
  )
}
