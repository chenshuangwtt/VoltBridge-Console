import { operatingStatusLabels } from '../constants/statusLabels'

type DeviceState = {
  businessStatus?: string
  onlineStatus?: string
  connectors?: Array<{ runtimeStatus?: string }>
}

type TransactionState = { status?: string }

export type OperatingStatus = keyof typeof operatingStatusLabels

export function getOperatingStatus(
  device: DeviceState,
  transactions: TransactionState[],
): OperatingStatus {
  if (device.businessStatus === 'DISABLED') return 'DISABLED'
  if (device.onlineStatus === 'OFFLINE') return 'OFFLINE'
  if (device.onlineStatus !== 'ONLINE') return 'UNKNOWN'
  if (
    device.connectors?.some((connector) =>
      ['FAULT', 'FAULTED'].includes(connector.runtimeStatus ?? ''),
    )
  ) {
    return 'FAULT'
  }
  const active = transactions.find((transaction) =>
    ['STARTING', 'CHARGING', 'ENDING'].includes(transaction.status ?? ''),
  )
  if (active?.status === 'STARTING') return 'STARTING'
  if (active?.status === 'CHARGING') return 'CHARGING'
  if (active?.status === 'ENDING') return 'ENDING'
  return 'IDLE'
}

export function operatingStatusLabel(status: OperatingStatus): string {
  return operatingStatusLabels[status]
}

export function businessStatusLabel(status?: string): string {
  if (status === 'ENABLED') return '启用'
  if (status === 'DISABLED') return '停用'
  return '未知'
}

export function onlineStatusTagType(status?: string): 'success' | 'info' | 'warning' {
  if (status === 'ONLINE') return 'success'
  if (status === 'OFFLINE') return 'info'
  return 'warning'
}

export function businessStatusTagType(status?: string): 'success' | 'danger' | 'warning' {
  if (status === 'ENABLED') return 'success'
  if (status === 'DISABLED') return 'danger'
  return 'warning'
}

export function operatingStatusTagType(
  status: OperatingStatus,
): 'success' | 'info' | 'warning' | 'danger' | 'primary' {
  if (status === 'DISABLED' || status === 'FAULT') return 'danger'
  if (status === 'OFFLINE') return 'info'
  if (status === 'UNKNOWN' || status === 'STARTING' || status === 'ENDING') return 'warning'
  if (status === 'CHARGING') return 'primary'
  return 'success'
}
