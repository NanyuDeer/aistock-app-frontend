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
import type { AttributionChainEvent } from '../api/modules/attributionChain'

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
 * 不挂预判入口（2026-09-18 晚，组长裁定）：**大盘归因链去掉「看该板块预判 →」入口** ——
 * 分支只留溯源侧（角色徽 + 板块名 + 驱动句 + 事件胶囊 + 依据详情 ▾），预判不再从链上跳转
 * （板块详情页仍可从板块四环页 / 风口页进入）。
 */
describe('AttributionChainView 不挂预判入口（2026-09-18 晚）', () => {
  it('分支不渲染「看该板块预判 →」（组件也不再声明/emit select-sector）', () => {
    const wrapper = mount(AttributionChainView, { props: { date: DATE, chain: chainFixture } })

    expect(wrapper.find('.acv-forecast').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('看该板块预判')
    expect(wrapper.emitted('select-sector')).toBeUndefined()
  })
})

/**
 * 链上事件胶囊来源过滤（2026-09-18 晚，组长裁定「隐藏检索的新闻条」）：
 * `EventRefChip` 按来源打标 —— `warehouse`→「中台」/ `search`→「检索」。链上**只保留中台事件**，
 * 隐藏「检索」（板块定向检索补漏）来的新闻条：那批多是行情综述/研报观点/栏目碎片。
 */
describe('AttributionChainView 隐藏「检索」来源新闻条（2026-09-18 晚）', () => {
  const withEvents = (events: AttributionChainEvent[]) => ({
    date: DATE,
    root: { type: 'market' as const, date: DATE, summary: 'x', index_pct: 1 },
    children: [
      {
        sector: '汽车芯片',
        ts_code: '885893',
        relation: 'self_driven' as const,
        pct: 4.03,
        trace_summary: '关税豁免落地',
        events,
      },
    ],
  })

  it('中台事件保留、「检索」事件不渲染', () => {
    const wrapper = mount(AttributionChainView, {
      props: {
        date: DATE,
        chain: withEvents([
          { event_id: 'e1', ref: 'https://a.example.com', headline: '中台事件一条', source: 'warehouse' },
          { event_id: null, ref: 'search:q|t', headline: '检索新闻一条', source: 'search' },
        ]),
      },
    })

    expect(wrapper.findAll('.as-event-chip')).toHaveLength(1)
    expect(wrapper.text()).toContain('中台事件一条')
    expect(wrapper.text()).not.toContain('检索新闻一条')
  })

  it('全是「检索」来源 → 不渲染事件区（不占位），分支其余部分照常', () => {
    const wrapper = mount(AttributionChainView, {
      props: {
        date: DATE,
        chain: withEvents([{ event_id: null, ref: 'search:q|t', headline: '检索新闻一条', source: 'search' }]),
        sectorStages: { '885893': [{ name: '触发', text: '关税豁免落地' }] },
      },
    })

    expect(wrapper.find('.acv-events').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('检索新闻一条')
    expect(wrapper.find('.acv-driver').text()).toBe('关税豁免落地')
    expect(wrapper.find('.acv-more').exists()).toBe(true)
  })

  it('事件为空数组 → 不渲染事件区（旧链缺省，行为不变）', () => {
    const wrapper = mount(AttributionChainView, { props: { date: DATE, chain: withEvents([]) } })

    expect(wrapper.find('.acv-events').exists()).toBe(false)
  })
})

/**
 * 板块原因链展开（2026-09-18）：每个分支可展开看该板块的 3 段溯源（触发 → 传导 → 结果），
 * 与大盘主因链 3 步同形。数据由页面首屏拉一次 sector-insight 后索引传入（组件不自己请求）。
 */
describe('AttributionChainView 分支依据详情展开（2026-09-18；2026-09-19 文案对齐洞见卡）', () => {
  const chainWith = (children: Array<Record<string, unknown>>) => ({
    date: DATE,
    root: { type: 'market' as const, date: DATE, summary: 'x', index_pct: 1 },
    children: children as never,
  })

  const STAGES = [
    { name: '触发', text: '大基金三期再落子' },
    { name: '传导', text: '持仓共振走强' },
    { name: '结果', text: '国产替代预期升温' },
  ]

  it('无 sectorStages 数据 → 分支不出「依据详情」入口（不占位）', () => {
    const wrapper = mount(AttributionChainView, {
      props: {
        date: DATE,
        chain: chainWith([
          { sector: '汽车芯片', ts_code: '885893', relation: 'self_driven', pct: 4, trace_summary: '关税豁免' },
        ]),
      },
    })

    expect(wrapper.findAll('.acv-more')).toHaveLength(0)
    expect(wrapper.find('.acv-detail').exists()).toBe(false)
  })

  it('有数据 → 出入口；点击展开 3 段（触发/传导/结果）、再点收起', async () => {
    const wrapper = mount(AttributionChainView, {
      props: {
        date: DATE,
        chain: chainWith([
          { sector: '汽车芯片', ts_code: '885893', relation: 'self_driven', pct: 4, trace_summary: '关税豁免' },
        ]),
        sectorStages: { '885893': STAGES },
      },
    })

    expect(wrapper.find('.acv-more-tx').text()).toBe('依据详情')
    expect(wrapper.find('.acv-detail').exists()).toBe(false)

    await wrapper.find('.acv-more').trigger('tap')
    expect(wrapper.find('.acv-more-tx').text()).toBe('收起')
    expect(wrapper.findAll('.acv-detail-k').map((n) => n.text())).toEqual(['触发', '传导', '结果'])
    expect(wrapper.findAll('.acv-detail-v').map((n) => n.text())).toEqual([
      '大基金三期再落子',
      '持仓共振走强',
      '国产替代预期升温',
    ])

    await wrapper.find('.acv-more').trigger('tap')
    expect(wrapper.find('.acv-detail').exists()).toBe(false)
  })

  it('键降级：ts_code 无数据时用板块名查到（权威名/原始名都能命中）', async () => {
    const wrapper = mount(AttributionChainView, {
      props: {
        date: DATE,
        chain: chainWith([
          // ts_code 有值但映射里没有 → 降级到 sector_std
          { sector: '次新股', sector_std: '注册制次新股', ts_code: '999999', relation: 'self_driven', pct: 7, trace_summary: 'x' },
          // 连 sector_std 都没有 → 降级到原始名
          { sector: '汽车芯片', relation: 'self_driven', pct: 4, trace_summary: 'y' },
        ]),
        sectorStages: { 注册制次新股: STAGES, 汽车芯片: STAGES },
      },
    })

    expect(wrapper.findAll('.acv-more')).toHaveLength(2)
  })

  it('展开态按分支独立（点开一个不影响另一个）', async () => {
    const wrapper = mount(AttributionChainView, {
      props: {
        date: DATE,
        chain: chainWith([
          { sector: '汽车芯片', ts_code: 'A', relation: 'self_driven', pct: 4, trace_summary: 'x' },
          { sector: '券商', ts_code: 'B', relation: 'market_follow', pct: 1, trace_summary: 'y' },
        ]),
        sectorStages: { A: STAGES, B: STAGES },
      },
    })

    await wrapper.findAll('.acv-more')[0]!.trigger('tap')

    expect(wrapper.findAll('.acv-detail')).toHaveLength(1)
    expect(wrapper.findAll('.acv-more-tx').map((n) => n.text())).toEqual(['收起', '依据详情'])
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
