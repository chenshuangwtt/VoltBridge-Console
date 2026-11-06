<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { ElMessage } from 'element-plus'
import type { components } from '../api/generated/voltbridge-schema'
import { api, unwrap } from '../api/client'
import { pricingTypeLabels } from '../constants/statusLabels'
import { formatDateTime, formatEffectiveRange } from '../utils/dateTime'
import { formatTariffUnitPrice } from '../utils/tariff'
import { formatTariffMinute } from '../utils/tariffTime'
import CopyButton from './CopyButton.vue'

type Tariff = components['schemas']['TariffPlanView']
type RevisionRequest = components['schemas']['CreateFallbackTariffRevisionRequest']

const props = defineProps<{ tenantId: string; revisions: Tariff[] }>()
const queryClient = useQueryClient()
const dialogOpen = ref(false)
const detailOpen = ref(false)
const form = reactive({ energyPricePerKwh: 0, serviceFeePerKwh: 0, switchAt: null as Date | null })

const fallback = useQuery({
  queryKey: ['fallback-tariff', computed(() => props.tenantId)],
  enabled: computed(() => !!props.tenantId),
  refetchInterval: 60_000,
  queryFn: async () =>
    unwrap<Tariff>(
      await api.GET('/api/tenants/{tenantId}/fallback-tariff', {
        params: { path: { tenantId: props.tenantId } },
      }),
    ),
})
const latest = computed(
  () =>
    props.revisions
      .filter((plan) => plan.role === 'FALLBACK')
      .sort((left, right) => (right.revision ?? 0) - (left.revision ?? 0))[0],
)
const upcoming = computed(() => {
  const plan = latest.value
  return plan &&
    (plan.revision ?? 0) > (fallback.data.value?.revision ?? 0) &&
    plan.effectiveFrom &&
    Date.parse(plan.effectiveFrom) > Date.now()
    ? plan
    : undefined
})
const period = computed(() => fallback.data.value?.periods?.[0])
const formError = computed(() => {
  if (!Number.isFinite(form.energyPricePerKwh) || form.energyPricePerKwh < 0)
    return '请输入有效的电费单价'
  if (!Number.isFinite(form.serviceFeePerKwh) || form.serviceFeePerKwh < 0)
    return '请输入有效的服务费单价'
  if (!form.switchAt || Number.isNaN(form.switchAt.getTime())) return '请选择新版本生效时间'
  return undefined
})
const createRevision = useMutation({
  mutationFn: async (body: RevisionRequest) =>
    unwrap<Tariff>(
      await api.POST('/api/tenants/{tenantId}/fallback-tariff/revisions', {
        params: { path: { tenantId: props.tenantId } },
        body,
      }),
    ),
  onSuccess: async () => {
    dialogOpen.value = false
    ElMessage.success('默认资费新版本已创建')
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['fallback-tariff', props.tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['tariffs', props.tenantId] }),
    ])
  },
})

function openRevision() {
  if (!fallback.data.value) return
  form.energyPricePerKwh = period.value?.energyPricePerKwh ?? 0
  form.serviceFeePerKwh = period.value?.serviceFeePerKwh ?? 0
  form.switchAt = new Date(Date.now() + 60_000)
  createRevision.reset()
  dialogOpen.value = true
}

function submitRevision() {
  if (formError.value || !form.switchAt) return
  createRevision.mutate({
    switchAt: form.switchAt.toISOString(),
    energyPricePerKwh: form.energyPricePerKwh,
    serviceFeePerKwh: form.serviceFeePerKwh,
  })
}
</script>

<template>
  <section class="fallback-section" aria-labelledby="fallback-heading">
    <div class="section-label">
      <div>
        <h2 id="fallback-heading">默认兜底资费</h2>
        <p>未命中已启用运营资费时，系统自动采用此固定费率。</p>
      </div>
      <el-tag type="info" effect="plain">系统管理</el-tag>
    </div>
    <el-card class="fallback-card">
      <el-empty v-if="!tenantId" description="请先加载租户" />
      <el-skeleton v-else-if="fallback.isLoading.value" :rows="3" animated />
      <el-alert
        v-else-if="fallback.isError.value"
        type="error"
        :title="fallback.error.value?.message || '默认兜底资费加载失败'"
        :closable="false"
      />
      <el-empty v-else-if="!fallback.data.value" description="该租户没有默认兜底资费" />
      <template v-else>
        <div class="fallback-card-main">
          <div class="fallback-identity">
            <span class="fallback-kicker">FALLBACK · 固定费率</span>
            <h3>{{ fallback.data.value.name || '默认固定资费' }}</h3>
            <span>当前业务版本 V{{ fallback.data.value.revision ?? '—' }}</span>
          </div>
          <div class="fallback-price">
            <span>电费单价</span>
            <strong>{{
              formatTariffUnitPrice(period?.energyPricePerKwh, fallback.data.value.currency)
            }}</strong>
          </div>
          <div class="fallback-price">
            <span>服务费单价</span>
            <strong>{{
              formatTariffUnitPrice(period?.serviceFeePerKwh, fallback.data.value.currency)
            }}</strong>
          </div>
        </div>
        <div class="fallback-card-foot">
          <span>生效时间 {{ formatDateTime(fallback.data.value.effectiveFrom) }}</span>
          <span v-if="upcoming"
            >已计划 V{{ upcoming.revision }}：{{
              formatDateTime(upcoming.effectiveFrom)
            }}
            生效</span
          >
          <div class="fallback-actions">
            <el-button @click="detailOpen = true">查看详情</el-button>
            <el-button type="primary" @click="openRevision">修改默认资费</el-button>
          </div>
        </div>
      </template>
    </el-card>

    <el-dialog v-model="dialogOpen" title="修改默认兜底资费" width="520px">
      <el-alert
        class="mb"
        type="info"
        title="修改会创建新的资费版本；历史账单及旧版本价格不会被修改。"
        :closable="false"
      />
      <el-alert
        v-if="createRevision.isError.value"
        class="mb"
        type="error"
        :title="createRevision.error.value?.message || '新版本创建失败'"
        :closable="false"
      />
      <p>当前版本：V{{ fallback.data.value?.revision ?? '—' }}</p>
      <el-form label-position="top" class="fallback-form">
        <el-form-item :label="`电费单价（${fallback.data.value?.currency || 'CNY'}/kWh）`" required>
          <el-input-number
            v-model="form.energyPricePerKwh"
            :min="0"
            :step="0.01"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item
          :label="`服务费单价（${fallback.data.value?.currency || 'CNY'}/kWh）`"
          required
        >
          <el-input-number
            v-model="form.serviceFeePerKwh"
            :min="0"
            :step="0.01"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="新版本生效时间" required>
          <el-date-picker v-model="form.switchAt" type="datetime" format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="!!formError"
          :loading="createRevision.isPending.value"
          @click="submitRevision"
          >创建新版本</el-button
        >
      </template>
    </el-dialog>

    <el-drawer v-model="detailOpen" title="默认兜底资费详情" size="520px">
      <el-descriptions v-if="fallback.data.value" :column="1" border>
        <el-descriptions-item label="方案名称">{{ fallback.data.value.name }}</el-descriptions-item>
        <el-descriptions-item label="业务版本"
          >V{{ fallback.data.value.revision ?? '—' }}</el-descriptions-item
        >
        <el-descriptions-item label="计价方式">{{
          pricingTypeLabels[fallback.data.value.pricingType ?? ''] ?? '固定费率'
        }}</el-descriptions-item>
        <el-descriptions-item label="方案有效期">{{
          formatEffectiveRange(
            fallback.data.value.effectiveFrom,
            fallback.data.value.effectiveTo,
            true,
          )
        }}</el-descriptions-item>
        <el-descriptions-item label="每日计价时段"
          >{{ formatTariffMinute(period?.startMinute ?? -1) }}–{{
            formatTariffMinute(period?.endMinute ?? -1)
          }}</el-descriptions-item
        >
        <el-descriptions-item label="资费 ID"
          ><span>{{ fallback.data.value.id }}</span
          ><CopyButton :value="fallback.data.value.id"
        /></el-descriptions-item>
        <el-descriptions-item label="资费系列 ID"
          ><span>{{ fallback.data.value.familyId }}</span
          ><CopyButton :value="fallback.data.value.familyId"
        /></el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </section>
</template>

<style scoped>
.fallback-section {
  margin-top: 28px;
}
.fallback-section .section-label {
  margin-top: 0;
}
.fallback-card :deep(.el-card__body) {
  padding: 24px;
}
.fallback-card-main {
  display: grid;
  grid-template-columns: minmax(220px, 1.4fr) repeat(2, minmax(150px, 1fr));
  gap: 24px;
  align-items: center;
}
.fallback-identity,
.fallback-price {
  display: grid;
  gap: 7px;
}
.fallback-kicker,
.fallback-price span,
.fallback-identity > span:last-child {
  color: var(--muted);
  font-size: 11px;
}
.fallback-kicker {
  letter-spacing: 0.04em;
}
.fallback-identity h3 {
  margin: 0;
  color: var(--ink);
  font-size: 19px;
}
.fallback-price strong {
  color: var(--ink);
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}
.fallback-card-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid var(--line-soft);
  color: var(--ink-soft);
  font-size: 11px;
}
.fallback-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
.fallback-form {
  margin-top: 16px;
}
.fallback-form :deep(.el-input-number),
.fallback-form :deep(.el-date-editor) {
  width: 100%;
}
@media (max-width: 950px) {
  .fallback-card-main {
    grid-template-columns: 1fr 1fr;
  }
  .fallback-identity {
    grid-column: 1 / -1;
  }
}
@media (max-width: 620px) {
  .fallback-card-main {
    grid-template-columns: 1fr;
  }
  .fallback-identity {
    grid-column: auto;
  }
  .fallback-actions {
    width: 100%;
    margin-left: 0;
  }
}
</style>
