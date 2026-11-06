<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { components } from '../api/generated/voltbridge-schema'
import { api, unwrap } from '../api/client'
import {
  fieldLabel,
  periodTypeLabels,
  pricingTypeLabels,
  statusLabel,
} from '../constants/statusLabels'
import { formatFieldValue } from '../utils/display'
import { formatTariffMinute } from '../utils/tariffTime'
import CopyButton from './CopyButton.vue'

type Bill = components['schemas']['BillingRecordView']
type Tariff = components['schemas']['TariffPlanView']
const props = defineProps<{ bill: Bill }>()
const snapshotOpen = ref(false)
const rawOpen = ref(false)
const snapshot = computed(() => {
  if (!props.bill.pricingSnapshot) return null
  try {
    return JSON.parse(props.bill.pricingSnapshot) as unknown
  } catch {
    return null
  }
})
const snapshotRecord = computed<Record<string, unknown> | null>(() =>
  snapshot.value && typeof snapshot.value === 'object' && !Array.isArray(snapshot.value)
    ? (snapshot.value as Record<string, unknown>)
    : null,
)
const snapshotEntries = computed(() => Object.entries(snapshotRecord.value ?? {}))
const snapshotRole = computed(() => {
  const role = snapshotRecord.value?.role
  return role === 'FALLBACK' || role === 'SCHEDULED' ? role : undefined
})
const tariff = useQuery({
  queryKey: ['tariff', computed(() => props.bill.tariffPlanId)],
  enabled: computed(() => !!props.bill.tariffPlanId && !snapshotRole.value),
  queryFn: async () => {
    const tariffPlanId = props.bill.tariffPlanId
    if (!tariffPlanId) throw new Error('账单未提供资费 ID')
    return unwrap<Tariff>(
      await api.GET('/api/tariffs/{tariffPlanId}', {
        params: { path: { tariffPlanId } },
      }),
    )
  },
})
const tariffRole = computed(() => snapshotRole.value ?? tariff.data.value?.role)
const tariffSourceLabel = computed(() =>
  tariffRole.value === 'FALLBACK'
    ? '系统兜底'
    : tariffRole.value === 'SCHEDULED'
      ? '运营资费'
      : tariff.isLoading.value
        ? '查询中'
        : tariff.isError.value
          ? '查询失败'
          : '暂未提供',
)
const tariffName = computed(() => {
  const name = snapshotRecord.value?.name
  return typeof name === 'string' ? name : tariff.data.value?.name || '—'
})
const tariffRevision = computed(() => {
  const revision = snapshotRecord.value?.revision
  return typeof revision === 'number' ? revision : tariff.data.value?.revision
})
const tariffDisplayName = computed(() => {
  const revision = tariffRevision.value
  const name = tariffName.value
  return revision == null || name.endsWith(`V${revision}`) ? name : `${name} V${revision}`
})
const snapshotLabels: Record<string, string> = {
  name: '方案名称',
  role: '资费来源',
  tariffPlanId: '资费 ID',
  familyId: '资费系列 ID',
  revision: '业务版本',
  timezone: '计价时区',
  periods: '每日计价时段',
  appliedSegments: '实际计费分段',
  lineItems: '分段计费明细',
  sequenceNo: '时段序号',
  periodType: '时段类型',
  startMinute: '开始钟点',
  endMinute: '结束钟点',
  quantity: '计费量',
  unit: '单位',
  unitPrice: '单价',
  amount: '金额',
}
function snapshotLabel(key: string) {
  return snapshotLabels[key] ?? fieldLabel(key)
}
function snapshotText(key: string, value: unknown): string {
  if (key === 'effectiveTo' && value == null) return '长期有效'
  if (value == null) return '—'
  if ((key === 'startMinute' || key === 'endMinute') && typeof value === 'number')
    return formatTariffMinute(value)
  if (key === 'effectiveFrom' || key === 'effectiveTo') return formatFieldValue(key, value)
  if (key === 'revision') return `V${value}`
  if (key === 'energyKwh' && typeof value === 'number') return `${value} kWh`
  if (
    typeof value === 'number' &&
    [
      'energyFee',
      'serviceFee',
      'subtotalAmount',
      'discountAmount',
      'totalAmount',
      'amount',
    ].includes(key)
  )
    return amount(value)
  if (typeof value === 'number' && ['energyPricePerKwh', 'serviceFeePerKwh'].includes(key))
    return `${amount(value)}/kWh`
  if (key === 'pricingType' && typeof value === 'string') return pricingTypeLabels[value] ?? value
  if (key === 'role' && typeof value === 'string')
    return value === 'FALLBACK' ? '系统兜底' : value === 'SCHEDULED' ? '运营资费' : value
  if (key === 'periodType' && typeof value === 'string') return periodTypeLabels[value] ?? value
  if (key === 'status' && typeof value === 'string') return statusLabel(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
function description(text?: string) {
  return (
    text?.replace(/\b(PEAK|FLAT|VALLEY)\b/g, (period) => `${periodTypeLabels[period]}段`) || '—'
  )
}
function amount(value?: number) {
  if (typeof value !== 'number') return '—'
  try {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: props.bill.currency || 'CNY',
      maximumFractionDigits: 6,
    }).format(value)
  } catch {
    return `${value} ${props.bill.currency ?? ''}`
  }
}
function lineItemLabel(item: NonNullable<Bill['lineItems']>[number]) {
  if (item.type === 'ENERGY' || item.type === 'ENERGY_FEE') return '电能费'
  if (item.type === 'SERVICE' || item.type === 'SERVICE_FEE') return '充电服务费'
  return item.type || '计费项目'
}
</script>

<template>
  <div class="billing-details">
    <div class="billing-summary">
      <div>
        <span>总电量</span><strong>{{ formatFieldValue('energyKwh', bill.energyKwh) }} kWh</strong>
      </div>
      <div>
        <span>电费</span><strong>{{ amount(bill.energyFee) }}</strong>
      </div>
      <div>
        <span>服务费</span><strong>{{ amount(bill.serviceFee) }}</strong>
      </div>
      <div>
        <span>小计</span><strong>{{ amount(bill.subtotalAmount) }}</strong>
      </div>
      <div>
        <span>优惠</span><strong>{{ amount(bill.discountAmount) }}</strong>
      </div>
      <div class="billing-summary-total">
        <span>应收金额</span><strong>{{ amount(bill.totalAmount) }}</strong>
      </div>
    </div>
    <p class="muted">账单状态：{{ statusLabel(bill.status) }}</p>
    <div class="billing-tariff-source">
      <div>
        <span>使用资费</span><strong>{{ tariffDisplayName }}</strong>
      </div>
      <div>
        <span>资费来源</span><strong>{{ tariffSourceLabel }}</strong>
        <el-button v-if="tariff.isError.value" link type="primary" @click="tariff.refetch()"
          >重试</el-button
        >
      </div>
    </div>
    <div class="section-label">
      <div>
        <h2>计费明细</h2>
        <p>以下金额来自后端账单记录</p>
      </div>
    </div>
    <el-empty v-if="!bill.lineItems?.length" description="账单未返回分项明细" />
    <el-table v-else :data="bill.lineItems">
      <el-table-column label="计费项目" min-width="110"
        ><template #default="scope">{{ lineItemLabel(scope.row) }}</template></el-table-column
      >
      <el-table-column label="时段 / 说明" min-width="185"
        ><template #default="scope">{{
          description(scope.row.description)
        }}</template></el-table-column
      >
      <el-table-column label="计费量" width="130"
        ><template #default="scope"
          >{{ scope.row.quantity ?? '—' }} {{ scope.row.unit ?? '' }}</template
        ></el-table-column
      >
      <el-table-column label="单价" width="125"
        ><template #default="scope">{{ amount(scope.row.unitPrice) }}</template></el-table-column
      >
      <el-table-column label="金额" width="125"
        ><template #default="scope">{{ amount(scope.row.amount) }}</template></el-table-column
      >
    </el-table>
    <el-descriptions :column="2" border class="mt">
      <el-descriptions-item label="账单 ID"
        ><span>{{ bill.billingRecordId ?? '—' }}</span
        ><CopyButton :value="bill.billingRecordId"
      /></el-descriptions-item>
      <el-descriptions-item label="交易 ID"
        ><span>{{ bill.transactionId ?? '—' }}</span
        ><CopyButton :value="bill.transactionId"
      /></el-descriptions-item>
      <el-descriptions-item label="资费 ID"
        ><span>{{ bill.tariffPlanId ?? '—' }}</span
        ><CopyButton :value="bill.tariffPlanId"
      /></el-descriptions-item>
      <el-descriptions-item label="结算时间">{{
        formatFieldValue('finalizedAt', bill.finalizedAt)
      }}</el-descriptions-item>
      <el-descriptions-item label="充电开始">{{
        formatFieldValue('chargingStartedAt', bill.chargingStartedAt)
      }}</el-descriptions-item>
      <el-descriptions-item label="充电结束">{{
        formatFieldValue('chargingEndedAt', bill.chargingEndedAt)
      }}</el-descriptions-item>
    </el-descriptions>
    <el-button v-if="bill.pricingSnapshot" class="mt" @click="snapshotOpen = true"
      >查看计价快照</el-button
    >
    <el-drawer v-model="snapshotOpen" title="计价快照" size="520px">
      <el-descriptions v-if="snapshotEntries.length" :column="1" border>
        <el-descriptions-item
          v-for="[key, value] in snapshotEntries"
          :key="key"
          :label="snapshotLabel(key)"
        >
          <div v-if="Array.isArray(value)" class="snapshot-list">
            <div v-for="(entry, index) in value" :key="index" class="snapshot-entry">
              <template v-if="entry && typeof entry === 'object' && !Array.isArray(entry)">
                <div v-for="[entryKey, entryValue] in Object.entries(entry)" :key="entryKey">
                  <span>{{ snapshotLabel(entryKey) }}</span>
                  <strong>{{ snapshotText(entryKey, entryValue) }}</strong>
                </div>
              </template>
              <span v-else>{{ snapshotText(key, entry) }}</span>
            </div>
          </div>
          <div v-else-if="value && typeof value === 'object'" class="snapshot-entry">
            <div v-for="[entryKey, entryValue] in Object.entries(value)" :key="entryKey">
              <span>{{ snapshotLabel(entryKey) }}</span>
              <strong>{{ snapshotText(entryKey, entryValue) }}</strong>
            </div>
          </div>
          <span v-else>{{ snapshotText(key, value) }}</span>
        </el-descriptions-item>
      </el-descriptions>
      <el-empty v-else description="没有可解析的快照结构" />
      <el-button class="mt" link @click="rawOpen = !rawOpen">{{
        rawOpen ? '收起原始 JSON' : '查看原始 JSON'
      }}</el-button>
      <pre v-if="rawOpen">{{ bill.pricingSnapshot }}</pre>
    </el-drawer>
  </div>
</template>
