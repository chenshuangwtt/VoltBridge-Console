import { describe, expect, it } from 'vitest'
import { getOperatingStatus } from './deviceStatus'

const onlineDevice = { businessStatus: 'ENABLED', onlineStatus: 'ONLINE' }

describe('device status semantics', () => {
  it('does not confuse business state with connection state', () => {
    expect(getOperatingStatus({ ...onlineDevice, onlineStatus: 'OFFLINE' }, [])).toBe('OFFLINE')
  })

  it('derives online idle when no active transaction exists', () => {
    expect(getOperatingStatus(onlineDevice, [])).toBe('IDLE')
  })

  it.each([
    ['STARTING', 'STARTING'],
    ['CHARGING', 'CHARGING'],
    ['ENDING', 'ENDING'],
  ])('derives %s from active transactions', (transactionStatus, expected) => {
    expect(getOperatingStatus(onlineDevice, [{ status: transactionStatus }])).toBe(expected)
  })

  it('prioritizes disabled and faulted states', () => {
    expect(getOperatingStatus({ ...onlineDevice, businessStatus: 'DISABLED' }, [])).toBe('DISABLED')
    expect(
      getOperatingStatus({ ...onlineDevice, connectors: [{ runtimeStatus: 'FAULT' }] }, [
        { status: 'CHARGING' },
      ]),
    ).toBe('FAULT')
  })

  it('keeps unknown connectivity unknown', () => {
    expect(getOperatingStatus({ ...onlineDevice, onlineStatus: 'UNKNOWN' }, [])).toBe('UNKNOWN')
  })
})
