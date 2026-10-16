import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DynamicInsightCard from './DynamicInsightCard.vue'

const baseProps = {
  leaderSectors: [
    { name: '半导体', tag: '+2.10%', tagType: 'up', hint: '算力主线延续，资金回流明显' },
    { name: '算力', tag: '-1.20%', tagType: 'down' },
    { name: '汽车', tag: '0.00%', tagType: 'wash' },
  ],
  chainEvents: [
    {
      name: '降准落地，流动性进一步宽松',
      tag: '09:35',
      tagType: 'date',
      hint: '银行地产链条直接受益',
      sectors: [
        { name: '银行', sentiment: 'bullish' as const },
        { name: '地产', sentiment: 'bearish' as const },
        { name: '煤炭', sentiment: 'neutral' as const },
      ],
    },
    { name: '新能源补贴新政发布', tag: '10:02', tagType: 'date' },
  ],
  traceReports: [
    { name: '今日消费电子异动溯源', tag: '09-19', tagType: 'date', hint: '电子化学品跌幅扩大', updatedAt: '15:32' },
  ],
  rhythmRows: [{ band: '五成~六成', basis_date: '2026-09-25', date: '2026-09-24', level: 'normal' }],
}

describe('DynamicInsightCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('盘前：头条取风口首条；模块标签与时段徽标同行', () => {
    const wrapper = mount(DynamicInsightCard, { props: { ...baseProps, currentSlot: 'pre' } })
    expect(wrapper.find('.dyn-card__slot-text').text()).toBe('盘前')
    // 时段徽标 + 来源模块在同一徽标行
    const headLeft = wrapper.find('.dyn-card__head-left')
    expect(headLeft.find('.dyn-card__slot-text').text()).toBe('盘前')
    expect(headLeft.find('.dyn-card__module').text()).toBe('风口')
    // 时段徽标前带洞见字标
    const logo = wrapper.find('.dyn-card__logo')
    expect(logo.exists()).toBe(true)
    expect(logo.attributes('style')).toContain('url(')
    // 时段徽标为实心时段主色底（替代原顶部渐变横条）：不再是 8% 透明 tint
    const slotStyle = wrapper.find('.dyn-card__slot').attributes('style') ?? ''
    expect(slotStyle).toContain('background')
    expect(slotStyle).not.toContain('rgba')
    // 标题行仅标题本身
    expect(wrapper.find('.dyn-focus__title').text()).toBe('半导体')
    // 小字详情＝风口 AI 一句话预判
    expect(wrapper.find('.dyn-focus__hint').text()).toContain('算力主线延续')
    // 独有内容：榜首序号 + 涨跌幅
    expect(wrapper.find('.dyn-uniq__rank').text()).toBe('No.1')
    expect(wrapper.find('.dyn-focus__badge').text()).toBe('+2.10%')
    expect(wrapper.find('.dyn-card__new').exists()).toBe(true)
  })

  it('盘中：头条取消息首条，小字详情＝洞见结论，独有内容＝影响板块（↑红/↓绿）', () => {
    const wrapper = mount(DynamicInsightCard, { props: { ...baseProps, currentSlot: 'intraday' } })
    expect(wrapper.find('.dyn-card__slot-text').text()).toBe('盘中')
    expect(wrapper.find('.dyn-card__module').text()).toBe('消息')
    expect(wrapper.find('.dyn-focus__title').text()).toBe('降准落地，流动性进一步宽松')
    expect(wrapper.find('.dyn-focus__hint').text()).toBe('银行地产链条直接受益')

    const sectors = wrapper.findAll('.dyn-uniq__sector')
    expect(sectors).toHaveLength(3)
    expect(sectors[0].text()).toContain('银行')
    expect(sectors[0].find('.dyn-uniq__arrow').classes()).toContain('is-up')
    expect(sectors[1].text()).toContain('地产')
    expect(sectors[1].find('.dyn-uniq__arrow').classes()).toContain('is-down')
    // 中性板块只显示名称，不带箭头
    expect(sectors[2].text()).toBe('煤炭')
    expect(sectors[2].find('.dyn-uniq__arrow').exists()).toBe(false)
  })

  it('盘后：默认头条＝市场（日期 + 更新时间），5s 后轮播切换到节奏（档位色标 + 基准日）', async () => {
    const wrapper = mount(DynamicInsightCard, { props: { ...baseProps, currentSlot: 'post' } })
    expect(wrapper.find('.dyn-card__slot-text').text()).toBe('盘后')
    expect(wrapper.find('.dyn-card__module').text()).toBe('市场')
    expect(wrapper.find('.dyn-focus__title').text()).toBe('今日消费电子异动溯源')
    expect(wrapper.find('.dyn-focus__hint').text()).toBe('电子化学品跌幅扩大')
    expect(wrapper.findAll('.dyn-uniq__chip').map(c => c.text())).toEqual(['09-19', '更新 15:32'])

    vi.advanceTimersByTime(5000)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.dyn-card__module').text()).toBe('节奏')
    expect(wrapper.find('.dyn-uniq__level').exists()).toBe(true)
    expect(wrapper.find('.dyn-focus__hint').text()).toBe('档位与建议仓位')

    // 再 5s 回到市场，形成双内容循环
    vi.advanceTimersByTime(5000)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.dyn-card__module').text()).toBe('市场')
  })

  it('头条始终渲染小字详情，缺省时回退模块说明', () => {
    const pre = mount(DynamicInsightCard, { props: { ...baseProps, currentSlot: 'pre' } })
    expect(pre.find('.dyn-focus__hint').text()).toBe('算力主线延续，资金回流明显')

    const noHint = {
      ...baseProps,
      leaderSectors: [{ name: '半导体', tag: '+2.10%', tagType: 'up' }],
      chainEvents: [{ name: '降准落地', tag: '09:35', tagType: 'date' }],
      traceReports: [{ name: '今日消费电子异动溯源', tag: '09-19', tagType: 'date' }],
    }
    const intraday = mount(DynamicInsightCard, { props: { ...noHint, currentSlot: 'intraday' } })
    expect(intraday.find('.dyn-focus__hint').text()).toBe('产业链最新事件追踪')

    const post = mount(DynamicInsightCard, { props: { ...noHint, currentSlot: 'post' } })
    expect(post.find('.dyn-focus__hint').text()).toBe('收盘后异动溯源结论')
  })

  it('次要焦点：3 条跨模块混排，且不含头条模块自身条目', () => {
    const wrapper = mount(DynamicInsightCard, { props: { ...baseProps, currentSlot: 'pre' } })
    const rows = wrapper.findAll('.dyn-sec__row')
    expect(rows).toHaveLength(3)
    expect(rows.map(r => r.find('.dyn-sec__chip').text())).toEqual(['消息', '市场', '节奏'])
    expect(wrapper.find('.dyn-sec').text()).not.toContain('半导体')
  })

  it('次卡尾部标签与四宫格一致：风口/市场用组件库 Tag，节奏用档位色块', () => {
    // 盘中头条为消息，次要为 风口(+2.10% up) / 市场(09-19 neutral) / 节奏(档位)
    const wrapper = mount(DynamicInsightCard, { props: { ...baseProps, currentSlot: 'intraday' } })
    const tags = wrapper.findAll('.dyn-sec__row .as-tag')
    expect(tags).toHaveLength(2)
    expect(tags[0].classes()).toContain('as-tag--sm')
    expect(tags[0].classes()).toContain('as-tag--up')
    expect(tags[1].classes()).toContain('as-tag--neutral')
    // 节奏行改用档位色块（对齐四宫格「节奏洞见」卡的 .rhythm-chip）
    const chips = wrapper.findAll('.dyn-sec__row .dyn-sec__rhythm')
    expect(chips).toHaveLength(1)
    expect(chips[0].attributes('style')).toContain('background')
    // 不再使用纯文字标签
    expect(wrapper.find('.dyn-sec__badge').exists()).toBe(false)
  })

  it('市场头条：标题用现象摘要（洞见卡的「一句话结论」），小字详情用溯源句', () => {
    const wrapper = mount(DynamicInsightCard, {
      props: {
        ...baseProps,
        traceReports: [{
          name: '今日概念板块集中异动',
          tag: '09-19',
          tagType: 'date',
          hint: '产业政策：注册制改革推进改善市场供给结构',
        }],
        currentSlot: 'post',
      },
    })
    expect(wrapper.find('.dyn-focus__title').text()).toBe('今日概念板块集中异动')
    expect(wrapper.find('.dyn-focus__hint').text()).toBe('产业政策：注册制改革推进改善市场供给结构')
  })

  it('节奏行的小字详情取传入结论，不再回退兜底文案', async () => {
    const wrapper = mount(DynamicInsightCard, {
      props: {
        ...baseProps,
        rhythmRows: [{
          band: '五成~六成',
          basis_date: '2026-09-25',
          date: '2026-09-24',
          level: 'normal',
          hint: '常温 · 建议仓位五成~六成',
        }],
        currentSlot: 'post',
      },
    })
    vi.advanceTimersByTime(5000)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.dyn-card__module').text()).toBe('节奏')
    expect(wrapper.find('.dyn-focus__hint').text()).toBe('常温 · 建议仓位五成~六成')
  })

  it('四入口条带：4 项、仅图标 + 模块名（无数量徽标）、当前时段模块高亮', () => {
    const wrapper = mount(DynamicInsightCard, { props: { ...baseProps, currentSlot: 'pre' } })
    const items = wrapper.findAll('.dyn-strip__item')
    expect(items).toHaveLength(4)
    // 数量徽标已下线（2026-10-06）：条带只保留图标 + 模块名
    expect(wrapper.findAll('.dyn-strip__count')).toHaveLength(0)
    expect(items.map(t => t.text())).toEqual(['风口', '消息', '市场', '节奏'])
    const active = wrapper.findAll('.dyn-strip__item--active')
    expect(active).toHaveLength(1)
    expect(active[0].text()).toContain('风口')

    const post = mount(DynamicInsightCard, { props: { ...baseProps, currentSlot: 'post' } })
    expect(post.findAll('.dyn-strip__item--active')[0].text()).toContain('市场')
  })

  it('点击头条详情链接与条带项 emit navigate 并携带对应模块 target', async () => {
    const wrapper = mount(DynamicInsightCard, { props: { ...baseProps, currentSlot: 'pre' } })
    await wrapper.find('.dyn-focus__link').trigger('tap')
    expect(wrapper.emitted('navigate')?.[0]).toEqual(['sectors'])

    await wrapper.findAll('.dyn-strip__item')[1].trigger('tap')
    expect(wrapper.emitted('navigate')?.[1]).toEqual(['events'])

    await wrapper.findAll('.dyn-sec__row')[2].trigger('tap')
    expect(wrapper.emitted('navigate')?.[2]).toEqual(['rhythm'])
  })

  it('C 式整宽头条布局：无左侧主视觉图标；详情为蓝色文字链接而非按钮', () => {
    const wrapper = mount(DynamicInsightCard, { props: { ...baseProps, currentSlot: 'pre' } })
    expect(wrapper.find('.dyn-focus__visual').exists()).toBe(false)
    expect(wrapper.find('.dyn-focus__cta').exists()).toBe(false)
    const link = wrapper.find('.dyn-focus__link')
    expect(link.text()).toBe('详情 →')
    expect(link.classes()).toContain('dyn-focus__link')
    expect(wrapper.find('.dyn-focus__foot').find('.dyn-focus__badge').exists()).toBe(true)
    expect(wrapper.find('.dyn-focus__foot').find('.dyn-focus__link').exists()).toBe(true)
  })

  it('全部数据为空时提供空态，不渲染头条焦点区', () => {
    const wrapper = mount(DynamicInsightCard, {
      props: { leaderSectors: [], chainEvents: [], traceReports: [], rhythmRows: [], currentSlot: 'pre' },
    })
    expect(wrapper.find('.dyn-focus').exists()).toBe(false)
    expect(wrapper.find('.dyn-card__new').exists()).toBe(false)
    expect(wrapper.text()).toContain('暂无洞见')
  })
})