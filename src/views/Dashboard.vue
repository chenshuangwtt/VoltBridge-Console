<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { api, unwrap } from '../api/client'
import type { components } from '../api/generated/voltbridge-schema'
import { useRouter } from 'vue-router'
import { statusDisplay } from '../constants/statusLabels'
import { formatDateTime } from '../utils/dateTime'
const router = useRouter()
function openTransaction(row: components['schemas']['TransactionView']) {
  router.push(`/transactions/${row.id}`)
}
function formatStatus(_row: unknown, _column: unknown, value: unknown) {
  return statusDisplay(typeof value === 'string' ? value : undefined)
}
const q = useQuery({
  queryKey: ['transactions'],
  queryFn: async () =>
    unwrap<components['schemas']['TransactionView'][]>(await api.GET('/api/transactions')),
})
</script>
<template>
  <div class="page">
    <div class="page-heading">
      <div class="page-heading-copy">
        <span class="eyebrow">运营中心 / 总览</span>
        <h1>运营概览</h1>
        <p class="page-lede">查看当前交易状态与最近活动。所有数据均由 VoltBridge 后端实时返回。</p>
      </div>
      <el-button :loading="q.isFetching.value" @click="q.refetch()">刷新数据</el-button>
    </div>

    <el-alert
      v-if="q.isError.value"
      type="error"
      :title="q.error.value?.message || '交易查询失败'"
      :closable="false"
    />
    <el-skeleton v-else-if="q.isLoading.value" :rows="5" animated />
    <template v-else>
      <div class="overview-grid">
        <article class="overview-stat">
          <div class="stat-label">进行中的交易</div>
          <strong>{{
            q.data.value?.filter((x) => ['STARTING', 'CHARGING', 'ENDING'].includes(x.status || ''))
              .length ?? 0
          }}</strong>
          <span>基于当前接口返回的交易</span>
        </article>
        <article class="overview-stat">
          <div class="stat-label">已完成交易</div>
          <strong>{{ q.data.value?.filter((x) => x.status === 'COMPLETED').length ?? 0 }}</strong>
          <span>基于当前接口返回的交易</span>
        </article>
        <article class="overview-context">
          <span class="context-index">数据范围</span>
          <strong>当前查询结果</strong>
          <span>后端交易接口未提供服务端分页。</span>
        </article>
      </div>

      <div class="section-label">
        <div>
          <h2>最近交易</h2>
          <p>选择一条记录查看交易与账单详情</p>
        </div>
        <span class="data-count">{{ q.data.value?.length ?? 0 }} 条记录</span>
      </div>
      <el-card class="table-card">
        <el-empty v-if="!q.data.value?.length" description="后端暂无交易数据" />
        <el-table
          v-else
          class="dashboard-table"
          :data="q.data.value.slice(0, 8)"
          @row-click="openTransaction"
        >
          <el-table-column prop="deviceCode" label="设备" min-width="150" />
          <el-table-column prop="connectorNo" label="连接器" width="110" />
          <el-table-column prop="status" label="状态" :formatter="formatStatus" width="130" />
          <el-table-column prop="startedAt" label="开始时间" min-width="180">
            <template #default="scope">{{ formatDateTime(scope.row.startedAt) }}</template>
          </el-table-column>
          <el-table-column prop="totalAmount" label="金额" width="130" />
        </el-table>
      </el-card>
    </template>
  </div>
</template>
