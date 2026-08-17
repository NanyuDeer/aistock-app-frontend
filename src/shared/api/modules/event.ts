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

export const eventApi = {
  /** 获取事件列表 */
  getList(params?: { page?: number; size?: number }) {
    return request.get<EventItem[]>('/agent/event/list', { params })
  }
}
