import { Minus, Plus } from 'lucide-react'
import { GreySlider } from '../../components/GreySlider'

function nearestOptionIndex(value: number, options: readonly number[]) {
  return options.reduce(
    (closestIndex, option, index, list) =>
      Math.abs(option - value) < Math.abs(list[closestIndex] - value) ? index : closestIndex,
    0,
  )
}

export interface TextAdjustNumericControlProps {
  'aria-label': string
  value: number
  options: readonly number[]
  onChange: (value: number) => void
  format?: (value: number) => string
}

export function TextAdjustNumericControl({
  'aria-label': ariaLabel,
  value,
  options,
  onChange,
  format,
}: TextAdjustNumericControlProps) {
  if (options.length === 0) return null

  const index = nearestOptionIndex(value, options)
  const displayValue = options[index]
  const canDecrease = index > 0
  const canIncrease = index < options.length - 1
  const label = format ? format(displayValue) : String(displayValue)

  const setIndex = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(options.length - 1, nextIndex))
    onChange(options[clamped])
  }

  return (
    <div className="graphic-text-adjust-control">
      <div className="graphic-text-adjust-control-slider">
        <GreySlider
          aria-label={ariaLabel}
          minValue={0}
          maxValue={Math.max(options.length - 1, 0)}
          step={1}
          value={index}
          onChange={(nextIndex) => setIndex(nextIndex)}
        />
      </div>

      <div className="graphic-text-adjust-stepper" aria-label={ariaLabel}>
        <button
          type="button"
          className="graphic-text-adjust-stepper-btn"
          aria-label={`减小${ariaLabel}`}
          disabled={!canDecrease}
          onClick={() => setIndex(index - 1)}
        >
          <Minus size={16} strokeWidth={2} />
        </button>
        <span className="graphic-text-adjust-stepper-value">{label}</span>
        <button
          type="button"
          className="graphic-text-adjust-stepper-btn"
          aria-label={`增大${ariaLabel}`}
          disabled={!canIncrease}
          onClick={() => setIndex(index + 1)}
        >
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
