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

  /** 获取个股实时行情（activity 级别，含完整数据） */
  getQuote(symbol: string) {
    return request.get('/cn/stock/quotes/activity', { params: { symbols: symbol } }).then((res: any) => {
      const quote = res?.行情?.[0] || res?.data?.行情?.[0] || null
      if (!quote) return null
      return {
        symbol: quote['股票代码'] || symbol,
        name: quote['股票简称'] || '',
        price: quote['最新价'] || 0,
        change: quote['涨跌额'] || 0,
        changePercent: quote['涨跌幅'] || 0,
        open: quote['今开价'] || 0,
        high: quote['最高价'] || 0,
        low: quote['最低价'] || 0,
        prevClose: quote['昨收价'] || 0,
        volume: quote['成交量'] || 0,
        amount: quote['成交额'] || 0,
        turnoverRate: quote['换手率'] || 0,
        peRatio: quote['市盈率'] || 0,
        pbRatio: quote['市净率'] || 0,
        amplitude: quote['振幅'] || 0,
        avgPrice: quote['均价'] || 0,
        limitUp: quote['涨停价'] || 0,
        limitDown: quote['跌停价'] || 0,
      }
    })
  },

  /** 批量获取核心行情（返回适配后的数组） */
  getCoreQuotes(symbols: string[]) {
    return request.get('/cn/stock/quotes/core', { params: { symbols: symbols.join(',') } }).then((res: any) => {
      const list = res?.行情 || res?.data?.行情 || []
      return list.map((q: any) => ({
        symbol: q['股票代码'] || '',
        name: q['股票简称'] || '',
        price: q['最新价'] || 0,
        changePercent: q['涨跌幅'] || 0,
      }))
    })
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

  /** 获取板块龙头（指定板块 code） */
  getTagLeaders(tagCode: string) {
    return request.get(`/cn/tags/${tagCode}/leaders`)
  },

  /** 获取风口龙头（长线风口，返回 hot_sectors 数组） */
  getWindLeaders(limit = 8) {
    return request.get('/cn/wind-leaders', { params: { limit } }).then((res: any) => res)
  },

  /** 获取机构调研热门股（共振检测） */
  getHotBursts(params?: { hours?: number; min_resonance?: number; limit?: number }) {
    return request.get('/cn/hot-bursts', { params }).then((res: any) => res)
  },

  /** 获取趋势风口事件（重磅消息） */
  getTrendEvents(params?: { cycle?: string; change_type?: string; limit?: number; offset?: number }) {
    return request.get('/cn/trend-hotspots/events', { params }).then((res: any) => res)
  },

  /** 获取财联社头条新闻 */
  getNewsHeadlines() {
    return request.get('/news/headlines').then((res: any) => res)
  },

  /** 获取新闻详情 */
  getNewsDetail(newsId: string) {
    return request.get(`/news/${newsId}`).then((res: any) => {
      const item = res?.data || res
      return {
        id: newsId,
        title: item['标题'] || item.title || '',
        content: item['正文'] || item.content || '',
        summary: item['摘要'] || item.summary || '',
        publishTime: item['发布时间'] || item.publish_time || '',
        url: item['原文链接'] || item.url || '',
        source: item['来源'] || item.source || '财联社',
      }
    })
  },

  /** 获取自选股（通过 /users/me 返回的用户信息提取） */
  getFavorites() {
    return request.get('/users/me').then((res: any) => {
      // 后端返回中文字段名，适配为前端期望的格式
      const favorites = res?.['自选股'] || res?.favorites || []
      return favorites.map((item: any) => ({
        symbol: item['股票代码'] || item.symbol,
        name: item['股票简称'] || item.name || '',
      }))
    })
  },

  /** 添加自选股 */
  addFavorites(symbols: string[]) {
    return request.post('/users/me/favorites', { symbols })
  },

  /** 删除自选股 */
  removeFavorites(symbols: string[]) {
    return request.delete('/users/me/favorites', { data: { symbols } })
  },

  /** 获取业绩预测列表 */
  getProfitForecastList(params?: { page?: number; pageSize?: number; sortBy?: string; sortOrder?: string }) {
    return request.get('/cn/stocks/profit-forecast', { params })
  },

  /** 搜索业绩预测 */
  searchProfitForecast(params?: { keyword?: string; page?: number; pageSize?: number; sortBy?: string; sortOrder?: string }) {
    return request.get('/cn/stocks/profit-forecast/search', { params })
  },

  /** 获取推送历史 */
  getPushHistory(params?: { date?: string }) {
    return request.get<{ items: PushHistoryItem[] }>('/potential-stocks/push-history', { params }).then((res: any) => res)
  },

  /** 获取半年报关键财务数据 */
  getSemiAnnualReport(symbol: string) {
    return request.get(`/cn/stocks/${symbol}/semi-annual-report`).then((res: any) => res?.data || res)
  }
}

export interface PushHistoryItem {
  push_date: string
  stock_name: string
  stock_code: string
  theme?: string
  reason?: string
  score?: number | null
  chain_position?: string
  push_price: number | null
  latest_price?: number | null
  latest_trade_date?: string
  return_pct?: number | null
  realtime_return_pct?: number | null
  realtime_time?: string
  latest_change_pct?: number | null
}
