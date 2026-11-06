import { describe, expect, it } from 'vitest'
import { formatFieldValue } from './display'
import { formatDateTimeWithSeconds } from './dateTime'
import { statusDisplay } from '../constants/statusLabels'

describe('display formatting', () => {
  it('formats timestamps as local date and time without milliseconds or timezone', () => {
    const instant = new Date('2025-01-02T03:04:05.678Z')
    const pad = (value: number) => String(value).padStart(2, '0')
    const expectedLocalTime = `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())} ${pad(instant.getHours())}:${pad(instant.getMinutes())}:${pad(instant.getSeconds())}`

    expect(formatDateTimeWithSeconds(instant.toISOString())).toBe(expectedLocalTime)
  })

  it('shows statuses in Chinese without exposing enum values', () => {
    expect(statusDisplay('CHARGING')).toBe('充电中')
    expect(formatFieldValue('status', 'FINALIZED')).toBe('已结算')
    expect(formatFieldValue('stopCategory', 'REMOTE_STOP')).toBe('远程停止')
    expect(formatFieldValue('startMethod', 'REMOTE')).toBe('远程启动')
  })

  it('formats timestamps embedded in JSON snapshots', () => {
    const formatted = formatFieldValue(
      'pricingSnapshot',
      '{"effectiveFrom":"2025-01-02T03:04:05.678Z"}',
    )

    expect(formatted).not.toContain('T03:04:05.678Z')
    expect(formatted).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
  })

  it('uses the same seconds format for operational detail timestamps', () => {
    const instant = '2026-11-06T05:45:32.184Z'
    const expected = formatDateTimeWithSeconds(instant)
    for (const field of [
      'effectiveFrom',
      'effectiveTo',
      'createdAt',
      'activatedAt',
      'startedAt',
      'endedAt',
      'finalizedAt',
      'lastSeenAt',
    ]) {
      expect(formatFieldValue(field, instant)).toBe(expected)
    }
  })
})
