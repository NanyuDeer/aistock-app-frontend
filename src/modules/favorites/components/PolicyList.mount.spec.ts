import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PolicyList from './PolicyList.vue'

const SHORT_TEXT = '政策支持新能源产业发展'

/** 超过截断阈值（42 字）的长文本，折叠时会被截成 2 行 */
const LONG_TEXT = '国家发展改革委印发《关于推进新型储能规模化应用的实施方案》，明确到2027年新型储能装机规模达到1.8亿千瓦以上，并完善电价机制与容量补偿政策'

const policies = [
  { tag: '利好', type: 'is-good', text: SHORT_TEXT },
  { tag: '利好', type: 'is-good', text: LONG_TEXT },
]

function mountWith(items: Array<{ tag?: string; type?: string; text: string }>) {
  return mount(PolicyList, { props: { policies: items } })
}

describe('PolicyList', () => {
  it('渲染全部政策条目，不再按可见条数截断', () => {
    expect(mountWith(policies).findAll('.policy-item')).toHaveLength(2)
  })

  it('只有超长条目带展开按钮，短条目不带', () => {
    const items = mountWith(policies).findAll('.policy-item')
    expect(items[0].find('.policy-toggle').exists()).toBe(false)
    expect(items[1].find('.policy-toggle').exists()).toBe(true)
    expect(items[1].find('.policy-toggle-text').text()).toBe('展开')
  })

  it('点击某条展开按钮只展开该条，其它条保持折叠', async () => {
    const wrapper = mountWith(policies)
    expect(wrapper.findAll('.policy-text')[1].classes()).toContain('is-collapsed')

    await wrapper.findAll('.policy-item')[1].find('.policy-toggle').trigger('tap')

    const texts = wrapper.findAll('.policy-text')
    expect(texts[0].classes()).toContain('is-collapsed')
    expect(texts[1].classes()).not.toContain('is-collapsed')
    expect(wrapper.findAll('.policy-item')[1].find('.policy-toggle-text').text()).toBe('收起')
  })

  it('再次点击同一条可收起', async () => {
    const wrapper = mountWith(policies)
    const toggle = wrapper.findAll('.policy-item')[1].find('.policy-toggle')
    await toggle.trigger('tap')
    await toggle.trigger('tap')
    expect(wrapper.findAll('.policy-text')[1].classes()).toContain('is-collapsed')
  })

  it('不渲染全局「查看完整 / 收起」按钮', () => {
    const wrapper = mountWith(policies)
    expect(wrapper.find('.news-toggle').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('查看完整')
  })

  it('同时只能展开一条：开第二条时自动收起第一条', async () => {
    const wrapper = mountWith([
      { tag: '利好', type: 'is-good', text: LONG_TEXT },
      { tag: '利好', type: 'is-good', text: `${LONG_TEXT}（第二批）` },
    ])
    const toggles = wrapper.findAll('.policy-toggle')
    expect(toggles).toHaveLength(2)

    await toggles[0].trigger('tap')
    expect(wrapper.findAll('.policy-text')[0].classes()).not.toContain('is-collapsed')

    await toggles[1].trigger('tap')
    const texts = wrapper.findAll('.policy-text')
    expect(texts[0].classes()).toContain('is-collapsed')
    expect(texts[1].classes()).not.toContain('is-collapsed')
  })
})
