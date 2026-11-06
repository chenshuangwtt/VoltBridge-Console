import {
  statusDisplay,
  transactionStartMethodLabels,
  transactionStopCategoryLabels,
} from '../constants/statusLabels'
import { formatDateTimeWithSeconds } from './dateTime'

const dateTimeFields = new Set([
  'createdAt',
  'updatedAt',
  'activatedAt',
  'reportedAt',
  'sentAt',
  'ackedAt',
  'completedAt',
  'startedAt',
  'endedAt',
  'finalizedAt',
  'chargingStartedAt',
  'chargingEndedAt',
  'finalRecordReceivedAt',
  'effectiveFrom',
  'effectiveTo',
])
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/

function formatNestedValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(formatNestedValue)
  if (typeof value === 'string' && isoDateTimePattern.test(value))
    return formatDateTimeWithSeconds(value)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, formatNestedValue(nested)]),
    )
  }
  return value
}

export function formatFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (key === 'stopCategory' && typeof value === 'string')
    return transactionStopCategoryLabels[value] ?? value
  if (key === 'startMethod' && typeof value === 'string')
    return transactionStartMethodLabels[value] ?? value
  if (['status', 'businessStatus', 'onlineStatus', 'runtimeStatus'].includes(key)) {
    return statusDisplay(String(value))
  }
  if (dateTimeFields.has(key) && typeof value === 'string') return formatDateTimeWithSeconds(value)
  if ((key === 'pricingSnapshot' || key === 'additionalInfo') && typeof value === 'string') {
    try {
      return JSON.stringify(formatNestedValue(JSON.parse(value)), null, 2)
    } catch {
      return value
    }
  }
  if (typeof value === 'string' && isoDateTimePattern.test(value))
    return formatDateTimeWithSeconds(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
