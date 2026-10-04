import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TimeSlotInsightBar from './TimeSlotInsightBar.vue'

const baseProps = {
  leaderSectors: [
    { name: '半导体', tag: '+2.10%', tagType: 'up', hint: '算力主线延续，资金回流明显' },
    { name: '算力', tag: '-1.20%', tagType: 'down' },
    { name: '汽车', tag: '0.00%', tagType: 'wash' },
    { name: '医药', tag: '+0.50%', tagType: 'up' },
  ],
  chainEvents: [
    { name: '降准落地，流动性进一步宽松', tag: '09:35', tagType: 'date' },
    { name: '新能源补贴新政发布', tag: '10:02', tagType: 'date' },
    { name: '数据要素改革试点扩大', tag: '11:20', tagType: 'date' },
    { name: '房地产融资松绑', tag: '13:05', tagType: 'date' },
  ],
  traceReports: [{ name: '今日消费电子异动溯源', tag: '09-19', tagType: 'date' }],
  rhythmRows: [{ band: '五成~六成', basis_date: '2026-09-25', date: '2026-09-24', level: 'normal' }],
}

describe('TimeSlotInsightBar', () => {
  it('渲染模块 Tab（风口/消息/市场/节奏），默认高亮风口，右上角时段徽标自动展示 currentSlot', () => {
    const wrapper = mount(TimeSlotInsightBar, { props: { ...baseProps, currentSlot: 'pre' } })
    const tabs = wrapper.findAll('.insight-bar__tab')
    expect(tabs.map(t => t.text())).toEqual(['风口', '消息', '市场', '节奏'])
    const active = wrapper.findAll('.insight-bar__tab--active')
    expect(active).toHaveLength(1)
    expect(active[0].text()).toContain('风口')
    expect(wrapper.find('.insight-bar__badge').text()).toContain('盘前')
  })

  it('风口模块：序号 + 板块名 + 涨跌标签 + 一句话预判副行，最多 3 条', () => {
    const wrapper = mount(TimeSlotInsightBar, { props: { ...baseProps, currentSlot: 'intraday' } })
    expect(wrapper.findAll('.insight-bar__row')).toHaveLength(3)
    expect(wrapper.findAll('.insight-bar__rank')).toHaveLength(3)
    expect(wrapper.text()).toContain('半导体')
    expect(wrapper.text()).toContain('+2.10%')
    expect(wrapper.find('.insight-bar__row-hint').text()).toContain('算力主线延续，资金回流明显')
    expect(wrapper.text()).not.toContain('医药')
  })

  it('点击「消息」Tab 切换为图文摘要列表（时间 chip + 标题），最多 3 条', async () => {
    const wrapper = mount(TimeSlotInsightBar, { props: { ...baseProps, currentSlot: 'intraday' } })
    await wrapper.findAll('.insight-bar__tab')[1].trigger('tap')
    expect(wrapper.findAll('.insight-bar__row')).toHaveLength(3)
    expect(wrapper.text()).toContain('降准落地，流动性进一步宽松')
    expect(wrapper.text()).toContain('09:35')
    expect(wrapper.text()).not.toContain('房地产融资松绑')
  })

  it('点击「市场」Tab 展示溯源结论摘要', async () => {
    const wrapper = mount(TimeSlotInsightBar, { props: { ...baseProps, currentSlot: 'post' } })
    await wrapper.findAll('.insight-bar__tab')[2].trigger('tap')
    expect(wrapper.text()).toContain('今日消费电子异动溯源')
    expect(wrapper.text()).toContain('09-19')
  })

  it('点击「节奏」Tab 展示档位 + 档位短码色标', async () => {
    const wrapper = mount(TimeSlotInsightBar, { props: { ...baseProps, currentSlot: 'post' } })
    await wrapper.findAll('.insight-bar__tab')[3].trigger('tap')
    expect(wrapper.text()).toContain('五成~六成')
    expect(wrapper.find('.insight-bar__level-chip').text()).toContain('常')
  })

  it('点击行 emit navigate 并携带对应模块 target', async () => {
    const wrapper = mount(TimeSlotInsightBar, { props: { ...baseProps, currentSlot: 'pre' } })
    await wrapper.findAll('.insight-bar__row')[0].trigger('tap')
    expect(wrapper.emitted('navigate')?.[0]).toEqual(['sectors'])
    await wrapper.findAll('.insight-bar__tab')[1].trigger('tap')
    await wrapper.findAll('.insight-bar__row')[0].trigger('tap')
    expect(wrapper.emitted('navigate')?.[1]).toEqual(['events'])
    await wrapper.findAll('.insight-bar__tab')[3].trigger('tap')
    await wrapper.findAll('.insight-bar__row')[0].trigger('tap')
    expect(wrapper.emitted('navigate')?.[2]).toEqual(['rhythm'])
  })

  it('模块数据为空时显示对应空态提示', () => {
    const wrapper = mount(TimeSlotInsightBar, {
      props: { leaderSectors: [], chainEvents: [], traceReports: [], rhythmRows: [], currentSlot: 'intraday' },
    })
    expect(wrapper.text()).toContain('暂无风口数据')
  })
})
