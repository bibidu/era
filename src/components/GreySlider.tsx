import { useRef } from 'react'

interface GreySliderProps {
  'aria-label': string
  minValue: number
  maxValue: number
  step?: number
  value: number
  onChange: (value: number) => void
  onChangeEnd?: (value: number) => void
}

export function GreySlider({
  minValue,
  maxValue,
  step = 1,
  value,
  onChange,
  onChangeEnd,
  'aria-label': ariaLabel,
}: GreySliderProps) {
  const draggingRef = useRef(false)

  const commit = (next: number) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    onChangeEnd?.(next)
  }

  return (
    <div className="grey-slider-wrap">
      <input
        type="range"
        className="grey-range"
        min={minValue}
        max={maxValue}
        step={step}
        value={value}
        aria-label={ariaLabel}
        onInput={(e) => onChange(Number(e.currentTarget.value))}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        onPointerDown={() => {
          draggingRef.current = true
        }}
        onPointerUp={(e) => commit(Number(e.currentTarget.value))}
        onPointerCancel={(e) => commit(Number(e.currentTarget.value))}
        onBlur={(e) => commit(Number(e.currentTarget.value))}
      />
    </div>
  )
}
