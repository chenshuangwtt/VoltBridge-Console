<script setup lang="ts">
import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useRoute } from 'vue-router'
import type { components } from '../api/generated/voltbridge-schema'
import { ApiError, api, unwrap } from '../api/client'
import { fieldLabel } from '../constants/statusLabels'
import { formatFieldValue } from '../utils/display'
import BillingDetails from '../components/BillingDetails.vue'
import CopyButton from '../components/CopyButton.vue'

type Schemas = components['schemas']
const route = useRoute()
const queryClient = useQueryClient()
const id = computed(() => String(route.params.id || ''))
const tx = useQuery({
  queryKey: computed(() => ['transaction', id.value]),
  queryFn: async () =>
    unwrap<Schemas['TransactionView']>(
      await api.GET('/api/transactions/{transactionId}', {
        params: { path: { transactionId: id.value } },
      }),
    ),
})
const bill = useQuery({
  queryKey: computed(() => ['billing-by-transaction', id.value]),
  enabled: computed(() => tx.data.value?.status === 'COMPLETED'),
  queryFn: async () =>
    unwrap<Schemas['BillingRecordView']>(
      await api.GET('/api/billing-records/by-transaction/{transactionId}', {
        params: { path: { transactionId: id.value } },
      }),
    ),
  retry: false,
})
const billingNotFound = computed(
  () =>
    bill.error.value instanceof ApiError && bill.error.value.code === 'BILLING_RECORD_NOT_FOUND',
)
const retry = useMutation({
  mutationFn: async () =>
    unwrap<Schemas['BillingRecordView']>(
      await api.POST('/api/billing-records/by-transaction/{transactionId}/retry', {
        params: { path: { transactionId: id.value } },
      }),
    ),
  onSuccess: () =>
    queryClient.invalidateQueries({ queryKey: ['billing-by-transaction', id.value] }),
})
const lifecycle = ['STARTING', 'CHARGING', 'ENDING', 'COMPLETED']
const billingUnavailableMessage = computed(() =>
  ['STARTING', 'CHARGING', 'ENDING'].includes(tx.data.value?.status || '')
    ? '交易正在进行中；交易完成后再查询账单。'
    : '该交易尚未完成，目前没有可查询的账单。',
)
</script>

<template>
  <div class="page">
    <div class="page-heading">
      <div class="page-heading-copy">
        <span class="eyebrow">运营中心 / 交易详情</span>
        <h1>交易详情</h1>
        <p class="page-lede">查看交易状态、计费摘要与生命周期时间。</p>
      </div>
      <el-button @click="$router.push('/transactions')">返回交易列表</el-button>
    </div>

    <el-skeleton v-if="tx.isLoading.value" :rows="5" animated />
    <el-alert
      v-else-if="tx.isError.value"
      type="error"
      :title="tx.error.value?.message || '交易查询失败'"
      :closable="false"
    />
    <template v-else-if="tx.data.value">
      <el-card>
        <template #header>
          <span
            >当前交易状态
            <el-tag>{{ formatFieldValue('status', tx.data.value.status) }}</el-tag></span
          >
        </template>
        <div class="lifecycle" aria-label="交易生命周期阶段">
          <span
            v-for="stage in lifecycle"
            :key="stage"
            :class="{
              current: stage === tx.data.value.status,
              passed: lifecycle.indexOf(stage) < lifecycle.indexOf(tx.data.value.status || ''),
            }"
            >{{ formatFieldValue('status', stage) }}</span
          >
        </div>
        <el-descriptions :column="2" border>
          <el-descriptions-item
            v-for="(value, key) in tx.data.value"
            :key="key"
            :label="key === 'id' ? '交易 ID' : fieldLabel(String(key))"
          >
            <span
              v-if="
                ['id', 'deviceCode', 'businessRef', 'protocolTransactionId'].includes(String(key))
              "
              >{{ value ?? '—' }}</span
            >
            <CopyButton
              v-if="
                ['id', 'deviceCode', 'businessRef', 'protocolTransactionId'].includes(String(key))
              "
              :value="typeof value === 'string' ? value : ''"
            />
            <template
              v-else-if="
                !['id', 'deviceCode', 'businessRef', 'protocolTransactionId'].includes(String(key))
              "
            >
              {{ formatFieldValue(String(key), value) }}
            </template>
          </el-descriptions-item>
        </el-descriptions>
        <p class="muted">仅后端实际返回的事实和时间代表已记录数据。</p>
      </el-card>

      <el-card class="mt">
        <template #header>账单摘要</template>
        <el-skeleton v-if="bill.isLoading.value" :rows="3" animated />
        <el-alert
          v-else-if="tx.data.value.status !== 'COMPLETED'"
          type="info"
          :title="billingUnavailableMessage"
          :closable="false"
        />
        <template v-else-if="billingNotFound">
          <el-alert
            type="info"
            :title="
              tx.data.value.status === 'COMPLETED'
                ? '交易已完成，但账单尚未生成。'
                : '交易尚未结束，完成后才会生成账单。'
            "
            :closable="false"
          />
          <el-button
            v-if="tx.data.value.status === 'COMPLETED'"
            class="mt"
            type="primary"
            :loading="retry.isPending.value"
            @click="retry.mutate()"
            >生成账单</el-button
          >
        </template>
        <el-alert
          v-else-if="bill.isError.value"
          type="error"
          :title="bill.error.value?.message || '账单加载失败'"
          :closable="false"
        />
        <template v-else-if="bill.data.value">
          <BillingDetails :bill="bill.data.value" />
          <el-button
            v-if="bill.data.value.status !== 'FINALIZED'"
            class="mt"
            :loading="retry.isPending.value"
            @click="retry.mutate()"
            >重试计费</el-button
          >
        </template>
        <el-alert
          v-if="retry.isError.value"
          class="mt"
          type="error"
          :title="retry.error.value?.message || '计费操作失败'"
          :closable="false"
        />
      </el-card>
    </template>
  </div>
</template>
