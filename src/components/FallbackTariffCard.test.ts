// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import ElementPlus, { ElDatePicker, ElInputNumber } from 'element-plus'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import FallbackTariffCard from './FallbackTariffCard.vue'

vi.mock('../api/client', () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  unwrap: async (response: { data: unknown }) => response.data,
}))

const tenantId = '11111111-1111-4111-8111-111111111111'
const DialogStub = defineComponent({
  props: { modelValue: { type: Boolean, default: false } },
  template:
    '<div v-if="modelValue" class="dialog"><slot /><div class="footer"><slot name="footer" /></div></div>',
})
const initial = {
  id: 'fallback-1',
  familyId: 'family-fallback',
  tenantId,
  role: 'FALLBACK' as const,
  status: 'ACTIVE',
  name: '默认固定资费',
  revision: 1,
  currency: 'CNY',
  pricingType: 'FIXED',
  effectiveFrom: '2026-01-01T00:00:00Z',
  periods: [
    {
      periodType: 'FLAT',
      startMinute: 0,
      endMinute: 1440,
      energyPricePerKwh: 1,
      serviceFeePerKwh: 0.2,
    },
  ],
}

describe('FallbackTariffCard', () => {
  let current = initial
  beforeEach(() => {
    current = initial
    vi.mocked(api.GET)
      .mockReset()
      .mockImplementation(async () => ({ data: current }) as never)
    vi.mocked(api.POST).mockReset()
  })

  async function mountCard() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = mount(FallbackTariffCard, {
      props: { tenantId, revisions: [initial] },
      global: {
        plugins: [ElementPlus, [VueQueryPlugin, { queryClient }]],
        stubs: { ElDialog: DialogStub },
      },
    })
    await flushPromises()
    return wrapper
  }

  it('shows the system fixed tariff separately with only view and revision actions', async () => {
    const wrapper = await mountCard()
    expect(wrapper.text()).toContain('默认兜底资费')
    expect(wrapper.text()).toContain('当前业务版本 V1')
    expect(wrapper.text()).toContain('1.00 元/kWh')
    expect(wrapper.text()).toContain('0.20 元/kWh')
    expect(wrapper.text()).not.toContain('删除')
    expect(wrapper.text()).not.toContain('退役')
    expect(wrapper.text()).not.toContain('激活')
    expect(wrapper.findAll('button').map((button) => button.text())).toContain('修改默认资费')
  })

  it('creates a price revision through the fallback endpoint and refreshes the current version', async () => {
    const wrapper = await mountCard()
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '修改默认资费')
      ?.trigger('click')
    await flushPromises()
    expect(wrapper.find('.dialog').text()).toContain('历史账单及旧版本价格不会被修改')
    const prices = wrapper.findAllComponents(ElInputNumber)
    await prices[0]?.vm.$emit('update:modelValue', 1.1)
    await prices[1]?.vm.$emit('update:modelValue', 0.2)
    const switchAt = new Date('2026-12-01T00:00:00Z')
    await wrapper.findComponent(ElDatePicker).vm.$emit('update:modelValue', switchAt)
    vi.mocked(api.POST).mockImplementationOnce(async () => {
      current = {
        ...initial,
        id: 'fallback-2',
        revision: 2,
        effectiveFrom: switchAt.toISOString(),
        periods: [{ ...initial.periods[0], energyPricePerKwh: 1.1 }],
      }
      return { data: current } as never
    })
    await wrapper
      .find('.footer')
      .findAll('button')
      .find((button) => button.text() === '创建新版本')
      ?.trigger('click')
    await flushPromises()
    expect(api.POST).toHaveBeenCalledWith('/api/tenants/{tenantId}/fallback-tariff/revisions', {
      params: { path: { tenantId } },
      body: { switchAt: switchAt.toISOString(), energyPricePerKwh: 1.1, serviceFeePerKwh: 0.2 },
    })
    expect(wrapper.text()).toContain('当前业务版本 V2')
    expect(wrapper.text()).toContain('1.10 元/kWh')
    expect(wrapper.find('.dialog').exists()).toBe(false)
  })
})
