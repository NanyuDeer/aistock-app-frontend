import type {
  MarketTraceAttributionStatus,
  MarketTraceCandidateCategory,
  MarketTraceCandidateStatus,
  MarketTraceCausalChain,
  MarketTraceCausalNode,
  MarketTraceCausalStage,
  MarketTraceCandidateExplanation,
  MarketTraceConfidence,
  MarketTracePhenomenonKind,
  MarketTracePrediction,
  MarketTraceReviewRecord,
  MarketTraceSeverity,
} from '@/shared/api/modules/agent'
import { labelEvidenceList } from './evidenceLabels'

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

/* ===== 新增：结构化展示 ViewModel（基于 schema 2.0 字段提取，不调 LLM） ===== */

export interface MarketTraceIndexPerf {
  name: string
  /** 指数收盘点位（后端 indexes 对象的 close 字段，可能缺失） */
  close: number | null
  pctChange: number | null
}

export interface MarketTraceSectorItemView {
  name: string
  pctChange: number | null
}

export interface MarketTracePrimaryCauseView {
  categoryId: string
  categoryLabel: string
  conclusion: string
  trigger: string
  transmission: string
  result: string
  supportingEvidence: string[]
}

export interface MarketTraceAlternativeView {
  categoryId: string
  categoryLabel: string
  conclusion: string
  transmission: string
  supportingEvidence: string[]
  counterEvidence: string[]
}

export interface MarketTraceRejectedView {
  categoryId: string
  categoryLabel: string
  status: 'rejected' | 'insufficient' | 'weak'
  conclusion: string
  reason: string
}

export interface PredictionValidationPresentation {
  status: 'hit' | 'partial' | 'miss' | 'no_forecast'
  sectorHits: Array<{
    sector: string
    morningDirection: string
    actualDirection: string
    result: 'hit' | 'miss'
    deviationNote: string
  }>
  eventHits: Array<{
    eventTitle: string
    morningDirection: string
    actualImpact: string
    result: 'hit' | 'miss' | 'unverifiable'
    note: string
  }>
  overallNote: string
}

export interface PredictionHorizonPresentation {
  horizon: 'short' | 'mid' | 'long'
  remainingEstimate: string
  phase: 'building' | 'peaking' | 'decaying' | 'returning'
  direction: 'bullish' | 'bearish' | 'neutral'
  target: string
  metricProjection: string
  confidence: 'high' | 'medium' | 'low'
}

export interface PredictionRiskPresentation {
  factor: string
  invalidation: string
}

export interface PredictionStepPresentation {
  label: string
  text: string
}

export interface PredictionPresentation {
  status: 'confirmed' | 'hypothesis' | 'insufficient'
  horizons: PredictionHorizonPresentation[]
  /** 结构化演化步骤（后端 B2 输出）；旧记录为空数组，组件回退 narrative 拆分 */
  evolutionSteps: PredictionStepPresentation[]
  evolutionNarrative: string
  risks: PredictionRiskPresentation[]
  attributionSummary: string | null
}

export interface MarketTracePresentation {
  reportTitle: string
  reportDate: string
  generatedAt: string
  snapshotId: string
  attributionStatus: MarketTraceAttributionStatus
  confidence: MarketTraceConfidence | null
  isFallback: boolean

  pendingRisks: {
    openQuestions: string[]
    missingEvidence: string[]
  }

  phenomenon: {
    kind: string
    kindLabel: string
    summary: string
    severity: MarketTraceSeverity | null
    severityLabel: string
    factIds: string[]
    indexPerformance: MarketTraceIndexPerf[]
    topGainers: MarketTraceSectorItemView[]
    topLosers: MarketTraceSectorItemView[]
  }

  primaryCause: MarketTracePrimaryCauseView | null
  alternatives: MarketTraceAlternativeView[]
  rejected: MarketTraceRejectedView[]

  sectorRanking: {
    topGainers: MarketTraceSectorItemView[]
    topLosers: MarketTraceSectorItemView[]
  }

  predictionValidation: PredictionValidationPresentation | null

  prediction: PredictionPresentation | null

  markdownDetails: string
}

const CATEGORY_LABELS: Record<MarketTraceCandidateCategory, string> = {
  global_risk_liquidity: '全球风险与流动性',
  domestic_macro_policy: '国内宏观政策',
  industry_technology_supply: '产业技术与供应',
  market_positioning_liquidity: '市场定位与流动性',
}

const PHENOMENON_KIND_LABELS: Record<MarketTracePhenomenonKind, string> = {
  broad_rally: '普涨',
  broad_decline: '普跌',
  style_divergence: '风格分化',
  sector_concentration: '板块集中异动',
  sentiment_extreme: '情绪极端',
}

const SEVERITY_LABELS: Record<MarketTraceSeverity, string> = {
  low: '低',
  medium: '中',
  high: '高',
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function findNodeByStage(chain: MarketTraceCausalChain | null | undefined, stage: MarketTraceCausalStage): MarketTraceCausalNode | null {
  if (!chain?.nodes) return null
  return chain.nodes.find(n => n.stage === stage) ?? null
}

const HORIZON_KEYS: ReadonlySet<string> = new Set(['short', 'mid', 'long'])
const PHASE_KEYS: ReadonlySet<string> = new Set(['building', 'peaking', 'decaying', 'returning'])
const DIRECTION_KEYS: ReadonlySet<string> = new Set(['bullish', 'bearish', 'neutral'])
const CONFIDENCE_KEYS: ReadonlySet<string> = new Set(['high', 'medium', 'low'])
const PREDICTION_STATUS_KEYS: ReadonlySet<string> = new Set(['confirmed', 'hypothesis', 'insufficient'])

function toPredictionPresentation(raw: MarketTracePrediction | null | undefined): PredictionPresentation | null {
  if (!raw || typeof raw !== 'object' || !PREDICTION_STATUS_KEYS.has(raw.prediction_status)) return null
  const horizons = Array.isArray(raw.horizons)
    ? raw.horizons
        .filter(h => Boolean(h)
          && typeof h === 'object'
          && HORIZON_KEYS.has(h.horizon)
          && PHASE_KEYS.has(h.phase)
          && DIRECTION_KEYS.has(h.direction)
          && CONFIDENCE_KEYS.has(h.confidence))
        .map(h => ({
          horizon: h.horizon,
          remainingEstimate: asString(h.remaining_estimate),
          phase: h.phase,
          direction: h.direction,
          target: asString(h.target),
          metricProjection: asString(h.metric_projection),
          confidence: h.confidence,
        }))
    : []
  if (horizons.length === 0) return null
  const risks = Array.isArray(raw.risks)
    ? raw.risks
        .filter(r => Boolean(r) && typeof r === 'object' && typeof r.factor === 'string' && typeof r.invalidation === 'string')
        .map(r => ({ factor: asString(r.factor), invalidation: asString(r.invalidation) }))
    : []
  const evolutionSteps = Array.isArray(raw.evolution_steps)
    ? raw.evolution_steps
        .filter(s => Boolean(s) && typeof s === 'object' && typeof s.label === 'string' && typeof s.text === 'string')
        .map(s => ({ label: asString(s.label), text: asString(s.text) }))
    : []
  return {
    status: raw.prediction_status,
    horizons,
    evolutionSteps,
    evolutionNarrative: asString(raw.evolution_narrative),
    risks,
    attributionSummary: raw.attribution_summary ? asString(raw.attribution_summary) : null,
  }
}

function sectorItemsFromUnknown(value: unknown): MarketTraceSectorItemView[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 5).map((item) => {
    const obj = (item ?? {}) as Record<string, unknown>
    return {
      name: asString(obj.name),
      pctChange: asNumber(obj.pct_change),
    }
  }).filter(item => item.name.length > 0)
}

function indexPerfFromUnknown(value: unknown): MarketTraceIndexPerf[] {
  // 后端 indexes 可能是数组（旧 fixture）或对象（map，实际生产数据 {SH000001: {...}}）
  const entries: unknown[] = Array.isArray(value)
    ? value
    : (value && typeof value === 'object' ? Object.values(value as Record<string, unknown>) : [])
  return entries.map((item) => {
    const obj = (item ?? {}) as Record<string, unknown>
    return {
      name: asString(obj.name),
      close: asNumber(obj.close),
      // 兼容两种字段名：生产数据用 change_pct，旧 fixture 用 pct_change
      pctChange: asNumber(obj.change_pct ?? obj.pct_change),
    }
  }).filter(item => item.name.length > 0)
}

function buildRejectedReason(candidate: MarketTraceCandidateExplanation): string {
  const counterLabels = labelEvidenceList(asStringList(candidate.counter_evidence_ids))
  if (candidate.status === 'rejected') {
    if (counterLabels.length > 0) return `存在反证：${counterLabels.join('、')}`
    return '与市场观测相悖，已排除'
  }
  if (candidate.status === 'insufficient') {
    if (counterLabels.length > 0) return `证据不足，缺失：${counterLabels.join('、')}`
    return '证据不足，无法确认'
  }
  // weak 但未被 alternative_chain_id 指向
  if (counterLabels.length > 0) return `证据较弱，反证：${counterLabels.join('、')}`
  return '证据较弱，未作为主因'
}

export function toMarketTracePresentation(
  record: MarketTraceReviewRecord,
  requestedDate: string,
): MarketTracePresentation | null {
  if (record.status !== 'completed') return null
  if (record.content.schema_version !== '2.0') return null

  const marketTrace = record.content.market_trace
  const snapshot = marketTrace?.snapshot
  const trace = marketTrace?.trace
  if (!snapshot || !trace) return null

  const display = record.content.display_report
  const summary = asString(display?.summary)
  const details = asString(display?.details)
  if (!summary || !details) return null

  const tradeDate = asString(snapshot.trade_date) || record.report_date
  const candidates = Array.isArray(trace.candidates) ? trace.candidates : []

  // 按 primary_chain_id / alternative_chain_id 指针分类
  const primaryId = trace.primary_chain_id ?? null
  const alternativeId = trace.alternative_chain_id ?? null

  let primaryCandidate: MarketTraceCandidateExplanation | null = null
  const alternatives: MarketTraceAlternativeView[] = []
  const rejected: MarketTraceRejectedView[] = []

  for (const candidate of candidates) {
    if (candidate.id === primaryId) {
      primaryCandidate = candidate
      continue
    }
    if (candidate.id === alternativeId) {
      alternatives.push({
        categoryId: candidate.id,
        categoryLabel: CATEGORY_LABELS[candidate.category] ?? candidate.category,
        conclusion: asString(candidate.verdict),
        transmission: asString(findNodeByStage(candidate.chain, 'transmission')?.claim),
        supportingEvidence: asStringList(candidate.supporting_evidence_ids),
        counterEvidence: asStringList(candidate.counter_evidence_ids),
      })
      continue
    }
    // 证据不足态：primaryId=null 时，所有 weak 归入 alternatives
    if (primaryId === null && candidate.status === 'weak') {
      alternatives.push({
        categoryId: candidate.id,
        categoryLabel: CATEGORY_LABELS[candidate.category] ?? candidate.category,
        conclusion: asString(candidate.verdict),
        transmission: asString(findNodeByStage(candidate.chain, 'transmission')?.claim),
        supportingEvidence: asStringList(candidate.supporting_evidence_ids),
        counterEvidence: asStringList(candidate.counter_evidence_ids),
      })
      continue
    }
    // 其余归入 rejected（含 rejected/insufficient/未被 alternative 指向的 weak）
    rejected.push({
      categoryId: candidate.id,
      categoryLabel: CATEGORY_LABELS[candidate.category] ?? candidate.category,
      status: candidate.status === 'weak' ? 'weak' : candidate.status === 'insufficient' ? 'insufficient' : 'rejected',
      conclusion: asString(candidate.verdict),
      reason: buildRejectedReason(candidate),
    })
  }

  // 主因
  let primaryCause: MarketTracePrimaryCauseView | null = null
  if (primaryCandidate) {
    const repricing = findNodeByStage(primaryCandidate.chain, 'repricing')?.claim ?? ''
    const observable = findNodeByStage(primaryCandidate.chain, 'observable_result')?.claim ?? ''
    primaryCause = {
      categoryId: primaryCandidate.id,
      categoryLabel: CATEGORY_LABELS[primaryCandidate.category] ?? primaryCandidate.category,
      conclusion: asString(primaryCandidate.verdict),
      trigger: asString(findNodeByStage(primaryCandidate.chain, 'trigger')?.claim),
      transmission: asString(findNodeByStage(primaryCandidate.chain, 'transmission')?.claim),
      result: [repricing, observable].filter(Boolean).join(' '),
      supportingEvidence: asStringList(primaryCandidate.supporting_evidence_ids),
    }
  }

  // 现象
  const primary = snapshot.phenomenon_discovery?.primary
  const kind = primary?.kind ?? 'sector_concentration'
  const severity = primary?.severity ?? null
  const sectorsData = snapshot.a_share?.sectors

  const phenomenon = {
    kind,
    kindLabel: PHENOMENON_KIND_LABELS[kind] ?? kind,
    summary: asString(primary?.summary) || summary,
    severity,
    severityLabel: severity ? SEVERITY_LABELS[severity] : '--',
    factIds: asStringList(primary?.fact_ids),
    indexPerformance: indexPerfFromUnknown(snapshot.a_share?.indexes),
    topGainers: sectorItemsFromUnknown(sectorsData?.top_gainers),
    topLosers: sectorItemsFromUnknown(sectorsData?.top_losers),
  }

  // 预判对照（prediction_validation）
  const pv = trace.prediction_validation
  const predictionValidation: PredictionValidationPresentation | null = pv
    ? {
        status: pv.status,
        sectorHits: (pv.sector_hits || []).map(h => ({
          sector: h.sector,
          morningDirection: h.morning_direction,
          actualDirection: h.actual_direction,
          result: h.result,
          deviationNote: h.deviation_note || '',
        })),
        eventHits: (pv.event_hits || []).map(h => ({
          eventTitle: h.event_title,
          morningDirection: h.morning_direction,
          actualImpact: h.actual_impact,
          result: h.result,
          note: h.note || '',
        })),
        overallNote: pv.overall_note || '',
      }
    : null

  // 影响持续性预判（prediction，B2 预测能力）
  const prediction = toPredictionPresentation(trace.prediction)

  return {
    reportTitle: `${tradeDate} A股收盘溯源`,
    reportDate: tradeDate,
    generatedAt: record.created_at || asString(snapshot.captured_at) || '',
    snapshotId: asString(record.content.snapshot_id) || asString(snapshot.snapshot_id),
    attributionStatus: trace.attribution_status ?? 'not_applicable',
    confidence: trace.confidence ?? null,
    isFallback: record.report_date !== requestedDate,
    pendingRisks: {
      openQuestions: asStringList(trace.unresolved_questions),
      missingEvidence: asStringList(snapshot.missing_fields),
    },
    phenomenon,
    primaryCause,
    alternatives,
    rejected,
    sectorRanking: {
      topGainers: phenomenon.topGainers,
      topLosers: phenomenon.topLosers,
    },
    predictionValidation,
    prediction,
    markdownDetails: details,
  }
}
