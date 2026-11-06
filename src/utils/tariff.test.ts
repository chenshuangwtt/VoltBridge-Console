import { describe, expect, it } from 'vitest'
import { formatTariffUnitPrice } from './tariff'

describe('tariff display formatting', () => {
  it('shows unit prices with two decimal places and the same unit', () => {
    expect(formatTariffUnitPrice(1)).toBe('1.00 元/kWh')
    expect(formatTariffUnitPrice(0.2)).toBe('0.20 元/kWh')
    expect(formatTariffUnitPrice(0.2, 'USD')).toBe('0.20 USD/kWh')
  })

  it('shows an em dash for missing or invalid prices', () => {
    expect(formatTariffUnitPrice(null)).toBe('—')
    expect(formatTariffUnitPrice(Number.NaN)).toBe('—')
  })
})
