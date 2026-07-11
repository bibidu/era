import { Slider } from '@heroui/react'

function toNumber(value: number | number[]) {
  return Array.isArray(value) ? value[0] : value
}

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
  value,
  onChange,
  onChangeEnd,
  ...props
}: GreySliderProps) {
  return (
    <div
      className="grey-slider-wrap"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Slider
        {...props}
        value={value}
        onChange={(next) => onChange(toNumber(next))}
        onChangeEnd={onChangeEnd ? (next) => onChangeEnd(toNumber(next)) : undefined}
        className="grey-slider"
      >
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>
    </div>
  )
}
