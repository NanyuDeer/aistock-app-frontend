/**
 * 自选股洞察——按股票聚合卡 纯函数（无组件/运行环境依赖）
 *
 * 职责：将 movements（异动）+ intelEvents（情报）按 symbol 分组合成 InsightStockCard 列表，
 *       供 AlertContent 等组件渲染使用。
 *
 * 不依赖 .vue、不 import 组件、不走网络；纯 TS 逻辑，可被 vitest 单测锁定。
 */

// ---- 类型定义 ----

/** 预判 slot 载荷：slot 来源 + summary + conditions 列表 */
export interface ForecastSlotPayload {
  /** slot 来源：'close'（收盘预判）或 'midday'（午盘预判） */
  slot: 'close' | 'midday'
  summary: string
  conditions: Array<{
    condition: string
    scenario: string
    anchor?: Record<string, unknown>
  }>
}

/**
 * 情报事件入参（最小字段子集，基于 event-catcher.vue TrendEvent + 可选 forecast）。
 * 本函数按真实情报事件最小字段定义，不依赖上游类型文件。
 */
export interface IntelEvent {
  event_id: string
  symbol: string
  stock_code: string
  stock_name: string
  industry?: string
  cycle: string
  event_time: string
  title: string
  summary?: string
  detail_url?: string
  info_type?: string
  ai_impact?: string
  ai_horizon?: string
  ai_keywords?: string[]
  source?: string
  /** 情报事件也可能携带 forecast（当情报来源含轻量预判时） */
  forecast?: Record<string, unknown> | null
}

/** 异动事件入参（取 StockTraceEvent 需要字段的子集）。 */
export interface TraceEventLike {
  event_id: string
  symbol: string
  stock_name: string
  direction: 'up' | 'down'
  change_pct: number
  triggered_at: string
  window_end_at?: string | null
  analysis_status: string
  primary_cause?: string | null
  /** 涨停文章命中标记（强时效来源） */
  is_limit_up?: boolean
  /** 轻量预判 slot 分存：{midday?: ..., close?: ...} */
  forecast?: Record<string, unknown> | null
  /** 归因视图（含 status/confidence/primaryCandidate 等），缺省表示历史数据无此字段 */
  movement_view?: { status: string } | null
}

/** 聚合卡片 */
export interface InsightStockCard {
  symbol: string
  stockName: string
  hasTrace: boolean
  hasForecast: boolean
  trace: null | {
    eventId: string
    direction: 'up' | 'down'
    changePct?: number | null
    primaryCause?: string | null
    analysisStatus: string
    activityAt: string
    /** 是否涨停（is_limit_up===true） */
    isLimitUp: boolean
  }
  forecast: ForecastSlotPayload | null
  intel: IntelEvent[]
  activityAt: string
}

// ---- 内部工具 ----

/** 归一 symbol：剥 SH/SZ/BJ 前缀，保留纯数字部分 */
function normalizeSymbol(raw: string): string {
  return raw.replace(/^(SH|SZ|BJ)/, '')
}

/** 安全日期解析：空字符串返回 0 而非 NaN */
function safeDateParse(s: string): number {
  if (!s) return 0
  const n = Date.parse(s)
  return Number.isNaN(n) ? 0 : n
}

/** 取 movement 的活动时间：window_end_at || triggered_at */
function movementActivityAt(m: TraceEventLike): string {
  return m.window_end_at ?? m.triggered_at
}

/**
 * 判断异动事件是否"无法归因"——即归因无有效结论，不应在洞察中展示。
 *
 * 判定口径：
 * - analysis_status === 'unavailable' → true（从未归因出结论，如黄河旋风 11:11 档）
 * - analysis_status !== 'completed' → false（processing/pending 归因中保留展示）
 * - 有 movement_view 时：view.status === 'insufficient' || view.status === 'not_applicable' → true
 *   （证据不足/不适用，如蓝盾光电 completed 但主因"证据不足"）
 * - 无 movement_view（列表接口不带 view）：主因短语为空、或为“证据不足/主因未明”等无结论表达 → true
 *   （如蓝盾光电 completed 但 primary_cause='证据不足'）
 */
/** 无结论主因短语提示词（命中即视为归因无有效结论，不展示） */
const INVALID_CAUSE_HINTS = ['证据不足', '主因未明', '待验证', '无法归因', '无明确主因', '未发现明确主因'] as const

function hasNoUsableCause(cause?: string | null): boolean {
  if (!cause || !cause.trim()) return true
  return INVALID_CAUSE_HINTS.some((hint) => cause.includes(hint))
}

export function isUnattributableMovement(m: TraceEventLike): boolean {
  if (m.analysis_status === 'unavailable') return true
  if (m.analysis_status !== 'completed') return false
  if (m.movement_view) {
    const status = m.movement_view.status
    return status === 'insufficient' || status === 'not_applicable'
  }
  // 列表接口不带 movement_view：以主因短语是否给出有效结论为准
  return hasNoUsableCause(m.primary_cause)
}

/**
 * 解析 forecast JSONB 取 slot（close 优先，无则 midday），返回结构化 Payload 或 null。
 * 导出供 insight-detail-move.vue / insight.vue 复用。
 */
export function parseForecastSlot(raw: Record<string, unknown> | null | undefined): ForecastSlotPayload | null {
  if (!raw) return null
  // close 优先
  if (raw.close) {
    const slot = raw.close as Record<string, unknown>
    if (typeof slot.summary === 'string' && Array.isArray(slot.conditions) &&
      (slot.conditions as Array<Record<string, unknown>>).every(
        (c) => typeof c.condition === 'string' && typeof c.scenario === 'string',
      )) {
      return { slot: 'close', ...slot } as unknown as ForecastSlotPayload
    }
  }
  // midday 回退
  if (raw.midday) {
    const slot = raw.midday as Record<string, unknown>
    if (typeof slot.summary === 'string' && Array.isArray(slot.conditions) &&
      (slot.conditions as Array<Record<string, unknown>>).every(
        (c) => typeof c.condition === 'string' && typeof c.scenario === 'string',
      )) {
      return { slot: 'midday', ...slot } as unknown as ForecastSlotPayload
    }
  }
  return null
}

/** 内部别名（兼容旧调用点） */
function parseForecast(raw: Record<string, unknown> | null | undefined): ForecastSlotPayload | null {
  return parseForecastSlot(raw)
}

/** ai_impact 是否含"利好"或"利空"（即非中性） */
function isNonNeutralImpact(impact: string | undefined): boolean {
  if (!impact) return false
  return impact.includes('利好') || impact.includes('利空')
}

/** 判断情报是否重大：ai_impact 含"重大"或 title 含"重大" */
function isMajorIntel(item: IntelEvent): boolean {
  return !!item.ai_impact?.includes('重大') || item.title.includes('重大')
}

// ---- 主函数 ----

/**
 * 按 symbol 分组合并异动与情报，生成聚合卡片列表。
 *
 * 规则：
 * - symbol 归一（剥 SH/SZ/BJ 前缀）
 * - 一 symbol 一卡，卡含 trace（最新异动）、forecast（异动 forecast slot）、intel（情报列表）
 * - 仅构建有数据（trace 或 forecast 或 intel）的卡
 * - 排序按 activityAt 倒序（activityAt = max(trace.activityAt, intel[].event_time)）
 */
export function buildInsightCards(input: {
  movements: TraceEventLike[]
  intelEvents: IntelEvent[]
}): InsightStockCard[] {
  const { movements, intelEvents } = input

  // 1. 归一 + 分组异动
  const movementBySymbol = new Map<string, TraceEventLike[]>()
  for (const m of movements) {
    const key = normalizeSymbol(m.symbol)
    const list = movementBySymbol.get(key) ?? []
    list.push(m)
    movementBySymbol.set(key, list)
  }

  // 2. 归一 + 分组情报
  const intelBySymbol = new Map<string, IntelEvent[]>()
  for (const ev of intelEvents) {
    const key = normalizeSymbol(ev.stock_code ?? ev.symbol)
    const list = intelBySymbol.get(key) ?? []
    list.push(ev)
    intelBySymbol.set(key, list)
  }

  // 3. 收集所有出现过的 symbol
  const allSymbols = new Set([...movementBySymbol.keys(), ...intelBySymbol.keys()])

  const cards: InsightStockCard[] = []

  for (const symbol of allSymbols) {
    const mList = movementBySymbol.get(symbol) ?? []
    const iList = intelBySymbol.get(symbol) ?? []

    // 3a. 处理异动（取 activityAt 最新一条）
    let trace: InsightStockCard['trace'] = null
    let hasForecast = false
    let forecast: ForecastSlotPayload | null = null

    if (mList.length > 0) {
      // 按 activityAt 倒序取最新（safeDateParse 避免 'Z' 与 '.000Z' 字典序问题）
      const sorted = [...mList].sort(
        (a, b) => safeDateParse(movementActivityAt(b)) - safeDateParse(movementActivityAt(a)),
      )
      const latest = sorted[0]
      trace = {
        eventId: latest.event_id,
        direction: latest.direction,
        changePct: latest.change_pct ?? null,
        primaryCause: latest.primary_cause ?? null,
        analysisStatus: latest.analysis_status,
        activityAt: movementActivityAt(latest),
        isLimitUp: latest.is_limit_up === true,
      }
      // 解析 forecast（取最新一条的 forecast）
      const parsed = parseForecast(latest.forecast)
      if (parsed) {
        forecast = parsed
        hasForecast = true
      }
    }

    // 3b. 处理情报：剔除中性 → 排序（重大优先 → event_time 倒序）
    const filteredIntel = iList
      .filter((ev) => ev.ai_impact === undefined || isNonNeutralImpact(ev.ai_impact))
      .sort((a, b) => {
        const aMajor = isMajorIntel(a)
        const bMajor = isMajorIntel(b)
        if (aMajor && !bMajor) return -1
        if (!aMajor && bMajor) return 1
        return safeDateParse(b.event_time) - safeDateParse(a.event_time)
      })

    // 3c. 情报 forecast 提升为卡级预判（仅当 trace 无 forecast 时）
    // 仅重大资讯股无 stock_trace 事件，forecast 落在情报事件自身字段上
    if (!hasForecast && filteredIntel.length > 0) {
      for (const evt of filteredIntel) {
        const parsed = parseForecastSlot(evt.forecast)
        if (parsed) {
          forecast = parsed
          hasForecast = true
          break
        }
      }
    }

    // 3c. 跳过无数据卡（无 trace、无 forecast、无 intel）
    if (!trace && !hasForecast && filteredIntel.length === 0) continue

    // 3d. 计算 stockName（优先取最新 trace 的 stock_name）
    let stockName = ''
    if (mList.length > 0) {
      // 按 activityAt 倒序取最新一条的 stock_name
      const sorted = [...mList].sort(
        (a, b) => safeDateParse(movementActivityAt(b)) - safeDateParse(movementActivityAt(a)),
      )
      stockName = sorted[0].stock_name ?? ''
    }
    if (!stockName && filteredIntel.length > 0) {
      stockName = filteredIntel[0].stock_name ?? ''
    }

    // 3e. 计算 activityAt（卡片整体活动时间 = max(trace, intel)，safeDateParse 避免空字符串 NaN）
    const traceAt = trace?.activityAt ?? ''
    const intelMaxAt = filteredIntel.length > 0
      ? filteredIntel.reduce((max, item) => (safeDateParse(item.event_time) > safeDateParse(max) ? item.event_time : max), filteredIntel[0].event_time)
      : ''
    const activityAt = safeDateParse(traceAt) > safeDateParse(intelMaxAt) ? traceAt : intelMaxAt

    cards.push({
      symbol,
      stockName,
      hasTrace: trace !== null,
      hasForecast,
      trace,
      forecast,
      intel: filteredIntel,
      activityAt,
    })
  }

  // 4. 整体按 activityAt 倒序（safeDateParse 避免空字符串 NaN）
  cards.sort((a, b) => safeDateParse(b.activityAt) - safeDateParse(a.activityAt))

  return cards
}

// ---- Tab 归属判断 ----

/**
 * 判断卡片是否属于指定 Tab。
 *
 * - 'all'：全部卡片
 * - 'forecast'：有预判区（hasForecast，与提升逻辑自洽）
 * - 'trace'：有溯源区（hasTrace）
 */
export function cardInTab(
  card: InsightStockCard,
  tab: 'all' | 'forecast' | 'trace',
): boolean {
  if (tab === 'all') return true
  if (tab === 'forecast') return card.hasForecast
  if (tab === 'trace') return card.hasTrace
  return true
}