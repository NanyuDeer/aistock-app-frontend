/**
 * AI 智能体相关 API（App 专属功能）
 */
import request from '../request'
import { WS_BASE_URL, AGENT_WS_BASE_URL } from '@/shared/utils/constants'

export interface ProgressStep {
  label: string
  status: 'pending' | 'done'
  timestamp: number
}

/** 深度分析引用（对齐 Python DeepReportRef，P2 task-4 冻结结构；前端只读消费） */
export interface DeepReportRef {
  worker?: 'stock' | 'sector' | 'hot_burst'
  report_id?: string | null
  question?: string
  summary?: string
  symbols?: string[]
  tag_codes?: string[]
  created_at?: string
}

/** 执行细节：单个工具调用（D21 二级节点） */
export interface ExecToolStep {
  tool: string          // 工具名（tool_start.tool）
  label?: string        // tool_start 下发的显示名
  startAt: number       // 前端时间戳（ms）
  endAt?: number        // tool_end 配对时间（ms）
  status: 'done' | 'failed'
}

/** 执行细节：一级节点（D21 层级树） */
export interface ExecStepNode {
  node: string          // intermediate 的 node 名（分组 key）
  label: string         // intermediate 下发的 label（后端生成，前端零硬编码）
  startAt: number
  endAt?: number        // 下一节点或 DONE 时间
  tools: ExecToolStep[] // 二级缩进：工具调用序列
  thinkingMs?: number   // llm_start → 首个 text
}

/** AI 思考链单步（流式聚合） */
export interface ReasoningStep {
  node: string           // 节点名（qa_router / skill_executor / ...）
  text: string           // 累积的思考文本
  status: 'streaming' | 'done' | 'failed'
  startAt: number
  endAt?: number
}

/** P11：DONE 事件下发的本轮 token 用量（计划 B 线 2 新增可选字段；HTTP 降级缺失） */
export interface TokenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

/** P11：结构化卡片负载（计划 C 产出 data，卡片组件按 card_type 消费） */
export interface ChatCard {
  card_type: 'market_snapshot' | 'stock_snapshot' | 'capital_flow' | 'deep' | 'comparison'
  title: string
  data: Record<string, unknown>
}

/** 用户累计 token 用量（GET /api/chat/usage/summary，JWT → openid；无记录全 0） */
export interface TokenUsageSummary {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  turn_count: number
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  progressSteps?: ProgressStep[]
  lastDeepReport?: DeepReportRef
  execSteps?: ExecStepNode[]
  reasoningSteps?: ReasoningStep[]   // NEW: AI 思考链
  cards?: ChatCard[]                 // P11: DONE 下发的结构化卡片（HTTP 降级/旧协议缺失）
  tokenUsage?: TokenUsage            // P11: DONE 下发的本轮 token 用量（会话本地累加用）
  timestamp: number
  /** Phase 4-2 Task 3：本地赞/踩反馈（v1 纯前端本地、按 message_id 持久化，不落库；同消息可改选/取消） */
  feedback?: 'up' | 'down'
}

/** 会话维度 token 用量聚合项（P10 线 4/线 6；对应 GET /api/chat/usage/sessions 的 data.items 结构） */
export interface SessionUsageItem {
  session_id: string
  title?: string
  total_tokens: number
  turn_count: number
  last_used_at?: string
}

/** 会话元数据（P9 会话管理；对应后端 /api/chat/sessions 的 data 结构） */
export interface ChatSessionMeta {
  session_id: string
  title: string
  last_message_at?: string
  created_at?: string
}

export interface MarketTraceReviewDisplayReport {
  summary?: unknown
  details?: unknown
  sectors?: unknown
  risks?: unknown
}

/* ===== 大盘溯源 schema 2.0 完整类型树（前端只读消费，字段对齐后端 pydantic models） ===== */

export type MarketTraceConfidence = 'high' | 'medium' | 'low'
export type MarketTraceAttributionStatus = 'confirmed' | 'hypothesis' | 'insufficient' | 'not_applicable'
export type MarketTraceCandidateStatus = 'supported' | 'weak' | 'rejected' | 'insufficient'
export type MarketTraceCandidateCategory =
  | 'global_risk_liquidity'
  | 'domestic_macro_policy'
  | 'industry_technology_supply'
  | 'market_positioning_liquidity'
export type MarketTraceCausalStage =
  | 'structural_root'
  | 'trigger'
  | 'transmission'
  | 'exposure'
  | 'repricing'
  | 'observable_result'
export type MarketTracePhenomenonKind =
  | 'broad_rally'
  | 'broad_decline'
  | 'style_divergence'
  | 'sector_concentration'
  | 'sentiment_extreme'
export type MarketTraceSeverity = 'low' | 'medium' | 'high'

export interface MarketTraceCausalNode {
  stage: MarketTraceCausalStage
  claim: string
  evidence_ids?: unknown
}

export interface MarketTraceCausalChain {
  nodes: MarketTraceCausalNode[]
}

export interface MarketTraceCandidateExplanation {
  id: string
  category: MarketTraceCandidateCategory
  status: MarketTraceCandidateStatus
  verdict: string
  chain?: MarketTraceCausalChain | null
  supporting_evidence_ids?: unknown
  counter_evidence_ids?: unknown
}

export interface MarketTraceSectorHit {
  sector: string
  morning_direction: string
  actual_direction: string
  result: 'hit' | 'miss'
  deviation_note?: string
}

export interface MarketTraceEventHit {
  event_title: string
  morning_direction: string
  actual_impact: string
  result: 'hit' | 'miss' | 'unverifiable'
  note?: string
}

export interface MarketTracePredictionValidation {
  status: 'hit' | 'partial' | 'miss' | 'no_forecast'
  sector_hits?: MarketTraceSectorHit[]
  event_hits?: MarketTraceEventHit[]
  overall_note?: string
}

export interface MarketTracePredictionHorizon {
  horizon: 'short' | 'mid' | 'long'
  remaining_estimate: string
  phase: 'building' | 'peaking' | 'decaying' | 'returning'
  direction: 'bullish' | 'bearish' | 'neutral'
  target: string
  metric_projection: string
  confidence: 'high' | 'medium' | 'low'
}

export interface MarketTracePredictionRisk {
  factor: string
  invalidation: string
}

/** 演化路径单步（B2 结构化；label=档位标签 短/中/长，text=该档演化描述） */
export interface MarketTracePredictionStep {
  label: string
  text: string
}

export interface MarketTracePrediction {
  schema_version?: string
  prediction_status: 'confirmed' | 'hypothesis' | 'insufficient'
  horizons?: MarketTracePredictionHorizon[]
  evolution_narrative?: string
  /** 结构化演化步骤（前端时间轴渲染）；旧记录可能缺失 */
  evolution_steps?: MarketTracePredictionStep[]
  risks?: MarketTracePredictionRisk[]
  evidence_ids?: unknown
  attribution_summary?: string | null
}

export interface MarketTraceTrace {
  schema_version?: string
  attribution_status?: MarketTraceAttributionStatus
  candidates?: MarketTraceCandidateExplanation[]
  primary_chain_id?: string | null
  alternative_chain_id?: string | null
  confidence?: MarketTraceConfidence
  unresolved_questions?: unknown
  /** 综合主因的一句话结论（30-40 字），供晚报页异象卡片直接展示；旧报告可能缺失 */
  attribution_summary?: string | null
  prediction_validation?: MarketTracePredictionValidation | null
  /** 影响持续性预判（B2 预测能力）；旧报告可能缺失 */
  prediction?: MarketTracePrediction | null
}

export interface MarketTraceDetectedPhenomenon {
  kind?: MarketTracePhenomenonKind
  summary?: string
  severity?: MarketTraceSeverity
  fact_ids?: unknown
  tags?: unknown
}

export interface MarketTracePhenomenonDiscovery {
  status?: 'detected' | 'no_phenomenon' | 'insufficient_data'
  primary?: MarketTraceDetectedPhenomenon | null
}

export interface MarketTraceSectorItem {
  name?: unknown
  pct_change?: unknown
  net_amount?: unknown
}

export interface MarketTraceAShareSectors {
  top_gainers?: MarketTraceSectorItem[]
  top_losers?: MarketTraceSectorItem[]
  top_inflows?: MarketTraceSectorItem[]
  top_outflows?: MarketTraceSectorItem[]
}

export interface MarketTraceAShare {
  indexes?: unknown
  breadth?: unknown
  turnover?: unknown
  limits?: unknown
  main_force?: unknown
  sectors?: MarketTraceAShareSectors
}

export interface MarketTraceSourceRecord {
  source_id?: string
  kind?: 'market_fact' | 'event_evidence'
  provider?: string
  title?: string
  content?: string
  url?: string | null
  occurred_at?: string | null
  captured_at?: string
  source_level?: 'primary' | 'reporting' | 'market_data'
}

export interface MarketTraceSnapshot {
  snapshot_id?: string
  trade_date?: string
  captured_at?: string
  a_share?: MarketTraceAShare
  sources?: Record<string, MarketTraceSourceRecord>
  missing_fields?: unknown
  phenomenon_discovery?: MarketTracePhenomenonDiscovery
}

export interface MarketTraceArtifact {
  snapshot?: MarketTraceSnapshot
  trace?: MarketTraceTrace
}

export interface MarketTraceReviewRecord {
  report_type: string
  report_date: string
  status?: string
  data_source?: string | null
  created_at?: string
  content: {
    schema_version?: string
    snapshot_id?: string
    display_report?: MarketTraceReviewDisplayReport
    market_trace?: MarketTraceArtifact
  }
}

export interface BriefingData {
  date: string
  title: string
  kind: 'market_fact' | 'event_evidence'
  provider: string
}

/** 异动分析报告 DB 记录（GET /api/agent/report/alert/:symbol/:date 返回） */
export interface AlertReportRecord {
  id?: string
  report_type: string
  report_date: string
  status?: string
  data_source?: string | null
  created_at?: string
  content: {
    symbol?: string
    display_report?: {
      summary?: string
      impact?: string
      keywords?: string[]
      details?: string
      stocks?: string[]
      risks?: string[]
    }
    podcast_brief?: string
  }
}

/** 深度分析报告 DB 记录（GET /api/agent/report/chat/:reportId 返回；不存在/非本人/过期 → null） */
export interface ChatAnalysisReport {
  /** API 返回的数据库主键（后端 BIGSERIAL 归一为 Number，兼容旧字符串格式） */
  id: string | number
  report_type: string
  report_date: string
  status?: string
  data_source?: string | null
  created_at?: string
  content: {
    display_report?: {
      summary?: string
      details?: string
      stocks?: string[]
      risks?: string[]
    }
    schema_version?: string
  }
}

export type BriefType = 'morning' | 'evening'
export const PUBLIC_REPORT_INTENTS = ['morning', 'wind_leader', 'hot_burst', 'trend_score', 'review'] as const
export type PublicReportIntent = typeof PUBLIC_REPORT_INTENTS[number]

export function isPublicReportIntent(intent: string): intent is PublicReportIntent {
  return (PUBLIC_REPORT_INTENTS as readonly string[]).includes(intent)
}

export interface AdvisorSubquestionTrace {
  intent: string
  reports: Record<string, unknown>[]
  sources: Record<string, unknown>[]
  as_of: string | null
  missing_sources: string[]
  degraded: boolean
}

export interface BriefEvidence {
  report_type: string
  id: string
  data_source: string
  created_at: string
}

export interface BriefItem {
  title: string
  conclusion: string
  evidence: BriefEvidence[]
  as_of: string
  confidence: string
  uncertainty: string | string[]
}

export interface BriefV1 {
  schema_version: 'brief.v1'
  brief_type: BriefType
  as_of: string
  items: BriefItem[]
  degraded: boolean
  missing_sources: string[]
}

export interface BroadcastSourceBrief {
  /** API 返回的数据库主键通常为 number，兼容旧字符串格式。 */
  id: string | number
  report_type: `brief_${BriefType}`
  report_date: string
  as_of: string
}

export interface BroadcastDialogueLine {
  role: 'host' | 'analyst'
  content: string
}

export interface BroadcastV1 {
  schema_version: 'broadcast.v1'
  brief_type: BriefType
  source_brief: BroadcastSourceBrief
  degraded: boolean
  missing_sources: string[]
  dialogue: BroadcastDialogueLine[]
  audio_path: string | null
}

export const agentApi = {
  /**
   * 发送对话消息（非流式，降级方案）
   * App 端推荐使用 WebSocket 流式，见 useStreamingChat
   */
  sendMessage(message: string, sessionId?: string, options?: { forceDeep?: boolean }) {
    // P0：user_id 改由服务端注入（app-api 验签 JWT 后覆写），客户端不再自报
    return request.post('/agent/chat/message', {
      message,
      session_id: sessionId,
      // D4：HTTP 降级路径透传 force_deep（与 WS 路径对齐，Task 1 Python 侧支持）
      ...(options?.forceDeep ? { force_deep: true } : {})
    }, {
      // 非流式降级路径跑完整 LangGraph 较慢（本地实测 ~50s），全局默认 15s 会超时 → 无回复
      timeout: 120000
    })
  },

  /** 查询用户累计 token 用量（P10 线 2 端点；JWT 拦截器自动带 token；无记录全 0） */
  getTokenUsageSummary() {
    return request.get<TokenUsageSummary>('/chat/usage/summary')
  },

  /**
   * 会话列表（P9 会话管理）：GET /api/chat/sessions
   * 鉴权由 request 拦截器自动注入 Authorization: Bearer token；失败静默返回 []
   */
  async listChatSessions(): Promise<ChatSessionMeta[]> {
    try {
      return await request.get<ChatSessionMeta[]>('/chat/sessions')
    } catch (e) {
      console.error('[agent] listChatSessions failed:', e)
      return []
    }
  },

  /** 会话元数据 upsert（P9）：POST /api/chat/sessions，fire-and-forget 静默失败 */
  async upsertChatSession(sessionId: string, question?: string): Promise<void> {
    try {
      await request.post('/chat/sessions', { session_id: sessionId, question })
    } catch (e) {
      console.error('[agent] upsertChatSession failed:', e)
    }
  },

  /** 删除会话（P9）：DELETE /api/chat/sessions/:id，fire-and-forget 静默失败 */
  async deleteChatSession(sessionId: string): Promise<void> {
    try {
      await request.delete(`/chat/sessions/${sessionId}`)
    } catch (e) {
      console.error('[agent] deleteChatSession failed:', e)
    }
  },

  /** 获取今日晨报 */
  getMorningBriefing() {
    return request.get<BriefingData>('/agent/briefing/morning')
  },

  /** 读取结构化早报/晚报，事实层仅来自已持久化 Brief。 */
  getBrief(type: BriefType, date: string) {
    return request.get<BriefV1>(`/agent/brief/${type}/${date}`)
  },

  /** 读取由对应 Brief 生成的双人播报。 */
  getBroadcast(type: BriefType, date: string) {
    return request.get<BroadcastV1>(`/agent/broadcast/${type}/${date}`)
  },

  /** 生成双人对话音频 */
  // TODO: 实际端点为 Node /internal/briefing/generate-audio（需 X-Internal-Token，非公开路由），
  // 参数为 {date} 而非 {type}。需后端补充公开路由后对齐，暂保留
  generateAudio(type: 'morning' | 'evening') {
    return request.post('/agent/briefing/generate-audio', { type })
  },

  /**
   * 生成通用播报音频（单主播朗读文本）
   * 对接 Node.js 公开路由 POST /api/agent/brief/generate-podcast
   * 同一 key 的音频已存在时后端直接返回缓存，不重复合成
   */
  generatePodcast(text: string, key: string) {
    return request.post<{ audio_url: string; cached: boolean }>(
      '/agent/brief/generate-podcast',
      { text, key }
    )
  },

  /** 获取动态估值 */
  // TODO: 后端 valuation 接口尚未实现，待 Agent 落地后启用
  getValuation(symbol: string) {
    return request.get(`/agent/valuation/${symbol}`)
  },

  /** 获取事件传导链 */
  getEventChain(eventId: string) {
    return request.get(`/agent/event/${eventId}`)
  },

  /** 获取事件列表 */
  getEventList(params?: { page?: number; size?: number }) {
    return request.get('/agent/event/list', { params })
  },

  /** 获取提醒列表 */
  // TODO: 后端 alert/list 接口尚未实现，待 Agent 落地后启用
  getAlertList() {
    return request.get('/agent/alert/list')
  },

  /** 订阅异动提醒 */
  // TODO: 后端 alert/subscribe 接口尚未实现，待 Agent 落地后启用
  subscribeAlert(symbols: string[]) {
    return request.post('/agent/alert/subscribe', { symbols })
  },

  /** 注册推送 Token（App 端） */
  // TODO: 后端 push/token 接口尚未实现，待 Agent 落地后启用
  registerPushToken(token: string, provider: string) {
    return request.post('/agent/push/token', { token, provider })
  },

  /** 读取分析报告（broadcast/morning/review/wind_leader/hot_burst 等）。 */
  getReport(intent: string, date: string) {
    return request.get(`/agent/report/${intent}/${date}`)
  },

  /**
   * 读取深度分析报告详情（B2 议题 2）：GET /api/agent/report/chat/:reportId
   * 鉴权由 request 拦截器自动注入 Bearer token；不存在/非本人/过期 → data: null。
   * 拦截器语义（request.ts）：{code:0, data: report} → 解包返回 report body；
   * {code:0, data:null} → `data ?? response.data` 走右侧，返回整个信封 {code:0, data:null}。
   * 故判断信封（对象且含 code 键）→ 空态 null；否则返回值即报告体本身。
   */
  async getChatAnalysisReport(reportId: string | number): Promise<ChatAnalysisReport | null> {
    const res = await request.get<ChatAnalysisReport | { data: ChatAnalysisReport | null }>(`/agent/report/chat/${reportId}`)
    return res && typeof res === 'object' && 'code' in res ? null : (res as ChatAnalysisReport)
  },

  /**
   * 查询指定股票的异动分析报告（缓存查询）
   * 对接 Node.js 公开路由 GET /api/agent/report/alert/:symbol/:date
   * 命中缓存时直接返回 DB 中的报告，未命中返回 null（前端再走 SSE 流式分析）
   */
  getAlertReport(symbol: string, date: string) {
    return request.get<AlertReportRecord | null>(`/agent/report/alert/${symbol}/${date}`)
  },

  /** 读取大盘复盘报告。 */
  getMarketTraceReview(date: string) {
    return request.get<MarketTraceReviewRecord | null>(`/agent/report/review/${date}`)
  },

  /** 异动提醒 AI 解读 SSE 流 URL（不走 request 拦截器，直接拼接） */
  getAlertBriefingUrl(symbol: string, cycle: string = '') {
    const base = import.meta.env.VITE_API_BASE_URL || '/api'
    let url = `${base}/agent/briefing/alert?symbol=${encodeURIComponent(symbol)}`
    if (cycle) url += `&cycle=${encodeURIComponent(cycle)}`
    return url
  },

  /**
   * 会话维度用量聚合（P10 线 6）：GET /api/chat/usage/sessions
   * 鉴权由 request 拦截器自动注入 Authorization: Bearer token；失败静默返回空 items
   * （用量缺失只影响列表徽标，不影响会话列表主功能——与 listChatSessions 同模式）。
   */
  async getChatSessionUsage(): Promise<{ items: SessionUsageItem[] }> {
    try {
      return await request.get<{ items: SessionUsageItem[] }>('/chat/usage/sessions')
    } catch (e) {
      console.error('[agent] getChatSessionUsage failed:', e)
      return { items: [] }
    }
  }
}

/**
 * 创建 WebSocket 连接（App 端推荐）
 * 用于：实时行情推送、异动提醒、对话流式输出
 */
export function createWebSocket() {
  const token = uni.getStorageSync('token')
  const url = `${WS_BASE_URL}?token=${token}`
  return uni.connectSocket({
    url,
    success: () => console.log('[WS] connecting...'),
    fail: (err) => console.error('[WS] connect failed:', err)
  })
}

/**
 * 创建 Agent Python 后端 WebSocket 连接（用于 AI 对话流式 + 进度反馈）
 * 连接地址: {AGENT_WS_BASE_URL}/chat
 */
export function createAgentWebSocket() {
  // P0：WS 握手鉴权（uni-app 小程序端 WS 不能自定义 header，走 query——与 createWebSocket 同模式）
  const token = uni.getStorageSync('token')
  const url = `${AGENT_WS_BASE_URL}/chat?token=${token || ''}`
  return uni.connectSocket({
    url,
    success: () => console.log('[AgentWS] connecting...'),
    fail: (err) => console.error('[AgentWS] connect failed:', err)
  })
}
