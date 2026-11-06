import { describe, expect, it } from 'vitest'
import {
  effectiveRangesOverlap,
  findActiveTariffConflict,
  getTariffRuntimeState,
  tariffRuntimeLabels,
} from './tariffLifecycle'

const january = '2026-01-01T00:00:00Z'
const may = '2026-05-01T00:00:00Z'
const july = '2026-07-01T00:00:00Z'
const august = '2026-08-01T00:00:00Z'
const december = '2026-12-01T00:00:00Z'

describe('tariff lifecycle view state', () => {
  it('derives draft, current, future, expired and retired labels from status and range', () => {
    const now = new Date(may)
    const range = { effectiveFrom: january, effectiveTo: july }
    expect(tariffRuntimeLabels[getTariffRuntimeState({ ...range, status: 'DRAFT' }, now)]).toBe(
      '草稿',
    )
    expect(tariffRuntimeLabels[getTariffRuntimeState({ ...range, status: 'ACTIVE' }, now)]).toBe(
      '当前生效',
    )
    expect(tariffRuntimeLabels[getTariffRuntimeState({ ...range, status: 'RETIRED' }, now)]).toBe(
      '已退役',
    )
    expect(
      tariffRuntimeLabels[getTariffRuntimeState({ effectiveFrom: july, status: 'ACTIVE' }, now)],
    ).toBe('已启用 · 待生效')
    expect(
      tariffRuntimeLabels[getTariffRuntimeState({ ...range, status: 'ACTIVE' }, new Date(july))],
    ).toBe('已启用 · 已过期')
    expect(
      getTariffRuntimeState({ effectiveFrom: january, status: 'ACTIVE' }, new Date(december)),
    ).toBe('CURRENT')
  })

  it('uses half-open [from, to) ranges for conflict detection', () => {
    const first = { effectiveFrom: january, effectiveTo: july }
    expect(effectiveRangesOverlap(first, { effectiveFrom: may, effectiveTo: august })).toBe(true)
    expect(effectiveRangesOverlap(first, { effectiveFrom: july, effectiveTo: december })).toBe(
      false,
    )
    expect(effectiveRangesOverlap({ effectiveFrom: january }, { effectiveFrom: july })).toBe(true)
    expect(
      findActiveTariffConflict({ effectiveFrom: may, effectiveTo: august }, [
        { ...first, role: 'SCHEDULED', status: 'DRAFT' },
      ]),
    ).toBeUndefined()
    expect(
      findActiveTariffConflict({ effectiveFrom: may, effectiveTo: august }, [
        { ...first, role: 'SCHEDULED', status: 'ACTIVE' },
      ]),
    ).toBeDefined()
    expect(
      findActiveTariffConflict({ effectiveFrom: may, effectiveTo: august }, [
        { ...first, role: 'FALLBACK', status: 'ACTIVE' },
      ]),
    ).toBeUndefined()
  })
})
