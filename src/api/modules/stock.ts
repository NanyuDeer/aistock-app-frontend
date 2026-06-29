/**
 * 股票相关 API
 * 复用现有 aistock-api 接口定义，仅调整路径前缀
 */
import request from '../request'

export interface StockQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  prevClose: number
  volume: number
  amount: number
}

export interface KLineItem {
  date: string
  open: number
  close: number
  high: number
  low: number
  volume: number
}

export const stockApi = {
  /** 获取股票列表 */
  getStockList(params?: { keyword?: string; page?: number; size?: number }) {
    return request.get('/cn/stocks', { params })
  },

  /** 获取个股实时行情 */
  getQuote(symbol: string) {
    return request.get<StockQuote>(`/cn/stock/quotes/realtime`, { params: { symbol } })
  },

  /** 批量获取核心行情 */
  getCoreQuotes(symbols: string[]) {
    return request.get('/cn/stock/quotes/core', { params: { symbols: symbols.join(',') } })
  },

  /** 获取 K 线数据 */
  getKLine(symbol: string, params?: { period?: string; count?: number }) {
    return request.get<KLineItem[]>('/cn/stock/quotes/kline', { params: { symbol, ...params } })
  },

  /** 获取资金流向 */
  getCapitalFlow(symbol: string) {
    return request.get(`/cn/stocks/${symbol}/capital-flow`)
  },

  /** 获取个股新闻 */
  getStockNews(symbol: string, params?: { page?: number; size?: number }) {
    return request.get(`/cn/stocks/${symbol}/news`, { params })
  },

  /** 获取十倍股评分 */
  getTenxScore(symbol: string) {
    return request.get(`/cn/stocks/${symbol}/tenx-score`)
  },

  /** 获取板块龙头 */
  getTagLeaders(tagCode: string) {
    return request.get(`/cn/tags/${tagCode}/leaders`)
  },

  /** 获取自选股 */
  getFavorites() {
    return request.get('/users/me/favorites')
  },

  /** 添加自选股 */
  addFavorites(symbols: string[]) {
    return request.post('/users/me/favorites', { symbols })
  },

  /** 删除自选股 */
  removeFavorites(symbols: string[]) {
    return request.delete('/users/me/favorites', { data: { symbols } })
  }
}
