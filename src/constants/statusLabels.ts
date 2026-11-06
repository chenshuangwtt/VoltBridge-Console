export const commandStatusLabels: Record<string, string> = {
  CREATED: '已创建',
  SENT: '已发送',
  ACKED: '已确认',
  EXECUTING: '执行中',
  SUCCEEDED: '已成功',
  FAILED: '失败',
  TIMEOUT: '超时',
}

export const commandTypeLabels: Record<string, string> = {
  START_CHARGING: '启动充电',
  STOP_CHARGING: '停止充电',
  TIME_SYNC: '时间同步',
  RESET: '设备复位',
}

export const transactionStopCategoryLabels: Record<string, string> = {
  REMOTE_STOP: '远程停止',
}

export const transactionStartMethodLabels: Record<string, string> = {
  REMOTE: '远程启动',
}

export const transactionStatusLabels: Record<string, string> = {
  STARTING: '启动中',
  CHARGING: '充电中',
  ENDING: '结束中',
  COMPLETED: '已完成',
  START_FAILED: '启动失败',
  ABORTED: '已中止',
}

export const businessStatusLabels: Record<string, string> = {
  ENABLED: '启用',
  DISABLED: '停用',
}

export const onlineStatusLabels: Record<string, string> = {
  ONLINE: '在线',
  OFFLINE: '离线',
  UNKNOWN: '未知',
}

export const pricingTypeLabels: Record<string, string> = {
  FIXED: '固定费率',
  TIME_OF_USE: '分时费率',
}

export const periodTypeLabels: Record<string, string> = {
  PEAK: '峰',
  FLAT: '平',
  VALLEY: '谷',
}

export const operatingStatusLabels: Record<string, string> = {
  DISABLED: '已停用',
  OFFLINE: '离线',
  UNKNOWN: '未知',
  FAULT: '故障',
  STARTING: '启动中',
  CHARGING: '充电中',
  ENDING: '停止中',
  IDLE: '在线空闲',
}

export const otherStatusLabels: Record<string, string> = {
  ONLINE: '在线',
  OFFLINE: '离线',
  UNKNOWN: '未知',
  ENABLED: '启用',
  DISABLED: '已停用',
  AVAILABLE: '空闲',
  OCCUPIED: '占用',
  FAULTED: '故障',
  FAULT: '故障',
  PLUGGED: '已插枪',
  CHARGING: '充电中',
  CHARGE_COMPLETE: '充电完成',
  RESERVED: '已预约',
  UNAVAILABLE: '不可用',
  DRAFT: '草稿',
  ACTIVE: '已启用',
  RETIRED: '已退役',
  FINALIZED: '已结算',
}

export function statusLabel(status?: string): string {
  if (!status) return '未知'
  return (
    commandStatusLabels[status] ??
    transactionStatusLabels[status] ??
    businessStatusLabels[status] ??
    onlineStatusLabels[status] ??
    otherStatusLabels[status] ??
    status
  )
}

export const fieldLabels: Record<string, string> = {
  id: '记录 ID',
  billingRecordId: '账单 ID',
  tenantId: '租户 ID',
  stationId: '站点 ID',
  deviceCode: '设备编码',
  deviceName: '设备名称',
  protocol: '协议',
  protocolVersion: '协议版本',
  status: '状态',
  businessStatus: '业务状态',
  onlineStatus: '在线状态',
  runtimeStatus: '运行状态',
  lastSeenAt: '最近心跳时间',
  commandId: '命令 ID',
  connectorNo: '连接器编号',
  type: '类型',
  businessRef: '业务参考号',
  createdAt: '创建时间',
  sentAt: '发送时间',
  ackedAt: '确认时间',
  completedAt: '完成时间',
  failureCode: '失败代码',
  failureReason: '失败原因',
  transactionId: '交易 ID',
  protocolTransactionId: '协议交易 ID',
  startedAt: '开始时间',
  endedAt: '结束时间',
  startMeterKwh: '起始电量（千瓦时）',
  endMeterKwh: '结束电量（千瓦时）',
  energyKwh: '充电量（千瓦时）',
  totalAmount: '总金额',
  currency: '币种',
  energyFee: '电费',
  serviceFee: '服务费',
  subtotalAmount: '小计',
  discountAmount: '优惠金额',
  tariffPlanId: '资费方案 ID',
  finalizedAt: '结算完成时间',
  pricingType: '计价方式',
  energyPricePerKwh: '电价 / 千瓦时',
  serviceFeePerKwh: '服务费 / 千瓦时',
  effectiveFrom: '生效时间',
  effectiveTo: '失效时间',
  version: '版本',
  startSoc: '起始电量百分比',
  latestSoc: '最新电量百分比',
  endSoc: '结束电量百分比',
  chargingDurationSeconds: '充电时长（秒）',
  stopCategory: '停止类别',
  rawStopCode: '原始停止代码',
  vehicleVin: '车辆识别码',
  startMethod: '启动方式',
  finalRecordReceivedAt: '最终记录接收时间',
  additionalInfo: '附加信息',
}

export function fieldLabel(key: string): string {
  return fieldLabels[key] ?? key
}

export function statusDisplay(status?: string): string {
  return statusLabel(status)
}
