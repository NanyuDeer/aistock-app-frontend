import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TimeSlotInsightBar from './TimeSlotInsightBar.vue'

const baseProps = {
  leaderSectors: [{ name: '半导体' }, { name: '算力' }, { name: '汽车' }, { name: '医药' }],
  chainEvents: [{ name: '降准' }, { name: '新能源补贴' }, { name: '数据要素' }, { name: '房地产' }],
  traceReports: [{ name: '今日消费电子异动' }],
  rhythmRows: [{ band: '中仓', basis_date: '2026-09-25' }],
}

describe('TimeSlotInsightBar', () => {
  it('currentSlot=pre 时默认高亮「盘前」并渲染盘前两行', () => {
    const wrapper = mount(TimeSlotInsightBar, { props: { ...baseProps, currentSlot: 'pre' } })
    const active = wrapper.findAll('.insight-bar__tab--active')
    expect(active).toHaveLength(1)
    expect(active[0].text()).toContain('盘前')
    expect(wrapper.findAll('.insight-bar__row')).toHaveLength(2)
    expect(wrapper.text()).toContain('今日节奏 · 建议仓位')
    expect(wrapper.text()).toContain('中仓')
    expect(wrapper.text()).toContain('半导体 / 算力 / 汽车')
  })

  it('currentSlot=intraday 渲染单行重磅消息（最多 3 条，· 连接）', () => {
    const wrapper = mount(TimeSlotInsightBar, { props: { ...baseProps, currentSlot: 'intraday' } })
    expect(wrapper.findAll('.insight-bar__row')).toHaveLength(1)
    expect(wrapper.text()).toContain('重磅消息 · 最新 3 条')
    expect(wrapper.text()).toContain('降准 · 新能源补贴 · 数据要素')
    expect(wrapper.text()).not.toContain('房地产')
  })

  it('currentSlot=post 渲染溯源结论 + 收盘基准两行', () => {
    const wrapper = mount(TimeSlotInsightBar, { props: { ...baseProps, currentSlot: 'post' } })
    expect(wrapper.findAll('.insight-bar__row')).toHaveLength(2)
    expect(wrapper.text()).toContain('今日消费电子异动')
    expect(wrapper.text()).toContain('中仓（基准 09-25）')
  })

  it('点击其他 tab 切换内容区（可回看）', async () => {
    const wrapper = mount(TimeSlotInsightBar, { props: { ...baseProps, currentSlot: 'pre' } })
    await wrapper.findAll('.insight-bar__tab')[1].trigger('tap')
    expect(wrapper.findAll('.insight-bar__row')).toHaveLength(1)
    expect(wrapper.text()).toContain('重磅消息 · 最新 3 条')
  })

  it('点击行 emit navigate 并携带正确 target', async () => {
    const pre = mount(TimeSlotInsightBar, { props: { ...baseProps, currentSlot: 'pre' } })
    await pre.findAll('.insight-bar__row')[0].trigger('tap')
    expect(pre.emitted('navigate')?.[0]).toEqual(['rhythm'])
    await pre.findAll('.insight-bar__row')[1].trigger('tap')
    expect(pre.emitted('navigate')?.[1]).toEqual(['sectors'])

    const post = mount(TimeSlotInsightBar, { props: { ...baseProps, currentSlot: 'post' } })
    await post.findAll('.insight-bar__row')[0].trigger('tap')
    expect(post.emitted('navigate')?.[0]).toEqual(['trace'])
  })

  it('空数据显示「暂无」而非假数据', () => {
    const wrapper = mount(TimeSlotInsightBar, {
      props: {
        leaderSectors: [],
        chainEvents: [],
        traceReports: [],
        rhythmRows: [],
        currentSlot: 'intraday',
      },
    })
    expect(wrapper.text()).toContain('暂无重磅消息')
  })
})
