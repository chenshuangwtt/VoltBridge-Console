import type { components } from './generated/voltbridge-schema'
import { validatePeriodCoverage } from '../utils/tariffTime'

type Period = components['schemas']['TariffPeriodRequest']
type CreatePlan = components['schemas']['CreateTariffPlanRequest']
type CreateRevision = components['schemas']['CreateTariffRevisionRequest']
type Tariff = components['schemas']['TariffPlanView']

export type TariffForm = {
  name: string
  currency: string
  pricingType: CreatePlan['pricingType']
  timezone: string
  effectiveFrom: Date | null
  effectiveTo: Date | null
  periods: Period[]
}

export function createTariffForm(now = new Date(), source?: Tariff): TariffForm {
  return {
    name: source?.name ?? '',
    currency: source?.currency ?? 'CNY',
    pricingType: source?.pricingType === 'TIME_OF_USE' ? 'TIME_OF_USE' : 'FIXED',
    timezone: source?.timezone ?? 'Asia/Shanghai',
    effectiveFrom: source?.effectiveFrom ? new Date(source.effectiveFrom) : new Date(now.getTime()),
    effectiveTo: source?.effectiveTo ? new Date(source.effectiveTo) : null,
    periods: source?.periods?.length
      ? source.periods.map((period) => ({
          periodType: period.periodType as Period['periodType'],
          startMinute: period.startMinute ?? 0,
          endMinute: period.endMinute ?? 1440,
          energyPricePerKwh: period.energyPricePerKwh ?? 0,
          serviceFeePerKwh: period.serviceFeePerKwh ?? 0,
        }))
      : [
          {
            periodType: 'FLAT',
            startMinute: 0,
            endMinute: 1440,
            energyPricePerKwh: 0,
            serviceFeePerKwh: 0,
          },
        ],
  }
}

export function getTariffFormError(form: TariffForm, tenantId: string): string | undefined {
  if (!tenantId.trim()) return '请先加载租户'
  if (!form.name.trim()) return '请输入资费名称'
  if (!form.currency.trim()) return '请输入币种'
  if (!form.timezone.trim()) return '请输入计价时区'
  if (!form.effectiveFrom || Number.isNaN(form.effectiveFrom.getTime())) return '请选择生效时间'
  if (
    form.effectiveTo &&
    (Number.isNaN(form.effectiveTo.getTime()) || form.effectiveTo <= form.effectiveFrom)
  )
    return '失效时间必须晚于生效时间'
  if (
    form.pricingType === 'FIXED' &&
    (form.periods.length !== 1 ||
      form.periods[0]?.startMinute !== 0 ||
      form.periods[0]?.endMinute !== 1440)
  )
    return '固定费率必须覆盖全天'
  if (form.pricingType === 'TIME_OF_USE' && form.periods.length < 2)
    return '分时费率至少需要两个时段'
  return validatePeriodCoverage(form.periods)
}

function requestFields(form: TariffForm): CreateRevision {
  return {
    name: form.name.trim(),
    currency: form.currency.trim(),
    pricingType: form.pricingType,
    timezone: form.timezone.trim(),
    effectiveFrom: form.effectiveFrom!.toISOString(),
    ...(form.effectiveTo ? { effectiveTo: form.effectiveTo.toISOString() } : {}),
    periods: form.periods.map((period) => ({ ...period })),
  }
}

export function toCreateTariffPlanRequest(form: TariffForm, tenantId: string): CreatePlan {
  const error = getTariffFormError(form, tenantId)
  if (error) throw new Error(error)
  return { tenantId: tenantId.trim(), ...requestFields(form) }
}

export function toCreateTariffRevisionRequest(form: TariffForm, tenantId: string): CreateRevision {
  const error = getTariffFormError(form, tenantId)
  if (error) throw new Error(error)
  return requestFields(form)
}
