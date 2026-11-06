// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import ElementPlus from 'element-plus'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import BillingDetails from './BillingDetails.vue'

vi.mock('../api/client', () => ({
  api: { GET: vi.fn() },
  unwrap: async (response: { data: unknown }) => response.data,
}))

const DrawerStub = defineComponent({
  props: { modelValue: { type: Boolean, default: false } },
  template: '<div v-if="modelValue" class="snapshot-drawer"><slot /></div>',
})

function mountBill(bill: Record<string, unknown>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return mount(BillingDetails, {
    props: { bill: bill as never },
    global: {
      plugins: [ElementPlus, [VueQueryPlugin, { queryClient }]],
      stubs: { ElDrawer: DrawerStub },
    },
  })
}

describe('BillingDetails', () => {
  beforeEach(() => {
    vi.mocked(api.GET).mockReset()
  })
  it('renders fixed-rate line items and trusts the backend total', async () => {
    const wrapper = mountBill({
      currency: 'CNY',
      status: 'FINALIZED',
      energyKwh: 10,
      energyFee: 10,
      serviceFee: 2,
      subtotalAmount: 12,
      discountAmount: 0,
      totalAmount: 11.5,
      lineItems: [
        {
          type: 'ENERGY',
          description: '全天电能费',
          quantity: 10,
          unit: 'kWh',
          unitPrice: 1,
          amount: 10,
        },
        {
          type: 'SERVICE',
          description: '全天服务费',
          quantity: 10,
          unit: 'kWh',
          unitPrice: 0.2,
          amount: 2,
        },
      ],
    })

    await flushPromises()
    expect(wrapper.text()).toContain('电能费')
    expect(wrapper.text()).toContain('充电服务费')
    expect(wrapper.text()).toContain('10 kWh')
    expect(wrapper.text()).toContain('¥1.00')
    expect(wrapper.text()).toContain('¥2.00')
    expect(wrapper.text()).toContain('¥11.50')
  })

  it('renders multiple peak, flat and valley items and expands a structured snapshot', async () => {
    const wrapper = mountBill({
      currency: 'CNY',
      totalAmount: 4.6,
      lineItems: [
        {
          type: 'ENERGY',
          description: 'VALLEY 00:00-07:00',
          quantity: 2,
          unit: 'kWh',
          unitPrice: 0.6,
          amount: 1.2,
        },
        {
          type: 'ENERGY',
          description: 'FLAT 10:00-17:00',
          quantity: 3,
          unit: 'kWh',
          unitPrice: 0.8,
          amount: 2.4,
        },
        {
          type: 'SERVICE',
          description: 'PEAK 17:00-21:00',
          quantity: 2,
          unit: 'kWh',
          unitPrice: 0.5,
          amount: 1,
        },
      ],
      pricingSnapshot: JSON.stringify({
        name: '标准峰谷资费',
        revision: 2,
        role: 'SCHEDULED',
        effectiveTo: null,
        timezone: 'Asia/Shanghai',
        periods: [{ periodType: 'VALLEY', startMinute: 0, endMinute: 420 }],
        appliedSegments: [{ periodType: 'VALLEY', energyKwh: 2 }],
      }),
    })

    await flushPromises()

    expect(wrapper.text()).toContain('谷段')
    expect(wrapper.text()).toContain('平段')
    expect(wrapper.text()).toContain('峰段')
    expect(wrapper.text()).toContain('¥4.60')
    expect(wrapper.text()).toContain('运营资费')

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '查看计价快照')
      ?.trigger('click')
    await flushPromises()
    expect(wrapper.find('.snapshot-drawer').text()).toContain('业务版本')
    expect(wrapper.find('.snapshot-drawer').text()).toContain('V2')
    expect(wrapper.find('.snapshot-drawer').text()).toContain('实际计费分段')
    expect(wrapper.find('.snapshot-drawer').text()).toContain('00:00')
    expect(wrapper.find('.snapshot-drawer').text()).toContain('07:00')
    expect(wrapper.find('.snapshot-drawer').text()).toContain('长期有效')
  })

  it('loads the tariff source for older snapshots without a role', async () => {
    vi.mocked(api.GET).mockResolvedValue({
      data: { role: 'FALLBACK', name: '默认固定资费', revision: 3 },
    } as never)
    const wrapper = mountBill({
      tariffPlanId: 'fallback-3',
      currency: 'CNY',
      pricingSnapshot: JSON.stringify({ name: '默认固定资费', revision: 3 }),
    })
    await flushPromises()
    expect(api.GET).toHaveBeenCalledWith('/api/tariffs/{tariffPlanId}', {
      params: { path: { tariffPlanId: 'fallback-3' } },
    })
    expect(wrapper.text()).toContain('系统兜底')
    expect(wrapper.text()).toContain('默认固定资费 V3')
  })
})
