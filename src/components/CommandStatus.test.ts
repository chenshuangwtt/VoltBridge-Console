// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import ElementPlus from 'element-plus'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CommandStatus from './CommandStatus.vue'
import { api } from '../api/client'
vi.mock('../api/client', () => ({
  api: { GET: vi.fn() },
  unwrap: async (response: { data: unknown }) => response.data,
}))
const view = (status: string) => ({
  commandId: 'cmd-1',
  deviceCode: 'D-1',
  type: 'START_CHARGING',
  status,
  createdAt: '2026-01-01T00:00:00Z',
  failureCode: status === 'FAILED' ? 'DEVICE_ERROR' : undefined,
  failureReason: status === 'FAILED' ? 'Device rejected command' : undefined,
})
describe('CommandStatus', () => {
  beforeEach(() => vi.mocked(api.GET).mockReset())
  async function mountState(status: string) {
    vi.mocked(api.GET).mockResolvedValue({ data: view(status) } as never)
    const wrapper = mount(CommandStatus, {
      props: { commandId: 'cmd-1' },
      global: {
        plugins: [
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
  it('does not call ACKED a business success', async () => {
    const w = await mountState('ACKED')
    expect(w.text()).toContain('充电设备已确认命令')
    expect(w.text()).not.toContain('命令执行成功')
  })
  it('shows success only at SUCCEEDED', async () => {
    const w = await mountState('SUCCEEDED')
    expect(w.text()).toContain('已成功')
    expect(w.text()).toContain('启动充电')
    expect(w.text()).not.toContain('START_CHARGING')
    expect(w.text()).not.toContain('SUCCEEDED')
  })
  it('shows failure reason and code', async () => {
    const w = await mountState('FAILED')
    expect(w.text()).toContain('DEVICE_ERROR')
    expect(w.text()).toContain('Device rejected command')
  })
  it('releases a pending command after the polling deadline', async () => {
    vi.useFakeTimers()
    try {
      const w = await mountState('ACKED')
      await vi.advanceTimersByTimeAsync(60_000)
      expect(w.emitted('status')?.at(-1)?.[0]).toBe('POLLING_TIMEOUT')
      expect(w.text()).toContain('自动查询已停止')
      w.unmount()
    } finally {
      vi.useRealTimers()
    }
  })
})
