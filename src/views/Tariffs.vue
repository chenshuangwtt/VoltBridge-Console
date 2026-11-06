<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { components } from '../api/generated/voltbridge-schema'
import { api, unwrap } from '../api/client'
import {
  createTariffForm,
  getTariffFormError,
  toCreateTariffPlanRequest,
  toCreateTariffRevisionRequest,
  type TariffForm,
} from '../api/tariff-form'
import { periodTypeLabels, pricingTypeLabels } from '../constants/statusLabels'
import { formatEffectiveRange } from '../utils/dateTime'
import { formatTariffUnitPrice } from '../utils/tariff'
import {
  findActiveTariffConflict,
  getTariffRuntimeState,
  tariffRuntimeLabels,
} from '../utils/tariffLifecycle'
import { formatTariffMinute, validatePeriodCoverage } from '../utils/tariffTime'
import CopyButton from '../components/CopyButton.vue'
import FallbackTariffCard from '../components/FallbackTariffCard.vue'

type Tariff = components['schemas']['TariffPlanView']
type Period = components['schemas']['TariffPeriodRequest']

const queryClient = useQueryClient()
const tenant = ref(
  (
    localStorage.getItem('voltbridge.tenantId') ||
    import.meta.env.VITE_DEFAULT_TENANT_ID ||
    ''
  ).trim(),
)
const tenantId = computed(() => tenant.value.trim())
const form = reactive<TariffForm>(createTariffForm())
const dialog = ref(false)
const selected = ref<Tariff | null>(null)
const detailOpen = ref(false)
const revisionSource = ref<Tariff | null>(null)
const clock = ref(new Date())
const plans = useQuery({
  queryKey: ['tariffs', tenantId],
  enabled: computed(() => !!tenantId.value),
  refetchInterval: 60_000,
  queryFn: async () => {
    clock.value = new Date()
    localStorage.setItem('voltbridge.tenantId', tenantId.value)
    return unwrap<Tariff[]>(
      await api.GET('/api/tariffs', { params: { query: { tenantId: tenantId.value } } }),
    )
  },
})
const scheduledPlans = computed(() =>
  (plans.data.value ?? []).filter((plan) => plan.role === 'SCHEDULED'),
)
const create = useMutation({
  mutationFn: async () =>
    revisionSource.value?.id
      ? unwrap<Tariff>(
          await api.POST('/api/tariffs/{tariffPlanId}/revisions', {
            params: { path: { tariffPlanId: revisionSource.value.id } },
            body: toCreateTariffRevisionRequest(form, tenantId.value),
          }),
        )
      : unwrap<Tariff>(
          await api.POST('/api/tariffs', { body: toCreateTariffPlanRequest(form, tenantId.value) }),
        ),
  onSuccess: async () => {
    clock.value = new Date()
    dialog.value = false
    ElMessage.success(revisionSource.value ? '新版本已创建' : '资费已创建')
    await queryClient.invalidateQueries({ queryKey: ['tariffs', tenantId.value] })
  },
})
const activate = useMutation({
  mutationFn: async (id: string) =>
    unwrap<Tariff>(
      await api.POST('/api/tariffs/{tariffPlanId}/activate', {
        params: { path: { tariffPlanId: id } },
      }),
    ),
  onSuccess: async () => {
    clock.value = new Date()
    ElMessage.success('资费已激活')
    await queryClient.invalidateQueries({ queryKey: ['tariffs', tenantId.value] })
  },
})
const retire = useMutation({
  mutationFn: async (id: string) =>
    unwrap<Tariff>(
      await api.POST('/api/tariffs/{tariffPlanId}/retire', {
        params: { path: { tariffPlanId: id } },
      }),
    ),
  onSuccess: async () => {
    clock.value = new Date()
    ElMessage.success('资费已退役')
    await queryClient.invalidateQueries({ queryKey: ['tariffs', tenantId.value] })
  },
})
const removeDraft = useMutation({
  mutationFn: async (id: string) =>
    unwrap<unknown>(
      await api.DELETE('/api/tariffs/{tariffPlanId}', {
        params: { path: { tariffPlanId: id } },
      }),
    ),
  onSuccess: async () => {
    ElMessage.success('资费草稿已删除')
    await queryClient.invalidateQueries({ queryKey: ['tariffs', tenantId.value] })
  },
})
const actionPending = computed(
  () => activate.isPending.value || retire.isPending.value || removeDraft.isPending.value,
)
const coverageError = computed(() => validatePeriodCoverage(form.periods))
const formError = computed(() => getTariffFormError(form, tenantId.value))
const draftConflict = computed(() => {
  if (!form.effectiveFrom || Number.isNaN(form.effectiveFrom.getTime())) return undefined
  return findActiveTariffConflict(
    {
      effectiveFrom: form.effectiveFrom.toISOString(),
      effectiveTo: form.effectiveTo?.toISOString(),
    },
    scheduledPlans.value,
  )
})
const priceUnit = computed(
  () => `${form.currency.trim() === 'CNY' ? '元' : form.currency.trim() || '币种'}/kWh`,
)
const timeOptions = Array.from({ length: 97 }, (_, index) => ({
  value: index * 15,
  label: formatTariffMinute(index * 15),
}))

function openCreate(source: Tariff | null = null) {
  if (!tenantId.value || (source && source.role !== 'SCHEDULED')) return
  revisionSource.value = source
  Object.assign(form, createTariffForm(new Date(), source ?? undefined))
  create.reset()
  dialog.value = true
}

function openDetail(plan: Tariff) {
  selected.value = plan
  detailOpen.value = true
}

function loadTariffs() {
  clock.value = new Date()
  tenant.value = tenantId.value
  if (tenant.value) void plans.refetch()
}

function runtimeLabel(plan: Tariff): string {
  return tariffRuntimeLabels[getTariffRuntimeState(plan, clock.value)]
}

function runtimeTagType(plan: Tariff): 'success' | 'warning' | 'info' {
  const state = getTariffRuntimeState(plan, clock.value)
  if (state === 'CURRENT') return 'success'
  if (state === 'EXPIRED_ACTIVE') return 'warning'
  return 'info'
}

function activeConflict(plan: Tariff): Tariff | undefined {
  return findActiveTariffConflict(plan, scheduledPlans.value)
}

function tariffDisplayName(plan: Tariff): string {
  const name = plan.name?.trim() || '未命名资费'
  const revision = plan.revision
  return revision == null || name.endsWith(`V${revision}`) ? name : `${name} V${revision}`
}

function changePricingType(value: TariffForm['pricingType']) {
  form.pricingType = value
  const price = form.periods[0] ?? { energyPricePerKwh: 0, serviceFeePerKwh: 0 }
  form.periods =
    value === 'FIXED'
      ? [
          {
            periodType: 'FLAT',
            startMinute: 0,
            endMinute: 1440,
            energyPricePerKwh: price.energyPricePerKwh,
            serviceFeePerKwh: price.serviceFeePerKwh,
          },
        ]
      : [
          {
            periodType: 'VALLEY',
            startMinute: 0,
            endMinute: 720,
            energyPricePerKwh: price.energyPricePerKwh,
            serviceFeePerKwh: price.serviceFeePerKwh,
          },
          {
            periodType: 'PEAK',
            startMinute: 720,
            endMinute: 1440,
            energyPricePerKwh: price.energyPricePerKwh,
            serviceFeePerKwh: price.serviceFeePerKwh,
          },
        ]
}

function boundaryOptions(index: number) {
  const current = form.periods[index]
  const next = form.periods[index + 1]
  if (!current || !next) return []
  return timeOptions.filter(
    (option) => option.value > current.startMinute && option.value < next.endMinute,
  )
}

function setBoundary(index: number, minute: number) {
  const current = form.periods[index]
  const next = form.periods[index + 1]
  if (!current || !next) return
  current.endMinute = minute
  next.startMinute = minute
}

function addPeriod() {
  const last = form.periods.at(-1)
  if (!last || last.endMinute - last.startMinute < 30) return
  const boundary = Math.floor((last.startMinute + last.endMinute) / 30) * 15
  const next: Period = { ...last, startMinute: boundary, endMinute: 1440 }
  last.endMinute = boundary
  form.periods.push(next)
}

function removePeriod(index: number) {
  if (form.periods.length <= 2) return
  const period = form.periods[index]
  if (!period) return
  if (index === 0) form.periods[1]!.startMinute = 0
  else form.periods[index - 1]!.endMinute = period.endMinute
  form.periods.splice(index, 1)
}

function submit() {
  if (formError.value) {
    ElMessage.warning(formError.value)
    return
  }
  create.mutate()
}

async function confirmActivate(plan: Tariff) {
  if (plan.role !== 'SCHEDULED' || plan.status !== 'DRAFT') return
  try {
    const conflict = findActiveTariffConflict(plan, scheduledPlans.value)
    const conflictNote = conflict
      ? `\n与「${tariffDisplayName(conflict)}」的有效期重叠。现有资费：${formatEffectiveRange(conflict.effectiveFrom, conflict.effectiveTo)}；待激活资费：${formatEffectiveRange(plan.effectiveFrom, plan.effectiveTo)}。后端将最终确认。`
      : ''
    await ElMessageBox.confirm(
      `确认激活资费 V${plan.revision ?? '—'}？激活后，该方案将在其有效期内参与新充电交易的计费。${conflictNote}`,
      '激活资费',
      { type: 'warning', confirmButtonText: '确认激活', cancelButtonText: '取消' },
    )
    retire.reset()
    removeDraft.reset()
    activate.reset()
    if (plan.id) activate.mutate(plan.id)
  } catch {
    /* 用户取消 */
  }
}

async function confirmRetire(plan: Tariff) {
  if (plan.role !== 'SCHEDULED' || plan.status !== 'ACTIVE') return
  try {
    const state = getTariffRuntimeState(plan, new Date())
    const prompt =
      state === 'CURRENT'
        ? '确认退役当前运营资费？退役后如无其他运营资费命中，新充电交易将自动使用默认兜底资费。'
        : state === 'FUTURE_ACTIVE'
          ? '该资费尚未开始生效，确认退役？'
          : '确认退役该资费？'
    await ElMessageBox.confirm(
      `${prompt}退役后该资费将不再用于新的计费解析，历史账单不会受到影响。`,
      '退役资费',
      { type: 'warning', confirmButtonText: '确认退役', cancelButtonText: '取消' },
    )
    activate.reset()
    removeDraft.reset()
    retire.reset()
    if (plan.id) retire.mutate(plan.id)
  } catch {
    /* 用户取消 */
  }
}

async function confirmDelete(plan: Tariff) {
  if (plan.role !== 'SCHEDULED' || plan.status !== 'DRAFT' || !plan.id) return
  try {
    await ElMessageBox.confirm(
      `确认删除草稿「${tariffDisplayName(plan)}」？该操作不可恢复。`,
      '删除资费草稿',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' },
    )
    activate.reset()
    retire.reset()
    removeDraft.reset()
    removeDraft.mutate(plan.id)
  } catch {
    /* 用户取消 */
  }
}
</script>

<template>
  <div class="page">
    <div class="page-heading">
      <div class="page-heading-copy">
        <span class="eyebrow">运营配置 / 资费</span>
        <h1>资费管理</h1>
        <p class="page-lede">默认兜底资费保障基础计费；运营资费按生效时间和每日时段执行。</p>
      </div>
    </div>

    <el-card class="tenant-card">
      <div class="tenant-context">
        <div class="tenant-glyph" aria-hidden="true">ID</div>
        <div><strong>租户上下文</strong><span>创建资费自动继承当前租户</span></div>
      </div>
      <el-form class="tenant-form" inline @submit.prevent>
        <el-form-item label="租户 ID"
          ><div class="tenant-input-row">
            <el-input
              v-model="tenant"
              placeholder="输入租户 UUID"
              @change="loadTariffs"
            /><CopyButton :value="tenantId" /></div
        ></el-form-item>
        <el-button :loading="plans.isFetching.value" :disabled="!tenantId" @click="loadTariffs"
          >加载资费</el-button
        >
      </el-form>
    </el-card>

    <FallbackTariffCard :tenant-id="tenantId" :revisions="plans.data.value ?? []" />

    <div class="section-label table-section-label">
      <div>
        <h2>运营资费方案</h2>
        <p>只展示自行配置的运营规则；未命中时自动使用上方默认兜底资费。</p>
      </div>
      <div class="section-actions">
        <span v-if="plans.data.value" class="data-count">{{ scheduledPlans.length }} 个版本</span>
        <el-tooltip content="请先加载租户" :disabled="!!tenantId">
          <span class="tariff-create-trigger">
            <el-button type="primary" :disabled="!tenantId" @click="openCreate()"
              >新建资费</el-button
            >
          </span>
        </el-tooltip>
      </div>
    </div>
    <el-card class="table-card">
      <el-alert
        v-if="plans.isError.value"
        type="error"
        :title="plans.error.value?.message || '资费加载失败'"
        :closable="false"
      />
      <el-skeleton v-else-if="plans.isLoading.value" :rows="4" animated />
      <el-empty v-else-if="!scheduledPlans.length" description="该租户暂无运营资费方案" />
      <el-table v-else class="tariff-table" :data="scheduledPlans">
        <el-table-column prop="name" label="方案名称" min-width="145" />
        <el-table-column label="业务版本" width="70"
          ><template #default="scope">V{{ scope.row.revision ?? '—' }}</template></el-table-column
        >
        <el-table-column label="计价类型" width="95"
          ><template #default="scope">{{
            pricingTypeLabels[scope.row.pricingType] ?? '未知'
          }}</template></el-table-column
        >
        <el-table-column label="运行状态" width="165"
          ><template #default="scope">
            <div class="tariff-runtime-state">
              <el-tag :type="runtimeTagType(scope.row)" effect="plain">{{
                runtimeLabel(scope.row)
              }}</el-tag>
              <span
                v-if="scope.row.status === 'DRAFT' && activeConflict(scope.row)"
                class="tariff-conflict-hint"
              >
                有效期与已启用运营资费重叠，当前无法激活
              </span>
            </div>
          </template></el-table-column
        >
        <el-table-column label="有效期 / 时区 / 每日时段" min-width="210"
          ><template #default="scope">
            <div class="tariff-effective-cell">
              <span>{{
                formatEffectiveRange(scope.row.effectiveFrom, scope.row.effectiveTo)
              }}</span>
              <small
                >{{ scope.row.timezone || '时区未知' }} ·
                {{ scope.row.periods?.length ?? 0 }} 段</small
              >
            </div>
          </template></el-table-column
        >
        <el-table-column label="操作" width="205"
          ><template #default="scope"
            ><div class="table-actions">
              <el-button link @click="openDetail(scope.row)">查看</el-button>
              <el-button link @click="openCreate(scope.row)">创建新版本</el-button>
              <el-button
                v-if="scope.row.role === 'SCHEDULED' && scope.row.status === 'DRAFT'"
                link
                type="primary"
                :loading="activate.isPending.value"
                :disabled="actionPending"
                @click="confirmActivate(scope.row)"
                >激活</el-button
              >
              <el-button
                v-if="scope.row.role === 'SCHEDULED' && scope.row.status === 'DRAFT'"
                link
                type="danger"
                :loading="removeDraft.isPending.value"
                :disabled="actionPending"
                @click="confirmDelete(scope.row)"
                >删除</el-button
              >
              <el-button
                v-if="scope.row.role === 'SCHEDULED' && scope.row.status === 'ACTIVE'"
                link
                type="danger"
                :loading="retire.isPending.value"
                :disabled="actionPending"
                @click="confirmRetire(scope.row)"
                >退役</el-button
              >
            </div></template
          ></el-table-column
        >
      </el-table>
      <el-alert
        v-if="activate.isError.value || retire.isError.value || removeDraft.isError.value"
        class="mt"
        type="error"
        :title="
          activate.error.value?.message ||
          retire.error.value?.message ||
          removeDraft.error.value?.message ||
          '操作失败'
        "
        :closable="false"
      />
    </el-card>

    <el-dialog
      v-model="dialog"
      :title="revisionSource ? `创建新版本 · V${revisionSource.revision ?? '—'}` : '新建资费'"
      width="760px"
      @closed="create.reset"
    >
      <el-alert
        v-if="create.isError.value"
        type="error"
        :title="create.error.value?.message || '资费创建失败'"
        :closable="false"
        class="mb"
      />
      <el-form label-position="top" class="tariff-form">
        <el-form-item class="tariff-form-wide" label="当前租户"
          ><div class="tariff-tenant-display">
            <span class="tariff-tenant-id">{{ tenantId }}</span
            ><CopyButton :value="tenantId" /></div
        ></el-form-item>
        <el-form-item class="tariff-form-wide" label="方案名称" required
          ><el-input v-model="form.name" maxlength="128" placeholder="输入资费方案名称"
        /></el-form-item>
        <el-form-item label="计价方式" required
          ><el-select :model-value="form.pricingType" @update:model-value="changePricingType"
            ><el-option label="固定费率" value="FIXED" /><el-option
              label="分时费率"
              value="TIME_OF_USE" /></el-select
        ></el-form-item>
        <el-form-item label="币种" required
          ><el-input v-model="form.currency" placeholder="CNY"
        /></el-form-item>
        <el-form-item label="计价时区" required
          ><el-input v-model="form.timezone" placeholder="Asia/Shanghai"
        /></el-form-item>
        <div class="tariff-form-wide tariff-group-title">
          <strong>方案有效期</strong><span>决定此版本在哪段日期参与计费</span>
        </div>
        <el-form-item label="生效时间" required
          ><el-date-picker
            v-model="form.effectiveFrom"
            type="datetime"
            format="YYYY-MM-DD HH:mm:ss"
        /></el-form-item>
        <el-form-item label="失效时间（可选）"
          ><el-date-picker v-model="form.effectiveTo" type="datetime" format="YYYY-MM-DD HH:mm:ss"
        /></el-form-item>
        <el-alert
          v-if="draftConflict"
          class="tariff-form-wide mb"
          type="warning"
          :title="`该草稿的有效期与已启用运营资费「${tariffDisplayName(draftConflict)}」重叠。创建草稿不受影响，但在调整有效期前将无法激活。`"
          :closable="false"
        />
        <div class="tariff-form-wide tariff-group-title">
          <strong>{{ form.pricingType === 'FIXED' ? '全天费率' : '每日计价时段' }}</strong>
          <span v-if="form.pricingType === 'TIME_OF_USE'"
            >按 {{ form.timezone || '当前计价时区' }} 的当地钟点循环</span
          >
        </div>
        <template v-if="form.pricingType === 'FIXED'">
          <el-form-item :label="`电费单价（${priceUnit}）`" required>
            <el-input-number
              v-model="form.periods[0]!.energyPricePerKwh"
              :min="0"
              :step="0.01"
              controls-position="right"
            />
          </el-form-item>
          <el-form-item :label="`服务费单价（${priceUnit}）`" required>
            <el-input-number
              v-model="form.periods[0]!.serviceFeePerKwh"
              :min="0"
              :step="0.01"
              controls-position="right"
            />
          </el-form-item>
        </template>
      </el-form>
      <template v-if="form.pricingType === 'TIME_OF_USE'">
        <div class="period-timeline" aria-label="24 小时费率预览">
          <div
            v-for="(period, index) in form.periods"
            :key="index"
            :style="{ flexGrow: period.endMinute - period.startMinute }"
            :class="['period-segment', `period-${period.periodType.toLowerCase()}`]"
          >
            {{ periodTypeLabels[period.periodType] }}
          </div>
        </div>
        <el-alert
          :type="coverageError ? 'error' : 'success'"
          :title="coverageError || '已完整覆盖 00:00–24:00'"
          :closable="false"
          class="mb"
        />
        <div class="period-table-wrap">
          <table class="period-editor">
            <thead>
              <tr>
                <th>时段</th>
                <th>类型</th>
                <th>电费单价（{{ priceUnit }}）</th>
                <th>服务费单价（{{ priceUnit }}）</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(period, index) in form.periods" :key="index">
                <td>
                  <span class="period-range">{{ formatTariffMinute(period.startMinute) }} → </span
                  ><el-select
                    v-if="index < form.periods.length - 1"
                    :model-value="period.endMinute"
                    @update:model-value="setBoundary(index, $event)"
                    ><el-option
                      v-for="option in boundaryOptions(index)"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value" /></el-select
                  ><span v-else class="period-range">24:00</span>
                </td>
                <td>
                  <el-select v-model="period.periodType"
                    ><el-option
                      v-for="(label, value) in periodTypeLabels"
                      :key="value"
                      :label="label"
                      :value="value"
                  /></el-select>
                </td>
                <td>
                  <el-input-number
                    v-model="period.energyPricePerKwh"
                    :min="0"
                    :step="0.01"
                    controls-position="right"
                  />
                </td>
                <td>
                  <el-input-number
                    v-model="period.serviceFeePerKwh"
                    :min="0"
                    :step="0.01"
                    controls-position="right"
                  />
                </td>
                <td>
                  <el-button
                    link
                    type="danger"
                    :disabled="form.periods.length <= 2"
                    @click="removePeriod(index)"
                    >删除</el-button
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <el-button
          class="mt"
          :disabled="form.periods.at(-1)!.endMinute - form.periods.at(-1)!.startMinute < 30"
          @click="addPeriod"
          >添加时段</el-button
        >
      </template>
      <template #footer
        ><el-button @click="dialog = false">取消</el-button
        ><el-button
          type="primary"
          :loading="create.isPending.value"
          :disabled="!!formError"
          @click="submit"
          >{{ revisionSource ? '创建新版本' : '新建资费' }}</el-button
        ></template
      >
    </el-dialog>

    <el-drawer v-model="detailOpen" title="资费详情" size="600px">
      <template v-if="selected"
        ><el-descriptions :column="1" border>
          <el-descriptions-item label="方案名称">{{ selected.name }}</el-descriptions-item>
          <el-descriptions-item label="资费 ID"
            ><span>{{ selected.id }}</span
            ><CopyButton :value="selected.id"
          /></el-descriptions-item>
          <el-descriptions-item label="资费系列 ID"
            ><span>{{ selected.familyId }}</span
            ><CopyButton :value="selected.familyId"
          /></el-descriptions-item>
          <el-descriptions-item label="业务版本"
            >V{{ selected.revision ?? '—' }}</el-descriptions-item
          >
          <el-descriptions-item label="计价方式">{{
            pricingTypeLabels[selected.pricingType ?? ''] ?? '未知'
          }}</el-descriptions-item>
          <el-descriptions-item label="运行状态">{{ runtimeLabel(selected) }}</el-descriptions-item>
          <el-descriptions-item label="币种 / 时区"
            >{{ selected.currency }} · {{ selected.timezone }}</el-descriptions-item
          >
          <el-descriptions-item label="方案有效期">{{
            formatEffectiveRange(selected.effectiveFrom, selected.effectiveTo, true)
          }}</el-descriptions-item>
        </el-descriptions>
        <div class="section-label">
          <div>
            <h2>每日计价时段</h2>
            <p>按照 {{ selected.timezone }} 当地钟点</p>
          </div>
        </div>
        <div v-for="(period, index) in selected.periods" :key="index" class="tariff-period-detail">
          <strong
            >{{ formatTariffMinute(period.startMinute ?? -1) }}–{{
              formatTariffMinute(period.endMinute ?? -1)
            }}</strong
          ><el-tag>{{ periodTypeLabels[period.periodType ?? ''] ?? '未知' }}</el-tag
          ><span
            >{{ formatTariffUnitPrice(period.energyPricePerKwh, selected.currency) }} +
            {{ formatTariffUnitPrice(period.serviceFeePerKwh, selected.currency) }}</span
          >
        </div>
      </template>
    </el-drawer>
  </div>
</template>
