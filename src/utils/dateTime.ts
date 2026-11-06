function formatLocalDateTime(value: string | null | undefined, withSeconds: boolean): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (part: number) => String(part).padStart(2, '0')
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  return `${day} ${time}${withSeconds ? `:${pad(date.getSeconds())}` : ''}`
}

export function formatDateTime(value?: string | null): string {
  return formatLocalDateTime(value, false)
}

export function formatDateTimeWithSeconds(value?: string | null): string {
  return formatLocalDateTime(value, true)
}

export function formatEffectiveRange(
  effectiveFrom?: string | null,
  effectiveTo?: string | null,
  withSeconds = false,
): string {
  const formatter = withSeconds ? formatDateTimeWithSeconds : formatDateTime
  return `${formatter(effectiveFrom)} ～ ${effectiveTo ? formatter(effectiveTo) : '长期有效'}`
}
