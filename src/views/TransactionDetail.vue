<script setup lang="ts">
import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useRoute } from 'vue-router'
import type { components } from '../api/generated/voltbridge-schema'
import { api, unwrap } from '../api/client'
type Schemas=components['schemas']
const route=useRoute(),qc=useQueryClient(),id=computed(()=>String(route.params.id||''))
const tx=useQuery({queryKey:computed(()=>['transaction',id.value]),queryFn:async()=>unwrap<Schemas['TransactionView']>(await api.GET('/api/transactions/{transactionId}',{params:{path:{transactionId:id.value}}}))})
const bill=useQuery({queryKey:computed(()=>['billing-by-transaction',id.value]),queryFn:async()=>unwrap<Schemas['BillingRecordView']>(await api.GET('/api/billing-records/by-transaction/{transactionId}',{params:{path:{transactionId:id.value}}})),retry:false})
const retry=useMutation({mutationFn:async()=>unwrap<Schemas['BillingRecordView']>(await api.POST('/api/billing-records/by-transaction/{transactionId}/retry',{params:{path:{transactionId:id.value}}})),onSuccess:()=>qc.invalidateQueries({queryKey:['billing-by-transaction',id.value]})})
const lifecycle=['STARTING','CHARGING','ENDING','COMPLETED']
</script>
<template><div class="page"><div class="page-title"><div><span class="eyebrow">TRANSACTIONS / DETAIL</span><h1>Transaction</h1></div><el-button @click="$router.push('/transactions')">Back to transactions</el-button></div>
  <el-skeleton v-if="tx.isLoading.value" :rows="5" animated/><el-alert v-else-if="tx.isError.value" type="error" :title="tx.error.value?.message || 'Transaction lookup failed'" :closable="false"/><template v-else-if="tx.data.value"><el-card><template #header><span>Current transaction state <el-tag>{{tx.data.value.status}}</el-tag></span></template>
    <div class="lifecycle" aria-label="Transaction lifecycle stages"><span v-for="stage in lifecycle" :key="stage" :class="{current:stage===tx.data.value.status,passed:lifecycle.indexOf(stage)<lifecycle.indexOf(tx.data.value.status||'')}" >{{stage}}</span></div>
    <el-descriptions :column="2" border><el-descriptions-item v-for="(value,key) in tx.data.value" :key="key" :label="key">{{value??'—'}}</el-descriptions-item></el-descriptions><p class="muted">Lifecycle stages show the model; only facts and timestamps returned below are persisted.</p>
  </el-card><el-card class="mt"><template #header>Billing summary</template><el-skeleton v-if="bill.isLoading.value" :rows="3" animated/><el-alert v-else-if="bill.isError.value" type="info" title="Billing is not available for this transaction yet." :closable="false"/><template v-else-if="bill.data.value"><el-descriptions :column="2" border><el-descriptions-item v-for="key in ['status','energyKwh','energyFee','serviceFee','subtotalAmount','discountAmount','totalAmount','currency','tariffPlanId','finalizedAt']" :key="key" :label="key">{{bill.data.value[key as keyof typeof bill.data.value]??'—'}}</el-descriptions-item></el-descriptions><el-button v-if="bill.data.value.status!=='FINALIZED'" class="mt" :loading="retry.isPending.value" @click="retry.mutate()">Retry billing</el-button><el-alert v-if="retry.isError.value" class="mt" type="error" :title="retry.error.value?.message || 'Billing retry rejected'" :closable="false"/></template></el-card></template>
</div></template>
