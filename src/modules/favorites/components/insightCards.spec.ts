import { describe, it, expect } from 'vitest'
import { isUnattributableMovement, dedupeDailyMovements, upsertEventById } from './insightCards'
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

// ---- 低置信不展示（2026-09-30）：低置信归因的异动卡片不展示 ----

describe('isUnattributableMovement 低置信不展示口径', () => {
  it('confidence_level = low → 不展示（即使主因文案可用）', () => {
    expect(isUnattributableMovement(makeMovement({
      symbol: 'A',
      analysis_status: 'completed',
      primary_cause: '板块联动走弱',
      confidence_level: 'low',
    }))).toBe(true)
  })

  it('confidence_level = medium → 展示', () => {
    expect(isUnattributableMovement(makeMovement({
      symbol: 'B',
      analysis_status: 'completed',
      primary_cause: '板块联动走弱',
      confidence_level: 'medium',
    }))).toBe(false)
  })

  it('confidence_level = high → 展示', () => {
    expect(isUnattributableMovement(makeMovement({
      symbol: 'C',
      analysis_status: 'completed',
      primary_cause: '板块联动走弱',
      confidence_level: 'high',
    }))).toBe(false)
  })

  it('confidence_level 缺失（app-api 未升级）→ 不隐藏（避免误杀全部卡片）', () => {
    expect(isUnattributableMovement(makeMovement({
      symbol: 'D',
      analysis_status: 'completed',
      primary_cause: '板块联动走弱',
    }))).toBe(false)
  })

  it('confidence_level = null（无归因结果）→ 不隐藏', () => {
    expect(isUnattributableMovement(makeMovement({
      symbol: 'E',
      analysis_status: 'completed',
      primary_cause: '板块联动走弱',
      confidence_level: null,
    }))).toBe(false)
  })

  // 归因失败可见性（2026-10-06，失败状态契约）：failed **必须保持不被隐藏**。
  // 否则"当日全失败"时整组会在 filter(isUnattributableMovement) 处消失，
  // 用户看不到「归因失败」，与"全失败才展示失败"的口径相悖。
  it('analysis_status = failed → 不隐藏（全失败时「归因失败」必须可见）', () => {
    expect(isUnattributableMovement(makeMovement({
      symbol: 'F',
      analysis_status: 'failed',
    }))).toBe(false)
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

  // window_end_at 优先作为活动时间（与组内活动时间口径一致）
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

// ---- 失败回退（2026-10-06，页面契约）：最新 failed 回退到当日有效归因 ----

describe('dedupeDailyMovements 失败回退（failed）', () => {
  // ① 最新 failed + 当日有 completed → 取 completed（失败不遮住有效归因）
  it('最新 failed + 当日有 completed → 取 completed', () => {
    const items = dedupeDailyMovements([
      makeMovement({ symbol: '688203', event_id: 'mv:failed:latest', triggered_at: '2026-09-04T07:00:00Z', analysis_status: 'failed' }),
      makeMovement({ symbol: '688203', event_id: 'mv:completed:early', triggered_at: '2026-09-04T01:00:00Z', analysis_status: 'completed', primary_cause: '板块联动走弱' }),
    ])
    expect(items).toHaveLength(1)
    expect(items[0].event_id).toBe('mv:completed:early')
  })

  // ② 全 failed → 取其中最新 failed（让「归因失败」可见）
  it('当日全 failed → 取其中最新 failed', () => {
    const items = dedupeDailyMovements([
      makeMovement({ symbol: '688203', event_id: 'mv:failed:old', triggered_at: '2026-09-04T01:00:00Z', analysis_status: 'failed' }),
      makeMovement({ symbol: '688203', event_id: 'mv:failed:new', triggered_at: '2026-09-04T07:00:00Z', analysis_status: 'failed' }),
    ])
    expect(items).toHaveLength(1)
    expect(items[0].event_id).toBe('mv:failed:new')
  })

  // ③ 交互用例：同一交易日、同股混排 unavailable / failed / completed。
  // 关键在「unavailable 是当日最新非 failed」，它在 dedupe 内部本应胜出，但会先被
  // isUnattributableMovement 过滤剔除；failed 是当日最新、但被 dedupe 的「跳过 failed」跳过。
  // 二者共同作用，最终仍取到较早的 completed —— 这锁住「失败回退」×「不可归因过滤」的交互。
  // 注意与①不同：①只有 failed+completed 两态历时竞争；③额外引入 unavailable 这枚「会被过滤的
  // 最新项」，若不过滤它或不去重跳过 failed，本用例都会得到非 completed，真正区分于①。
  it('unavailable + failed + completed 混排 → 仍取 completed（失败回退 × 不可归因过滤 交互）', () => {
    const items = dedupeDailyMovements(
      [
        makeMovement({ symbol: '688203', event_id: 'mv:unavailable:newest', triggered_at: '2026-09-04T07:00:00Z', analysis_status: 'unavailable' }),
        makeMovement({ symbol: '688203', event_id: 'mv:failed:newest', triggered_at: '2026-09-04T08:00:00Z', analysis_status: 'failed' }),
        makeMovement({ symbol: '688203', event_id: 'mv:completed:older', triggered_at: '2026-09-04T06:00:00Z', analysis_status: 'completed', primary_cause: '科创板块走弱' }),
      ].filter((x) => !isUnattributableMovement(x)),
    )
    expect(items).toHaveLength(1)
    expect(items[0].event_id).toBe('mv:completed:older')
  })
})

// ---- upsertEventById（2026-10-07，monitor.vue / insight.vue 共享的分页/推送合并）----

describe('upsertEventById 按 event_id 浅合并', () => {
  it('键不存在 → 追加到末尾', () => {
    const prev = [{ event_id: 'a', n: 1 }, { event_id: 'b', n: 2 }]
    const next = upsertEventById(prev, [{ event_id: 'c', n: 3 }])
    expect(next.map((e) => e.event_id)).toEqual(['a', 'b', 'c'])
  })

  it('键已存在 → 浅合并更新，且不改变原位置', () => {
    const prev = [{ event_id: 'a', n: 1 }, { event_id: 'b', n: 2 }]
    const next = upsertEventById(prev, [{ event_id: 'b', n: 9 }])
    // 保留原位置（b 仍排第 2）
    expect(next.map((e) => e.event_id)).toEqual(['a', 'b'])
    // incoming 覆盖同名字段，其余保留
    expect(next[1]).toEqual({ event_id: 'b', n: 9 })
  })

  it('不修改输入的 prev 数组及其元素', () => {
    const prev = [{ event_id: 'a', n: 1 }]
    const clone = { event_id: 'a', n: 1 }
    upsertEventById(prev, [{ event_id: 'a', n: 9 }, { event_id: 'b', n: 2 }])
    expect(prev).toEqual([clone])
  })
})