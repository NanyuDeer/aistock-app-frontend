/**
 * 股票相关 API
 * 复用现有 aistock-api 接口定义，仅调整路径前缀
 */
import request from '../request'
import { isInvalidValue } from '@/shared/utils/format'

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

// ---- 趋势股评分接口类型 ----
export interface TrendIndicator {
  name: string
  key: string
  value: string
  score: number
}

export interface TrendSubDimension {
  name: string
  weight: number
  score: number
  indicators: TrendIndicator[]
}

export interface TrendDimension {
  name: string
  weight: number
  score: number
  indicators: TrendIndicator[]
  subDimensions?: TrendSubDimension[]
  detail?: Record<string, unknown>
}

export interface TrendScoreData {
  vetoed: boolean
  reasons?: string[]
  symbol?: string
  score: number
  label: string
  expectedMultiple: string
  description: string
  aiConclusion: string
  dimScores: number[]
  dimensions: TrendDimension[]
  updatedAt: string
  scoreDate: string
  rawData: unknown
}

// ---- 业绩预测接口类型 ----
export interface ForecastPrediction {
  year: string
  netProfit: string | number
  growth: number | string
}

export interface ForecastData {
  symbol: string
  summary: string
  updateTime: string
  netProfitYoy: number | null
  predictions: ForecastPrediction[]
  detailIndicators: Record<string, unknown>[]
  epsList: Record<string, unknown>[]
  profitList: Record<string, unknown>[]
  rawData: unknown
}

// ---- 股票基础信息接口类型 ----
export interface StockInfo {
  name: string
  symbol: string
  market: string
  industry: string
  regionBoard: string
  industryTagId: string | null
  regionBoardTagId: string | null
  listingDate: string
  totalShares: number | null
  floatShares: number | null
  marketCap: number | null
  floatMarketCap: number | null
}

// ---- 个股新闻接口类型 ----
export interface StockNewsItem {
  id: string
  title: string
  summary: string
  content: string
  url: string
  source: string
  publishTime: string
}

export interface FavoriteStock {
  symbol: string
  name: string
  market?: string | null
  addedAt?: string | null
}

interface FavoriteStockPayload {
  股票代码?: string
  股票简称?: string | null
  市场代码?: string | null
  添加时间?: string | null
  symbol?: string
  name?: string | null
  market?: string | null
  added_at?: string | null
}

interface UserFavoritesPayload {
  自选股?: FavoriteStockPayload[]
  favorites?: FavoriteStockPayload[]
}

function normalizeFavorites(payload: UserFavoritesPayload | null | undefined): FavoriteStock[] {
  const favorites = payload?.自选股 || payload?.favorites || []
  if (!Array.isArray(favorites)) return []

  return favorites
    .map((item) => ({
      symbol: String(item.股票代码 || item.symbol || '').trim(),
      name: String(item.股票简称 || item.name || ''),
      market: item.市场代码 ?? item.market ?? null,
      addedAt: item.添加时间 ?? item.added_at ?? null,
    }))
    .filter((item) => item.symbol)
}

export interface WindLeaderAiAnalysis {
  persistence?: string
  persistence_reason?: string
  heat_transfer?: boolean
  transfer_direction?: string
  transfer_reason?: string
  risk_warning?: string
}

export interface WindLeaderStock {
  code: string
  name: string
  industry?: string
  score?: number
  reason?: string
  reason_tag?: string
  reason_tag_class?: string
  in_concept?: boolean
  chain_position?: string
  source?: string
  overlap_ratio?: number
  transmission_factor?: number
  related_industry?: string
  price?: number | null
  change_pct?: number | null
}

export interface WindLeaderFlowNode {
  id: string
  type: 'main' | 'related' | 'upstream' | 'downstream'
  label: string
}

export interface WindLeaderFlowLink {
  source: string
  target: string
  factor: number
  direction: 'related' | 'upstream' | 'downstream'
}

export interface WindLeaderFlowData {
  nodes: WindLeaderFlowNode[]
  links: WindLeaderFlowLink[]
  transfer_direction?: string
}

export interface WindLeaderSector {
  code?: string
  name: string
  type?: string
  frequency?: number | string
  avg_change?: number
  today_change?: number
  amount_trend?: number
  net_inflow?: number
  score?: number
  leading_stock?: string
  leading_change?: number
  up_count?: number
  down_count?: number
  driver?: string
  ai_analysis?: WindLeaderAiAnalysis | string | null
  main_stocks?: WindLeaderStock[]
  upstream_stocks?: WindLeaderStock[]
  downstream_stocks?: WindLeaderStock[]
  leading_stock_info?: WindLeaderStock | null
  flow_data?: WindLeaderFlowData | null
}

export interface WindLeaderResponse {
  update_time?: string
  hot_sectors: WindLeaderSector[]
}

export interface HotBurstSignal {
  symbol: string
  stockName?: string
  price?: number | null
  changePct?: number | null
  triggerTags?: string[]
  sectorInfo?: string
  thsSectorName?: string
  resonanceLevel?: 'critical' | 'high' | 'medium' | 'low'
  detectedAt?: string
}

interface HotBurstHistoryRecord {
  symbol: string
  stock_name?: string
  price?: number | null
  change_pct?: number | null
  sector_info?: string
  keywords?: string
  resonance_level?: HotBurstSignal['resonanceLevel']
  detected_at?: string
}

interface HotBurstHistoryResponse {
  records?: HotBurstHistoryRecord[]
}

function normalizeHotBurstHistory(records: HotBurstHistoryRecord[] | undefined): HotBurstSignal[] {
  return (records ?? []).map((record) => ({
    symbol: record.symbol,
    stockName: record.stock_name,
    price: record.price,
    changePct: record.change_pct,
    triggerTags: record.keywords?.split(/[、，,]/).map((tag) => tag.trim()).filter(Boolean),
    sectorInfo: record.sector_info,
    resonanceLevel: record.resonance_level,
    detectedAt: record.detected_at,
  }))
}

export const stockApi = {
  /** 获取股票列表 */
  getStockList(params?: { keyword?: string; page?: number; size?: number }) {
    return request.get('/cn/stocks', { params })
  },

  /** 获取个股实时行情（activity 级别，含完整数据） */
  getQuote(symbol: string) {
    return request.get('/cn/stock/quotes/activity', { params: { symbols: symbol } }).then((res: Record<string, unknown>) => {
      const data = (res.data as Record<string, unknown>) || res
      const quotes = (data['行情'] as Record<string, unknown>[]) || []
      const quote = quotes[0]
      if (!quote) return null
      return {
        symbol: String(quote['股票代码'] || symbol),
        name: String(quote['股票简称'] || ''),
        price: Number(quote['最新价']) || 0,
        change: Number(quote['涨跌额']) || 0,
        changePercent: Number(quote['涨跌幅']) || 0,
        open: Number(quote['今开价']) || 0,
        high: Number(quote['最高价']) || 0,
        low: Number(quote['最低价']) || 0,
        prevClose: Number(quote['昨收价']) || 0,
        volume: Number(quote['成交量']) || 0,
        amount: Number(quote['成交额']) || 0,
        turnoverRate: Number(quote['换手率']) || 0,
        peRatio: Number(quote['市盈率']) || 0,
        pbRatio: Number(quote['市净率']) || 0,
        amplitude: Number(quote['振幅']) || 0,
        avgPrice: Number(quote['均价']) || 0,
        limitUp: Number(quote['涨停价']) || 0,
        limitDown: Number(quote['跌停价']) || 0,
        volumeRatio: Number(quote['量比']) || 0,
      }
    })
  },

  /** 批量获取核心行情（返回适配后的数组） */
  getCoreQuotes(symbols: string[]) {
    return request.get('/cn/stock/quotes/core', { params: { symbols: symbols.join(',') } }).then((res: Record<string, unknown>) => {
      const data = (res.data as Record<string, unknown>) || res
      const list = (data['行情'] as Record<string, unknown>[]) || []
      return list.map((q: Record<string, unknown>) => ({
        symbol: String(q['股票代码'] || ''),
        name: String(q['股票简称'] || ''),
        price: Number(q['最新价']) || 0,
        changePercent: Number(q['涨跌幅']) || 0,
      }))
    })
  },

  /** 获取 K 线数据 */
  getKLine(symbol: string, params?: { period?: 'daily' | 'weekly' | 'yearly' | string; count?: number }) {
    const kltMap: Record<string, number> = {
      daily: 101,
      weekly: 102,
      yearly: 103,
    }
    const klt = kltMap[params?.period || 'daily'] || 101
    return request.get<Record<string, unknown>>('/cn/stock/quotes/kline', {
      params: { symbol, klt, fqt: 1, limit: params?.count || 120 }
    }).then((res: Record<string, unknown>) => {
      const data = (res.data as Record<string, unknown>) || res
      const payload = (data.data as Record<string, unknown>) || data
      const klines = (payload['K线'] as Record<string, unknown>[])
        || (payload.klines as Record<string, unknown>[])
        || (data['K线'] as Record<string, unknown>[])
        || (data.klines as Record<string, unknown>[])
        || []
      if (!Array.isArray(klines)) return []
      const mapped = klines.map((k: Record<string, unknown>) => ({
        date: String(k['时间'] ?? k['date'] ?? ''),
        open: Number(k['开盘价'] ?? k['open'] ?? 0),
        close: Number(k['收盘价'] ?? k['close'] ?? 0),
        high: Number(k['最高价'] ?? k['high'] ?? 0),
        low: Number(k['最低价'] ?? k['low'] ?? 0),
        volume: Number(k['成交量'] ?? k['volume'] ?? 0),
      }))
      return mapped
    })
  },

  /** 获取资金流向（已归一化） */
  getCapitalFlow(symbol: string) {
    return request.get(`/cn/stocks/${symbol}/capital-flow`).then((res: Record<string, unknown>) => res || null)
  },

  /** 获取个股新闻 */
  getStockNews(symbol: string, params?: { page?: number; size?: number }) {
    return request.get(`/cn/stocks/${symbol}/news`, { params })
  },

  /** 获取趋势股评分（四维：技术面/行业赛道景气/消息面催化/基本面，含一票否决检查） */
  getTrendScore(symbol: string) {
    return request.get(`/cn/stocks/${symbol}/trend-score`).then((res: Record<string, unknown>) => normalizeTrendScore(res))
  },

  /** 获取板块龙头（指定板块 code） */
  getTagLeaders(tagCode: string) {
    return request.get(`/cn/tags/${tagCode}/leaders`)
  },

  /** 获取风口龙头（长线风口，返回 hot_sectors 数组） */
  getWindLeaders(limit = 8) {
    return request.get<WindLeaderResponse>('/cn/wind-leaders', { params: { limit } })
  },

  /** 获取机构调研热门股（共振检测） */
  getHotBursts(params?: { hours?: number; min_resonance?: number; limit?: number }) {
    return request.get('/cn/institution-research', { params })
  },

  /** 获取机构调研热门股历史记录，供 App 的近时段展示使用。 */
  getHotBurstHistory(params: { days: number; min_resonance: number; limit?: number; offset?: number }) {
    return request
      .get<HotBurstHistoryResponse>('/cn/institution-research/history', { params })
      .then((result) => normalizeHotBurstHistory(result.records))
  },

  /** 获取个股异动事件（重磅消息） */
  getTrendEvents(params?: { cycle?: string; change_type?: string; limit?: number; offset?: number }) {
    return request.get('/cn/stock-monitors/events', { params }).then((res: Record<string, unknown>) => res)
  },

  /** 获取财联社头条新闻 */
  getNewsHeadlines() {
    return request.get('/news/headlines').then((res: Record<string, unknown>) => res)
  },

  /** 获取新闻详情 */
  getNewsDetail(newsId: string) {
    return request.get(`/news/${newsId}`).then((res: Record<string, unknown>) => {
      const item = (res.data as Record<string, unknown>) || res
      return {
        id: newsId,
        title: String(item['标题'] || item['title'] || ''),
        content: String(item['正文'] || item['content'] || ''),
        summary: String(item['摘要'] || item['summary'] || ''),
        publishTime: String(item['发布时间'] || item['publish_time'] || ''),
        url: String(item['原文链接'] || item['url'] || ''),
        source: String(item['来源'] || item['source'] || '财联社'),
      }
    })
  },

  /** 获取自选股（通过 /users/me 返回的用户信息提取） */
  getFavorites() {
    return request.get<UserFavoritesPayload>('/users/me').then(normalizeFavorites)
  },

  /** 添加自选股 */
  addFavorites(symbols: string[]) {
    return request.post<UserFavoritesPayload>('/users/me/favorites', { symbols }).then(normalizeFavorites)
  },

  /** 删除自选股 */
  removeFavorites(symbols: string[]) {
    return request.delete<UserFavoritesPayload>('/users/me/favorites', { data: { symbols } }).then(normalizeFavorites)
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
    return request.get<Record<string, unknown>>('/potential-stocks/push-history', { params }).then((res: Record<string, unknown>) => res)
  },

  /** 获取半年报关键财务数据 */
  getSemiAnnualReport(symbol: string) {
    return request.get(`/cn/stocks/${symbol}/semi-annual-report`).then((res: Record<string, unknown>) => (res?.data as Record<string, unknown>) || res)
  },

  /** 获取个股 AI 资讯分析 */
  getStockAnalysis(symbol: string) {
    return request.get(`/cn/stocks/${symbol}/analysis`).then((res: Record<string, unknown>) => (res?.data as Record<string, unknown>) || res)
  },

  /** 创建个股 AI 资讯分析（触发后端生成） */
  createStockAnalysis(symbol: string) {
    return request.post(`/cn/stocks/${symbol}/analysis`).then((res: Record<string, unknown>) => (res?.data as Record<string, unknown>) || res)
  },

  /** 获取个股 AI 分析历史 */
  getStockAnalysisHistory(symbol: string, params?: { page?: number; pageSize?: number }) {
    return request.get(`/cn/stocks/${symbol}/analysis/history`, { params }).then((res: Record<string, unknown>) => (res?.data as Record<string, unknown>) || res)
  },

  /** 获取股票基础信息（行业、地域板块、上市时间、股本、市值等） */
  getStockInfos(symbol: string) {
    return request.get('/cn/stock/infos', { params: { symbols: symbol } }).then((res: Record<string, unknown>) => {
      const data = (res.data as Record<string, unknown>) || res
      const infos = (data['股票信息'] as Record<string, unknown>[]) || []
      const info = infos[0]
      if (!info) return null
      return {
        name: String(info['股票简称'] || ''),
        symbol: String(info['股票代码'] || symbol),
        market: String(info['市场代码'] || ''),
        industry: String(info['所属行业'] || info['行业板块'] || ''),
        regionBoard: String(info['地域板块'] || ''),
        industryTagId: (info['行业板块ID'] as string | null) || null,
        regionBoardTagId: (info['地域板块ID'] as string | null) || null,
        listingDate: String(info['上市时间'] || ''),
        totalShares: (info['总股本'] as number | null) || null,
        floatShares: (info['流通股'] as number | null) || null,
        marketCap: (info['总市值'] as number | null) || null,
        floatMarketCap: (info['流通市值'] as number | null) || null,
      }
    })
  },

  /** 获取业绩预测（GET 只读） */
  getForecast(symbol: string) {
    return request.get(`/cn/stock/${symbol}/profit-forecast`).then((res: Record<string, unknown>) => normalizeForecast(res))
  },

  /** 触发更新业绩预测 */
  createForecast(symbol: string) {
    return request.post(`/cn/stock/${symbol}/profit-forecast`).then((res: Record<string, unknown>) => normalizeForecast(res))
  },

  /** 强制刷新趋势股评分 */
  refreshTrendScore(symbol: string) {
    return request.post(`/cn/stocks/${symbol}/trend-score/refresh`).then((res: Record<string, unknown>) => normalizeTrendScore(res))
  },

  /** 获取个股异动事件（趋势风口） */
  getStockEvents(symbol: string, params?: { cycle?: string; limit?: number }) {
    return request.get(`/cn/trend-hotspots/events/${symbol}`, { params }).then((res: Record<string, unknown>) => {
      const data = (res.data as Record<string, unknown>) || res
      const events = (data['events'] as unknown[]) || []
      return Array.isArray(events) ? events : []
    })
  },

  /** 获取业绩报告列表 */
  getPerformanceReportList(params?: {
    page?: number; pageSize?: number; sortBy?: string; sortOrder?: string; reportType?: string; endYear?: string
  }) {
    return request.get('/cn/stocks/performance-reports', { params })
  },

  /** 搜索业绩报告 */
  searchPerformanceReport(params?: {
    keyword?: string; page?: number; pageSize?: number; sortBy?: string; sortOrder?: string; reportType?: string; endYear?: string
  }) {
    return request.get('/cn/stocks/performance-reports/search', { params })
  },

  /** 手动刷新业绩报告 */
  refreshPerformanceReports() {
    return request.post('/cn/stocks/performance-reports/refresh')
  },

  /** 获取业绩报告 AI 智能研判分析（亮点/风险词条 + 综合研判短文 + 多期财务数据） */
  getReportAnalysis(params: { symbol: string; endDate?: string }) {
    return request.get('/cn/stocks/performance-reports/analysis', { params })
  },

  /** 获取 AI 四维评分 */
  getAiScore(params: { symbol: string }) {
    return request.get('/cn/stocks/performance-reports/ai-analysis', { params })
  },
}

function normalizeForecast(res: Record<string, unknown> | null): ForecastData | null {
  if (!res) return null
  const epsList = (res['预测年报每股收益'] || res.epsList || []) as Record<string, unknown>[]
  const profitList = (res['预测年报净利润'] || res.profitList || []) as Record<string, unknown>[]
  const detailIndicators = (res['业绩预测详表_详细指标预测'] || res.predictions || []) as Record<string, unknown>[]
  // 提取按年份的净利润预测和增长率
  const predictions = profitList.map((p) => {
    const year = String(p['年度'] || p.year || '')
    const netProfit = (p['均值'] as string | number) || (p.mean as string | number) || '--'
    // 从详表中查找对应年份的净利润增长率
    let growth: number | string = '--'
    const growthRow = detailIndicators.find((r) =>
      String(r['预测指标'] || r.indicator || '').includes('净利润增长率')
    )
    if (growthRow) {
      const key = `预测${year}-平均`
      const raw = growthRow[key] || growthRow[`预测${year}`]
      if (raw && raw !== '--') {
        const num = parseFloat(String(raw).replace('%', '').replace(/,/g, ''))
        if (!isNaN(num)) growth = num
      }
    }
    return { year, netProfit, growth }
  })
  // 生成摘要文本（若无后端摘要）
  let summary = (res['摘要'] as string) || (res.summary as string) || ''
  if (!summary && epsList.length > 0 && profitList.length > 0) {
    const first = epsList[0]
    const year = String(first['年度'] || first.year || '')
    const orgCount = (first['预测机构数'] as number) || (first.orgCount as number) || 0
    const meanEPS = (first['均值'] as string) || (first.mean as string) || '--'
    const profitItem = profitList.find((x) => String(x['年度'] || x.year) === String(year))
    const profitMean = profitItem ? ((profitItem['均值'] as string) || (profitItem.mean as string) || '--') : '--'
    summary = `截至${new Date().toISOString().split('T')[0]}，6个月以内共有 ${orgCount} 家机构作出预测；预测每股收益 ${meanEPS} 元，净利润 ${profitMean} 亿元。`
  }
  return {
    symbol: (res['股票代码'] as string) || (res.symbol as string) || '',
    summary,
    updateTime: (res['更新时间'] as string) || (res.update_time as string) || '',
    netProfitYoy: (res['净利润同比(%)'] as number) ?? (res.netProfitYoy as number) ?? null,
    predictions,
    detailIndicators,
    epsList,
    profitList,
    rawData: res,
  }
}

/** 趋势股评分归一化：处理四维结构（技术面/行业赛道景气/消息面催化/基本面），基本面维度含 subDimensions */
function normalizeTrendScore(res: Record<string, unknown> | null): TrendScoreData | null {
  if (!res) return null
  // 一票否决
  if (res.vetoed === true) {
    return {
      vetoed: true,
      reasons: (res.reasons as string[]) || [],
      symbol: (res.symbol as string) || '',
      score: 0,
      label: '',
      expectedMultiple: '',
      description: '',
      aiConclusion: '',
      dimScores: [],
      dimensions: [],
      updatedAt: '',
      scoreDate: '',
      rawData: res,
    }
  }
  const dimensions = (res.dimensions || []) as Record<string, unknown>[]
  const dimScores = (res.dimScores as number[]) || (res.dim_scores as number[]) || dimensions.map((d) => (d.score as number) || 0)
  // 清洗指标无效值
  const cleanIndicators = (inds: Record<string, unknown>[] | undefined): TrendIndicator[] => (inds || []).map((ind) => ({
    name: (ind.name as string) || '',
    key: (ind.key as string) || '',
    value: isInvalidValue(ind.value) ? '--' : (String(ind.value) || '--'),
    score: (ind.score as number) || 0,
  }))
  return {
    vetoed: false,
    score: Number(res.score) || 0,
    label: (res.label as string) || '',
    expectedMultiple: (res.expectedMultiple as string) || (res.expected_multiple as string) || '',
    description: (res.description as string) || '',
    aiConclusion: (res.aiConclusion as string) || (res.ai_conclusion as string) || '',
    dimScores,
    dimensions: dimensions.map((d): TrendDimension => {
      const dim: TrendDimension = {
        name: (d.name as string) || '',
        weight: (d.weight as number) || 0,
        score: (d.score as number) || 0,
        indicators: cleanIndicators(d.indicators as Record<string, unknown>[] | undefined),
      }
      // 基本面维度：提取 detail.subDimensions 作为子维度展示
      const detail = d.detail as Record<string, unknown> | undefined
      const subDims = (detail?.subDimensions || d.subDimensions) as Record<string, unknown>[] | undefined
      if (Array.isArray(subDims) && subDims.length) {
        dim.subDimensions = subDims.map((sub): TrendSubDimension => ({
          name: (sub.name as string) || '',
          weight: (sub.weight as number) || 0,
          score: (sub.score as number) || 0,
          indicators: cleanIndicators(sub.indicators as Record<string, unknown>[] | undefined),
        }))
      }
      // 提取 detail 中的展示字段（技术面 kline、行业赛道 sectorName 等）
      if (detail) {
        dim.detail = detail
      }
      return dim
    }),
    updatedAt: (res.updatedAt as string) || (res.updated_at as string) || '',
    scoreDate: (res.scoreDate as string) || (res.score_date as string) || '',
    rawData: res,
  }
}

function aggregateYearlyKLines(items: KLineItem[]): KLineItem[] {
  const byYear = new Map<string, KLineItem[]>()
  items.forEach(item => {
    const year = String(item.date || '').slice(0, 4)
    if (!/^\d{4}$/.test(year)) return
    const list = byYear.get(year) || []
    list.push(item)
    byYear.set(year, list)
  })
  return Array.from(byYear.entries())
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, list]) => {
      const sorted = [...list].sort((a, b) => String(a.date).localeCompare(String(b.date)))
      const first = sorted[0]
      const last = sorted[sorted.length - 1]
      const lows = sorted.map(item => item.low || 0).filter(value => value > 0)
      return {
        date: year,
        open: first?.open ?? 0,
        close: last?.close ?? 0,
        high: Math.max(...sorted.map(item => item.high || 0)),
        low: lows.length ? Math.min(...lows) : 0,
        volume: sorted.reduce((sum, item) => sum + (item.volume || 0), 0),
      }
    })
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
