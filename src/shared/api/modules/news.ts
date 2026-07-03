/**
 * 资讯相关 API
 */
import request from '../request'

export interface NewsHeadline {
  title: string
  content?: string
  source?: string
  time?: string
  url?: string
  symbols?: string[]
}

export interface TrendEvent {
  id: string
  title: string
  summary?: string
  cycle?: string
  change_type?: string
  keywords?: string[]
  stocks?: Array<{ symbol: string; name: string }>
  ai_impact?: string
  ai_summary?: string
  published_at?: string
}

export const newsApi = {
  /** 获取财联社头条 */
  getHeadlines(params?: { limit?: number }) {
    return request.get<NewsHeadline[]>('/news/headlines', { params }).then((res: any) => res)
  },

  /** 获取趋势风口事件（重磅消息） */
  getTrendEvents(params?: {
    cycle?: string
    change_type?: string
    limit?: number
    offset?: number
  }) {
    return request.get<TrendEvent[]>('/cn/trend-hotspots/events', { params }).then((res: any) => res)
  },

  /** 获取个股新闻 */
  getStockNews(symbol: string, params?: { page?: number; size?: number }) {
    return request.get(`/cn/stocks/${symbol}/news`, { params })
  }
}
