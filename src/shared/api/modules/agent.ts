/**
 * AI 智能体相关 API（App 专属功能）
 */
import request from '../request'
import { WS_BASE_URL, AGENT_WS_BASE_URL } from '@/shared/utils/constants'

export const MARKET_TRACE_QA_TIMEOUT = 120_000

export interface ProgressStep {
  label: string
  status: 'pending' | 'done'
  timestamp: number
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  skillResult?: SkillResult
  progressSteps?: ProgressStep[]
  trace?: MarketTraceQaTrace
  timestamp: number
}

export interface SkillResult {
  type: 'text' | 'card' | 'chart' | 'graph'
  data: any
  narrative?: string
}

export interface MarketTraceQaSource {
  source_id: string
  title: string
  kind: 'market_fact' | 'event_evidence'
  provider: string
}

export interface MarketTraceQaTrace {
  artifact_id: string
  sources: MarketTraceQaSource[]
  as_of: string
  confidence: 'high' | 'medium' | 'low'
  uncertainty: string[]
  degraded: boolean
  degraded_reason: string | null
}

export interface MarketTraceQaResponse {
  content: string
  session_id: string
  trace: MarketTraceQaTrace
}

export interface BriefingData {
  date: string
  title: string
  audioUrl?: string
  segments: Array<{
    host: 'A' | 'B'
    text: string
    audioUrl?: string
  }>
  events: any[]
  sectors: any[]
}

export const agentApi = {
  /**
   * 发送对话消息（非流式，降级方案）
   * App 端推荐使用 WebSocket 流式，见 useStreamingChat
   */
  sendMessage(message: string, sessionId?: string) {
    return request.post('/agent/chat/message', { message, session_id: sessionId })
  },

  /**
   * 发送市场复盘问答消息（HTTP，非流式）
   * 通过 Node 代理转发到 Python /api/agent/market-trace-qa/message
   * 返回包含 trace 证据元数据的响应
   */
  async sendMarketTraceQaMessage(message: string, reportDate?: string, sessionId?: string): Promise<MarketTraceQaResponse> {
    return request.post<MarketTraceQaResponse>('/agent/market-trace-qa/message', {
      message,
      report_date: reportDate,
      session_id: sessionId,
    }, {
      timeout: MARKET_TRACE_QA_TIMEOUT,
    })
  },

  /** 获取今日晨报 */
  getMorningBriefing() {
    return request.get<BriefingData>('/agent/briefing/morning')
  },

  /** 获取今日晚报 */
  // TODO: 后端 evening briefing 尚未实现（Python 仅有 morning/alert），待 Agent 落地后启用
  getEveningBriefing() {
    return request.get<BriefingData>('/agent/briefing/evening')
  },

  /** 生成双人对话音频 */
  // TODO: 实际端点为 Node /internal/briefing/generate-audio（需 X-Internal-Token，非公开路由），
  // 参数为 {date} 而非 {type}。需后端补充公开路由后对齐，暂保留
  generateAudio(type: 'morning' | 'evening') {
    return request.post('/agent/briefing/generate-audio', { type })
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

  /** 获取 Agent 分析报告 */
  getReport(intent: string, date: string) {
    return request.get(`/agent/report/${intent}/${date}`)
  },

  /** 异动提醒 AI 解读 SSE 流 URL（不走 request 拦截器，直接拼接） */
  getAlertBriefingUrl(symbol: string, cycle: string = '') {
    const base = import.meta.env.VITE_API_BASE_URL || '/api'
    let url = `${base}/agent/briefing/alert?symbol=${encodeURIComponent(symbol)}`
    if (cycle) url += `&cycle=${encodeURIComponent(cycle)}`
    return url
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
  const url = `${AGENT_WS_BASE_URL}/chat`
  return uni.connectSocket({
    url,
    success: () => console.log('[AgentWS] connecting...'),
    fail: (err) => console.error('[AgentWS] connect failed:', err)
  })
}
