import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SectionCard from './SectionCard.vue'

vi.mock('mp-html/dist/uni-app/components/mp-html/mp-html', () => ({
  default: { name: 'mp-html', props: ['content'], template: '<div class="mp-html-mock">{{ content }}</div>' },
}))

describe('SectionCard', () => {
  it('conclusion 变体渲染标题 + 正文', () => {
    const wrapper = mount(SectionCard, {
      props: { variant: 'conclusion', title: '核心结论', body: '茅台今日上涨 2.3%' },
    })
    expect(wrapper.text()).toContain('核心结论')
    expect(wrapper.text()).toContain('茅台今日上涨 2.3%')
    expect(wrapper.find('.sc-card').exists()).toBe(true)
  })

  it('5 种变体各自渲染不同头部 class', () => {
    const variants = ['conclusion', 'points', 'notes', 'risk', 'other'] as const
    for (const v of variants) {
      const wrapper = mount(SectionCard, {
        props: { variant: v, title: '测试', body: '正文' },
      })
      expect(wrapper.find(`.sc-header.${v}`).exists()).toBe(true)
    }
  })

  it('空 body 时卡片不渲染', () => {
    const wrapper = mount(SectionCard, {
      props: { variant: 'conclusion', title: '测试', body: '' },
    })
    expect(wrapper.find('.sc-card').exists()).toBe(false)
  })

  it('空 title 时卡片不渲染', () => {
    const wrapper = mount(SectionCard, {
      props: { variant: 'conclusion', title: '', body: '正文' },
    })
    expect(wrapper.find('.sc-card').exists()).toBe(false)
  })

  it('body 经 markdownToHtml 渲染', () => {
    const wrapper = mount(SectionCard, {
      props: { variant: 'points', title: '行情要点', body: '- 要点1\n- 要点2' },
    })
    expect(wrapper.find('.sc-body').exists()).toBe(true)
  })
})
