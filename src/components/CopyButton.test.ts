// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CopyButton from './CopyButton.vue'
import { ElMessage } from 'element-plus'

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
}))

describe('CopyButton', () => {
  beforeEach(() => vi.clearAllMocks())

  function mountButton(value?: string) {
    return mount(CopyButton, {
      props: { value },
      global: {
        stubs: {
          'el-tooltip': {
            props: ['content'],
            template: '<div class="tooltip" :data-content="content"><slot /></div>',
          },
          'el-button': {
            props: ['disabled'],
            template:
              '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
          },
          'el-icon': { template: '<span><slot /></span>' },
        },
      },
    })
  }

  it('copies the value and shows a compact tooltip icon', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    const wrapper = mountButton('tx-123')

    expect(wrapper.find('.tooltip').attributes('data-content')).toBe('复制')
    expect(wrapper.text()).toBe('')
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('tx-123')
    expect(ElMessage.success).toHaveBeenCalledWith('已复制')
  })

  it('disables the icon when the value is empty', () => {
    const wrapper = mountButton('')
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })
})
