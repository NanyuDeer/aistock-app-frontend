import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmSheet from './ConfirmSheet.vue'

// SvgIcon 必桩：测试环境无真实 SVG 资源（对齐 InsightAlertCard.spec 既有惯例）
vi.mock('./SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name', 'size', 'color'], template: '<view class="svg-stub" />' },
}))

describe('ConfirmSheet（交互式确认，改进 13）', () => {
  const options = [
    { key: '600519', label: '贵州茅台' },
    { key: '000858', label: '五粮液' },
  ]

  it('visible 时渲染问题与全部选项', () => {
    const wrapper = mount(ConfirmSheet, {
      props: { visible: true, question: '你想问哪个？', options, waiting: false },
    })
    expect(wrapper.text()).toContain('你想问哪个？')
    expect(wrapper.text()).toContain('贵州茅台')
    expect(wrapper.text()).toContain('五粮液')
    expect(wrapper.findAll('.cs-option')).toHaveLength(2)
  })

  it('点击选项 emit select(key, label)', async () => {
    const wrapper = mount(ConfirmSheet, {
      props: { visible: true, question: 'q', options, waiting: false },
    })
    await wrapper.findAll('.cs-option')[1].trigger('tap')
    expect(wrapper.emitted('select')).toEqual([['000858', '五粮液']])
  })

  it('waiting 态：选项禁用且显示「已确认 XX，继续回答…」', async () => {
    const wrapper = mount(ConfirmSheet, {
      props: { visible: true, question: 'q', options, waiting: false },
    })
    await wrapper.findAll('.cs-option')[0].trigger('tap')
    await wrapper.setProps({ waiting: true })
    expect(wrapper.text()).toContain('已确认「贵州茅台」，继续回答…')
    // 等待态点击不再二次 emit（防重复发送 confirm_response）
    await wrapper.findAll('.cs-option')[1].trigger('tap')
    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  it('visible=false 时内容不渲染（弹框关闭即空壳）', () => {
    const wrapper = mount(ConfirmSheet, {
      props: { visible: false, question: 'q', options, waiting: false },
    })
    expect(wrapper.find('.cs-options').exists()).toBe(false)
  })
})
