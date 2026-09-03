import { labelEvidenceList } from './evidenceLabels'
import type { MarketTracePresentation, PredictionPresentation } from './marketTraceReview'

export interface MarketInsightBrief {
  type: 'market'
  time: string
  title: string
  trace: string
  forecast: string
  confidence: string
}

const CONFIDENCE_LABELS: Record<string, string> = { high: '高', medium: '中', low: '低' }

/**
 * 从 MarketTracePresentation 提炼简短洞见三段文案（现象/溯源/预判）。
 * 纯前端提炼，不调 LLM、不改后端。任何字段缺失走兜底文案，不抛异常。
 *
 * 简短卡展示**完整文案**、不做字符截断：现象/溯源/预判是面向所有用户的基础内容，
 * 必须看全；「展开详情」才是后续付费升级的增值入口（见 MarketInsightCard.canViewFullReport）。
 */
export function toMarketInsightBrief(
  p: MarketTracePresentation | null | undefined,
): MarketInsightBrief | null {
  if (!p) return null
  const title = (p.phenomenon.summary || p.phenomenon.kindLabel || '当日市场行情综述').trim()
  const trace = p.primaryCause
    ? `${p.primaryCause.categoryLabel}：${p.primaryCause.conclusion}`.trim()
    : '证据不足，主因待验证'
  const forecast = p.prediction
    ? (p.prediction.attributionSummary?.trim() || '见展开详情')
    : '暂无预判'
  const confidence = p.confidence ? (CONFIDENCE_LABELS[p.confidence] ?? '') : ''
  const time = (p.reportDate || '').slice(5).replace('-', '.') // YYYY-MM-DD → MM.DD
  return { type: 'market', time, title, trace, forecast, confidence }
}

export interface MarketInsightDetail {
  phenomenon: {
    summary: string
    severityLabel: string
    indexPerformance: Array<{ name: string; pctChange: number | null }>
    topGainers: Array<{ name: string; pctChange: number | null }>
    topLosers: Array<{ name: string; pctChange: number | null }>
  }
  trace: {
    categoryLabel: string
    conclusion: string
    trigger: string
    transmission: string
    result: string
    evidenceLabels: string[]
  } | null
  forecast: PredictionPresentation | null
}

/** 构建市场洞见展开详情（现象/溯源/预判三块，强相关对应 title/trace/forecast）。 */
export function toMarketInsightDetail(
  p: MarketTracePresentation | null | undefined,
): MarketInsightDetail | null {
  if (!p) return null
  const pc = p.primaryCause
  return {
    phenomenon: {
      summary: p.phenomenon.summary,
      severityLabel: p.phenomenon.severityLabel,
      indexPerformance: p.phenomenon.indexPerformance,
      topGainers: p.phenomenon.topGainers,
      topLosers: p.phenomenon.topLosers,
    },
    trace: pc
      ? {
          categoryLabel: pc.categoryLabel,
          conclusion: pc.conclusion,
          trigger: pc.trigger,
          transmission: pc.transmission,
          result: pc.result,
          evidenceLabels: labelEvidenceList(pc.supportingEvidence),
        }
      : null,
    forecast: p.prediction,
  }
}