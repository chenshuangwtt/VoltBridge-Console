import type { components } from '../api/generated/voltbridge-schema'

type Tariff = components['schemas']['TariffPlanView']
type EffectiveRange = Pick<Tariff, 'effectiveFrom' | 'effectiveTo'>

export type TariffRuntimeState =
  | 'DRAFT'
  | 'CURRENT'
  | 'FUTURE_ACTIVE'
  | 'EXPIRED_ACTIVE'
  | 'RETIRED'
  | 'ACTIVE_UNKNOWN'
  | 'UNKNOWN'

export const tariffRuntimeLabels: Record<TariffRuntimeState, string> = {
  DRAFT: '草稿',
  CURRENT: '当前生效',
  FUTURE_ACTIVE: '已启用 · 待生效',
  EXPIRED_ACTIVE: '已启用 · 已过期',
  RETIRED: '已退役',
  ACTIVE_UNKNOWN: '已启用 · 时间待核实',
  UNKNOWN: '未知',
}

function parseRange(range: EffectiveRange): { from: number; to: number } | null {
  const from = range.effectiveFrom ? Date.parse(range.effectiveFrom) : Number.NaN
  const to = range.effectiveTo ? Date.parse(range.effectiveTo) : Number.POSITIVE_INFINITY
  if (!Number.isFinite(from) || Number.isNaN(to) || to <= from) return null
  return { from, to }
}

export function getTariffRuntimeState(plan: Tariff, now = new Date()): TariffRuntimeState {
  if (plan.status === 'DRAFT') return 'DRAFT'
  if (plan.status === 'RETIRED') return 'RETIRED'
  if (plan.status !== 'ACTIVE') return 'UNKNOWN'
  const range = parseRange(plan)
  if (!range || Number.isNaN(now.getTime())) return 'ACTIVE_UNKNOWN'
  if (now.getTime() < range.from) return 'FUTURE_ACTIVE'
  if (now.getTime() >= range.to) return 'EXPIRED_ACTIVE'
  return 'CURRENT'
}

export function effectiveRangesOverlap(left: EffectiveRange, right: EffectiveRange): boolean {
  const a = parseRange(left)
  const b = parseRange(right)
  return !!a && !!b && a.from < b.to && b.from < a.to
}

export function findActiveTariffConflict(
  candidate: EffectiveRange & Pick<Tariff, 'id'>,
  plans: Tariff[],
): Tariff | undefined {
  return plans.find(
    (plan) =>
      plan.role === 'SCHEDULED' &&
      plan.status === 'ACTIVE' &&
      (!candidate.id || plan.id !== candidate.id) &&
      effectiveRangesOverlap(candidate, plan),
  )
}
