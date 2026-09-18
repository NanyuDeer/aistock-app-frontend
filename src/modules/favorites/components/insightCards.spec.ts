import { describe, it, expect } from 'vitest'
import { isUnattributableMovement, dedupeDailyMovements } from './insightCards'
import type { TraceEventLike } from './insightCards'

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
    is_limit_up: undefined,
    ...overrides,
  }
}

// ---- 测试 ----

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

// ---- 同日同股聚合（2026-09-13）：同一交易日同股多条异动只保留最新一条 ----

describe('dedupeDailyMovements 同日同股聚合', () => {
  // 同股同日多条（同向/反向）→ 只保留 triggered_at 最新一条
  it('同股同日多条（含反向）只保留最新一条', () => {
    const items = dedupeDailyMovements([
      makeMovement({ symbol: '003018', event_id: 'mv:003018:09-04:0950', triggered_at: '2026-09-04T01:50:00Z', direction: 'up' }),
      makeMovement({ symbol: '003018', event_id: 'mv:003018:09-04:1347', triggered_at: '2026-09-04T05:47:00Z', direction: 'up' }),
      makeMovement({ symbol: '003018', event_id: 'mv:003018:09-04:1030', triggered_at: '2026-09-04T02:30:00Z', direction: 'down' }),
    ])
    expect(items).toHaveLength(1)
    expect(items[0].event_id).toBe('mv:003018:09-04:1347')
  })

  // 同股跨日 → 各日各保留一条
  it('同股跨交易日各保留一条', () => {
    const items = dedupeDailyMovements([
      makeMovement({ symbol: '600172', event_id: 'mv:600172:09-03:a', triggered_at: '2026-09-03T02:55:00Z' }),
      makeMovement({ symbol: '600172', event_id: 'mv:600172:09-03:b', triggered_at: '2026-09-03T07:05:00Z' }),
      makeMovement({ symbol: '600172', event_id: 'mv:600172:09-04:a', triggered_at: '2026-09-04T02:00:00Z' }),
    ])
    expect(items.map((x) => x.event_id).sort()).toEqual(['mv:600172:09-03:b', 'mv:600172:09-04:a'])
  })

  // 不同股同日 → 互不影响
  it('不同股票同日各自保留', () => {
    const items = dedupeDailyMovements([
      makeMovement({ symbol: '003018', event_id: 'mv:A', triggered_at: '2026-09-04T02:00:00Z' }),
      makeMovement({ symbol: '600172', event_id: 'mv:B', triggered_at: '2026-09-04T03:00:00Z' }),
    ])
    expect(items).toHaveLength(2)
  })

  // 上海时区口径：UTC 前一日 16:00Z 之后属于上海次日（UTC+8 → 00:00 起算）
  it('按上海交易日分组：UTC 09-03T16:30Z 属上海 09-04，与同日事件合并', () => {
    const items = dedupeDailyMovements([
      makeMovement({ symbol: '003018', event_id: 'mv:late', triggered_at: '2026-09-03T16:30:00Z' }), // 上海 09-04 00:30
      makeMovement({ symbol: '003018', event_id: 'mv:day', triggered_at: '2026-09-04T02:00:00Z' }), // 上海 09-04 10:00
      makeMovement({ symbol: '003018', event_id: 'mv:prev', triggered_at: '2026-09-03T15:00:00Z' }), // 上海 09-03 23:00
    ])
    const ids = items.map((x) => x.event_id)
    expect(ids).toContain('mv:day')
    expect(ids).toContain('mv:prev')
    expect(ids).not.toContain('mv:late')
  })

  // 输入顺序不影响结果（取值为最新一条而非最后一条）
  it('乱序输入仍取最新一条', () => {
    const items = dedupeDailyMovements([
      makeMovement({ symbol: '003018', event_id: 'mv:new', triggered_at: '2026-09-04T05:47:00Z' }),
      makeMovement({ symbol: '003018', event_id: 'mv:old', triggered_at: '2026-09-04T01:50:00Z' }),
    ])
    expect(items).toHaveLength(1)
    expect(items[0].event_id).toBe('mv:new')
  })

  // 前缀归一：SH600519 与 600519 视作同一只
  it('SH/SZ/BJ 前缀归一后按同股聚合', () => {
    const items = dedupeDailyMovements([
      makeMovement({ symbol: 'SH600519', event_id: 'mv:sh', triggered_at: '2026-09-04T02:00:00Z' }),
      makeMovement({ symbol: '600519', event_id: 'mv:plain', triggered_at: '2026-09-04T03:00:00Z' }),
    ])
    expect(items).toHaveLength(1)
    expect(items[0].event_id).toBe('mv:plain')
  })

  // window_end_at 优先作为活动时间（与 buildInsightCards 口径一致）
  it('以 window_end_at 优先判定最新（活动时间口径一致）', () => {
    const items = dedupeDailyMovements([
      makeMovement({ symbol: '003018', event_id: 'mv:early', triggered_at: '2026-09-04T01:00:00Z', window_end_at: '2026-09-04T06:00:00Z' }),
      makeMovement({ symbol: '003018', event_id: 'mv:late', triggered_at: '2026-09-04T05:00:00Z', window_end_at: '2026-09-04T05:30:00Z' }),
    ])
    expect(items).toHaveLength(1)
    expect(items[0].event_id).toBe('mv:early')
  })

  it('空数组返回空数组', () => {
    expect(dedupeDailyMovements([])).toEqual([])
  })
})