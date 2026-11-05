// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TransactionDetail from './TransactionDetail.vue'
import { api } from '../api/client'

vi.mock('../api/client', () => ({ api: { GET: vi.fn(), POST: vi.fn() }, unwrap: async (r: any) => r.data }))
const transaction = { id: 'tx-1', deviceCode: 'charger-1', connectorNo: 1, status: 'COMPLETED', energyKwh: 4.2, totalAmount: 5.1 }
const billing = { transactionId: 'tx-1', status: 'FINALIZED', currency: 'CNY', totalAmount: 5.1, energyKwh: 4.2 }

describe('TransactionDetail', () => {
  beforeEach(() => vi.mocked(api.GET).mockReset())
  async function mountPage() {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/transactions/:id', component: TransactionDetail }] })
    await router.push('/transactions/tx-1')
    await router.isReady()
    return mount(TransactionDetail, { global: { plugins: [router, [VueQueryPlugin, { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) }]] } })
  }
  it('renders transaction and linked billing', async () => {
    vi.mocked(api.GET).mockResolvedValueOnce({ data: transaction } as any).mockResolvedValueOnce({ data: billing } as any)
    const wrapper = await mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('charger-1')
    expect(wrapper.text()).toContain('FINALIZED')
    expect(wrapper.text()).toContain('5.1')
  })
})
