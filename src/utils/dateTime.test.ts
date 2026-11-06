import { describe, expect, it } from 'vitest'
import { formatDateTime, formatDateTimeWithSeconds, formatEffectiveRange } from './dateTime'

describe('local date and time display', () => {
  it('uses browser-local minutes for lists and seconds for details', () => {
    const instant = '2026-11-06T05:45:32.184Z'
    const local = new Date(instant)
    const pad = (value: number) => String(value).padStart(2, '0')
    const expected = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())} ${pad(local.getHours())}:${pad(local.getMinutes())}`
    expect(formatDateTime(instant)).toBe(expected)
    expect(formatDateTimeWithSeconds(instant)).toBe(`${expected}:${pad(local.getSeconds())}`)
    expect(formatDateTime(instant)).not.toMatch(/[TZ]|\.184|\+00:00/)
  })

  it('shows an open-ended effective range and handles missing or invalid dates', () => {
    expect(formatEffectiveRange('2026-11-06T05:45:32Z', null)).toContain('长期有效')
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime(undefined)).toBe('—')
    expect(formatDateTime('invalid')).toBe('—')
  })
})
