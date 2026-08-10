import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// SvgIcon 必桩：测试环境无真实 SVG 资源
vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name', 'size', 'color'], template: '<view class="svg-stub" />' },
}))

import InsightAlertCard from './InsightAlertCard.vue'

const baseProps = {
  name: '贵州茅台',
  symbol: '600519',
  direction: 'up' as const,
  message: '主因：白酒板块领涨',
  type: '涨停雷达',
  time: '2026-08-07 10:30',
  confidence: 'high' as const,
}

describe('InsightAlertCard', () => {
  it('渲染股票名、代码、主因、类型、时间', () => {
    const wrapper = mount(InsightAlertCard, { props: baseProps })
    expect(wrapper.text()).toContain('贵州茅台')
    expect(wrapper.text()).toContain('600519')
    expect(wrapper.text()).toContain('主因：白酒板块领涨')
    expect(wrapper.text()).toContain('涨停雷达')
    expect(wrapper.text()).toContain('2026-08-07 10:30')
  })

  it('direction=up 时左侧色条用 $stock-up-color 类', () => {
    const wrapper = mount(InsightAlertCard, { props: { ...baseProps, direction: 'up' } })
    const bar = wrapper.find('.insight-alert-card__bar')
    expect(bar.exists()).toBe(true)
    expect(bar.classes()).toContain('is-up')
    expect(bar.classes()).not.toContain('is-down')
  })

  it('direction=down 时左侧色条用 is-down 类', () => {
    const wrapper = mount(InsightAlertCard, { props: { ...baseProps, direction: 'down' } })
    const bar = wrapper.find('.insight-alert-card__bar')
    expect(bar.classes()).toContain('is-down')
    expect(bar.classes()).not.toContain('is-up')
  })

  it('confidence=high → Tag 用 warning 类型', () => {
    const wrapper = mount(InsightAlertCard, { props: { ...baseProps, confidence: 'high' } })
    const tag = wrapper.find('.insight-alert-card__confidence')
    expect(tag.classes()).toContain('is-high')
  })

  it('confidence=medium/low/unconfirmed → Tag 用 is-neutral 类', () => {
    for (const conf of ['medium', 'low', 'unconfirmed'] as const) {
      const wrapper = mount(InsightAlertCard, { props: { ...baseProps, confidence: conf } })
      const tag = wrapper.find('.insight-alert-card__confidence')
      expect(tag.classes()).toContain('is-neutral')
    }
  })

  it('clickable + @click 事件透传', async () => {
    const wrapper = mount(InsightAlertCard, { props: { ...baseProps, clickable: true } })
    const root = wrapper.find('.insight-alert-card')
    expect(root.classes()).toContain('is-clickable')
    await root.trigger('tap')
    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')!.length).toBe(1)
  })

  it('compact 模式：头部装饰条不渲染，type/confidence 隐藏', () => {
    const wrapper = mount(InsightAlertCard, { props: { ...baseProps, compact: true } })
    const root = wrapper.find('.insight-alert-card')
    expect(root.classes()).toContain('is-compact')
    // compact 模式无品牌渐变头部
    expect(wrapper.find('.insight-alert-card__header').exists()).toBe(false)
    // compact 模式隐藏 type 和 confidence
    expect(wrapper.find('.insight-alert-card__type').exists()).toBe(false)
    expect(wrapper.find('.insight-alert-card__confidence').exists()).toBe(false)
  })

  it('compact 模式仍渲染股票名、代码、主因、时间', () => {
    const wrapper = mount(InsightAlertCard, { props: { ...baseProps, compact: true } })
    const text = wrapper.text()
    expect(text).toContain('贵州茅台')
    expect(text).toContain('600519')
    expect(text).toContain('主因：白酒板块领涨')
    expect(text).toContain('2026-08-07 10:30')
  })
})
