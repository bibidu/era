const selectClassName =
  'h-9 min-w-0 flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-2 text-sm outline-none focus:border-neutral-500'

function nearestOption(value: number, options: readonly number[]) {
  return options.reduce((closest, option) =>
    Math.abs(option - value) < Math.abs(closest - value) ? option : closest,
  )
}

export interface GraphicConfigSelectProps {
  label: string
  value: number
  options: readonly number[]
  onChange: (value: number) => void
  format?: (value: number) => string
  labelClassName?: string
  className?: string
  hideLabel?: boolean
}

export function GraphicConfigSelect({
  label,
  value,
  options,
  onChange,
  format,
  labelClassName = 'w-[4.6rem]',
  className = '',
  hideLabel = false,
}: GraphicConfigSelectProps) {
  const displayValue = nearestOption(value, options)

  if (hideLabel) {
    return (
      <select
        value={displayValue}
        onChange={(event) => onChange(Number(event.target.value))}
        className={`${selectClassName} ${className}`}
        aria-label={label}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {format ? format(option) : option}
          </option>
        ))}
      </select>
    )
  }

  return (
    <label className={`flex min-w-0 flex-1 items-center gap-2 text-sm ${className}`}>
      <span className={`${labelClassName} shrink-0 text-neutral-600`}>{label}</span>
      <select
        value={displayValue}
        onChange={(event) => onChange(Number(event.target.value))}
        className={selectClassName}
        aria-label={label}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {format ? format(option) : option}
          </option>
        ))}
      </select>
    </label>
  )
}
