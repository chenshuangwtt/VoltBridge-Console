<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { components } from '../api/generated/voltbridge-schema'
import { api, unwrap } from '../api/client'
import CommandStatus from '../components/CommandStatus.vue'
import CopyButton from '../components/CopyButton.vue'
import { fieldLabel, statusDisplay } from '../constants/statusLabels'
import { formatFieldValue } from '../utils/display'
import {
  getOperatingStatus,
  businessStatusLabel,
  businessStatusTagType,
  onlineStatusTagType,
  operatingStatusLabel,
  operatingStatusTagType,
  type OperatingStatus,
} from '../utils/deviceStatus'

type Schemas = components['schemas']
type Device = Schemas['DeviceView']
type Transaction = Schemas['TransactionView']

const route = useRoute()
const queryClient = useQueryClient()
const deviceCode = computed(() => String(route.params.deviceCode || ''))
const commandId = ref('')
const commandPending = ref(false)
const device = useQuery({
  queryKey: ['device', deviceCode],
  queryFn: async () =>
    unwrap<Device>(
      await api.GET('/api/devices/{deviceCode}', {
        params: { path: { deviceCode: deviceCode.value } },
      }),
    ),
  refetchInterval: (query) =>
    query.state.data?.onlineStatus === 'ONLINE' || commandPending.value ? 4_000 : 15_000,
})
const transactions = useQuery({
  queryKey: ['transactions', deviceCode],
  queryFn: async () =>
    unwrap<Transaction[]>(
      await api.GET('/api/transactions', {
        params: { query: { deviceCode: deviceCode.value } },
      }),
    ),
  refetchInterval: () =>
    device.data.value?.onlineStatus === 'ONLINE' || commandPending.value ? 4_000 : 15_000,
})

const dialog = ref(false)
const action = ref<'start' | 'stop' | 'reset' | 'time-sync'>('start')
const form = reactive({
  connectorNo: '',
  limitAmount: 0,
  logicalCardNo: '',
  physicalCardNo: '',
  businessRef: '',
  whenIdle: true,
})

const deviceOnline = computed(() => device.data.value?.onlineStatus === 'ONLINE')
const businessEnabled = computed(() => device.data.value?.businessStatus === 'ENABLED')
const capabilities = computed(() => device.data.value?.capabilities)
const activeTransactions = computed(() =>
  (transactions.data.value ?? []).filter((transaction) => isActiveTransaction(transaction.status)),
)
const stoppableTransactions = computed(() =>
  activeTransactions.value.filter((transaction) =>
    ['STARTING', 'CHARGING'].includes(transaction.status ?? ''),
  ),
)
const availableConnectors = computed(() =>
  (device.data.value?.connectors ?? []).filter(
    (connector) =>
      connector.runtimeStatus === 'AVAILABLE' &&
      !activeTransactions.value.some(
        (transaction) => transaction.connectorNo === connector.connectorNo,
      ),
  ),
)
const displayedDeviceFields = computed(() =>
  Object.entries(device.data.value ?? {}).filter(
    ([key]) => !['connectors', 'capabilities', 'businessStatus', 'onlineStatus'].includes(key),
  ),
)
const operatingStatus = computed<OperatingStatus>(() =>
  getOperatingStatus(device.data.value ?? {}, activeTransactions.value),
)
const canStart = computed(
  () =>
    businessEnabled.value &&
    deviceOnline.value &&
    !commandPending.value &&
    transactions.isSuccess.value &&
    capabilities.value?.startCharging === true &&
    availableConnectors.value.length > 0,
)
const canStop = computed(
  () =>
    businessEnabled.value &&
    deviceOnline.value &&
    !commandPending.value &&
    transactions.isSuccess.value &&
    capabilities.value?.stopCharging === true &&
    stoppableTransactions.value.length > 0,
)
const canTimeSync = computed(
  () =>
    businessEnabled.value &&
    deviceOnline.value &&
    !commandPending.value &&
    capabilities.value?.timeSync === true,
)
const canReset = computed(
  () =>
    businessEnabled.value &&
    deviceOnline.value &&
    !commandPending.value &&
    capabilities.value?.reset === true,
)
const operationAllowed = computed(() => {
  if (action.value === 'start') return canStart.value
  if (action.value === 'stop') return canStop.value
  if (action.value === 'time-sync') return canTimeSync.value
  return canReset.value
})
const connectorValid = computed(() => {
  if (!/^\d{1,2}$/.test(form.connectorNo)) return false
  const connectorNo = Number(form.connectorNo)
  if (action.value === 'start') {
    return availableConnectors.value.some((connector) => connector.connectorNo === connectorNo)
  }
  if (action.value === 'stop') {
    return stoppableTransactions.value.some(
      (transaction) => transaction.connectorNo === connectorNo,
    )
  }
  return true
})

const commandMutation = useMutation({
  mutationFn: async () => {
    if (action.value === 'start')
      return unwrap<Schemas['CommandCreatedView']>(
        await api.POST('/api/devices/{deviceCode}/commands/start-charging', {
          params: { path: { deviceCode: deviceCode.value } },
          body: {
            connectorNo: form.connectorNo,
            limitAmount: form.limitAmount,
            ...(form.logicalCardNo ? { logicalCardNo: form.logicalCardNo } : {}),
            ...(form.physicalCardNo ? { physicalCardNo: form.physicalCardNo } : {}),
            ...(form.businessRef ? { businessRef: form.businessRef } : {}),
          },
        }),
      )
    if (action.value === 'stop')
      return unwrap<Schemas['CommandCreatedView']>(
        await api.POST('/api/devices/{deviceCode}/commands/stop-charging', {
          params: { path: { deviceCode: deviceCode.value } },
          body: { connectorNo: form.connectorNo },
        }),
      )
    if (action.value === 'reset')
      return unwrap<Schemas['CommandCreatedView']>(
        await api.POST('/api/devices/{deviceCode}/commands/reset', {
          params: { path: { deviceCode: deviceCode.value } },
          body: { whenIdle: form.whenIdle },
        }),
      )
    return unwrap<Schemas['CommandCreatedView']>(
      await api.POST('/api/devices/{deviceCode}/commands/time-sync', {
        params: { path: { deviceCode: deviceCode.value } },
        body: {},
      }),
    )
  },
  onSuccess: async (result) => {
    commandId.value = result.commandId || ''
    commandPending.value = true
    dialog.value = false
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['device', deviceCode] }),
      queryClient.invalidateQueries({ queryKey: ['transactions', deviceCode] }),
    ])
    ElMessage.success('命令已提交')
  },
  onError: () => {
    commandPending.value = false
  },
})

function isActiveTransaction(status?: string) {
  return ['STARTING', 'CHARGING', 'ENDING'].includes(status ?? '')
}

function open(name: typeof action.value) {
  action.value = name
  commandMutation.reset()
  if (name === 'start' && !connectorValid.value) {
    form.connectorNo = String(availableConnectors.value[0]?.connectorNo ?? '')
  } else if (name === 'stop' && !connectorValid.value) {
    form.connectorNo = String(stoppableTransactions.value[0]?.connectorNo ?? '')
  }
  dialog.value = true
}

function submitCommand() {
  commandPending.value = true
  commandMutation.mutate()
}

function updateCommandStatus(status?: string) {
  if (['SUCCEEDED', 'FAILED', 'TIMEOUT', 'POLLING_TIMEOUT'].includes(status ?? ''))
    commandPending.value = false
}

function protocolOperationReason(operation: 'time-sync' | 'reset') {
  if (!businessEnabled.value) return '设备已停用，无法执行远程操作'
  if (!deviceOnline.value) return '设备离线，无法操作'
  if (commandPending.value) return '当前设备操作正在处理中'
  if (operation === 'time-sync' && capabilities.value?.timeSync !== true) {
    return device.data.value?.protocol === 'OCPP_16'
      ? '当前 OCPP 1.6 适配器尚不支持主动时间同步'
      : '当前设备协议不支持平台主动时间同步'
  }
  if (operation === 'reset' && capabilities.value?.reset !== true) {
    return device.data.value?.protocol === 'OCPP_16'
      ? '当前 OCPP 1.6 适配器尚未实现设备复位'
      : '当前设备协议暂不支持设备复位'
  }
  return operation === 'time-sync' ? '设备支持时间同步' : '设备支持复位操作'
}

function actionReason(actionName: 'start' | 'stop') {
  if (!businessEnabled.value) return '设备已停用，无法执行远程操作'
  if (!deviceOnline.value) return '设备离线，无法执行远程操作'
  if (commandPending.value) return '当前设备操作正在处理中'
  if (actionName === 'start' && !availableConnectors.value.length)
    return '当前没有空闲且可启动充电的连接器'
  if (actionName === 'stop' && !stoppableTransactions.value.length)
    return '当前没有可停止的充电交易'
  if (capabilities.value?.[actionName === 'start' ? 'startCharging' : 'stopCharging'] !== true)
    return '当前设备协议不支持此操作'
  return actionName === 'start' ? '可以选择空闲连接器启动充电' : '可以停止正在进行的交易'
}

const title = computed(
  () =>
    ({
      start: '启动充电',
      stop: '停止充电',
      reset: '设备复位',
      'time-sync': '时间同步',
    })[action.value],
)
</script>

<template>
  <div class="page">
    <div class="page-heading">
      <div class="page-heading-copy">
        <span class="eyebrow">设备管理 / 设备详情</span>
        <h1>设备 {{ deviceCode }}</h1>
        <p class="page-lede">查看设备档案、提交运维命令，并跟踪设备返回的命令状态。</p>
      </div>
      <el-button @click="$router.push('/devices')">返回设备</el-button>
    </div>
    <el-alert
      v-if="device.isError.value"
      type="error"
      :title="device.error.value?.message || '设备查询失败'"
      :closable="false"
    />
    <el-skeleton v-else-if="device.isLoading.value" :rows="4" animated />
    <el-empty v-else-if="!device.data.value" description="后端未返回该设备信息" />
    <template v-else>
      <div class="section-label">
        <div>
          <h2>设备信息</h2>
          <p>业务状态与设备实时运行状态分开展示</p>
        </div>
      </div>
      <el-card>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="业务状态">
            <el-tag :type="businessStatusTagType(device.data.value.businessStatus)">
              {{ businessStatusLabel(device.data.value.businessStatus) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="在线状态">
            <el-tag :type="onlineStatusTagType(device.data.value.onlineStatus)">
              {{ statusDisplay(device.data.value.onlineStatus) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="运行状态">
            <el-tag :type="operatingStatusTagType(operatingStatus)">{{
              operatingStatusLabel(operatingStatus)
            }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item
            v-for="([key, value], index) in displayedDeviceFields"
            :key="index"
            :label="fieldLabel(key)"
          >
            <span v-if="key === 'id' || key === 'deviceCode'">{{ value ?? '—' }}</span>
            <CopyButton
              v-if="key === 'id' || key === 'deviceCode'"
              :value="typeof value === 'string' ? value : ''"
            />
            <template v-else>{{ formatFieldValue(key, value) }}</template>
          </el-descriptions-item>
        </el-descriptions>
        <div v-if="device.data.value.connectors?.length" class="connector-runtime">
          <strong>连接器运行状态</strong>
          <el-tag
            v-for="connector in device.data.value.connectors"
            :key="connector.connectorNo"
            :type="connector.runtimeStatus === 'AVAILABLE' ? 'success' : 'info'"
          >
            {{ String(connector.connectorNo).padStart(2, '0') }}：{{
              statusDisplay(connector.runtimeStatus)
            }}
          </el-tag>
        </div>
      </el-card>
      <div class="section-label">
        <div>
          <h2>设备操作</h2>
          <p>按钮根据设备在线状态、协议能力和连接器交易状态启用</p>
        </div>
      </div>
      <el-card class="operation-card">
        <el-alert
          v-if="transactions.isError.value"
          type="error"
          title="交易状态加载失败，暂时无法判断连接器是否可操作。"
          :closable="false"
          class="mb"
        />
        <div class="actions">
          <el-tooltip :content="actionReason('start')" placement="top">
            <span
              ><el-button type="primary" :disabled="!canStart" @click="open('start')"
                >启动充电</el-button
              ></span
            >
          </el-tooltip>
          <el-tooltip :content="actionReason('stop')" placement="top">
            <span><el-button :disabled="!canStop" @click="open('stop')">停止充电</el-button></span>
          </el-tooltip>
          <el-tooltip :content="protocolOperationReason('time-sync')" placement="top">
            <span>
              <el-button :disabled="!canTimeSync" @click="open('time-sync')">时间同步</el-button>
            </span>
          </el-tooltip>
          <el-tooltip :content="protocolOperationReason('reset')" placement="top">
            <span>
              <el-button type="warning" :disabled="!canReset" @click="open('reset')"
                >设备复位</el-button
              >
            </span>
          </el-tooltip>
        </div>
      </el-card>
    </template>
    <CommandStatus
      v-if="commandId"
      :command-id="commandId"
      class="mt"
      @status="updateCommandStatus"
    />
    <el-dialog v-model="dialog" :title="title" width="520px">
      <el-alert
        v-if="commandMutation.isError.value"
        type="error"
        :title="commandMutation.error.value?.message || '命令提交失败'"
        :closable="false"
        class="mb"
      />
      <el-alert
        v-if="action === 'time-sync'"
        title="将设备时间同步为平台当前时间？"
        description="不指定目标时间时，平台会使用 VoltBridge 当前时间。"
        type="info"
        :closable="false"
      />
      <el-alert
        v-if="action === 'reset'"
        title="设备复位可能导致设备短暂离线，并需要重新连接平台。"
        description="这是请求设备自身重启或复位，不会替代停止充电操作。"
        type="warning"
        :closable="false"
        class="mb"
      />
      <el-form label-position="top">
        <el-form-item v-if="action === 'start' || action === 'stop'" label="连接器编号" required>
          <el-select
            v-if="action === 'start'"
            v-model="form.connectorNo"
            placeholder="选择空闲连接器"
          >
            <el-option
              v-for="connector in availableConnectors"
              :key="connector.connectorNo"
              :label="String(connector.connectorNo).padStart(2, '0')"
              :value="String(connector.connectorNo)"
            />
          </el-select>
          <el-select v-else v-model="form.connectorNo" placeholder="选择正在进行的交易">
            <el-option
              v-for="transaction in stoppableTransactions"
              :key="transaction.id"
              :label="`${String(transaction.connectorNo).padStart(2, '0')} · ${statusDisplay(transaction.status)}`"
              :value="String(transaction.connectorNo)"
            />
          </el-select>
          <small v-if="action === 'start' && !availableConnectors.length" class="validation">
            当前没有可启动充电的连接器。
          </small>
          <small v-if="action === 'stop' && !stoppableTransactions.length" class="validation">
            当前没有可以停止的充电交易。
          </small>
        </el-form-item>
        <template v-if="action === 'start'">
          <el-form-item label="金额上限" required>
            <el-input-number v-model="form.limitAmount" :min="0" :precision="2" />
          </el-form-item>
          <el-form-item label="逻辑卡号"><el-input v-model="form.logicalCardNo" /></el-form-item>
          <el-form-item label="实体卡号"><el-input v-model="form.physicalCardNo" /></el-form-item>
          <el-form-item label="业务参考号">
            <el-input v-model="form.businessRef" maxlength="128" />
          </el-form-item>
        </template>
        <el-form-item v-if="action === 'reset'" label="空闲时复位">
          <el-switch v-model="form.whenIdle" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button
          type="primary"
          :loading="commandMutation.isPending.value"
          :disabled="
            !operationAllowed || ((action === 'start' || action === 'stop') && !connectorValid)
          "
          @click="submitCommand"
        >
          提交命令
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.connector-runtime {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.connector-runtime strong {
  margin-right: 0.25rem;
}
</style>
