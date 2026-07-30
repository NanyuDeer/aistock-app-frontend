import request from '../request'

export interface StockTraceEvent {
  event_id: string
  trigger_revision: number
  symbol: string
  stock_name: string
  event_type: 'price'
  direction: 'up' | 'down'
  triggered_at: string
  latest_price: number
  previous_close: number
  change_pct: number
  threshold_pct: number
  severity: 'medium' | 'high' | 'critical'
  rule_version: string
  analysis_status: 'pending' | 'processing' | 'completed' | 'unavailable'
  read_at?: string | null
  movement_view?: MovementViewV2 | null
  unavailable?: TraceUnavailableView
}

export interface MovementCandidate {
  layer: 'company' | 'sector' | 'market'
  status: 'supported' | 'weak' | 'rejected' | 'insufficient'
  verdict: string
  supportingEvidenceIds: string[]
}

export interface MovementViewV2 {
  schemaVersion: 'movement-view-v2'
  eventId: string
  artifactId: string
  artifactVersion: number
  status: 'confirmed' | 'hypothesis' | 'insufficient' | 'not_applicable'
  confidenceScore?: number
  confidenceLevel?: 'high' | 'medium' | 'low'
  primaryCandidate?: MovementCandidate
  alternatives: MovementCandidate[]
  unresolvedQuestions: string[]
  suggestedActions: string[]
  evidenceCount: number
  generatedAt: string
}

export interface StockTraceArtifact {
  artifactId: string
  artifactVersion: number
  artifactJson: StockTraceArtifactContent
  movementView: MovementViewV2
  createdAt: string
}

export interface TraceEvidence {
  source_id: string
  kind: 'trigger_fact' | 'quote_fact' | 'sector_fact' | 'market_fact' | 'announcement' | 'news'
  provider: string
  source_level: 'A' | 'B' | 'C' | 'D'
  title: string
  content_excerpt: string
  canonical_url?: string
  occurred_at?: string
  captured_at?: string
  content_hash: string
}

export interface TraceChainNode {
  nodeId: string
  stage: 'structural_root' | 'trigger' | 'transmission' | 'exposure' | 'repricing' | 'observable_result'
  stageOrder: number
  epistemicType: 'fact' | 'inference' | 'hypothesis'
  status: 'established' | 'partial' | 'not_established'
  claim: string
  evidenceIds: string[]
  counterEvidenceIds: string[]
}

export interface TraceChain {
  chainId: string
  candidateId: string
  role: 'primary' | 'alternative'
  nodes: TraceChainNode[]
}

export interface StockTraceArtifactContent {
  attribution_status?: MovementViewV2['status']
  confidence?: { score?: number; level?: MovementViewV2['confidenceLevel'] }
  primary_chain_id?: string
  candidates?: Array<MovementCandidate & { candidateId: string; rank: number; counterEvidenceIds?: string[] }>
  chains?: TraceChain[]
  contradictions?: string[]
  unresolved_questions?: string[]
  missing_capabilities?: string[]
  suggested_actions?: string[]
  evidence_index?: TraceEvidence[]
}

export interface StockTraceAnalysisResponse {
  event_id: string
  trigger_revision: number
  processing_status: 'processing' | 'completed' | 'unavailable'
  artifact: StockTraceArtifact | null
  unavailable?: TraceUnavailableView
}

export interface TraceUnavailableView {
  code: 'reason_unavailable'
  message: '原因暂不可用'
  triggerFacts: Record<string, unknown>
}

export interface StockTraceEventPage {
  items: StockTraceEvent[]
  nextCursor: string | null
}

export const stockTraceApi = {
  list(limit = 20, cursor?: string) {
    return request.get<StockTraceEventPage>('/cn/favorites/movements', {
      params: { limit, ...(cursor ? { cursor } : {}) },
    })
  },
  get(eventId: string) {
    return request.get<StockTraceEvent>(`/cn/favorites/movements/${encodeURIComponent(eventId)}`)
  },
  getAnalysis(eventId: string) {
    return request.get<StockTraceAnalysisResponse>(`/cn/favorites/movements/${encodeURIComponent(eventId)}/analysis`)
  },
  markRead(eventId: string) {
    return request.post<{ event_id: string; read: true }>(`/cn/favorites/movements/${encodeURIComponent(eventId)}/read`)
  },
}
