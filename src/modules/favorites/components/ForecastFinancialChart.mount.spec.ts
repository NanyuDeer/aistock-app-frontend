import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ForecastFinancialChart from './ForecastFinancialChart.vue'

/**
 * 主夹具：4 个年份（2023/2024/2025 实际值，2026 预测值），2025 年同时存在实际值与平均值列（用于验证实际值优先）。
 * 金额刻意分两档单位：2023 用「万」（需折算为亿），其余为「亿」。
 * 归一化后 2023 各段占比为整洁值：净利润 40% / 营业收入 60%。
 */
const baseRows: Array<Record<string, string>> = [
  { 预测指标: '营业收入(元)', '2023-实际值': '1000000万', '2024-实际值': '50', '2025-实际值': '80', '预测2025-平均': '999', '预测2026-平均': '40' },
  { 预测指标: '净利润(元)', '2023-实际值': '400000万', '2024-实际值': '20', '2025-实际值': '32', '预测2025-平均': '999', '预测2026-平均': '16' },
  { 预测指标: '净利润增长率', '2023-实际值': '10', '2024-实际值': '-5', '2025-实际值': '25', '预测2025-平均': '999', '预测2026-平均': '30' },
  { 预测指标: '营业收入增长率', '2023-实际值': '8', '2024-实际值': '12', '2025-实际值': '-3', '预测2025-平均': '999', '预测2026-平均': '20' },
  { 预测指标: '净资产收益率', '2023-实际值': '15', '2024-实际值': '14', '2025-实际值': '18', '预测2025-平均': '999', '预测2026-平均': '17' },
  { 预测指标: '市盈率(动态)', '2023-实际值': '22', '2024-实际值': '25', '2025-实际值': '30', '预测2025-平均': '999', '预测2026-平均': '20' },
]

function mountWith(rows: Array<Record<string, string>>) {
  return mount(ForecastFinancialChart, { props: { detailRows: rows } })
}

describe('ForecastFinancialChart', () => {
  it('渲染两块图表，图例各为 3 项', () => {
    const wrapper = mountWith(baseRows)
    const blocks = wrapper.findAll('.ffc__block')
    expect(blocks).toHaveLength(2)
    expect(blocks[0].findAll('.ffc__legend-item').map(t => t.text())).toEqual(['净利润', '营业收入', '净利润增长率'])
    expect(blocks[1].findAll('.ffc__legend-item').map(t => t.text())).toEqual(['营业收入增长率', '净资产收益率', '市盈率'])
  })

  it('年份轴升序，且同年实际值与平均值并存时只保留一个年份', () => {
    const wrapper = mountWith(baseRows)
    const years = wrapper.findAll('.ffc__block')[0].findAll('.ffc__year').map(t => t.text())
    expect(years).toEqual(['2023', '2024', '2025', '2026'])
  })

  it('横坐标年份轴在两块都渲染（含无柱状序列的「成长与估值」）', () => {
    const blocks = mountWith(baseRows).findAll('.ffc__block')
    expect(blocks).toHaveLength(2)
    for (const block of blocks) {
      expect(block.findAll('.ffc__year').map(t => t.text())).toEqual(['2023', '2024', '2025', '2026'])
    }
  })

  it('堆叠柱：下段为净利润、上段为营业收入剩余，按最大值归一化', () => {
    const wrapper = mountWith(baseRows)
    // 2023：营业收入 100 亿、净利润 40 亿 → 剩余 60 亿；当年合计即最大值 100 亿
    const y2023 = wrapper.findAll('.ffc__anchor')[0]
    expect(y2023.find('.ffc__bar.is-profit').attributes('style')).toContain('height: 40%')
    expect(y2023.find('.ffc__bar.is-rest').attributes('style')).toContain('height: 60%')
  })

  it('「万」单位的值折算为亿：左轴最大刻度为 100 而非 1000000', () => {
    const wrapper = mountWith(baseRows)
    const leftTicks = wrapper.findAll('.ffc__block')[0].findAll('.ffc__tick--left').map(t => t.text())
    expect(leftTicks[0]).toBe('100')
  })

  it('折线在缺失年份断开，缺失点不画圆点', () => {
    const rows = [
      { 预测指标: '营业收入(元)', '2023-实际值': '100', '2024-实际值': '100', '2025-实际值': '100', '预测2026-平均': '100' },
      { 预测指标: '净利润增长率', '2023-实际值': '10', '2024-实际值': '20', '2025-实际值': '--', '预测2026-平均': '30' },
    ]
    const wrapper = mountWith(rows)
    const block = wrapper.findAll('.ffc__block')[0]
    expect(block.findAll('.ffc__dot')).toHaveLength(3)
    expect(block.findAll('.ffc__seg')).toHaveLength(1)
  })

  it('预测年标注：存在预测分隔线、末点空心、并标注预测年份', () => {
    const wrapper = mountWith(baseRows)
    expect(wrapper.findAll('.ffc__divider.is-forecast')).toHaveLength(2)
    const dots = wrapper.findAll('.ffc__block')[0].findAll('.ffc__dot')
    expect(dots[dots.length - 1].classes()).toContain('is-hollow')
    expect(wrapper.find('.ffc__note').text()).toContain('2026')
  })

  it('整条序列缺失时，该序列与其图例项都不渲染', () => {
    const rows = baseRows.filter(r => !String(r['预测指标']).includes('市盈率(动态)'))
    const wrapper = mountWith(rows)
    expect(wrapper.findAll('.ffc__block')[1].findAll('.ffc__legend-item')).toHaveLength(2)
    expect(wrapper.findAll('.ffc__block')[1].text()).not.toContain('市盈率')
  })

  it('块内序列全部缺失时，该块整块不渲染', () => {
    const rows = baseRows.filter(r => {
      const name = String(r['预测指标'])
      return !name.includes('营业收入增长率') && !name.includes('净资产收益率') && !name.includes('市盈率(动态)')
    })
    expect(mountWith(rows).findAll('.ffc__block')).toHaveLength(1)
  })

  it('共用同一坐标轴的多条折线按同一取值范围定标（不与刻度错位）', () => {
    // 营业收入增长率 [20,10] 与 净资产收益率 [5,10] 共用左轴 %：轴范围应为 0~20
    // 若各折线按自身范围定标，ROE 会被拉满（50%/100%），与轴刻度不符
    const rows = [
      { 预测指标: '营业收入增长率', '2023-实际值': '20', '2024-实际值': '10' },
      { 预测指标: '净资产收益率', '2023-实际值': '5', '2024-实际值': '10' },
    ]
    const dots = mountWith(rows).findAll('.ffc__dot')
    expect(dots).toHaveLength(4)
    expect(dots[0].attributes('style')).toContain('bottom: 100%')
    expect(dots[2].attributes('style')).toContain('bottom: 25%')
    expect(dots[3].attributes('style')).toContain('bottom: 50%')
  })

  it('折线段几何：两点连线按绘图区宽高比换算，角度与长度确定', () => {
    const rows = [
      { 预测指标: '净利润增长率', '2023-实际值': '0', '2024-实际值': '1' },
    ]
    const seg = mountWith(rows).find('.ffc__seg')
    // 两点 (0%,0%) → (100%,100%)；绘图区高/宽 = 0.46/0.76 ≈ 0.6053
    // lenPct = √(100² + (100×0.6053)²) ≈ 116.89；angle = -atan2(60.53, 100) ≈ -31.18°
    const style = seg.attributes('style') ?? ''
    expect(style).toContain('width: 116.89%')
    expect(style).toContain('rotate(-31.18deg)')
  })

  it('无任何详表数据时，组件不渲染图表', () => {
    expect(mountWith([]).find('.ffc__block').exists()).toBe(false)
    expect(mountWith([{ 预测指标: '其他指标', '2023-实际值': '1' }]).find('.ffc__block').exists()).toBe(false)
  })
})
