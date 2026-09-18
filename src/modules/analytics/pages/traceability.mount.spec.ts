/**
 * 市场洞见页「今日影响大盘的主要板块」区块挂载护栏（vitest + happy-dom）。
 *
 * 覆盖 spec §7.1（2026-09-17 P3' 改造）与 §2.1 两轨分离：
 * - 无链 → 整块不渲染（隐藏不占位）；
 * - 有链 → 候选卡按「自驱动优先 → |pct| 降序」排序；
 * - 每卡只渲染溯源侧（角色徽 + 事件胶囊），**不出现预判内容**（CFB 分支节点 `.as-insight-card__sc` 为 0）
 *   —— 用「候选自带已成立条件（met:true）」构造最严场景：若 structured 未被 traceOnly 拦下，CFB 必渲染分支。
 * - R17（2026-09-18）：出卡以**链 children 为主**（弱归因日链上有 3 个板块而候选只有 1 个）、
 *   「未确认驱动原因」的链节点不出卡、chain_only 卡与空态文案。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const h = vi.hoisted(() => ({
  onShowCb: null as null | (() => void),
  onUnloadCb: null as null | (() => void),
}))

const agentApiMock = vi.hoisted(() => ({
  getMarketTraceReview: vi.fn(),
  getSectorInsight: vi.fn(),
  getNextTradingDay: vi.fn(),
  getPreviousTradingDay: vi.fn(),
}))
vi.mock('@/shared/api/modules/agent', () => ({ agentApi: agentApiMock }))

const predictionApiMock = vi.hoisted(() => ({ list: vi.fn() }))
vi.mock('@/shared/api/modules/prediction', () => ({ predictionApi: predictionApiMock }))

const chainApiMock = vi.hoisted(() => ({ fetchAttributionChain: vi.fn() }))
vi.mock('@/shared/api/modules/attributionChain', () => chainApiMock)

// 报告 → ViewModel 映射替换为最小桩：本 spec 只关心区块，不关心大盘洞见卡内容
vi.mock('@/modules/analytics/utils/marketTraceReview', () => ({
  toMarketTracePresentation: vi.fn(() => ({ reportTitle: '大盘洞见桩' })),
}))

vi.mock('@/modules/analytics/components/MarketInsightCard.vue', () => ({
  default: { name: 'MarketInsightCard', props: ['presentation'], template: '<view class="mic-stub" />' },
}))

vi.mock('@/shared/components/AttributionChainView.vue', () => ({
  default: {
    name: 'AttributionChainView',
    props: ['date', 'chain', 'loading', 'mock'],
    template: '<view class="acv-stub" />',
  },
}))

vi.mock('@/shared/components/SubPageCard.vue', () => ({
  default: {
    name: 'SubPageCard',
    props: ['title'],
    template: '<view class="subpage-stub"><slot /><slot name="header-right" /><slot name="footer" /></view>',
  },
}))

vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name', 'size', 'color'], template: '<view class="svg-stub" />' },
}))

// barrel 桩：挂载页与 SectorInsightCard 的 LoadingState 均走此入口
vi.mock('@/shared/components', () => ({
  LoadingState: { name: 'LoadingState', props: ['size', 'text', 'layout'], template: '<view class="loading-stub" />' },
  EmptyState: { name: 'EmptyState', props: ['title', 'description', 'text', 'icon'], template: '<view class="empty-stub" />' },
  Button: { name: 'Button', props: ['size'], template: '<view class="btn-stub"><slot /></view>' },
  Card: { name: 'Card', props: ['title', 'subtitle'], template: '<view class="card-stub"><slot /></view>' },
}))

vi.stubGlobal('uni', { navigateTo: vi.fn(), showToast: vi.fn() })

vi.mock('@dcloudio/uni-app', () => ({
  onShow: (cb: () => void) => {
    h.onShowCb = cb
  },
  onHide: () => {},
  onUnload: (cb: () => void) => {
    h.onUnloadCb = cb
  },
}))

import traceabilityPage from './traceability.vue'

const DATE = '2026-09-16'

type Child = {
  sector: string
  relation: 'self_driven' | 'market_follow' | 'unknown'
  pct: number | null
  trace_summary: string
  events?: Array<{ event_id: string | null; ref: string; headline: string; source: 'warehouse' | 'search' }>
}

const chainOf = (children: Child[]) => ({
  date: DATE,
  root: { type: 'market' as const, date: DATE, summary: '半导体材料与券商走弱拖累大盘', index_pct: -1.2 },
  children,
})

const evt = (id: string, headline: string, source: 'warehouse' | 'search', ref: string) => ({
  event_id: source === 'warehouse' ? id : null,
  ref,
  headline,
  source,
})

/** 候选：均带 trace + 带「已成立条件」的 prediction（两轨分离下预判内容不得出现在卡内） */
const candidate = (
  name: string,
  source: 'review_primary' | 'both',
  traceSummary: string,
  /** 链上快照行码（省略时按 `${name}-code.TI` 造；与链 child.ts_code 精确匹配用） */
  tsCode = `${name}-code.TI`,
): Record<string, unknown> => ({
  ts_code: tsCode,
  name,
  category: 'industry',
  source,
  quote: null,
  trace: { present: true, status: 'completed', summary: traceSummary, sectors: [name] },
  prediction: {
    present: true,
    status: 'pending',
    attribution_summary: `${name}预判综述一句话（不得出现在主因卡）`,
    verification: 'pending',
    horizons: [{ horizon: 'short', label: '弱势整理', direction: 'bearish', confidence: 'medium' }],
    conditions: [
      { horizon: 'short', condition: `${name}放量站上20日线`, scenario: '上探+3%', met: true },
    ],
  },
})

const SEMI = '半导体材料'
const BROKER = '券商'
const POWER = '电力'
/** R17 弱归因日场景：链上批量兜底板块（玉米为唯一确认主因） */
const CORN = '玉米'

/** 候选与链：半导体材料（自驱动，-3.0%）、券商（跟随，-0.8%）、电力（不在链上） */
const candidatesFixture = [
  candidate(BROKER, 'review_primary', '大盘情绪拖累，资金观望'),
  candidate(POWER, 'both', '电力板块当日无链上溯源记录'),
  candidate(SEMI, 'review_primary', '美对华设备出口限制落地，产业链避险'),
]

const chainFixture = chainOf([
  { sector: BROKER, relation: 'market_follow', pct: -0.8, trace_summary: '大盘情绪拖累，资金观望', events: [] },
  {
    sector: SEMI,
    relation: 'self_driven',
    pct: -3,
    trace_summary: '美对华设备出口限制落地，产业链避险',
    events: [
      evt('e1', '美对华设备出口限制落地', 'warehouse', 'https://news.example.com/a'),
      evt('', '半导体材料板块定向检索命中', 'search', 'search:半导体材料|检索命中'),
    ],
  },
])

async function mountPage() {
  const wrapper = mount(traceabilityPage)
  h.onShowCb?.()
  await flushPromises()
  await flushPromises()
  return wrapper
}

const titles = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('.primary-sector-card .as-insight-card__title').map((n) => n.text())

beforeEach(() => {
  agentApiMock.getMarketTraceReview.mockResolvedValue({ report_date: DATE, status: 'completed' })
  agentApiMock.getSectorInsight.mockResolvedValue({ date: DATE, hasData: true, candidates: candidatesFixture })
  predictionApiMock.list.mockResolvedValue({ items: [] })
  chainApiMock.fetchAttributionChain.mockResolvedValue(chainFixture)
})

afterEach(() => {
  h.onUnloadCb?.()
  vi.clearAllMocks()
})

describe('市场洞见页「今日影响大盘的主要板块」区块', () => {
  it('无链（chain=null）→ 整块不渲染、不占位', async () => {
    chainApiMock.fetchAttributionChain.mockResolvedValue(null)
    const wrapper = await mountPage()

    expect(wrapper.find('.primary-sector-block').exists()).toBe(false)
    expect(wrapper.findAll('.primary-sector-card')).toHaveLength(0)
  })

  it('有链 → 卡片按「自驱动优先 → |pct| 降序」排序（不在链上的候选排末尾）', async () => {
    const wrapper = await mountPage()

    expect(wrapper.find('.primary-sector-block').exists()).toBe(true)
    expect(wrapper.find('.primary-sector-title').text()).toBe('今日影响大盘的主要板块')
    // 半导体材料（self_driven, -3.0%）> 券商（market_follow, -0.8%）> 电力（未入链）
    expect(titles(wrapper)).toEqual([
      '美对华设备出口限制落地，产业链避险',
      '大盘情绪拖累，资金观望',
      '电力板块当日无链上溯源记录',
    ])
    // 主因卡标题不得回退到预判综述（两轨分离）
    expect(titles(wrapper).some((t) => t.includes('预判综述'))).toBe(false)
  })

  it('有链 → 入链卡出角色徽；未入链卡无角色徽', async () => {
    const wrapper = await mountPage()
    const cards = wrapper.findAll('.primary-sector-card')

    expect(cards[0]!.find('.as-insight-card__tlk-badge').text()).toBe('自驱动')
    expect(cards[1]!.find('.as-insight-card__tlk-badge').text()).toBe('跟随大盘')
    expect(cards[2]!.find('.as-insight-card__tlk-badge').exists()).toBe(false)
  })

  it('主因卡只出溯源侧：不出现预判分支节点（.as-insight-card__sc）', async () => {
    const wrapper = await mountPage()

    expect(wrapper.findAll('.primary-sector-card')).toHaveLength(3)
    expect(wrapper.findAll('.as-insight-card__sc')).toHaveLength(0)
    // 溯源行仍在（角色徽驱动句）
    expect(wrapper.findAll('.as-insight-card__tlk-badge')).toHaveLength(2)
  })

  it('链上事件透传到主因卡：事件胶囊条数 = 该板块链事件数', async () => {
    const wrapper = await mountPage()
    const cards = wrapper.findAll('.primary-sector-card')

    expect(cards[0]!.findAll('.as-event-chip')).toHaveLength(2)
    expect(cards[1]!.findAll('.as-event-chip')).toHaveLength(0)
  })

  it('老数据/正常日（无 evidence_weak / extraction）→ 零弱标记', async () => {
    const wrapper = await mountPage()

    expect(wrapper.find('.primary-sector-weak').exists()).toBe(false)
    expect(wrapper.findAll('.as-insight-card__weak')).toHaveLength(0)
  })

  it('R14：链上 sector 名与候选不一致时，按 ts_code 精确匹配仍出角色徽/驱动句', async () => {
    chainApiMock.fetchAttributionChain.mockResolvedValue({
      date: DATE,
      root: { type: 'market', date: DATE, summary: '复盘原文名与权威名不一致', index_pct: -1.2 },
      children: [
        {
          // sector 用复盘原文名、sector_std 用另一个权威名 → 名称口径全不命中，只能靠 ts_code 命中
          sector: '半导体材料(复盘原文)',
          sector_std: '半导体材料Ⅱ',
          ts_code: `${SEMI}-code.TI`,
          relation: 'self_driven',
          pct: -3,
          trace_summary: '链上驱动句',
        },
      ],
    })
    const wrapper = await mountPage()
    const card = wrapper.findAll('.primary-sector-card')[0]!

    expect(card.find('.as-insight-card__tlk-badge').text()).toBe('自驱动')
    expect(card.find('.as-insight-card__tlk-drv-text').text()).toBe('链上驱动句')
  })

  it('R14：无 ts_code 时按 sector_std 精确命中（次优先）', async () => {
    chainApiMock.fetchAttributionChain.mockResolvedValue({
      date: DATE,
      root: { type: 'market', date: DATE, summary: '仅权威名可比', index_pct: -1.2 },
      children: [
        {
          sector: '半导体材料(复盘原文)',
          sector_std: SEMI,
          relation: 'self_driven',
          pct: -3,
          trace_summary: '权威名命中驱动句',
        },
      ],
    })
    const wrapper = await mountPage()
    const card = wrapper.findAll('.primary-sector-card')[0]!

    expect(card.find('.as-insight-card__tlk-badge').text()).toBe('自驱动')
    expect(card.find('.as-insight-card__tlk-drv-text').text()).toBe('权威名命中驱动句')
  })

  it('弱归因日：链级「归因较弱」+ 板块级按 extraction.source 分流（依据较弱 / 无归因依据）', async () => {
    chainApiMock.fetchAttributionChain.mockResolvedValue({
      date: DATE,
      root: {
        type: 'market',
        date: DATE,
        summary: '证据不足，未确认主因',
        index_pct: -0.411,
        attribution_status: 'hypothesis',
        evidence_weak: true,
      },
      children: [
        {
          sector: SEMI,
          relation: 'self_driven',
          pct: -1.87,
          trace_summary: '美对华设备出口限制落地，产业链避险',
          extraction: { source: 'candidate_claim', weak: true },
        },
        {
          sector: BROKER,
          relation: 'market_follow',
          pct: -0.8,
          trace_summary: '大盘情绪拖累，资金观望',
          extraction: { source: 'snapshot', weak: true },
        },
      ],
    })
    const wrapper = await mountPage()
    const cards = wrapper.findAll('.primary-sector-card')

    // 链级：区块标题旁中性灰「归因较弱」
    expect(wrapper.find('.primary-sector-weak').text()).toBe('归因较弱')
    // 板块级：溯源子卡内标记文案按 source 分流（首条为链级标记、次条为板块级标记）
    expect(cards[0]!.findAll('.as-insight-card__weak').map((n) => n.text())).toEqual(['归因较弱', '依据较弱'])
    expect(cards[1]!.findAll('.as-insight-card__weak').map((n) => n.text())).toEqual(['归因较弱', '无归因依据'])
    // 溯源子卡保留 root.summary 作为一句话行（弱归因日的中性摘要）
    expect(cards[0]!.find('.as-insight-card__tlk-sum').text()).toBe('证据不足，未确认主因')
  })

  /**
   * R17（2026-09-18 链路侧实测复现）：弱归因日链上有 3 个板块、sector-insight 只给 1 个 review_primary，
   * 旧实现按候选出卡 → 只显示 1 张卡，用户误以为"只分析了一个板块"。
   * 现改为**以链 children 为主出卡**，「未确认驱动原因」的链节点不出卡（行情综述 ≠ 驱动原因）。
   */
  it('R17：以链 children 为主出卡——未确认驱动原因的链节点不出卡，卡上带板块名标签', async () => {
    agentApiMock.getSectorInsight.mockResolvedValue({
      date: DATE,
      hasData: true,
      candidates: [candidate(CORN, 'review_primary', '玉米期货走强带动种植链', `${CORN}.TI`)],
    })
    chainApiMock.fetchAttributionChain.mockResolvedValue({
      date: DATE,
      root: {
        type: 'market',
        date: DATE,
        summary: '证据不足，未确认主因',
        index_pct: -0.411,
        attribution_status: 'hypothesis',
        evidence_weak: true,
      },
      children: [
        { sector: 'CRO概念', relation: 'market_follow', pct: 2.09, trace_summary: '未确认驱动原因' },
        { sector: '转基因', relation: 'market_follow', pct: 4.04, trace_summary: '证据不足，未确认主因' },
        {
          sector: CORN,
          sector_std: CORN,
          ts_code: `${CORN}.TI`,
          relation: 'self_driven',
          pct: 3.74,
          trace_summary: '玉米期货走强带动种植链',
        },
      ],
    })
    const wrapper = await mountPage()

    // 3 个链节点 → 只出 1 张卡（另 2 个是「未确认驱动原因」）
    expect(wrapper.findAll('.primary-sector-card')).toHaveLength(1)
    expect(titles(wrapper)).toEqual(['玉米期货走强带动种植链'])
    // 卡上明确显示板块名（标题是溯源主句，不看标签看不出是哪个板块）
    expect(wrapper.find('.primary-sector-card .as-insight-card__name-tag-text').text()).toBe(CORN)
    // 未确认节点整体不出现（含链树外的区块文案）
    const blockText = wrapper.find('.primary-sector-block').text()
    expect(blockText).not.toContain('CRO概念')
    expect(blockText).not.toContain('转基因')
  })

  it('R17：链上板块在 sector-insight 候选中不存在 → 合成 chain_only 候选仍出卡', async () => {
    agentApiMock.getSectorInsight.mockResolvedValue({
      date: DATE,
      hasData: true,
      candidates: [candidate(BROKER, 'review_primary', '大盘情绪拖累，资金观望')],
    })
    chainApiMock.fetchAttributionChain.mockResolvedValue({
      date: DATE,
      root: { type: 'market', date: DATE, summary: '玉米与券商分化', index_pct: 0.6 },
      children: [
        {
          sector: '玉米(复盘原文)',
          sector_std: CORN,
          ts_code: 'CORN.TI',
          relation: 'self_driven',
          pct: 3.74,
          trace_summary: '玉米期货走强带动种植链',
        },
      ],
    })
    const wrapper = await mountPage()
    const cards = wrapper.findAll('.primary-sector-card')

    // 链上 1 个（候选里没有 → 合成）+ 候选里有、链上没有的券商 1 个
    expect(cards).toHaveLength(2)
    expect(titles(wrapper)).toEqual(['玉米为大盘主要驱动', '大盘情绪拖累，资金观望'])
    // chain_only 卡：板块名标签取 sector_std；链上角色徽/驱动句照常
    expect(cards[0]!.find('.as-insight-card__name-tag-text').text()).toBe(CORN)
    expect(cards[0]!.find('.as-insight-card__tlk-badge').text()).toBe('自驱动')
    expect(cards[0]!.find('.as-insight-card__tlk-drv-text').text()).toBe('玉米期货走强带动种植链')
  })

  it('R17：链有 children 但全部未确认驱动原因 → 区块仍渲染 + 中性空态文案（与"无数据"可区分）', async () => {
    agentApiMock.getSectorInsight.mockResolvedValue({ date: DATE, hasData: true, candidates: [] })
    chainApiMock.fetchAttributionChain.mockResolvedValue({
      date: DATE,
      root: {
        type: 'market',
        date: DATE,
        summary: '证据不足，未确认主因',
        index_pct: -0.411,
        evidence_weak: true,
      },
      children: [
        { sector: 'CRO概念', relation: 'market_follow', pct: 2.09, trace_summary: '未确认驱动原因' },
        { sector: '转基因', relation: 'market_follow', pct: 4.04, trace_summary: '  ' },
      ],
    })
    const wrapper = await mountPage()

    expect(wrapper.find('.primary-sector-block').exists()).toBe(true)
    expect(wrapper.findAll('.primary-sector-card')).toHaveLength(0)
    expect(wrapper.find('.primary-sector-empty').text()).toContain('今日暂无可确认的驱动板块')
  })
})
