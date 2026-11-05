<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useRoute } from 'vue-router'
import type { components } from '../api/generated/voltbridge-schema'
import { api, unwrap } from '../api/client'
import { ElMessage } from 'element-plus'
import CommandStatus from '../components/CommandStatus.vue'
type Schemas = components['schemas']
const route = useRoute(), qc = useQueryClient()
const deviceCode = computed(() => String(route.params.deviceCode || ''))
const device = useQuery({ queryKey: ['device', deviceCode], queryFn: async () => unwrap<Schemas['DeviceView']>(await api.GET('/api/devices/{deviceCode}', { params: { path: { deviceCode: deviceCode.value } } })) })
const dialog = ref(false), action = ref<'start'|'stop'|'reset'|'time-sync'>('start'), commandId = ref('')
const form = reactive({ connectorNo: '', limitAmount: 0, logicalCardNo: '', physicalCardNo: '', businessRef: '', whenIdle: true, targetTime: '' })
const commandMutation = useMutation({ mutationFn: async () => {
  if (action.value === 'start') return unwrap<Schemas['CommandCreatedView']>(await api.POST('/api/devices/{deviceCode}/commands/start-charging', { params:{path:{deviceCode:deviceCode.value}}, body:{connectorNo:form.connectorNo,limitAmount:form.limitAmount,...(form.logicalCardNo?{logicalCardNo:form.logicalCardNo}:{}),...(form.physicalCardNo?{physicalCardNo:form.physicalCardNo}:{}),...(form.businessRef?{businessRef:form.businessRef}:{})} }))
  if (action.value === 'stop') return unwrap<Schemas['CommandCreatedView']>(await api.POST('/api/devices/{deviceCode}/commands/stop-charging', { params:{path:{deviceCode:deviceCode.value}}, body:{connectorNo:form.connectorNo} }))
  if (action.value === 'reset') return unwrap<Schemas['CommandCreatedView']>(await api.POST('/api/devices/{deviceCode}/commands/reset', { params:{path:{deviceCode:deviceCode.value}}, body:{whenIdle:form.whenIdle} }))
  return unwrap<Schemas['CommandCreatedView']>(await api.POST('/api/devices/{deviceCode}/commands/time-sync', { params:{path:{deviceCode:deviceCode.value}}, body:form.targetTime?{targetTime:form.targetTime}:undefined }))
}, onSuccess: async result => { commandId.value=result.commandId || ''; dialog.value=false; await qc.invalidateQueries({queryKey:['device',deviceCode]}); ElMessage.success('Command submitted') } })
function open(name: typeof action.value) { action.value=name; commandMutation.reset(); dialog.value=true }
const connectorValid = computed(() => /^\d{1,2}$/.test(form.connectorNo))
const title = computed(()=>({start:'Start charging',stop:'Stop charging',reset:'Reset device','time-sync':'Synchronize time'}[action.value]))
</script>
<template><div class="page"><div class="page-title"><div><span class="eyebrow">DEVICES / DETAIL</span><h1>Device {{ deviceCode }}</h1></div><el-button @click="$router.push('/devices')">Back to lookup</el-button></div>
  <el-alert v-if="device.isError.value" type="error" :title="device.error.value?.message || 'Device lookup failed'" :closable="false"/><el-skeleton v-else-if="device.isLoading.value" :rows="4" animated/><el-empty v-else-if="!device.data.value" description="Device was not returned by the backend"/><template v-else>
    <el-card><template #header>Device information</template><el-descriptions :column="2" border><el-descriptions-item v-for="(value,key) in device.data.value" :key="key" :label="key">{{ value ?? '—' }}</el-descriptions-item></el-descriptions></el-card>
    <el-card class="mt"><template #header>Device operations</template><div class="actions"><el-button type="primary" @click="open('start')">Start Charging</el-button><el-button @click="open('stop')">Stop Charging</el-button><el-button @click="open('time-sync')">Time Sync</el-button><el-button type="warning" @click="open('reset')">Reset</el-button></div></el-card>
  </template>
  <CommandStatus v-if="commandId" :command-id="commandId" class="mt"/>
  <el-dialog v-model="dialog" :title="title" width="520px"><el-alert v-if="commandMutation.isError.value" type="error" :title="commandMutation.error.value?.message || 'Command was rejected'" :closable="false" class="mb"/><el-form label-position="top">
    <el-form-item v-if="action==='start'||action==='stop'" label="Connector number" required><el-input v-model="form.connectorNo" maxlength="2" placeholder="For example 01" /><small v-if="form.connectorNo&&!connectorValid" class="validation">Enter one or two digits.</small></el-form-item>
    <template v-if="action==='start'"><el-form-item label="Limit amount" required><el-input-number v-model="form.limitAmount" :min="0" :precision="2" /></el-form-item><el-form-item label="Logical card number"><el-input v-model="form.logicalCardNo" /></el-form-item><el-form-item label="Physical card number"><el-input v-model="form.physicalCardNo" /></el-form-item><el-form-item label="Business reference"><el-input v-model="form.businessRef" maxlength="128" /></el-form-item></template>
    <el-form-item v-if="action==='reset'" label="Reset when idle"><el-switch v-model="form.whenIdle" /></el-form-item><el-form-item v-if="action==='time-sync'" label="Target time (optional)"><el-date-picker v-model="form.targetTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss[Z]" /></el-form-item>
  </el-form><template #footer><el-button @click="dialog=false">Cancel</el-button><el-button type="primary" :loading="commandMutation.isPending.value" :disabled="(action==='start'||action==='stop')&&!connectorValid" @click="commandMutation.mutate()">Submit command</el-button></template></el-dialog>
</div></template>
