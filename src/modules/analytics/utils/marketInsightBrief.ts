import type { MarketTracePresentation } from './marketTraceReview'

export interface MarketInsightBrief {
  type: 'market'
  time: string
  title: string
  trace: string
  forecast: string
  confidence: string
}

const CONFIDENCE_LABELS: Record<string, string> = { high: '高', medium: '中', low: '低' }

/** 按字符截断（非字节），超长加省略号 */
function clip(text: string, max: number): string {
  const t = (text || '').trim()
  if (!t) return ''
  return t.length > max ? t.slice(0, max) + '…' : t
}

/**
 * 从 MarketTracePresentation 提炼简短洞见三段文案（现象/溯源/预判）。
 * 纯前端提炼，不调 LLM、不改后端。任何字段缺失走兜底文案，不抛异常。
 */
export function toMarketInsightBrief(
  p: MarketTracePresentation | null | undefined,
): MarketInsightBrief | null {
  if (!p) return null
  const title = clip(p.phenomenon.summary || p.phenomenon.kindLabel || '当日市场行情综述', 30)
  const trace = p.primaryCause
    ? clip(`${p.primaryCause.categoryLabel}：${p.primaryCause.conclusion}`, 40)
    : '证据不足，主因待验证'
  const forecast = p.prediction
    ? clip(p.prediction.attributionSummary || '见展开详情', 40)
    : '暂无预判'
  const confidence = p.confidence ? (CONFIDENCE_LABELS[p.confidence] ?? '') : ''
  const time = (p.reportDate || '').slice(5).replace('-', '.') // YYYY-MM-DD → MM.DD
  return { type: 'market', time, title, trace, forecast, confidence }
}