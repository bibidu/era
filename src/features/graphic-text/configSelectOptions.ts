export function buildNumericOptions(
  min: number,
  max: number,
  preferredStep: number,
  maxCount = 18,
): number[] {
  let step = preferredStep
  const span = max - min

  if (span <= 0) return [min]

  if (span / step + 1 > maxCount) {
    step = span / (maxCount - 1)
    const power = 10 ** Math.floor(Math.log10(step))
    step = Math.ceil(step / power) * power
  }

  const values: number[] = []
  for (let value = min; value <= max + step * 0.001; value += step) {
    values.push(Number(value.toFixed(4)))
  }

  const rounded = [...new Set(values.map((value) => Number(value.toFixed(2))))]
  if (rounded[0] !== min) rounded.unshift(min)
  if (rounded[rounded.length - 1] !== max) rounded.push(max)

  return rounded
}

export const TITLE_FONT_SIZE_OPTIONS = buildNumericOptions(40, 100, 2, 31)
export const BODY_FONT_SIZE_OPTIONS = buildNumericOptions(10, 32, 1)
export const TITLE_LINE_HEIGHT_OPTIONS = buildNumericOptions(1, 2, 0.05)
export const BODY_LINE_HEIGHT_OPTIONS = buildNumericOptions(1, 2.2, 0.05)
export const TITLE_MARGIN_OPTIONS = buildNumericOptions(0, 1.2, 0.05)
export const HEADING_MARGIN_OPTIONS = buildNumericOptions(0, 1.2, 0.05)
