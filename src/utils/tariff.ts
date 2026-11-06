export function formatTariffUnitPrice(value?: number | null, currency = 'CNY'): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'

  const formatted = new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
    useGrouping: false,
  }).format(value)

  return `${formatted} ${currency === 'CNY' ? '元' : currency}/kWh`
}
