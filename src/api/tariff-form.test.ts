import { describe, expect, it } from 'vitest'
import {
  createTariffForm,
  getTariffFormError,
  toCreateTariffPlanRequest,
  toCreateTariffRevisionRequest,
} from './tariff-form'
import { formatTariffMinute, parseTariffTime, validatePeriodCoverage } from '../utils/tariffTime'

const tenantId = '11111111-1111-4111-8111-111111111111'

describe('versioned tariff requests', () => {
  it('creates a FIXED plan with one full-day period and inherited tenant', () => {
    const form = createTariffForm(new Date('2026-11-06T00:00:00Z'))
    form.name = '标准固定资费'
    form.periods[0]!.energyPricePerKwh = 1
    form.periods[0]!.serviceFeePerKwh = 0.2
    const request = toCreateTariffPlanRequest(form, tenantId)
    expect(request).toMatchObject({
      tenantId,
      pricingType: 'FIXED',
      timezone: 'Asia/Shanghai',
      periods: [
        {
          periodType: 'FLAT',
          startMinute: 0,
          endMinute: 1440,
          energyPricePerKwh: 1,
          serviceFeePerKwh: 0.2,
        },
      ],
    })
    expect(request.effectiveFrom).toBe('2026-11-06T00:00:00.000Z')
  })

  it('creates a revision without changing the source plan', () => {
    const source = {
      name: '峰谷',
      currency: 'CNY',
      pricingType: 'TIME_OF_USE',
      timezone: 'Asia/Shanghai',
      effectiveFrom: '2026-12-01T00:00:00Z',
      periods: [
        {
          periodType: 'PEAK',
          startMinute: 0,
          endMinute: 720,
          energyPricePerKwh: 1,
          serviceFeePerKwh: 0.2,
        },
        {
          periodType: 'VALLEY',
          startMinute: 720,
          endMinute: 1440,
          energyPricePerKwh: 0.6,
          serviceFeePerKwh: 0.2,
        },
      ],
    } as const
    const form = createTariffForm(new Date(), source as never)
    form.periods[0]!.energyPricePerKwh = 1.2
    const request = toCreateTariffRevisionRequest(form, tenantId)
    expect(request.periods[0]?.energyPricePerKwh).toBe(1.2)
    expect(source.periods[0].energyPricePerKwh).toBe(1)
    expect('tenantId' in request).toBe(false)
  })

  it('rejects gaps, overlaps, negative prices, and invalid effective range', () => {
    const form = createTariffForm()
    form.name = '分时资费'
    form.pricingType = 'TIME_OF_USE'
    form.periods = [
      {
        periodType: 'PEAK',
        startMinute: 0,
        endMinute: 600,
        energyPricePerKwh: 1,
        serviceFeePerKwh: 0.2,
      },
      {
        periodType: 'VALLEY',
        startMinute: 660,
        endMinute: 1440,
        energyPricePerKwh: 0.6,
        serviceFeePerKwh: 0.2,
      },
    ]
    expect(getTariffFormError(form, tenantId)).toContain('未配置时段')
    form.periods[1]!.startMinute = 540
    expect(getTariffFormError(form, tenantId)).toContain('重叠')
    form.periods[1]!.startMinute = 600
    expect(validatePeriodCoverage(form.periods)).toBeUndefined()
    expect(toCreateTariffPlanRequest(form, tenantId).periods).toHaveLength(2)
    form.periods[1]!.serviceFeePerKwh = -1
    expect(getTariffFormError(form, tenantId)).toContain('费率不能小于 0')
    form.periods[1]!.serviceFeePerKwh = 0.2
    form.effectiveTo = new Date(form.effectiveFrom!)
    expect(getTariffFormError(form, tenantId)).toBe('失效时间必须晚于生效时间')
  })

  it('formats day boundaries including 24:00', () => {
    expect(formatTariffMinute(0)).toBe('00:00')
    expect(formatTariffMinute(420)).toBe('07:00')
    expect(formatTariffMinute(1440)).toBe('24:00')
    expect(parseTariffTime('24:00')).toBe(1440)
    expect(parseTariffTime('23:59')).toBe(1439)
  })
})
