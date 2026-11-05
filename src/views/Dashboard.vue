<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { api,unwrap } from '../api/client'
import type {components} from '../api/generated/voltbridge-schema'
import { useRouter } from 'vue-router'
const router=useRouter()
function openTransaction(row:components['schemas']['TransactionView']){router.push(`/transactions/${row.id}`)}
const q=useQuery({queryKey:['transactions'],queryFn:async()=>unwrap<components['schemas']['TransactionView'][]>(await api.GET('/api/transactions'))})
</script>
<template><div class="page"><p class="intro">A live view of charging operations from VoltBridge.</p><el-alert v-if="q.isError.value" type="error" :title="q.error.value?.message||'Transaction query failed'" :closable="false"/><el-skeleton v-else-if="q.isLoading.value" :rows="4" animated/><template v-else><div class="cards"><article class="card"><small>ACTIVE TRANSACTIONS</small><strong>{{q.data.value?.filter(x=>['STARTING','CHARGING','ENDING'].includes(x.status||'')).length??0}}</strong><span>Current query results</span></article><article class="card"><small>COMPLETED TRANSACTIONS</small><strong>{{q.data.value?.filter(x=>x.status==='COMPLETED').length??0}}</strong><span>Current query results</span></article></div><el-card><template #header>Recent transactions</template><el-empty v-if="!q.data.value?.length" description="No transactions returned by the backend"/><el-table v-else :data="q.data.value.slice(0,8)" @row-click="openTransaction"><el-table-column prop="deviceCode" label="Device"/><el-table-column prop="connectorNo" label="Connector"/><el-table-column prop="status" label="Status"/><el-table-column prop="startedAt" label="Started"/><el-table-column prop="totalAmount" label="Amount"/></el-table></el-card></template></div></template>
