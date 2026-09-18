/**
 * 大盘归因链视图「未确认驱动原因」节点过滤护栏（vitest + happy-dom，2026-09-18 R17）。
 *
 * 口径与市场洞见页「今日影响大盘的主要板块」区块同源（`sectorInsight.isUnconfirmedAttribution`）：
 * `trace_summary` 去空白后为空、或命中中性/未确认表述（如「未确认驱动原因」）→ 该 children 不渲染
 * （events[] 里常是「沪指跌0.41%…」这类行情综述=现象，不是驱动原因，故无条件按摘要判）。
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AttributionChainView from './AttributionChainView.vue'
import { isUnconfirmedAttribution } from '../utils/sectorInsight'

const DATE = '2026-09-17'

/** 链：3 个 children，其中 2 个为「未确认驱动原因」（含纯空白摘要） */
const chainFixture = {
  date: DATE,
  root: {
    type: 'market' as const,
    date: DATE,
    summary: '证据不足，未确认主因',
    index_pct: -0.411,
    evidence_weak: true,
  },
  children: [
    { sector: 'CRO概念', relation: 'market_follow' as const, pct: 2.09, trace_summary: '未确认驱动原因' },
    { sector: '转基因', relation: 'market_follow' as const, pct: 4.04, trace_summary: '  ' },
    {
      sector: '玉米',
      relation: 'self_driven' as const,
      pct: 3.74,
      trace_summary: '玉米期货走强带动种植链',
    },
  ],
}

describe('AttributionChainView 未确认驱动原因过滤（R17）', () => {
  it('未确认驱动原因的 children 不渲染（仅保留确认节点）', () => {
    const wrapper = mount(AttributionChainView, { props: { date: DATE, chain: chainFixture } })

    expect(wrapper.findAll('.acv-child')).toHaveLength(1)
    expect(wrapper.find('.acv-sec').text()).toBe('玉米')
    expect(wrapper.find('.acv-driver').text()).toBe('玉米期货走强带动种植链')
    expect(wrapper.text()).not.toContain('CRO概念')
    expect(wrapper.text()).not.toContain('转基因')
  })

  it('大盘根照常渲染（过滤只作用于 children，不影响 root）', () => {
    const wrapper = mount(AttributionChainView, { props: { date: DATE, chain: chainFixture } })

    expect(wrapper.find('.acv-root-sum').text()).toBe('证据不足，未确认主因')
  })
})

/**
 * 否定句口径（2026-09-18 补）：原判据只认「未确认驱动原因」「证据不足，未确认主因」两条，
 * 生产链上更常见的否定句是「**未检索到**可解释当日行情的独立触发事件」（2026-09-18 注册制次新股）
 * —— 不匹配 → 两个视图都会把它出成卡，驱动句就是那句否定句本身，等于「未确认驱动原因的不放」
 * 没落实。现与 agent-py `_NEGATIVE_SUMMARY_MARKERS`（同一晚迭代 4 引入）**逐字对齐**，口径单点。
 *
 * 反向护栏尤其重要：**肯定归因句里的否定词不得误伤**——2026-09-17 玉米的真实摘要是
 * 「未出现单一独立公告；催化来自超强厄尔尼诺供给扰动预期」，它是有内容的归因句，必须保留。
 */
describe('isUnconfirmedAttribution 否定句口径（与 agent-py _NEGATIVE_SUMMARY_MARKERS 对齐）', () => {
  const NEGATIVE = [
    '未检索到可解释当日大涨的独立触发事件', // 生产实证（2026-09-18 注册制次新股）
    '未找到可解释该板块异动的事件',
    '未发现明确触发事件',
    '未明确驱动因素',
    '未识别到触发事件',
    '未匹配到相关事件',
    '没有检索到独立触发事件',
    '没有找到可用的事件',
    '无法确认驱动原因',
    '无法判断主因',
    '不能确认当日触发事件',
    '暂无独立触发事件',
    '尚未检索到触发事件',
    '未确认驱动原因',
    '证据不足，未确认主因',
    '证据不足,未确认主因',
    '   ',
    '',
    null,
    undefined,
  ]

  const POSITIVE = [
    '国家大基金三期再落子，投资芯原股份旗下天遂芯愿科技',
    '工信部与国家发改委联合印发电子信息制造业「十五五」规划',
    '政策落地带动光伏板块大涨',
    '供给不足推动多晶硅价格上涨', // 含「不足」——刻意不入否定词表
    '玉米期货走强带动种植链',
    '未出现单一独立公告；催化来自超强厄尔尼诺供给扰动预期', // 2026-09-17 玉米真实摘要，必须保留
  ]

  it.each(NEGATIVE)('否定句判为未确认：%s', (s) => {
    expect(isUnconfirmedAttribution(s)).toBe(true)
  })

  it.each(POSITIVE)('有归因内容的摘要不得误伤：%s', (s) => {
    expect(isUnconfirmedAttribution(s)).toBe(false)
  })

  it('链树上「未检索到…」的 child 不再渲染（新句式端到端生效）', () => {
    const fixture = {
      date: DATE,
      root: { type: 'market' as const, date: DATE, summary: '大盘放量普涨', index_pct: 0.94 },
      children: [
        {
          sector: '注册制次新股',
          relation: 'self_driven' as const,
          pct: 7.3,
          trace_summary: '未检索到可解释当日行情的独立触发事件',
        },
        {
          sector: '国家大基金持股',
          relation: 'self_driven' as const,
          pct: 4.03,
          trace_summary: '国家大基金三期再落子',
        },
      ],
    }
    const wrapper = mount(AttributionChainView, { props: { date: DATE, chain: fixture } })

    expect(wrapper.findAll('.acv-child')).toHaveLength(1)
    expect(wrapper.find('.acv-sec').text()).toBe('国家大基金持股')
    expect(wrapper.text()).not.toContain('未检索到')
  })
})
