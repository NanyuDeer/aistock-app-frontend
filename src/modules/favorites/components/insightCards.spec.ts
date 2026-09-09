import { describe, it, expect } from 'vitest'
import { buildInsightCards, cardInTab, isUnattributableMovement } from './insightCards'
import type { TraceEventLike, IntelEvent, InsightStockCard } from './insightCards'

// ---- 测试数据工厂 ----

function makeMovement(overrides: Partial<TraceEventLike> & { symbol: string }): TraceEventLike {
  return {
    event_id: `mv:${overrides.symbol}:default`,
    stock_name: '',
    direction: 'up',
    change_pct: 5.0,
    triggered_at: '2026-09-03T06:00:00.000Z',
    window_end_at: undefined,
    analysis_status: 'completed',
    primary_cause: null,
    forecast: undefined,
    is_limit_up: undefined,
    ...overrides,
  }
}

function makeIntel(overrides: Partial<IntelEvent> & { symbol: string; stock_code: string }): IntelEvent {
  return {
    event_id: `intel:${overrides.symbol}:default`,
    stock_name: '',
    cycle: 'short',
    event_time: '2026-09-03T06:00:00.000Z',
    title: '测试情报',
    ai_impact: '利好',
    ...overrides,
  }
}

// ---- 测试 ----

describe('buildInsightCards 自选股聚合卡', () => {
  // ===== a) 一 symbol 一卡（异动+情报并集去重） =====
  it('同 symbol 多条异动+多条情报合并为一卡', () => {
    const movements: TraceEventLike[] = [
      makeMovement({ symbol: '600519', event_id: 'mv:1', triggered_at: '2026-09-03T08:00:00Z' }),
      makeMovement({ symbol: '600519', event_id: 'mv:2', triggered_at: '2026-09-03T07:00:00Z' }),
    ]
    const intelEvents: IntelEvent[] = [
      makeIntel({ symbol: '600519', stock_code: '600519', event_id: 'intel:1' }),
      makeIntel({ symbol: '600519', stock_code: '600519', event_id: 'intel:2' }),
    ]
    const cards = buildInsightCards({ movements, intelEvents })
    expect(cards).toHaveLength(1)
    expect(cards[0].symbol).toBe('600519')
    // 异动只保留最新一条
    expect(cards[0].trace?.eventId).toBe('mv:1')
    // 情报全部保留（非中性不过滤）
    expect(cards[0].intel).toHaveLength(2)
    expect(cards[0].hasTrace).toBe(true)
  })

  // ===== b) 前缀归一 =====
  it('前缀归一：SH600519 与 600519 合并为同一卡', () => {
    const movements: TraceEventLike[] = [
      makeMovement({ symbol: 'SH600519', stock_name: '贵州茅台', triggered_at: '2026-09-03T08:00:00Z' }),
    ]
    const intelEvents: IntelEvent[] = [
      makeIntel({ symbol: '600519', stock_code: '600519', stock_name: '贵州茅台', event_time: '2026-09-03T07:00:00Z' }),
    ]
    const cards = buildInsightCards({ movements, intelEvents })
    expect(cards).toHaveLength(1)
    expect(cards[0].symbol).toBe('600519')
    expect(cards[0].stockName).toBe('贵州茅台')
  })

  it('SZ/BJ 前缀归一', () => {
    const movements: TraceEventLike[] = [
      makeMovement({ symbol: 'SZ000001', stock_name: '平安银行', triggered_at: '2026-09-03T08:00:00Z' }),
    ]
    const intelEvents: IntelEvent[] = [
      makeIntel({ symbol: 'BJ830799', stock_code: 'BJ830799', stock_name: '某北交所股', event_time: '2026-09-03T07:00:00Z' }),
    ]
    const cards = buildInsightCards({ movements, intelEvents })
    expect(cards).toHaveLength(2)
    expect(cards.find((c) => c.symbol === '000001')?.stockName).toBe('平安银行')
    expect(cards.find((c) => c.symbol === '830799')?.stockName).toBe('某北交所股')
  })

  // ===== c) slot 选择 close 优先 midday =====
  it('forecast slot 选择 close 优先 midday', () => {
    const movements: TraceEventLike[] = [
      makeMovement({
        symbol: '600519',
        forecast: {
          midday: { summary: 'midday 摘要', conditions: [{ condition: 'c1', scenario: 's1' }] },
          close: { summary: 'close 摘要', conditions: [{ condition: 'c2', scenario: 's2' }] },
        },
        triggered_at: '2026-09-03T08:00:00Z',
      }),
    ]
    const cards = buildInsightCards({ movements, intelEvents: [] })
    expect(cards).toHaveLength(1)
    expect(cards[0].hasForecast).toBe(true)
    expect(cards[0].forecast?.summary).toBe('close 摘要')
    expect(cards[0].forecast?.conditions[0].condition).toBe('c2')
  })

  it('forecast 仅有 midday 时使用 midday', () => {
    const movements: TraceEventLike[] = [
      makeMovement({
        symbol: '600519',
        forecast: {
          midday: { summary: 'midday 摘要', conditions: [{ condition: 'c1', scenario: 's1' }] },
        },
        triggered_at: '2026-09-03T08:00:00Z',
      }),
    ]
    const cards = buildInsightCards({ movements, intelEvents: [] })
    expect(cards).toHaveLength(1)
    expect(cards[0].forecast?.summary).toBe('midday 摘要')
  })

  it('forecast 解析失败返回 null、hasForecast=false', () => {
    const movements: TraceEventLike[] = [
      makeMovement({
        symbol: '600519',
        // 空对象，无 close/midday
        forecast: {},
        triggered_at: '2026-09-03T08:00:00Z',
      }),
    ]
    const cards = buildInsightCards({ movements, intelEvents: [] })
    expect(cards).toHaveLength(1)
    expect(cards[0].hasForecast).toBe(false)
    expect(cards[0].forecast).toBeNull()
  })

  // ===== 情报 forecast 提升为卡级 =====
  it('仅情报股 forecast 提升为卡级（close??midday）', () => {
    const intelEvents: IntelEvent[] = [
      makeIntel({ symbol: '600519', stock_code: '600519', stock_name: '贵州茅台',
        event_time: '2026-09-03T08:00:00Z', title: '重大利好',
        forecast: { close: { summary: '收盘预判摘要', conditions: [{ condition: 'c1', scenario: 's1' }] } } }),
    ]
    const cards = buildInsightCards({ movements: [], intelEvents })
    expect(cards).toHaveLength(1)
    expect(cards[0].hasForecast).toBe(true)
    expect(cards[0].forecast?.summary).toBe('收盘预判摘要')
    expect(cards[0].forecast?.slot).toBe('close')
  })

  it('仅情报股 forecast 仅有 midday 时使用 midday', () => {
    const intelEvents: IntelEvent[] = [
      makeIntel({ symbol: '600519', stock_code: '600519', stock_name: '贵州茅台',
        event_time: '2026-09-03T08:00:00Z', title: '重大利好',
        forecast: { midday: { summary: '午盘预判摘要', conditions: [{ condition: 'c1', scenario: 's1' }] } } }),
    ]
    const cards = buildInsightCards({ movements: [], intelEvents })
    expect(cards).toHaveLength(1)
    expect(cards[0].hasForecast).toBe(true)
    expect(cards[0].forecast?.summary).toBe('午盘预判摘要')
    expect(cards[0].forecast?.slot).toBe('midday')
  })

  it('仅情报股无 forecast 字段时 hasForecast=false', () => {
    const intelEvents: IntelEvent[] = [
      makeIntel({ symbol: '600519', stock_code: '600519', stock_name: '贵州茅台',
        event_time: '2026-09-03T08:00:00Z', title: '利好' }),
    ]
    const cards = buildInsightCards({ movements: [], intelEvents })
    expect(cards).toHaveLength(1)
    expect(cards[0].hasForecast).toBe(false)
    expect(cards[0].forecast).toBeNull()
  })

  // ===== d) activityAt = 两源 max，排序倒序 =====
  it('activityAt 取 trace 与 intel 的 max，整体按倒序排列', () => {
    const movements: TraceEventLike[] = [
      makeMovement({ symbol: 'A', triggered_at: '2026-09-03T09:00:00Z' }),
      makeMovement({ symbol: 'B', triggered_at: '2026-09-03T08:00:00Z' }),
    ]
    const intelEvents: IntelEvent[] = [
      makeIntel({ symbol: 'A', stock_code: 'A', event_time: '2026-09-03T07:00:00Z' }),
      makeIntel({ symbol: 'C', stock_code: 'C', event_time: '2026-09-03T10:00:00Z', title: '重大利好', stock_name: 'C股' }),
    ]
    const cards = buildInsightCards({ movements, intelEvents })
    // C(10:00) > A(09:00) > B(08:00)
    expect(cards).toHaveLength(3)
    expect(cards[0].symbol).toBe('C')
    expect(cards[1].symbol).toBe('A')
    expect(cards[2].symbol).toBe('B')
    expect(cards[0].activityAt).toBe('2026-09-03T10:00:00Z')
    expect(cards[1].activityAt).toBe('2026-09-03T09:00:00Z')
    expect(cards[2].activityAt).toBe('2026-09-03T08:00:00Z')
  })

  it('intel 活动时间早于 trace 时，activityAt 取 trace', () => {
    const movements: TraceEventLike[] = [
      makeMovement({ symbol: '600519', triggered_at: '2026-09-03T09:00:00Z' }),
    ]
    const intelEvents: IntelEvent[] = [
      makeIntel({ symbol: '600519', stock_code: '600519', event_time: '2026-09-03T07:00:00Z' }),
    ]
    const cards = buildInsightCards({ movements, intelEvents })
    expect(cards[0].activityAt).toBe('2026-09-03T09:00:00Z')
  })

  it('trace 活动时间早于 intel 时，activityAt 取 intel', () => {
    const movements: TraceEventLike[] = [
      makeMovement({ symbol: '600519', triggered_at: '2026-09-03T07:00:00Z' }),
    ]
    const intelEvents: IntelEvent[] = [
      makeIntel({ symbol: '600519', stock_code: '600519', event_time: '2026-09-03T10:00:00Z' }),
    ]
    const cards = buildInsightCards({ movements, intelEvents })
    expect(cards[0].activityAt).toBe('2026-09-03T10:00:00Z')
  })

  // ===== e) Tab 归属 =====
  it('Tab 归属：仅情报股（有 forecast）hasTrace=false 只属 all/forecast', () => {
    const intelEvents: IntelEvent[] = [
      makeIntel({ symbol: '600519', stock_code: '600519', stock_name: '贵州茅台',
        event_time: '2026-09-03T08:00:00Z', title: '利好',
        forecast: { close: { summary: '预判摘要', conditions: [{ condition: 'c1', scenario: 's1' }] } } }),
    ]
    const cards = buildInsightCards({ movements: [], intelEvents })
    expect(cards).toHaveLength(1)
    expect(cards[0].hasTrace).toBe(false)
    expect(cards[0].hasForecast).toBe(true) // 情报 forecast 被提升为卡级
    // cardInTab 验证
    expect(cardInTab(cards[0], 'all')).toBe(true)
    expect(cardInTab(cards[0], 'forecast')).toBe(true) // hasForecast
    expect(cardInTab(cards[0], 'trace')).toBe(false)
  })

  it('Tab 归属：异动卡属 all/forecast/trace', () => {
    const movements: TraceEventLike[] = [
      makeMovement({ symbol: '600519', stock_name: '贵州茅台', triggered_at: '2026-09-03T08:00:00Z' }),
    ]
    const cards = buildInsightCards({ movements, intelEvents: [] })
    expect(cards).toHaveLength(1)
    expect(cards[0].hasTrace).toBe(true)
    expect(cardInTab(cards[0], 'all')).toBe(true)
    // 无 forecast 无 intel → forecast 为 false
    expect(cardInTab(cards[0], 'forecast')).toBe(false)
    expect(cardInTab(cards[0], 'trace')).toBe(true)
  })

  it('Tab 归属：异动+forecast 卡属 all/forecast/trace', () => {
    const movements: TraceEventLike[] = [
      makeMovement({
        symbol: '600519',
        forecast: { close: { summary: '测试', conditions: [{ condition: 'c', scenario: 's' }] } },
        triggered_at: '2026-09-03T08:00:00Z',
      }),
    ]
    const cards = buildInsightCards({ movements, intelEvents: [] })
    expect(cards).toHaveLength(1)
    expect(cards[0].hasTrace).toBe(true)
    expect(cards[0].hasForecast).toBe(true)
    expect(cardInTab(cards[0], 'all')).toBe(true)
    expect(cardInTab(cards[0], 'forecast')).toBe(true)
    expect(cardInTab(cards[0], 'trace')).toBe(true)
  })

  it('无 forecast 无 trace 不出现（不构建）', () => {
    // 空 movements 和 intelEvents → 无卡
    const cards = buildInsightCards({ movements: [], intelEvents: [] })
    expect(cards).toHaveLength(0)
  })

  // ===== f) 边界：双空输入 =====
  it('双空输入返回 []', () => {
    expect(buildInsightCards({ movements: [], intelEvents: [] })).toEqual([])
  })

  it('单源空另一源有数据', () => {
    // 仅异动
    const onlyMovements = buildInsightCards({
      movements: [makeMovement({ symbol: '600519', triggered_at: '2026-09-03T08:00:00Z' })],
      intelEvents: [],
    })
    expect(onlyMovements).toHaveLength(1)
    expect(onlyMovements[0].symbol).toBe('600519')
    expect(onlyMovements[0].hasTrace).toBe(true)

    // 仅情报
    const onlyIntel = buildInsightCards({
      movements: [],
      intelEvents: [makeIntel({ symbol: '600519', stock_code: '600519', event_time: '2026-09-03T08:00:00Z' })],
    })
    expect(onlyIntel).toHaveLength(1)
    expect(onlyIntel[0].symbol).toBe('600519')
    expect(onlyIntel[0].hasTrace).toBe(false)
    expect(onlyIntel[0].intel).toHaveLength(1)
  })

  // ===== g) 同股异动+情报合并 =====
  it('同股异动+情报合并：intel 进卡 trace 保留', () => {
    const movements: TraceEventLike[] = [
      makeMovement({
        symbol: '601318',
        stock_name: '中国平安',
        direction: 'up',
        change_pct: 8.5,
        triggered_at: '2026-09-03T07:26:22.789Z',
        primary_cause: '大盘系统性下跌',
        analysis_status: 'completed',
      }),
    ]
    const intelEvents: IntelEvent[] = [
      makeIntel({
        symbol: '601318',
        stock_code: '601318',
        stock_name: '中国平安',
        event_time: '2026-09-03T06:00:00Z',
        title: '中国平安重大利好公告',
        ai_impact: '利好',
      }),
    ]
    const cards = buildInsightCards({ movements, intelEvents })
    expect(cards).toHaveLength(1)
    expect(cards[0].symbol).toBe('601318')
    expect(cards[0].stockName).toBe('中国平安')
    // trace 保留
    expect(cards[0].hasTrace).toBe(true)
    expect(cards[0].trace?.eventId).toBe('mv:601318:default')
    expect(cards[0].trace?.direction).toBe('up')
    expect(cards[0].trace?.primaryCause).toBe('大盘系统性下跌')
    // intel 进卡
    expect(cards[0].intel).toHaveLength(1)
    expect(cards[0].intel[0].title).toBe('中国平安重大利好公告')
    // activityAt 取 max（trace 07:26 > intel 06:00）
    expect(cards[0].activityAt).toBe('2026-09-03T07:26:22.789Z')
  })

  // ===== 情报过滤与排序 =====
  it('剔除 ai_impact 中性情报（不含利好/利空）', () => {
    const intelEvents: IntelEvent[] = [
      makeIntel({ symbol: '600519', stock_code: '600519', event_id: 'intel:1', title: '利好事件', ai_impact: '利好' }),
      makeIntel({ symbol: '600519', stock_code: '600519', event_id: 'intel:2', title: '中性事件', ai_impact: '中性' }),
      makeIntel({ symbol: '600519', stock_code: '600519', event_id: 'intel:3', title: '利空事件', ai_impact: '利空' }),
    ]
    const cards = buildInsightCards({ movements: [], intelEvents })
    expect(cards).toHaveLength(1)
    expect(cards[0].intel).toHaveLength(2)
    expect(cards[0].intel.map((i) => i.title).sort()).toEqual(['利好事件', '利空事件'])
  })

  it('重大情报优先排序，其余按 event_time 倒序', () => {
    const intelEvents: IntelEvent[] = [
      makeIntel({ symbol: '600519', stock_code: '600519', event_id: 'intel:1', title: '普通利好', event_time: '2026-09-03T08:00:00Z', ai_impact: '利好' }),
      makeIntel({ symbol: '600519', stock_code: '600519', event_id: 'intel:2', title: '重大利好（标题含重大）', event_time: '2026-09-03T07:00:00Z', ai_impact: '利好' }),
      makeIntel({ symbol: '600519', stock_code: '600519', event_id: 'intel:3', title: '普通利空', event_time: '2026-09-03T09:00:00Z', ai_impact: '利空' }),
    ]
    const cards = buildInsightCards({ movements: [], intelEvents })
    expect(cards[0].intel).toHaveLength(3)
    // 重大排第一（title 含"重大"），其余按 event_time 倒序
    expect(cards[0].intel[0].title).toBe('重大利好（标题含重大）')
    expect(cards[0].intel[1].title).toBe('普通利空') // 09:00
    expect(cards[0].intel[2].title).toBe('普通利好') // 08:00
  })

  it('ai_impact 含"重大"而 title 不含时仍视为重大优先排序', () => {
    const intelEvents: IntelEvent[] = [
      makeIntel({ symbol: '600519', stock_code: '600519', event_id: 'intel:1', title: '普通利好', event_time: '2026-09-03T08:00:00Z', ai_impact: '利好' }),
      makeIntel({ symbol: '600519', stock_code: '600519', event_id: 'intel:2', title: '非标题重大利好', event_time: '2026-09-03T07:00:00Z', ai_impact: '重大利好' }),
    ]
    const cards = buildInsightCards({ movements: [], intelEvents })
    expect(cards[0].intel).toHaveLength(2)
    // ai_impact 含"重大"的排第一，title 不含"重大"也生效
    expect(cards[0].intel[0].title).toBe('非标题重大利好')
    expect(cards[0].intel[0].ai_impact).toBe('重大利好')
    expect(cards[0].intel[1].title).toBe('普通利好')
  })

  // ===== window_end_at 优先于 triggered_at =====
  it('trace activityAt 优先取 window_end_at', () => {
    const movements: TraceEventLike[] = [
      makeMovement({
        symbol: '600519',
        triggered_at: '2026-09-03T07:00:00Z',
        window_end_at: '2026-09-03T09:30:00Z',
      }),
    ]
    const cards = buildInsightCards({ movements, intelEvents: [] })
    expect(cards[0].trace?.activityAt).toBe('2026-09-03T09:30:00Z')
    expect(cards[0].activityAt).toBe('2026-09-03T09:30:00Z')
  })

  // ===== stockName 取 trace 优先 =====
  it('stockName 优先取 trace 的 stock_name', () => {
    const movements: TraceEventLike[] = [
      makeMovement({ symbol: '600519', stock_name: '贵州茅台(异动)', triggered_at: '2026-09-03T08:00:00Z' }),
    ]
    const intelEvents: IntelEvent[] = [
      makeIntel({ symbol: '600519', stock_code: '600519', stock_name: '贵州茅台(情报)', event_time: '2026-09-03T07:00:00Z' }),
    ]
    const cards = buildInsightCards({ movements, intelEvents })
    expect(cards[0].stockName).toBe('贵州茅台(异动)')
  })

  it('无 trace 时 stockName 取情报的 stock_name', () => {
    const intelEvents: IntelEvent[] = [
      makeIntel({ symbol: '600519', stock_code: '600519', stock_name: '贵州茅台', event_time: '2026-09-03T08:00:00Z' }),
    ]
    const cards = buildInsightCards({ movements: [], intelEvents })
    expect(cards[0].stockName).toBe('贵州茅台')
  })
})

describe('cardInTab Tab 归属判断', () => {
  function makeCard(overrides: Partial<InsightStockCard> & { symbol: string }): InsightStockCard {
    return {
      stockName: '',
      hasTrace: false,
      hasForecast: false,
      trace: null,
      forecast: null,
      intel: [],
      activityAt: '2026-09-03T08:00:00Z',
      ...overrides,
    }
  }

  it('all 恒 true', () => {
    const card = makeCard({ symbol: '600519' })
    expect(cardInTab(card, 'all')).toBe(true)
  })

  it('forecast 需 hasForecast', () => {
    expect(cardInTab(makeCard({ symbol: 'A', hasForecast: true }), 'forecast')).toBe(true)
    expect(cardInTab(makeCard({ symbol: 'B', hasForecast: true }), 'forecast')).toBe(true)
    expect(cardInTab(makeCard({ symbol: 'C' }), 'forecast')).toBe(false)
  })

  it('trace 需 hasTrace', () => {
    expect(cardInTab(makeCard({ symbol: 'A', hasTrace: true }), 'trace')).toBe(true)
    expect(cardInTab(makeCard({ symbol: 'B' }), 'trace')).toBe(false)
  })
})

describe('isUnattributableMovement 无法归因判定', () => {
  // 辅助：快速构建运动事件
  function m(overrides: Partial<TraceEventLike> & { symbol: string }): TraceEventLike {
    return {
      event_id: `mv:${overrides.symbol}:test`,
      stock_name: '',
      direction: 'up',
      change_pct: 5.0,
      triggered_at: '2026-09-03T06:00:00.000Z',
      window_end_at: undefined,
      analysis_status: 'completed',
      primary_cause: null,
      forecast: undefined,
      is_limit_up: undefined,
      movement_view: undefined,
      ...overrides,
    }
  }

  // 表驱动：每个用例 = [description, overrides, expected]
  const cases: Array<[string, Partial<TraceEventLike> & { symbol: string }, boolean]> = [
    // unavailable → 无法归因
    ['unavailable 状态 → true', { symbol: 'A', analysis_status: 'unavailable' }, true],
    // completed + view.status === 'insufficient' → true
    ['completed + insufficient → true', { symbol: 'B', analysis_status: 'completed', movement_view: { status: 'insufficient' } }, true],
    // completed + view.status === 'not_applicable' → true
    ['completed + not_applicable → true', { symbol: 'C', analysis_status: 'completed', movement_view: { status: 'not_applicable' } }, true],
    // completed + view.status === 'confirmed' → false
    ['completed + confirmed → false', { symbol: 'D', analysis_status: 'completed', movement_view: { status: 'confirmed' } }, false],
    // completed + view.status === 'hypothesis' → false
    ['completed + hypothesis → false', { symbol: 'E', analysis_status: 'completed', movement_view: { status: 'hypothesis' } }, false],
    // completed 无 view 无 cause → true
    ['completed 无 view 无 cause → true', { symbol: 'F', analysis_status: 'completed', movement_view: undefined, primary_cause: null }, true],
    // completed 无 view 有 cause → false
    ['completed 无 view 有 cause → false', { symbol: 'G', analysis_status: 'completed', movement_view: undefined, primary_cause: '大盘下跌' }, false],
    // completed 无 view + cause='证据不足' → true（蓝盾光电型）
    ['completed 无 view + 证据不足 → true', { symbol: 'K', analysis_status: 'completed', movement_view: undefined, primary_cause: '证据不足' }, true],
    ['completed 无 view + 证据不足，主因未明 → true', { symbol: 'L', analysis_status: 'completed', movement_view: undefined, primary_cause: '证据不足，主因未明' }, true],
    // processing → false
    ['processing → false', { symbol: 'H', analysis_status: 'processing' }, false],
    // pending → false
    ['pending → false', { symbol: 'I', analysis_status: 'pending' }, false],
  ]

  it.each(cases)('%s', (_desc, overrides, expected) => {
    expect(isUnattributableMovement(m(overrides))).toBe(expected)
  })

  // 额外：unavailable 即使有 primary_cause 也视为无法归因（归因从未跑出结论）
  it('unavailable 即使有 primary_cause 也视为无法归因', () => {
    expect(isUnattributableMovement(m({
      symbol: 'J',
      analysis_status: 'unavailable',
      primary_cause: '有值但不应出现',
    }))).toBe(true)
  })
})