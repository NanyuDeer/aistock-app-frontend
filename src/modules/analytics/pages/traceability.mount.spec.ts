/**
 * 市场洞见页：主因板块区块已并入大盘归因链（2026-09-18）。
 *
 * 背景：「今日影响大盘的主要板块」与上方「大盘归因链」读**同一份链**、用**同一个过滤判据**
 * （`sectorInsight.isUnconfirmedAttribution`）、显示**同一批板块**（角色徽 + 事件胶囊 + 驱动句），
 * 信息重复且同一批板块渲染两遍 → 决定只保留归因链。被移除区块的三个能力去向：
 * - 「归因较弱」/「全部板块 ›」→ 链视图下方的 `chain-foot` 行；
 * - 「今日暂无可确认的驱动板块」空态 → 取消（链树已过滤未确认节点，无分支即无卡）；
 * - 「看该板块预判 →」→ **2026-09-18 晚已撤掉**（组长裁定）：链分支不再挂预判入口
 *   （板块详情页仍可从板块四环页 / 风口页进入）。
 *
 * 本 spec 守住三件事：
 * ① 旧区块与其 `sector-insight` 出卡逻辑彻底消失（该接口只为首屏原因链拉一次）；
 * ② `chain-foot` 行（归因较弱 / 全部板块）随链存在与否显隐；
 * ③ 「全部板块」跳转正确、链分支不再有预判入口。
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

/** uni 全局桩：跳转断言用（hoisted 才能在 vi.mock 工厂外稳定取到同一实例） */
const uniMock = vi.hoisted(() => ({ navigateTo: vi.fn(), showToast: vi.fn() }))
vi.stubGlobal('uni', uniMock)

// 报告 → ViewModel 映射替换为最小桩：本 spec 只关心链区块，不关心大盘洞见卡内容
vi.mock('@/modules/analytics/utils/marketTraceReview', () => ({
  toMarketTracePresentation: vi.fn(() => ({ reportTitle: '大盘洞见桩' })),
}))

vi.mock('@/modules/analytics/components/MarketInsightCard.vue', () => ({
  default: { name: 'MarketInsightCard', props: ['presentation'], template: '<view class="mic-stub" />' },
}))

// 链视图桩：本 spec 只验证页面侧接线（props 传入 + 链/原因链数据流），
// 分支渲染、过滤、事件来源过滤由 AttributionChainView.mount.spec.ts 覆盖
vi.mock('@/shared/components/AttributionChainView.vue', () => ({
  default: {
    name: 'AttributionChainView',
    props: ['date', 'chain', 'loading', 'mock', 'sectorStages'],
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

// barrel 桩：挂载页的 LoadingState/EmptyState 等走此入口
vi.mock('@/shared/components', () => ({
  LoadingState: { name: 'LoadingState', props: ['size', 'text', 'layout'], template: '<view class="loading-stub" />' },
  EmptyState: { name: 'EmptyState', props: ['title', 'description', 'text', 'icon'], template: '<view class="empty-stub" />' },
  Button: { name: 'Button', props: ['size'], template: '<view class="btn-stub"><slot /></view>' },
  Card: { name: 'Card', props: ['title', 'subtitle'], template: '<view class="card-stub"><slot /></view>' },
}))

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
  sector_std?: string | null
}

const chainOf = (children: Child[], evidenceWeak = false) => ({
  date: DATE,
  root: {
    type: 'market' as const,
    date: DATE,
    summary: '半导体材料与券商走弱拖累大盘',
    index_pct: -1.2,
    ...(evidenceWeak ? { evidence_weak: true, attribution_status: 'hypothesis' } : {}),
  },
  children,
})

const SEMI = '半导体材料'
const BROKER = '券商'

const chainFixture = chainOf([
  { sector: BROKER, relation: 'market_follow', pct: -0.8, trace_summary: '大盘情绪拖累，资金观望', events: [] },
  {
    sector: SEMI,
    sector_std: '半导体',
    relation: 'self_driven',
    pct: -3,
    trace_summary: '美对华设备出口限制落地，产业链避险',
    events: [
      {
        event_id: 'e1',
        ref: 'https://news.example.com/a',
        headline: '美对华设备出口限制落地',
        source: 'warehouse' as const,
      },
    ],
  },
])

const acv = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findComponent({ name: 'AttributionChainView' })

async function mountPage() {
  const wrapper = mount(traceabilityPage)
  h.onShowCb?.()
  await flushPromises()
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  agentApiMock.getMarketTraceReview.mockResolvedValue({ report_date: DATE, status: 'completed' })
  // 保留 sector-insight 桩：若页面还在拉它，第 1 条用例会失败（负向护栏）
  agentApiMock.getSectorInsight.mockResolvedValue({ date: DATE, hasData: true, candidates: [] })
  predictionApiMock.list.mockResolvedValue({ items: [] })
  chainApiMock.fetchAttributionChain.mockResolvedValue(chainFixture)
})

afterEach(() => {
  h.onUnloadCb?.()
  vi.clearAllMocks()
})

describe('市场洞见页：主因板块区块并入大盘归因链（2026-09-18）', () => {
  it('旧区块彻底消失：不再渲染 .primary-sector-* 任何节点', async () => {
    const wrapper = await mountPage()

    expect(wrapper.find('.primary-sector-block').exists()).toBe(false)
    expect(wrapper.findAll('.primary-sector-card')).toHaveLength(0)
    expect(wrapper.find('.primary-sector-title').exists()).toBe(false)
    expect(wrapper.find('.primary-sector-empty').exists()).toBe(false)
  })

  it('首屏拉一次 sector-insight：只为链分支的板块原因链（不再出卡列表）', async () => {
    await mountPage()

    expect(agentApiMock.getSectorInsight).toHaveBeenCalledTimes(1)
    expect(agentApiMock.getSectorInsight).toHaveBeenCalledWith(DATE)
  })

  it('每板块原因链按 ts_code 与板块名双键索引后传给链视图（4 段→3 段）', async () => {
    agentApiMock.getSectorInsight.mockResolvedValue({
      date: DATE,
      hasData: true,
      candidates: [
        {
          ts_code: '885893',
          name: '国家大基金持股',
          source: 'review_primary',
          trace: {
            present: true,
            summary: '大基金三期再落子',
            sectors: ['国家大基金持股'],
            stages: [
              { kind: 'phenomenon', headline: '板块大涨 4.03%', claims: [], evidence: [] },
              { kind: 'trigger', headline: '大基金三期再落子', claims: [], evidence: [] },
              { kind: 'transmission', headline: '持仓共振走强', claims: [], evidence: [] },
              { kind: 'impact', headline: '国产替代预期升温', claims: [], evidence: [] },
            ],
          },
        },
      ],
    })

    const wrapper = await mountPage()
    const map = acv(wrapper).props('sectorStages') as Record<string, { name: string; text: string }[]>

    // 双键都索引（链节点可能用 ts_code 或板块名）
    expect(Object.keys(map).sort()).toEqual(['885893', '国家大基金持股'])
    // 现象段被丢掉、保源序：触发 → 传导 → 结果
    expect(map['885893']!.map((r) => r.name)).toEqual(['触发', '传导', '结果'])
    expect(map['885893']![0]!.text).toBe('大基金三期再落子')
    expect(map['国家大基金持股']).toEqual(map['885893'])
  })

  it('sector-insight 失败 → 静默空映射（不阻断报告；链视图不出展开入口）', async () => {
    agentApiMock.getSectorInsight.mockRejectedValue(new Error('boom'))
    const wrapper = await mountPage()

    expect(acv(wrapper).props('sectorStages')).toEqual({})
    expect(wrapper.find('.chain-view-block').exists()).toBe(true)
  })

  it('链数据仍受控传给归因链视图（页面拉一次，两处共用不再需要）', async () => {
    const wrapper = await mountPage()

    expect(chainApiMock.fetchAttributionChain).toHaveBeenCalledWith(DATE)
    expect(acv(wrapper).props('chain')).toEqual(chainFixture)
  })

  it('无链 → chain-foot 不渲染（不占位：既无归因较弱也无全部板块入口）', async () => {
    chainApiMock.fetchAttributionChain.mockResolvedValue(null)
    const wrapper = await mountPage()

    expect(wrapper.find('.chain-foot').exists()).toBe(false)
  })

  it('有链 → chain-foot 渲染「全部板块 ›」入口；正常日不出「归因较弱」', async () => {
    const wrapper = await mountPage()

    expect(wrapper.find('.chain-foot').exists()).toBe(true)
    expect(wrapper.find('.chain-foot-more-text').text()).toBe('全部板块 ›')
    expect(wrapper.find('.chain-foot-weak').exists()).toBe(false)
  })

  it('弱归因日（root.evidence_weak=true）→ chain-foot 出中性灰「归因较弱」', async () => {
    chainApiMock.fetchAttributionChain.mockResolvedValue(chainOf(chainFixture.children, true))
    const wrapper = await mountPage()

    expect(wrapper.find('.chain-foot-weak').text()).toBe('归因较弱')
  })

  it('「全部板块 ›」→ 跳板块四环页并带当前展示日期', async () => {
    const wrapper = await mountPage()

    await wrapper.find('.chain-foot-more').trigger('tap')
    await flushPromises()

    expect(uniMock.navigateTo).toHaveBeenCalledWith({
      url: `/modules/market/pages/sector-loop?date=${encodeURIComponent(DATE)}`,
    })
  })
})
