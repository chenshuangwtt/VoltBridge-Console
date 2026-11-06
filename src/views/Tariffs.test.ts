// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import ElementPlus, { ElInput, ElInputNumber, ElMessage, ElMessageBox } from 'element-plus'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import CopyButton from '../components/CopyButton.vue'
import Tariffs from './Tariffs.vue'

vi.mock('../api/client', () => ({
  api: { GET: vi.fn(), POST: vi.fn(), DELETE: vi.fn() },
  unwrap: async (response: { data: unknown }) => response.data,
}))

const tenantId = '11111111-1111-4111-8111-111111111111'
const fallback = {
  id: 'fallback-1',
  role: 'FALLBACK',
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
let listedTariffs: unknown[] = []

const DialogStub = defineComponent({
  props: { modelValue: { type: Boolean, default: false } },
  template:
    '<div v-if="modelValue" class="tariff-dialog"><slot /><div class="dialog-footer"><slot name="footer" /></div></div>',
})

describe('Tariffs page', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    vi.stubEnv('VITE_DEFAULT_TENANT_ID', '')
    listedTariffs = []
    vi.mocked(api.GET)
      .mockReset()
      .mockImplementation(
        async (path) => ({ data: path === '/api/tariffs' ? listedTariffs : fallback }) as never,
      )
    vi.mocked(api.POST).mockReset()
    vi.mocked(api.DELETE).mockReset()
  })

  async function mountPage(defaultTenantId = '') {
    vi.stubEnv('VITE_DEFAULT_TENANT_ID', defaultTenantId)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = mount(Tariffs, {
      global: {
        plugins: [ElementPlus, [VueQueryPlugin, { queryClient }]],
        stubs: { ElDialog: DialogStub },
      },
    })
    await flushPromises()
    return wrapper
  }

  it('disables creation without tenant context', async () => {
    const wrapper = await mountPage()
    const createButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('新建资费'))

    expect(createButton?.attributes('disabled')).toBeDefined()
    expect(api.GET).not.toHaveBeenCalled()
  })

  it('inherits the current tenant and displays it read-only beside CopyButton', async () => {
    const wrapper = await mountPage(tenantId)
    const createButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('新建资费'))

    expect(createButton?.attributes('disabled')).toBeUndefined()
    await createButton?.trigger('click')
    await flushPromises()

    const tenantDisplay = wrapper.find('.tariff-tenant-display')
    expect(tenantDisplay.text()).toContain(tenantId)
    expect(tenantDisplay.findComponent(CopyButton).exists()).toBe(true)
    expect(tenantDisplay.findComponent(ElInput).exists()).toBe(false)
  })

  it('submits UTC instants, omits an empty expiry, closes, and refreshes the tenant list', async () => {
    vi.mocked(api.POST).mockResolvedValueOnce({
      data: { id: 'tariff-1', tenantId, name: '标准直流测试资费' },
    } as never)
    const successMessage = vi
      .spyOn(ElMessage, 'success')
      .mockImplementation(() => undefined as never)
    const wrapper = await mountPage(tenantId)
    const createButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('新建资费'))
    await createButton?.trigger('click')
    await flushPromises()

    const defaultEffectiveFrom = wrapper
      .findAllComponents({ name: 'ElDatePicker' })[0]
      ?.props('modelValue') as Date
    expect(defaultEffectiveFrom).toBeInstanceOf(Date)

    const inputs = wrapper.findAllComponents(ElInput)
    await inputs[1]?.setValue('标准直流测试资费')
    await wrapper.findAllComponents(ElInputNumber)[0]?.vm.$emit('update:modelValue', 1)
    await wrapper.findAllComponents(ElInputNumber)[1]?.vm.$emit('update:modelValue', 0.2)
    await flushPromises()

    const submitButton = wrapper
      .find('.dialog-footer')
      .findAll('button')
      .find((button) => button.text().includes('新建资费'))
    await submitButton?.trigger('click')
    await flushPromises()

    expect(api.POST).toHaveBeenCalledWith('/api/tariffs', {
      body: {
        tenantId,
        name: '标准直流测试资费',
        currency: 'CNY',
        pricingType: 'FIXED',
        timezone: 'Asia/Shanghai',
        periods: [
          {
            periodType: 'FLAT',
            startMinute: 0,
            endMinute: 1440,
            energyPricePerKwh: 1,
            serviceFeePerKwh: 0.2,
          },
        ],
        effectiveFrom: defaultEffectiveFrom.toISOString(),
      },
    })
    expect(successMessage).toHaveBeenCalledWith('资费已创建')
    expect(wrapper.find('.tariff-dialog').exists()).toBe(false)
    expect(api.GET).toHaveBeenCalledTimes(3)
  })

  it('shows a Chinese backend error when tariff creation fails', async () => {
    vi.mocked(api.POST).mockRejectedValueOnce({
      code: 'INVALID_TARIFF',
      message: '失效时间必须晚于生效时间',
    })
    const wrapper = await mountPage(tenantId)
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('新建资费'))
      ?.trigger('click')
    await flushPromises()

    const inputs = wrapper.findAllComponents(ElInput)
    await inputs[1]?.setValue('标准直流测试资费')
    const submitButton = wrapper
      .find('.dialog-footer')
      .findAll('button')
      .find((button) => button.text().includes('新建资费'))
    await submitButton?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('失效时间必须晚于生效时间')
  })

  it('formats list rates consistently and displays backend UTC instants in browser local time', async () => {
    const activeFrom = new Date(Date.now() - 86_400_000).toISOString()
    listedTariffs = [
      {
        id: 'tariff-1',
        tenantId,
        name: '标准直流测试资费',
        currency: 'CNY',
        pricingType: 'FIXED',
        revision: 2,
        version: 99,
        timezone: 'Asia/Shanghai',
        periods: [
          {
            periodType: 'FLAT',
            startMinute: 0,
            endMinute: 1440,
            energyPricePerKwh: 1,
            serviceFeePerKwh: 0.2,
          },
        ],
        effectiveFrom: activeFrom,
        effectiveTo: null,
        status: 'ACTIVE',
        role: 'SCHEDULED',
      },
    ]
    const wrapper = await mountPage(tenantId)
    const instant = new Date(activeFrom)
    const pad = (value: number) => String(value).padStart(2, '0')
    const localTime = `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())} ${pad(instant.getHours())}:${pad(instant.getMinutes())}`

    expect(wrapper.text()).toContain('V2')
    expect(wrapper.text()).not.toContain('V99')
    expect(wrapper.text()).toContain('固定费率')
    expect(wrapper.text()).toContain('Asia/Shanghai')
    expect(wrapper.text()).toContain(localTime)
    expect(wrapper.text()).toContain('当前生效')
    expect(wrapper.text()).toContain('长期有效')
  })

  it('shows activation success and refreshes the tenant tariff list', async () => {
    const draft = {
      id: 'tariff-1',
      tenantId,
      name: '标准直流测试资费',
      currency: 'CNY',
      pricingType: 'FIXED',
      revision: 1,
      timezone: 'Asia/Shanghai',
      periods: [
        {
          periodType: 'FLAT',
          startMinute: 0,
          endMinute: 1440,
          energyPricePerKwh: 1,
          serviceFeePerKwh: 0.2,
        },
      ],
      effectiveFrom: '2026-11-06T04:02:34Z',
      status: 'DRAFT',
      role: 'SCHEDULED',
    }
    const active = { ...draft, status: 'ACTIVE' }
    listedTariffs = [draft]
    vi.mocked(api.POST).mockImplementationOnce(async () => {
      listedTariffs = [active]
      return { data: active } as never
    })
    const successMessage = vi
      .spyOn(ElMessage, 'success')
      .mockImplementation(() => undefined as never)
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as never)
    const wrapper = await mountPage(tenantId)

    const activateButton = wrapper.findAll('button').find((button) => button.text() === '激活')
    await activateButton?.trigger('click')
    await flushPromises()

    expect(api.POST).toHaveBeenCalledWith('/api/tariffs/{tariffPlanId}/activate', {
      params: { path: { tariffPlanId: 'tariff-1' } },
    })
    expect(successMessage).toHaveBeenCalledWith('资费已激活')
    expect(api.GET).toHaveBeenCalledTimes(3)
  })

  it('inherits an existing plan and creates a new revision without changing the source', async () => {
    const source = {
      id: 'tariff-1',
      familyId: 'family-1',
      revision: 1,
      tenantId,
      name: '标准峰谷资费',
      currency: 'CNY',
      pricingType: 'TIME_OF_USE',
      timezone: 'Asia/Shanghai',
      effectiveFrom: '2026-12-01T00:00:00Z',
      status: 'ACTIVE',
      role: 'SCHEDULED',
      periods: [
        {
          periodType: 'VALLEY',
          startMinute: 0,
          endMinute: 720,
          energyPricePerKwh: 0.6,
          serviceFeePerKwh: 0.2,
        },
        {
          periodType: 'PEAK',
          startMinute: 720,
          endMinute: 1440,
          energyPricePerKwh: 1.2,
          serviceFeePerKwh: 0.3,
        },
      ],
    }
    listedTariffs = [source]
    vi.mocked(api.POST).mockResolvedValueOnce({
      data: { ...source, revision: 2, status: 'DRAFT' },
    } as never)
    const wrapper = await mountPage(tenantId)
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '创建新版本')
      ?.trigger('click')
    await flushPromises()

    expect(wrapper.findAllComponents(ElInput)[1]?.props('modelValue')).toBe('标准峰谷资费')
    const prices = wrapper.findAllComponents(ElInputNumber)
    expect(prices[0]?.props('modelValue')).toBe(0.6)
    await prices[0]?.vm.$emit('update:modelValue', 0.7)
    await flushPromises()
    await wrapper
      .find('.dialog-footer')
      .findAll('button')
      .find((button) => button.text() === '创建新版本')
      ?.trigger('click')
    await flushPromises()

    expect(api.POST).toHaveBeenCalledWith('/api/tariffs/{tariffPlanId}/revisions', {
      params: { path: { tariffPlanId: 'tariff-1' } },
      body: expect.objectContaining({
        name: '标准峰谷资费',
        pricingType: 'TIME_OF_USE',
        timezone: 'Asia/Shanghai',
        periods: [
          expect.objectContaining({ energyPricePerKwh: 0.7 }),
          expect.objectContaining({ energyPricePerKwh: 1.2 }),
        ],
      }),
    })
    expect(source.periods[0].energyPricePerKwh).toBe(0.6)
  })

  it('shows only valid actions for draft, active and retired plans', async () => {
    const base = { tenantId, role: 'SCHEDULED', revision: 1, effectiveFrom: '2026-01-01T00:00:00Z' }
    listedTariffs = [
      { ...base, id: 'draft', name: '草稿方案', status: 'DRAFT' },
      { ...base, id: 'active', name: '已启用方案', status: 'ACTIVE' },
      { ...base, id: 'retired', name: '已退役方案', status: 'RETIRED' },
    ]
    const wrapper = await mountPage(tenantId)
    const rows = wrapper.findAll('.el-table__body tr')
    const actions = (name: string) =>
      rows
        .find((row) => row.find('td').text().trim() === name)
        ?.findAll('button')
        .map((button) => button.text())
    expect(actions('草稿方案')).toEqual(
      expect.arrayContaining(['查看', '创建新版本', '激活', '删除']),
    )
    expect(actions('已启用方案')).toEqual(expect.arrayContaining(['查看', '创建新版本', '退役']))
    expect(actions('已启用方案')).not.toContain('删除')
    expect(actions('已退役方案')).toEqual(expect.arrayContaining(['查看', '创建新版本']))
    expect(actions('已退役方案')).not.toContain('激活')
    expect(actions('已退役方案')).not.toContain('退役')
    expect(actions('已退役方案')).not.toContain('删除')
  })

  it('keeps FALLBACK out of the scheduled table while showing the fallback card', async () => {
    listedTariffs = [
      fallback,
      {
        id: 'scheduled-1',
        tenantId,
        role: 'SCHEDULED',
        name: '运营固定资费',
        revision: 1,
        status: 'ACTIVE',
        effectiveFrom: '2026-01-01T00:00:00Z',
      },
    ]
    const wrapper = await mountPage(tenantId)
    expect(wrapper.text()).toContain('默认兜底资费')
    expect(wrapper.findAll('.el-table__body tr')).toHaveLength(1)
    expect(wrapper.find('.el-table__body').text()).toContain('运营固定资费')
    expect(wrapper.find('.el-table__body').text()).not.toContain('默认固定资费')
  })

  it('shows fallback as a normal state when there is no scheduled tariff', async () => {
    listedTariffs = [fallback]
    const wrapper = await mountPage(tenantId)
    expect(wrapper.text()).toContain('默认兜底资费')
    expect(wrapper.text()).toContain('该租户暂无运营资费方案')
    expect(wrapper.text()).not.toContain('无法计费')
    expect(wrapper.findAll('button').map((button) => button.text())).not.toContain('退役')
  })

  it('allows an overlapping draft, warns before activation, and deletes only the draft', async () => {
    const active = {
      id: 'active-1',
      tenantId,
      name: '现行方案',
      revision: 1,
      status: 'ACTIVE',
      effectiveFrom: new Date(Date.now() - 86_400_000).toISOString(),
      role: 'SCHEDULED',
    }
    listedTariffs = [active]
    vi.mocked(api.POST).mockResolvedValueOnce({
      data: { ...active, id: 'draft-1', status: 'DRAFT' },
    } as never)
    vi.mocked(api.DELETE).mockResolvedValueOnce({ data: null } as never)
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as never)
    const wrapper = await mountPage(tenantId)
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '新建资费')
      ?.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('创建草稿不受影响')
    await wrapper.findAllComponents(ElInput)[1]?.setValue('重叠草稿')
    await wrapper
      .find('.dialog-footer')
      .findAll('button')
      .find((button) => button.text() === '新建资费')
      ?.trigger('click')
    await flushPromises()
    expect(api.POST).toHaveBeenCalledWith(
      '/api/tariffs',
      expect.objectContaining({
        body: expect.objectContaining({ name: '重叠草稿' }),
      }),
    )

    listedTariffs = [{ ...active, id: 'draft-1', name: '重叠草稿', status: 'DRAFT' }]
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '加载资费')
      ?.trigger('click')
    await flushPromises()
    const fetchesBeforeDelete = vi.mocked(api.GET).mock.calls.length
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '删除')
      ?.trigger('click')
    await flushPromises()
    expect(api.DELETE).toHaveBeenCalledWith('/api/tariffs/{tariffPlanId}', {
      params: { path: { tariffPlanId: 'draft-1' } },
    })
    expect(vi.mocked(api.GET).mock.calls.length).toBeGreaterThan(fetchesBeforeDelete)
  })

  it('shows conflict rejection and allows retiring the current scheduled tariff', async () => {
    const base = {
      tenantId,
      role: 'SCHEDULED',
      revision: 1,
      effectiveFrom: new Date(Date.now() - 86_400_000).toISOString(),
    }
    listedTariffs = [
      fallback,
      { ...base, id: 'draft', name: '草稿', status: 'DRAFT' },
      { ...base, id: 'active', name: '现行方案', status: 'ACTIVE' },
    ]
    vi.mocked(api.POST)
      .mockRejectedValueOnce({
        code: 'TARIFF_EFFECTIVE_RANGE_CONFLICT',
        message: '无法激活：该资费的有效期与已有已启用运营资费重叠。',
      })
      .mockImplementationOnce(async () => {
        const retired = { ...base, id: 'active', name: '现行方案', status: 'RETIRED' }
        listedTariffs = [fallback, retired]
        return { data: retired } as never
      })
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as never)
    const wrapper = await mountPage(tenantId)
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '激活')
      ?.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('有效期与已有已启用运营资费重叠')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '退役')
      ?.trigger('click')
    await flushPromises()
    expect(api.POST).toHaveBeenCalledWith('/api/tariffs/{tariffPlanId}/retire', {
      params: { path: { tariffPlanId: 'active' } },
    })
    expect(vi.mocked(ElMessageBox.confirm).mock.calls.at(-1)?.[0]).toContain('默认兜底资费')
    expect(wrapper.text()).toContain('默认兜底资费')
    expect(wrapper.find('.el-table__body').text()).toContain('已退役')
  })

  it.each([
    ['future', 86_400_000, undefined, '该资费尚未开始生效，确认退役？'],
    ['expired', -172_800_000, -86_400_000, '确认退役该资费？'],
  ])(
    'allows retiring a %s ACTIVE scheduled tariff',
    async (_state, fromOffset, toOffset, prompt) => {
      const plan = {
        id: 'scheduled-1',
        tenantId,
        role: 'SCHEDULED' as const,
        status: 'ACTIVE',
        name: '运营资费',
        effectiveFrom: new Date(Date.now() + fromOffset).toISOString(),
        ...(toOffset == null ? {} : { effectiveTo: new Date(Date.now() + toOffset).toISOString() }),
      }
      listedTariffs = [fallback, plan]
      vi.mocked(api.POST).mockImplementationOnce(async () => {
        const retired = { ...plan, status: 'RETIRED' }
        listedTariffs = [fallback, retired]
        return { data: retired } as never
      })
      vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as never)
      const wrapper = await mountPage(tenantId)
      expect(wrapper.find('.el-table__body').text()).toContain('退役')
      await wrapper
        .findAll('button')
        .find((button) => button.text() === '退役')
        ?.trigger('click')
      await flushPromises()
      expect(vi.mocked(ElMessageBox.confirm).mock.calls[0]?.[0]).toContain(prompt)
      expect(api.POST).toHaveBeenCalledWith('/api/tariffs/{tariffPlanId}/retire', {
        params: { path: { tariffPlanId: 'scheduled-1' } },
      })
      expect(wrapper.find('.el-table__body').text()).toContain('已退役')
    },
  )
})
