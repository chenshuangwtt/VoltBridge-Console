<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { api, unwrap } from '../api/client'
import type { components } from '../api/generated/voltbridge-schema'
import { commandStatusLabels, commandTypeLabels } from '../constants/statusLabels'
import { formatDateTimeWithSeconds } from '../utils/dateTime'
import CopyButton from './CopyButton.vue'
type Command = components['schemas']['CommandView']
const props = defineProps<{ commandId: string }>()
const emit = defineEmits<{ status: [status: string | undefined] }>()
let startedAt = Date.now()
let timeoutHandle: ReturnType<typeof setTimeout> | undefined
const autoPolling = ref(true)
const terminal = ['SUCCEEDED', 'FAILED', 'TIMEOUT']
const query = useQuery({
  queryKey: ['command', () => props.commandId],
  queryFn: async () =>
    unwrap<Command>(
      await api.GET('/api/commands/{commandId}', {
        params: { path: { commandId: props.commandId } },
      }),
    ),
  refetchInterval: (q) =>
    autoPolling.value &&
    Date.now() - startedAt < 60_000 &&
    !terminal.includes(q.state.data?.status || '')
      ? 2_000
      : false,
})
const stateLabel = computed(() => {
  const status = query.data.value?.status
  if (!status) return '正在查询命令状态'
  return commandStatusLabels[status] ?? status
})
watch(
  () => query.data.value?.status,
  (status) => {
    if (terminal.includes(status ?? '')) clearTimeout(timeoutHandle)
    emit('status', status)
  },
  { immediate: true },
)
watch(
  () => props.commandId,
  () => {
    startedAt = Date.now()
    autoPolling.value = true
    clearTimeout(timeoutHandle)
    timeoutHandle = setTimeout(() => {
      if (terminal.includes(query.data.value?.status ?? '')) return
      autoPolling.value = false
      emit('status', 'POLLING_TIMEOUT')
    }, 60_000)
  },
  { immediate: true },
)
onUnmounted(() => clearTimeout(timeoutHandle))
function stopPolling() {
  autoPolling.value = false
}
</script>
<template>
  <section class="panel command-panel" aria-live="polite">
    <div class="section-head">
      <div>
        <h2>命令状态</h2>
        <span class="tag">{{ stateLabel }}</span>
      </div>
      <el-button :loading="query.isFetching.value" @click="query.refetch()">刷新</el-button>
    </div>
    <el-alert
      v-if="query.isError.value"
      :title="query.error.value?.message || '命令状态查询失败'"
      type="error"
      :closable="false"
    />
    <p v-else-if="query.isLoading.value">正在查询命令状态…</p>
    <template v-else-if="query.data.value">
      <el-alert
        v-if="!autoPolling && !terminal.includes(query.data.value.status ?? '')"
        title="自动查询已停止；命令可能仍在执行，请手动刷新确认最终状态。"
        type="info"
        :closable="false"
        class="mb"
      />
      <p v-if="query.data.value.status === 'ACKED'" class="muted">
        充电设备已确认命令，但这不代表命令已执行完成。
      </p>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="命令 ID">
          <span>{{ query.data.value.commandId }}</span>
          <CopyButton :value="query.data.value.commandId" /> </el-descriptions-item
        ><el-descriptions-item label="命令类型">{{
          commandTypeLabels[query.data.value.type ?? ''] ?? query.data.value.type
        }}</el-descriptions-item>
        <el-descriptions-item label="设备">
          <span>{{ query.data.value.deviceCode }}</span>
          <CopyButton :value="query.data.value.deviceCode" /> </el-descriptions-item
        ><el-descriptions-item label="连接器">{{
          query.data.value.connectorNo || '—'
        }}</el-descriptions-item>
        <el-descriptions-item v-if="query.data.value.businessRef" label="业务参考号">
          <span>{{ query.data.value.businessRef }}</span>
          <CopyButton :value="query.data.value.businessRef" />
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{
          formatDateTimeWithSeconds(query.data.value.createdAt)
        }}</el-descriptions-item
        ><el-descriptions-item label="发送时间">{{
          formatDateTimeWithSeconds(query.data.value.sentAt)
        }}</el-descriptions-item>
        <el-descriptions-item label="确认时间">{{
          formatDateTimeWithSeconds(query.data.value.ackedAt)
        }}</el-descriptions-item
        ><el-descriptions-item label="完成时间">{{
          formatDateTimeWithSeconds(query.data.value.completedAt)
        }}</el-descriptions-item>
        <el-descriptions-item v-if="query.data.value.failureCode" label="失败代码">{{
          query.data.value.failureCode
        }}</el-descriptions-item
        ><el-descriptions-item v-if="query.data.value.failureReason" label="失败原因">{{
          query.data.value.failureReason
        }}</el-descriptions-item>
      </el-descriptions>
      <el-button v-if="terminal.includes(query.data.value.status || '')" text @click="stopPolling"
        >自动轮询已停止</el-button
      >
    </template>
  </section>
</template>
