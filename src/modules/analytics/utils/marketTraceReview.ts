import type {
  MarketTraceConfidence,
  MarketTraceReviewRecord,
} from '@/shared/api/modules/agent'

export type { MarketTraceReviewRecord }

export interface MarketTraceViewModel {
  reportDate: string
  generatedAt: string
  sourceLabel: string
  confidence: MarketTraceConfidence | null
  summary: string
  details: string
  sectors: string[]
  risks: string[]
  isFallback: boolean
}

const SOURCE_LABELS: Record<string, string> = {
  review_agent: '复盘 Agent',
  review_agent_quick: '快速复盘',
  review_agent_full: '完整复盘',
}

function trimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function marketTraceConfidence(value: unknown): MarketTraceConfidence | null {
  return value === 'high' || value === 'medium' || value === 'low' ? value : null
}

export function toMarketTraceViewModel(
  record: MarketTraceReviewRecord,
  requestedDate: string,
): MarketTraceViewModel | null {
  const display = record.content.display_report
  const summary = trimmedString(display?.summary)
  const details = trimmedString(display?.details)

  if (!display || record.status !== 'completed' || record.content.schema_version !== '2.0' || !summary || !details) {
    return null
  }

  return {
    reportDate: record.report_date,
    generatedAt: record.created_at || record.content.market_trace?.snapshot?.captured_at || '',
    sourceLabel: SOURCE_LABELS[record.data_source || ''] || '复盘报告',
    confidence: marketTraceConfidence(record.content.market_trace?.trace?.confidence),
    summary,
    details,
    sectors: stringList(display.sectors),
    risks: stringList(display.risks),
    isFallback: record.report_date !== requestedDate,
  }
}
