/**
 * 历史预测跟踪 API（B2.1）：读取 prediction_records 公开查询接口。
 * 大盘溯源预测随报告一天一换，此处提供历史预测 + 验证进度列表/详情。
 */
import request from '../request'

export type PredictionRecordStatus = 'pending' | 'verified' | 'skipped'
export type PredictionVerificationResult = 'hit' | 'miss' | 'insufficient'
export type PredictionHorizonKey = 'short' | 'mid' | 'long'

export interface PredictionHorizonRecord {
  horizon: PredictionHorizonKey
  remaining_estimate: string
  phase: 'building' | 'peaking' | 'decaying' | 'returning'
  direction: 'bullish' | 'bearish' | 'neutral'
  target: string
  metric_projection: string
  confidence: 'high' | 'medium' | 'low'
}

export interface PredictionVerificationEntry {
  horizon: string
  result: PredictionVerificationResult
  actual: string
  reason: string
  verified_at: string
  /** early_exit 标记：type === 'early_exit' 的 entry 无 result，不参与 verified 判定（A1） */
  type?: string
  early_exit?: Record<string, unknown>
  /** Spec A §4.2：condition 验证 entry 附加字段（condition_index/condition_met/threshold/target_type） */
  condition_index?: number
  condition_met?: boolean | null
  threshold?: string
  target_type?: string
  [key: string]: unknown
}

/** 条件锚点（Spec A：direction 自挂，不依赖 horizons[].direction） */
export interface PredictionConditionAnchor {
  horizon: PredictionHorizonKey
  threshold?: string
  metric?: string
  direction?: 'bullish' | 'bearish' | 'neutral'
}

/** 条件化预判单条（2.0 旧记录缺失） */
export interface PredictionCondition {
  condition: string
  scenario: string
  anchor?: PredictionConditionAnchor
  /** 简洁展示用关键词（2026-09-02 起新数据携带：1~2 个，单条 ≤10 字）；旧记录无 */
  keywords?: string[]
}

/** 预测记录（对齐后端 PredictionRecord + 补 report_date） */
export interface PredictionRecord {
  id: number
  source_type: string
  source_id: string
  report_date: string
  schema_version: string
  status: PredictionRecordStatus
  created_at: string
  prediction: {
    schema_version?: string
    prediction_status: 'confirmed' | 'hypothesis' | 'insufficient'
    attribution_summary?: string | null
    horizons?: PredictionHorizonRecord[]
    conditions?: PredictionCondition[]
    evolution_narrative?: string
    evolution_steps?: Array<{ label: string; text: string }>
    risks?: Array<{ factor: string; invalidation: string }>
    evidence_ids?: unknown
    /** 越年近似档位名列表（P2 裁决；缺省/空 = 全精确档） */
    due_dates_approximate?: string[]
  }
  due_dates: Partial<Record<PredictionHorizonKey, string>>
  verification: Partial<Record<string, PredictionVerificationEntry>>
}

/** 迭代看板子桶（§8-3 方向/档位下钻；字段与后端 publicRouter 对应） */
export interface PredictionSubBucket {
  n: number
  hits: number
  hitRate: number | null
  sufficientSample: boolean
  flat_rate: number | null
  flat_count: number
  directional_count: number
}

/** 方向桶：bullish / bearish / neutral 各一桶（各带 flat_rate） */
export interface PredictionDirectionBuckets {
  bullish: PredictionSubBucket
  bearish: PredictionSubBucket
  neutral: PredictionSubBucket
}

/** 档位桶：short / mid / long；long 单列并标注不参与迭代判读 */
export interface PredictionHorizonBuckets {
  short: PredictionSubBucket
  mid: PredictionSubBucket
  long: PredictionSubBucket & { iteration_board: boolean }
}

export interface PredictionStats {
  total: number
  pendingCount: number
  verifiedCount: number
  skippedCount: number
  hitRate: number | null
  verifiedHorizonCount: number
  hitCount: number
  missCount: number
  /** Task 5 迭代看板指标（后端新增；旧响应可能缺失，故全部可选） */
  long_excluded?: boolean
  settled_ratio?: number | null
  flat_rate?: number | null
  flat_count?: number
  directional_count?: number
  /** long 档命中率单列（仅展示，不进迭代判读；无样本时 hitRate=null） */
  long?: { n: number; hits: number; hitRate: number | null }
  /** §8-3 方向桶 × 档位桶（后端新增；旧响应可能缺失，故可选；展示留待后续 UI 任务） */
  directionBuckets?: PredictionDirectionBuckets
  horizonBuckets?: PredictionHorizonBuckets
}

export interface PredictionListResponse {
  items: PredictionRecord[]
  stats: PredictionStats
  pagination: { page: number; pageSize: number; total: number }
}

export const predictionApi = {
  /** 历史预测列表（含命中率统计）；status=all|pending|verified，默认 all；source_id 可定向溯源报告（如 review:2026-07-23） */
  list(params: {
    status?: 'all' | 'pending' | 'verified'
    source_id?: string
    /** 记录类型过滤：大盘溯源预测（market_trace）/ 板块预判（sector_prediction）；大盘历史页传 market_trace */
    source_type?: 'market_trace' | 'sector_prediction'
    page?: number
    pageSize?: number
  } = {}) {
    return request.get<PredictionListResponse>('/predictions', { params })
  },
  /** 预测详情 */
  detail(id: number) {
    return request.get<PredictionRecord>(`/predictions/${id}`)
  },
}
