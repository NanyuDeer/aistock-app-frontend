/**
 * 晚报卡片 ViewModel 组装工具
 *
 * 数据来源：
 * - brief（BriefV1）：归因结论 item.conclusion + brief.degraded（异象判定的文本 + 结构化兜底）
 * - review（MarketTraceReviewRecord）：market_trace.snapshot.a_share 中的指数/涨跌家数/板块涨跌
 *
 * 异象判定优先级（双重判定）：
 *   1. brief.degraded === true → 无异象（degraded_brief）
 *   2. review 非 null 且 status !== 'completed' → 无异象（review_unavailable）
 *   3. 归因结论文本含「证据不足/未确认主因」→ 无异象（no_anomaly_text）
 *   4. 归因结论文本含「主因是」→ 有异象（confirmed）
 *   5. 归因结论文本含「可能受」→ 有异象（hypothesis）
 *   6. 兜底 → 有异象（fallback_anomaly，保守展示）
 */
import type { BriefV1, MarketTraceReviewRecord } from '@/shared/api/modules/agent'
import { toMarketTracePresentation, type MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'

/** 异象判定结果 */
export interface EveningAnomaly {
  hasAnomaly: boolean
  reason:
    | 'confirmed'
    | 'hypothesis'
    | 'no_anomaly_text'
    | 'degraded_brief'
    | 'review_unavailable'
    | 'fallback_anomaly'
}

/** 涨跌家数视图模型（字段缺失时为 null） */
export interface MarketBreadth {
  advanceCount: number | null
  declineCount: number | null
  flatCount: number | null
}

/** 晚报卡片完整 ViewModel */
export interface EveningCardViewModel {
  /** 异象判定结果（决定结论卡片是否渲染） */
  anomaly: EveningAnomaly
  /** 归因结论文本（结论卡片内容；brief 缺失时为空字符串） */
  attributionConclusion: string
  /** review 报告 → presentation 转换结果（行情卡片数据源；review 不可用时为 null） */
  presentation: MarketTracePresentation | null
  /** 涨跌家数（大盘行情卡片数据；review 不可用或字段缺失时为 null） */
  breadth: MarketBreadth | null
}

const ATTRIBUTION_TITLE = '归因结论'
const NO_ANOMALY_KEYWORDS = ['证据不足', '未确认主因']
const CONFIRMED_KEYWORD = '主因是'
const HYPOTHESIS_KEYWORD = '可能受'

/** 从 brief.items 中提取归因结论 conclusion 文本 */
export function extractAttributionConclusion(brief: BriefV1 | null): string {
  if (!brief) return ''
  const item = brief.items.find((i) => i.title === ATTRIBUTION_TITLE)
  return item?.conclusion ?? ''
}

/**
 * 从 review 报告提取综合主因一句话结论（attribution_summary）。
 * 优先使用该字段作为晚报异象卡片的结论文本；旧报告缺失时返回空串，
 * 由调用方回退到 brief 归因结论。
 */
export function extractAttributionSummary(review: MarketTraceReviewRecord | null): string {
  const summary = review?.content?.market_trace?.trace?.attribution_summary
  return typeof summary === 'string' && summary.trim() ? summary.trim() : ''
}

/**
 * 异象判定（文本 + 结构化双重判定）
 *
 * 优先级见模块顶部注释。
 */
export function detectMarketAnomaly(
  brief: BriefV1 | null,
  review: MarketTraceReviewRecord | null,
): EveningAnomaly {
  // 1. brief 降级 → 无异象
  if (!brief || brief.degraded) {
    return { hasAnomaly: false, reason: 'degraded_brief' }
  }

  // 2. review 非 null 且未完成 → 无异象
  //    注：review 为 null 不触发此分支（数据缺失不等于数据未完成）
  if (review && review.status !== 'completed') {
    return { hasAnomaly: false, reason: 'review_unavailable' }
  }

  // 3-5. 文本判定
  const conclusion = extractAttributionConclusion(brief)
  if (NO_ANOMALY_KEYWORDS.some((kw) => conclusion.includes(kw))) {
    return { hasAnomaly: false, reason: 'no_anomaly_text' }
  }
  if (conclusion.includes(CONFIRMED_KEYWORD)) {
    return { hasAnomaly: true, reason: 'confirmed' }
  }
  if (conclusion.includes(HYPOTHESIS_KEYWORD)) {
    return { hasAnomaly: true, reason: 'hypothesis' }
  }

  // 6. 兜底：保守判定为有异象
  return { hasAnomaly: true, reason: 'fallback_anomaly' }
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

/**
 * 从 review 报告提取涨跌家数
 *
 * 字段路径：content.market_trace.snapshot.a_share.breadth
 * 字段名：advance_count / decline_count / flat_count
 */
export function extractBreadth(record: MarketTraceReviewRecord | null): MarketBreadth | null {
  if (!record) return null
  const breadth = record.content?.market_trace?.snapshot?.a_share?.breadth
  if (!breadth || typeof breadth !== 'object') return null

  const raw = breadth as Record<string, unknown>
  // 任一字段存在即返回（部分缺失时缺失字段为 null）
  const advanceCount = asFiniteNumber(raw.advance_count)
  const declineCount = asFiniteNumber(raw.decline_count)
  const flatCount = asFiniteNumber(raw.flat_count)
  if (advanceCount === null && declineCount === null && flatCount === null) {
    return null
  }
  return { advanceCount, declineCount, flatCount }
}

/**
 * 组装晚报卡片完整 ViewModel
 *
 * - brief 缺失 → anomaly=degraded_brief, conclusion='', presentation 仍可构建
 * - review 缺失 → presentation=null, breadth=null, anomaly 不受影响（除非 brief 也降级）
 */
export function buildEveningCardViewModel(
  brief: BriefV1 | null,
  review: MarketTraceReviewRecord | null,
  requestedDate: string,
): EveningCardViewModel {
  const anomaly = detectMarketAnomaly(brief, review)
  // 结论文本优先使用 review 的综合主因一句话结论（attribution_summary，
  // 供前端展示）；旧报告缺失该字段时回退到 brief 归因结论（主因链拼接）。
  const attributionConclusion = extractAttributionSummary(review) || extractAttributionConclusion(brief)
  const presentation = review && review.status === 'completed'
    ? toMarketTracePresentation(review, requestedDate)
    : null
  const breadth = extractBreadth(review)

  return {
    anomaly,
    attributionConclusion,
    presentation,
    breadth,
  }
}
