// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TransactionDetail from './TransactionDetail.vue'
import { ApiError, api } from '../api/client'

vi.mock('../api/client', () => {
  class ApiError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  }
  return {
    ApiError,
    api: { GET: vi.fn(), POST: vi.fn() },
    unwrap: async (response: { data: unknown }) => response.data,
  }
})
const transaction = {
  id: 'tx-1',
  deviceCode: 'charger-1',
  connectorNo: 1,
  status: 'COMPLETED',
  energyKwh: 4.2,
  totalAmount: 5.1,
}
const billing = {
  transactionId: 'tx-1',
  status: 'FINALIZED',
  currency: 'CNY',
  totalAmount: 5.1,
  energyKwh: 4.2,
}

describe('TransactionDetail', () => {
  beforeEach(() => vi.mocked(api.GET).mockReset())
  async function mountPage() {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/transactions/:id', component: TransactionDetail }],
    })
    await router.push('/transactions/tx-1')
    await router.isReady()
    return mount(TransactionDetail, {
      global: {
        plugins: [
          router,
          [
            VueQueryPlugin,
            { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
          ],
        ],
      },
    })
  }
  it('renders transaction and linked billing', async () => {
    vi.mocked(api.GET)
      .mockResolvedValueOnce({ data: transaction } as never)
      .mockResolvedValueOnce({ data: billing } as never)
    const wrapper = await mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('charger-1')
    expect(wrapper.text()).toContain('已结算')
    expect(wrapper.text()).toContain('5.1')
  })

  it.each(['STARTING', 'CHARGING'])(
    'does not request billing while a transaction is %s',
    async (status) => {
      vi.mocked(api.GET).mockResolvedValueOnce({ data: { ...transaction, status } } as never)

      const wrapper = await mountPage()
      await flushPromises()

      expect(wrapper.text()).toContain(status === 'STARTING' ? '启动中' : '充电中')
      expect(wrapper.findAll('el-alert').map((alert) => alert.attributes('title'))).toContain(
        '交易正在进行中；交易完成后再查询账单。',
      )
      expect(api.GET).toHaveBeenCalledTimes(1)
      expect(wrapper.text()).not.toContain('账单加载失败')
    },
  )

  it('offers billing generation for completed transactions without a billing record', async () => {
    vi.mocked(api.GET)
      .mockResolvedValueOnce({ data: transaction } as never)
      .mockRejectedValueOnce(new ApiError('BILLING_RECORD_NOT_FOUND', 'No billing record'))

    const wrapper = await mountPage()
    await flushPromises()

    expect(wrapper.findAll('el-alert').map((alert) => alert.attributes('title'))).toContain(
      '交易已完成，但账单尚未生成。',
    )
    expect(wrapper.text()).toContain('生成账单')
  })
})
