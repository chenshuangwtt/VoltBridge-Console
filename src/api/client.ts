import createClient from 'openapi-fetch'
import type { paths } from './generated/voltbridge-schema'

export const api = createClient<paths>({ baseUrl: import.meta.env.VITE_API_BASE_URL || '' })
export class ApiError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

const apiErrorMessages: Record<string, string> = {
  DEVICE_OFFLINE: '设备当前离线，无法执行远程操作',
  DEVICE_DISABLED: '设备已停用，无法执行远程操作',
  PROTOCOL_OPERATION_NOT_SUPPORTED: '当前设备协议不支持此操作',
  ACTIVE_TRANSACTION_EXISTS: '当前连接器已有进行中的充电交易',
  CONNECTOR_NOT_AVAILABLE: '当前连接器不可用',
  CONNECTOR_UNAVAILABLE: '当前连接器不可用',
  TARIFF_PERIOD_GAP: '每日计价时段存在空档，请完整覆盖 24 小时',
  TARIFF_PERIOD_OVERLAP: '每日计价时段存在重叠，请检查时间边界',
  TARIFF_EFFECTIVE_RANGE_CONFLICT: '无法激活：该资费的有效期与已有已启用运营资费重叠。',
  TARIFF_EFFECTIVE_RANGE_AMBIGUOUS: '当前存在多个同时生效的运营资费，请联系管理员检查配置',
  FALLBACK_TARIFF_NOT_FOUND: '系统默认兜底资费缺失，请联系管理员',
  FALLBACK_TARIFF_AMBIGUOUS: '系统默认兜底资费配置异常，请联系管理员',
  FALLBACK_TARIFF_CANNOT_RETIRE: '默认兜底资费不能退役',
  FALLBACK_TARIFF_CANNOT_DELETE: '默认兜底资费不能删除',
  TARIFF_ACTIVE_CANNOT_DELETE: '已启用资费不能删除，请按业务流程执行退役。',
  TARIFF_HISTORICAL_CANNOT_DELETE: '历史资费需要保留用于账单追溯，不能删除。',
  TARIFF_NOT_FOUND: '未找到对应资费方案',
  METER_TIMELINE_MISSING: '缺少完整计量数据，暂时无法完成分时计费',
  METER_READING_NON_MONOTONIC: '检测到异常电表读数，账单未生成',
  METER_ENERGY_MISMATCH: '计量分段电量与最终交易电量不一致',
}

function localizedApiMessage(code?: string, message?: string): string {
  if (code && apiErrorMessages[code]) return apiErrorMessages[code]
  if (message && /[\u3400-\u9fff]/.test(message)) return message
  return '请求失败，请检查后端服务后重试'
}
export async function unwrap<T>(response: {
  data?: unknown
  error?: unknown
  response: Response
}): Promise<T> {
  const envelope = (response.data ?? response.error) as
    { success?: boolean; code?: string; message?: string; data?: T } | undefined
  if (response.error && !envelope?.code)
    throw new ApiError(`HTTP_${response.response.status}`, localizedApiMessage())
  if (!envelope?.success)
    throw new ApiError(
      envelope?.code || 'API_ERROR',
      localizedApiMessage(envelope?.code, envelope?.message),
    )
  return envelope.data as T
}
