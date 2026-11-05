<script setup lang="ts">
import { reactive } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { api, unwrap } from '../api/client'
import type { components } from '../api/generated/voltbridge-schema'
import { useRouter } from 'vue-router'
const filters = reactive({ deviceCode: '', connectorNo: '', status: '' })
const router = useRouter()
function openTransaction(row: components['schemas']['TransactionView']) { router.push(`/transactions/${row.id}`) }
const q = useQuery({ queryKey: ['transactions', filters], queryFn: async () => {
  const result = await api.GET('/api/transactions', { params: { query: {
    deviceCode: filters.deviceCode || undefined,
    connectorNo: filters.connectorNo ? Number(filters.connectorNo) : undefined,
    status: (filters.status || undefined) as any,
  } } })
  return unwrap<components['schemas']['TransactionView'][]>(result)
} })
</script>
<template><div class="page"><h1>Transactions</h1><el-card>
  <el-form inline><el-form-item label="Device code"><el-input v-model="filters.deviceCode"/></el-form-item><el-form-item label="Connector"><el-input v-model="filters.connectorNo"/></el-form-item><el-form-item label="Status"><el-input v-model="filters.status"/></el-form-item><el-button @click="q.refetch()">Apply filters</el-button></el-form>
  <el-alert v-if="q.isError.value" type="error" :title="q.error.value?.message||'Could not load transactions'" :closable="false"/><el-skeleton v-else-if="q.isLoading.value" :rows="4" animated/><el-empty v-else-if="!q.data.value?.length" description="No matching transactions"/>
  <el-table v-else :data="q.data.value" @row-click="openTransaction"><el-table-column prop="id" label="ID"/><el-table-column prop="deviceCode" label="Device"/><el-table-column prop="connectorNo" label="Connector"/><el-table-column prop="protocol" label="Protocol"/><el-table-column prop="status" label="Status"/><el-table-column prop="startedAt" label="Started"/><el-table-column prop="endedAt" label="Ended"/><el-table-column prop="energyKwh" label="kWh"/><el-table-column prop="totalAmount" label="Amount"/></el-table>
  <p class="muted">Results are returned directly by the backend; no server pagination is implied.</p>
</el-card></div></template>
