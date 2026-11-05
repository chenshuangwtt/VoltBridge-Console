<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { api, unwrap } from '../api/client'
import type { components } from '../api/generated/voltbridge-schema'
type Command = components['schemas']['CommandView']
const props = defineProps<{ commandId: string }>()
const startedAt = Date.now()
const autoPolling = ref(true)
const terminal = ['SUCCEEDED', 'FAILED', 'TIMEOUT']
const query = useQuery({
  queryKey: ['command', () => props.commandId],
  queryFn: async () => unwrap<Command>(await api.GET('/api/commands/{commandId}', { params: { path: { commandId: props.commandId } } })),
  refetchInterval: q => autoPolling.value && Date.now() - startedAt < 60_000 && !terminal.includes(q.state.data?.status || '') ? 2_000 : false,
})
const succeeded = computed(() => query.data.value?.status === 'SUCCEEDED')
const stateLabel = computed(() => succeeded.value ? 'Command succeeded' : query.data.value?.status === 'ACKED' ? 'Acknowledged by charger; awaiting business completion' : query.data.value?.status || 'Checking command status')
function stopPolling() { autoPolling.value = false }
</script>
<template>
  <section class="panel command-panel" aria-live="polite">
    <div class="section-head"><div><h2>Command status</h2><span class="tag">{{ stateLabel }}</span></div><el-button :loading="query.isFetching.value" @click="query.refetch()">Refresh</el-button></div>
    <el-alert v-if="query.isError.value" :title="query.error.value?.message || 'Could not load command status'" type="error" :closable="false" />
    <p v-else-if="query.isLoading.value">Checking command status…</p>
    <template v-else-if="query.data.value">
      <p v-if="query.data.value.status==='ACKED'" class="muted">The charger acknowledged the command. ACKED does not mean the operation has completed.</p>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="Command ID">{{ query.data.value.commandId }}</el-descriptions-item><el-descriptions-item label="Type">{{ query.data.value.type }}</el-descriptions-item>
        <el-descriptions-item label="Device">{{ query.data.value.deviceCode }}</el-descriptions-item><el-descriptions-item label="Connector">{{ query.data.value.connectorNo || '—' }}</el-descriptions-item>
        <el-descriptions-item label="Created">{{ query.data.value.createdAt || '—' }}</el-descriptions-item><el-descriptions-item label="Sent">{{ query.data.value.sentAt || '—' }}</el-descriptions-item>
        <el-descriptions-item label="Acknowledged">{{ query.data.value.ackedAt || '—' }}</el-descriptions-item><el-descriptions-item label="Completed">{{ query.data.value.completedAt || '—' }}</el-descriptions-item>
        <el-descriptions-item v-if="query.data.value.failureCode" label="Failure code">{{ query.data.value.failureCode }}</el-descriptions-item><el-descriptions-item v-if="query.data.value.failureReason" label="Failure reason">{{ query.data.value.failureReason }}</el-descriptions-item>
      </el-descriptions>
      <el-button v-if="terminal.includes(query.data.value.status || '')" text @click="stopPolling">Automatic polling stopped</el-button>
    </template>
  </section>
</template>
