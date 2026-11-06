import type { components } from '../api/generated/voltbridge-schema'

type Period = components['schemas']['TariffPeriodRequest']

export function formatTariffMinute(minute: number): string {
  if (!Number.isInteger(minute) || minute < 0 || minute > 1440) return '—'
  if (minute === 1440) return '24:00'
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
}

export function parseTariffTime(value: string): number | undefined {
  if (value === '24:00') return 1440
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return undefined
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export function validatePeriodCoverage(periods: Period[]): string | undefined {
  if (!periods.length) return '请配置每日计价时段'
  const sorted = [...periods].sort((a, b) => a.startMinute - b.startMinute)
  if (sorted[0]?.startMinute !== 0)
    return `00:00–${formatTariffMinute(sorted[0].startMinute)} 存在未配置时段`
  for (let index = 0; index < sorted.length; index += 1) {
    const period = sorted[index]
    if (
      !period ||
      !Number.isInteger(period.startMinute) ||
      !Number.isInteger(period.endMinute) ||
      period.startMinute < 0 ||
      period.endMinute > 1440 ||
      period.endMinute <= period.startMinute
    )
      return '时段结束时间必须晚于开始时间，且须在 00:00–24:00 内'
    if (
      !Number.isFinite(period.energyPricePerKwh) ||
      !Number.isFinite(period.serviceFeePerKwh) ||
      period.energyPricePerKwh < 0 ||
      period.serviceFeePerKwh < 0
    )
      return '费率不能小于 0，且必须填写有效数字'
    if (index > 0) {
      const previousEnd = sorted[index - 1]!.endMinute
      if (period.startMinute > previousEnd)
        return `${formatTariffMinute(previousEnd)}–${formatTariffMinute(period.startMinute)} 存在未配置时段`
      if (period.startMinute < previousEnd)
        return `${formatTariffMinute(period.startMinute)}–${formatTariffMinute(previousEnd)} 存在时段重叠`
    }
  }
  if (sorted.at(-1)?.endMinute !== 1440)
    return `${formatTariffMinute(sorted.at(-1)!.endMinute)}–24:00 存在未配置时段`
  return undefined
}
