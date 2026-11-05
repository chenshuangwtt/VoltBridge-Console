import type { components } from './generated/voltbridge-schema'
export function isTariffFormValid(form: components['schemas']['CreateTariffRequest'], tenantId: string): boolean {
  return !!tenantId.trim() && !!form.name.trim() && !!form.currency.trim() && !!form.effectiveFrom && form.energyPricePerKwh >= 0 && form.serviceFeePerKwh >= 0
}
