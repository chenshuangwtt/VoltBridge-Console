import { describe, expect, it } from 'vitest'
import { unwrap } from './client'
describe('API envelope', () => {
  it('unwraps successful data', async () => {
    await expect(
      unwrap({ data: { success: true, data: { id: 'x' } }, response: new Response() }),
    ).resolves.toEqual({ id: 'x' })
  })
  it('localizes known backend domain errors', async () => {
    await expect(
      unwrap({
        data: { success: false, code: 'DEVICE_OFFLINE', message: 'Device offline' },
        response: new Response(),
      }),
    ).rejects.toMatchObject({ code: 'DEVICE_OFFLINE', message: '设备当前离线，无法执行远程操作' })
  })

  it('uses a Chinese fallback for unknown backend errors', async () => {
    await expect(
      unwrap({
        data: { success: false, code: 'UNKNOWN', message: 'Unexpected error' },
        response: new Response(),
      }),
    ).rejects.toMatchObject({ message: '请求失败，请检查后端服务后重试' })
  })

  it.each([
    ['TARIFF_PERIOD_GAP', '每日计价时段存在空档'],
    ['PROTOCOL_OPERATION_NOT_SUPPORTED', '当前设备协议不支持此操作'],
    ['TARIFF_PERIOD_OVERLAP', '每日计价时段存在重叠'],
    ['TARIFF_EFFECTIVE_RANGE_CONFLICT', '有效期与已有已启用运营资费重叠'],
    ['TARIFF_EFFECTIVE_RANGE_AMBIGUOUS', '多个同时生效的运营资费'],
    ['FALLBACK_TARIFF_NOT_FOUND', '默认兜底资费缺失'],
    ['FALLBACK_TARIFF_AMBIGUOUS', '默认兜底资费配置异常'],
    ['FALLBACK_TARIFF_CANNOT_RETIRE', '默认兜底资费不能退役'],
    ['FALLBACK_TARIFF_CANNOT_DELETE', '默认兜底资费不能删除'],
    ['TARIFF_ACTIVE_CANNOT_DELETE', '已启用资费不能删除'],
    ['TARIFF_HISTORICAL_CANNOT_DELETE', '历史资费需要保留用于账单追溯'],
    ['TARIFF_NOT_FOUND', '未找到对应资费方案'],
    ['METER_TIMELINE_MISSING', '缺少完整计量数据'],
    ['METER_READING_NON_MONOTONIC', '异常电表读数'],
    ['METER_ENERGY_MISMATCH', '计量分段电量与最终交易电量不一致'],
  ])('localizes %s', async (code, message) => {
    await expect(
      unwrap({
        data: { success: false, code, message: 'Backend error' },
        response: new Response(),
      }),
    ).rejects.toThrow(message)
  })
})
