import type { ReactNode } from 'react'

export const PAPER_COLORS = [
  '#FBF7ED',
  '#FFF8F0',
  '#FEFCE8',
  '#ECFDF5',
  '#EFF6FF',
  '#FDF2F8',
  '#FAF5FF',
  '#F5F5F4',
]

export function TemplatePreviewSquare({
  children,
  className = '',
  selected = false,
}: {
  children?: ReactNode
  className?: string
  selected?: boolean
}) {
  return (
    <div
      className={`flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-neutral-50 ${
        selected ? 'border-2 border-black' : 'border border-neutral-200'
      } ${className}`}
    >
      {children}
    </div>
  )
}
