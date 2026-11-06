<script setup lang="ts">
import { reactive } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { api, unwrap } from '../api/client'
import type { components } from '../api/generated/voltbridge-schema'
import type { paths } from '../api/generated/voltbridge-schema'
import { useRouter } from 'vue-router'
import { statusDisplay } from '../constants/statusLabels'
import { formatDateTime } from '../utils/dateTime'
import CopyButton from '../components/CopyButton.vue'
const filters = reactive({ deviceCode: '', connectorNo: '', status: '' })
const router = useRouter()
type TransactionStatus = NonNullable<
  NonNullable<paths['/api/transactions']['get']['parameters']['query']>['status']
>
const transactionStatuses: TransactionStatus[] = [
  'STARTING',
  'CHARGING',
  'ENDING',
  'COMPLETED',
  'START_FAILED',
  'ABORTED',
]
function parseTransactionStatus(value: string): TransactionStatus | undefined {
  return transactionStatuses.find((status) => status === value)
}
function openTransaction(row: components['schemas']['TransactionView']) {
  router.push(`/transactions/${row.id}`)
}
function formatStatus(_row: unknown, _column: unknown, value: unknown) {
  return statusDisplay(typeof value === 'string' ? value : undefined)
}
const q = useQuery({
  queryKey: ['transactions', filters],
  queryFn: async () => {
    const result = await api.GET('/api/transactions', {
      params: {
        query: {
          deviceCode: filters.deviceCode || undefined,
          connectorNo: filters.connectorNo ? Number(filters.connectorNo) : undefined,
          status: parseTransactionStatus(filters.status),
        },
      },
    })
    return unwrap<components['schemas']['TransactionView'][]>(result)
  },
})
</script>
<template>
  <div class="page">
    <div class="page-heading">
      <div class="page-heading-copy">
        <span class="eyebrow">运营中心 / 充电交易</span>
        <h1>充电交易</h1>
        <p class="page-lede">
          按设备、连接器或交易状态查找记录。选择交易行可查看完整生命周期与计费情况。
        </p>
      </div>
      <el-button :loading="q.isFetching.value" @click="q.refetch()">刷新数据</el-button>
    </div>
    <el-card class="filter-card">
      <div class="filter-intro">
        <div class="filter-icon" aria-hidden="true">⌕</div>
        <div><strong>筛选交易</strong><span>条件为空时返回接口默认结果</span></div>
      </div>
      <el-form class="filter-form" inline>
        <el-form-item label="设备编码"
          ><el-input v-model="filters.deviceCode" placeholder="输入设备编码"
        /></el-form-item>
        <el-form-item label="连接器编号"
          ><el-input v-model="filters.connectorNo" placeholder="例如：01"
        /></el-form-item>
        <el-form-item label="交易状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态">
            <el-option
              v-for="status in transactionStatuses"
              :key="status"
              :label="statusDisplay(status)"
              :value="status"
            />
          </el-select>
        </el-form-item>
        <el-button type="primary" :loading="q.isFetching.value" @click="q.refetch()"
          >应用筛选</el-button
        >
      </el-form>
    </el-card>

    <div class="section-label table-section-label">
      <div>
        <h2>交易记录</h2>
        <p>结果由后端直接返回，不代表服务端分页。</p>
      </div>
      <span v-if="q.data.value" class="data-count">{{ q.data.value.length }} 条记录</span>
    </div>
    <el-card class="table-card transaction-table-card">
      <el-alert
        v-if="q.isError.value"
        type="error"
        :title="q.error.value?.message || '交易加载失败'"
        :closable="false"
      /><el-skeleton v-else-if="q.isLoading.value" :rows="4" animated /><el-empty
        v-else-if="!q.data.value?.length"
        description="没有符合条件的交易"
      />
      <el-table v-else :data="q.data.value" @row-click="openTransaction"
        ><el-table-column prop="id" label="交易 ID" min-width="300">
          <template #default="scope">
            <span>{{ scope.row.id }}</span>
            <CopyButton :value="scope.row.id" />
          </template> </el-table-column
        ><el-table-column prop="deviceCode" label="设备" min-width="220"
          ><template #default="scope">
            <span>{{ scope.row.deviceCode }}</span>
            <CopyButton :value="scope.row.deviceCode" /> </template></el-table-column
        ><el-table-column prop="connectorNo" label="连接器" width="100" /><el-table-column
          prop="protocol"
          label="协议"
          width="120" /><el-table-column
          prop="status"
          label="状态"
          :formatter="formatStatus"
          width="125" /><el-table-column prop="startedAt" label="开始时间" min-width="170"
          ><template #default="scope">
            {{ formatDateTime(scope.row.startedAt) }}
          </template></el-table-column
        ><el-table-column prop="endedAt" label="结束时间" min-width="170"
          ><template #default="scope">
            {{ formatDateTime(scope.row.endedAt) }}
          </template></el-table-column
        ><el-table-column prop="energyKwh" label="电量 / kWh" width="120" /><el-table-column
          prop="totalAmount"
          label="金额"
          width="120"
      /></el-table>
    </el-card>
  </div>
</template>
