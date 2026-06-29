/**
 * AI 智能体相关 API（App 专属功能）
 */
import request from '../request'
import { WS_BASE_URL } from '@/utils/constants'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  skillResult?: SkillResult
  timestamp: number
}

export interface SkillResult {
  type: 'text' | 'card' | 'chart' | 'graph'
  data: any
  narrative?: string
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

  /** 获取今日晨报 */
  getMorningBriefing() {
    return request.get<BriefingData>('/agent/briefing/morning')
  },

  /** 获取今日晚报 */
  getEveningBriefing() {
    return request.get<BriefingData>('/agent/briefing/evening')
  },

  /** 生成双人对话音频 */
  generateAudio(type: 'morning' | 'evening') {
    return request.post('/agent/briefing/generate-audio', { type })
  },

  /** 获取动态估值 */
  getValuation(symbol: string) {
    return request.get(`/agent/valuation/${symbol}`)
  },

  /** 获取事件传导链 */
  getEventChain(eventId: string) {
    return request.get(`/agent/event/chain/${eventId}`)
  },

  /** 获取事件列表 */
  getEventList(params?: { page?: number; size?: number }) {
    return request.get('/agent/event/list', { params })
  },

  /** 获取提醒列表 */
  getAlertList() {
    return request.get('/agent/alert/list')
  },

  /** 订阅异动提醒 */
  subscribeAlert(symbols: string[]) {
    return request.post('/agent/alert/subscribe', { symbols })
  },

  /** 注册推送 Token（App 端） */
  registerPushToken(token: string, provider: string) {
    return request.post('/agent/push/token', { token, provider })
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
