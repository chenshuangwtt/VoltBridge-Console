// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import ElementPlus, { ElButton, ElTooltip } from 'element-plus'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import CommandStatus from '../components/CommandStatus.vue'
import DeviceDetail from './DeviceDetail.vue'

vi.mock('../api/client', () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  unwrap: async (response: { data: unknown }) => response.data,
}))

const onlineYkcDevice = {
  id: 'device-id',
  deviceCode: 'VB-DEMO-006',
  protocol: 'YUN_KUAI_CHONG_150',
  businessStatus: 'ENABLED',
  onlineStatus: 'ONLINE',
  connectors: [{ connectorNo: 1, runtimeStatus: 'AVAILABLE' }],
  capabilities: { startCharging: true, stopCharging: true, timeSync: true, reset: true },
}
const DialogStub = defineComponent({
  props: { modelValue: { type: Boolean, default: false } },
  template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>',
})

describe('DeviceDetail operations', () => {
  beforeEach(() => {
    vi.mocked(api.GET).mockReset()
    vi.mocked(api.POST).mockReset()
  })

  async function mountPage(device: object, transactionList: object[] = []) {
    vi.mocked(api.GET)
      .mockResolvedValueOnce({ data: device } as never)
      .mockResolvedValueOnce({ data: transactionList } as never)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/devices/:deviceCode', component: DeviceDetail }],
    })
    await router.push('/devices/VB-DEMO-006')
    await router.isReady()
    const wrapper = mount(DeviceDetail, {
      global: {
        stubs: { ElDialog: DialogStub },
        plugins: [
          router,
          ElementPlus,
          [
            VueQueryPlugin,
            { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
          ],
        ],
      },
    })
    await flushPromises()
    return wrapper
  }

  it('disables every device operation while the device is offline', async () => {
    const wrapper = await mountPage({
      ...onlineYkcDevice,
      onlineStatus: 'OFFLINE',
    })

    for (const label of ['启动充电', '停止充电', '时间同步', '设备复位']) {
      const button = wrapper.findAllComponents(ElButton).find((item) => item.text() === label)
      expect(button?.props('disabled')).toBe(true)
    }
  })

  it('keeps an enabled offline device semantically distinct', async () => {
    const wrapper = await mountPage({ ...onlineYkcDevice, onlineStatus: 'OFFLINE' })
    expect(wrapper.text()).toContain('业务状态')
    expect(wrapper.text()).toContain('启用')
    expect(wrapper.text()).toContain('在线状态')
    expect(wrapper.text()).toContain('离线')
    expect(wrapper.text()).not.toContain('业务状态离线')
  })

  it('disables every remote operation for a disabled device', async () => {
    const wrapper = await mountPage({ ...onlineYkcDevice, businessStatus: 'DISABLED' })
    for (const label of ['启动充电', '停止充电', '时间同步', '设备复位']) {
      const button = wrapper.findAllComponents(ElButton).find((item) => item.text() === label)
      expect(button?.props('disabled')).toBe(true)
    }
  })

  it('keeps OCPP time sync disabled with the protocol explanation', async () => {
    const wrapper = await mountPage({
      ...onlineYkcDevice,
      protocol: 'OCPP_16',
      capabilities: { startCharging: true, stopCharging: true, timeSync: false, reset: false },
    })

    const timeSyncButton = wrapper
      .findAllComponents(ElButton)
      .find((item) => item.text() === '时间同步')
    expect(timeSyncButton?.props('disabled')).toBe(true)
    expect(
      wrapper
        .findAllComponents(ElTooltip)
        .some((tooltip) =>
          String(tooltip.props('content') ?? '').includes(
            '当前 OCPP 1.6 适配器尚不支持主动时间同步',
          ),
        ),
    ).toBe(true)
  })

  it('submits platform time sync with an empty body', async () => {
    vi.mocked(api.POST).mockResolvedValueOnce({ data: { commandId: 'command-1' } } as never)
    const wrapper = await mountPage(onlineYkcDevice)
    vi.mocked(api.GET).mockImplementation(
      async (path) =>
        ({
          data:
            path === '/api/transactions'
              ? []
              : path === '/api/commands/{commandId}'
                ? { commandId: 'command-1', status: 'ACKED' }
                : onlineYkcDevice,
        }) as never,
    )

    await wrapper
      .findAllComponents(ElButton)
      .find((item) => item.text() === '时间同步')
      ?.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('将设备时间同步为平台当前时间？')

    await wrapper
      .findAllComponents(ElButton)
      .find((item) => item.text() === '提交命令')
      ?.trigger('click')
    await flushPromises()

    expect(api.POST).toHaveBeenCalledWith('/api/devices/{deviceCode}/commands/time-sync', {
      params: { path: { deviceCode: 'VB-DEMO-006' } },
      body: {},
    })
    const timeSyncButton = () =>
      wrapper.findAllComponents(ElButton).find((item) => item.text() === '时间同步')
    expect(timeSyncButton()?.props('disabled')).toBe(true)
    wrapper.findComponent(CommandStatus).vm.$emit('status', 'POLLING_TIMEOUT')
    await flushPromises()
    expect(timeSyncButton()?.props('disabled')).toBe(false)
  })
})
