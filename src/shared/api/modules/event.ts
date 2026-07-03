/**
 * 事件传导 API
 */
import request from '../request'

export interface EventItem {
  id: string
  title: string
  summary?: string
  cycle?: string
  change_type?: string
  keywords?: string[]
  published_at?: string
}

export interface EventChainNode {
  id: string
  label: string
  type?: string
}

export interface EventChainLink {
  source: string
  target: string
  factor?: number
  direction?: string
}

export interface EventChain {
  id: string
  chain: Array<EventChainNode | EventChainLink | any>
  narrative?: string
}

export const eventApi = {
  /** 获取事件列表 */
  getList(params?: { page?: number; size?: number }) {
    return request.get<EventItem[]>('/agent/event/list', { params })
  },

  /** 获取事件传导链 */
  getChain(eventId: string) {
    return request.get<EventChain>(`/agent/event/chain/${eventId}`)
  }
}
