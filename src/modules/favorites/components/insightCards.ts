/**
 * 自选股洞察——工具函数（纯函数，无 .vue/组件/运行环境依赖）
 *
 * 提供 isUnattributableMovement（无法归因判定）和 dedupeDailyMovements（同日同股聚合）。
 * 不依赖 .vue、不 import 组件、不走网络；纯 TS 逻辑，可被 vitest 单测锁定。
 */

// ---- 类型定义 ----

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
  /**
   * 归因置信度（low/medium/high）。低置信的归因不展示卡片（2026-09-30 口径）。
   * 字段缺失（老 app-api 未升级）或 null（无归因结果）时**不隐藏**，避免误杀全部卡片。
   */
  confidence_level?: 'low' | 'medium' | 'high' | null
  /** 涨停文章命中标记（强时效来源） */
  is_limit_up?: boolean
  /** 归因视图（含 status/confidence/primaryCandidate 等），缺省表示历史数据无此字段 */
  movement_view?: { status: string } | null
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
 * - 无 movement_view（列表接口不带 view）：主因短语为空、或为"证据不足/主因未明"等无结论表达 → true
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
  // 低置信归因不展示（2026-09-30）：判据用机器枚举值；字段缺失/null 时**不隐藏**
  // （app-api 未升级时列表不带该字段，若按"非 high 即隐藏"会把卡片全部误杀）
  if (m.confidence_level === 'low') return true
  if (m.analysis_status !== 'completed') return false
  if (m.movement_view) {
    const status = m.movement_view.status
    return status === 'insufficient' || status === 'not_applicable'
  }
  // 列表接口不带 movement_view：以主因短语是否给出有效结论为准
  return hasNoUsableCause(m.primary_cause)
}

/**
 * 上海交易日键（YYYY-MM-DD）。中国无夏令时，直接按 UTC+8 固定偏移取日期，
 * 避免依赖运行环境的本地时区。
 */
function shanghaiDayKey(iso: string): string {
  const ts = safeDateParse(iso)
  if (!ts) return ''
  const d = new Date(ts + 8 * 60 * 60 * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/** 归因失败判定（2026-10-06 新增枚举，前端新契约）：仅正向等值判断 */
function isFailedMovement(m: TraceEventLike): boolean {
  return m.analysis_status === 'failed'
}

/**
 * 同日同股聚合：同一交易日、同一只股票的多次异动只保留"最新一条"（不分涨跌方向）。
 *
 * 背景：同一交易日可能因多次打点/多触发源（涨停雷达文章、午盘 11:30、尾盘 15:05）
 * 或方向来回，产生同股同日多张异动卡片；展示层收敛为当日一张卡，展示最新异动归因。
 *
 * 组合用法（"最新 + 失败回退"）：调用方先 filter(isUnattributableMovement) 再调用本函数。
 * - `isUnattributableMovement` 负责剔除"无有效结论"的项（unavailable / 证据不足 / 低置信），
 *   但**刻意不隐藏 `failed`**——否则"当日全失败"时整组会消失，用户看不到「归因失败」。
 * - 本函数在组内选"最新"时**跳过 `analysis_status === 'failed'` 的项**：当日有有效归因时，
 *   回退显示该有效归因；**仅当整组皆 failed 时才保留其中最新那条**（让「归因失败」可见）。
 *   这保证失败只在其是"当日唯一/全部"时才被看到，不再遮住当日已有的有效归因。
 *   （monitor.vue / insight.vue / AlertContent.vue 三处消费者按同一契约接入。）
 *
 * 说明：
 * - 分组键 = symbol（剥 SH/SZ/BJ 前缀）+ 上海交易日（activityAt 转 UTC+8 取日期）
 * - 最新判定口径与组内活动时间一致：window_end_at ?? triggered_at 的时间更大者
 * - 优先级：非 failed > failed；同级内取活动时间新者。非法状态一律按非 failed 对待——
 *   用正向 `=== 'failed'` 判定，未来新增枚举值不会被误判为失败。
 * - 不修改输入；输出顺序沿用各分组"首次出现"顺序（接口已按时间倒序，输出近似倒序）
 */
export function dedupeDailyMovements<T extends TraceEventLike>(items: T[]): T[] {
  const latestByKey = new Map<string, T>()
  for (const item of items) {
    const at = movementActivityAt(item)
    const key = `${normalizeSymbol(item.symbol)}@${shanghaiDayKey(at)}`
    const prev = latestByKey.get(key)
    // 非 failed 优先于 failed；同为非 failed（或同为 failed）时取活动时间新者
    const prevFailed = prev ? isFailedMovement(prev) : false
    const itemFailed = isFailedMovement(item)
    const prevPreferred = !prevFailed ? 1 : 0
    const itemPreferred = !itemFailed ? 1 : 0
    const replace =
      !prev ||
      itemPreferred > prevPreferred ||
      (itemPreferred === prevPreferred && safeDateParse(at) > safeDateParse(movementActivityAt(prev)))
    if (replace) {
      // Map.set 对已存在 key 不改变插入顺序 → 保留该组首次出现的位置
      latestByKey.set(key, item)
    }
  }
  return [...latestByKey.values()]
}