import request from '../request'

export interface SelectionLiveQuote {
  symbol: string
  price: number | null
  changeAmount: number | null
  changePct: number | null
  tradeDate?: string | null
}
function quoteNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const quoteCache = new Map<string, { quote: SelectionLiveQuote; savedAt: number }>()
const QUOTE_CACHE_MS = 60_000

export interface AiStockSelectionItem {
  rank: number
  symbol: string
  name: string
  industry?: string | null
  recommendationLevel: '较高' | '中等' | '关注' | string
  reason: string[]
  riskTip: string
  price?: number | null
  changePct?: number | null
  /** 后端基于真实日 K 收盘价返回的最近 20 个交易日序列 */
  sparkline?: number[]
  matchedMethods?: string[]
  matchedTags?: string[]
  compositeScore?: number
  signals?: Array<{ method: string; rank: number; score: number; reason: string[]; metrics: Record<string, number>; invalidation: string }>
}

export interface AiStockSelectionLatest {
  runId: number
  tradeDate: string
  status: 'generating' | 'ready' | 'failed'
  candidateCount: number
  dataAsOf?: string | null
  generatedAt?: string | null
  summary?: string | null
  errorMessage?: string | null
  stocks: AiStockSelectionItem[]
}

export interface MethodSelectionResult {
  runId: string | null
  tradeDate: string | null
  expectedTradeDate: string
  dataAsOf: string | null
  generatedAt: string | null
  status: 'ready' | 'generating' | 'failed' | 'empty' | 'stale' | 'unavailable'
  candidateCount: number
  summary: string
  stocks: AiStockSelectionItem[]
}

/** 读取服务端最近一次 AI 帮我选生成结果；普通用户只有读取权限。 */
export const aiStockSelectionApi = {
  /** Recent real quotes only; never use the recommendation's closing-price snapshot as live data. */
  getCachedQuotes(symbols: string[]): Record<string, SelectionLiveQuote> {
    const now = Date.now()
    for (const [symbol, entry] of quoteCache) if (now < entry.savedAt || now - entry.savedAt >= QUOTE_CACHE_MS) quoteCache.delete(symbol)
    return Object.fromEntries(symbols.flatMap(symbol => {
      const entry = quoteCache.get(symbol)
      return entry ? [[symbol, entry.quote]] : []
    }))
  },
  /** Tencent core batch skips activity's slow supplementary Tushare fields. */
  async getQuotes(symbols: string[]): Promise<SelectionLiveQuote[]> {
    if (!symbols.length) return []
    const res = await request.get<Record<string, unknown>>('/cn/stock/quotes/core', {
      params: { symbols: [...new Set(symbols)].join(',') },
    })
    const data = (res.data as Record<string, unknown>) || res
    const rows = Array.isArray(data['行情']) ? data['行情'] as Record<string, unknown>[] : []
    const quotes = rows.map(q => {
      const rawPrice = quoteNumber(q['最新价'])
      const price = rawPrice !== null && rawPrice > 0 ? rawPrice : null
      const date = String(q['行情时间'] || '').match(/^(\d{4})-?(\d{2})-?(\d{2})/)
      return { symbol: String(q['股票代码'] || ''), price,
        tradeDate: date ? `${date[1]}-${date[2]}-${date[3]}` : null,
        changeAmount: price === null ? null : quoteNumber(q['涨跌额']),
        changePct: price === null ? null : quoteNumber(q['涨跌幅']),
      }
    })
    for (const quote of quotes) if (quote.price !== null) quoteCache.set(quote.symbol, { quote, savedAt: Date.now() })
    return quotes
  },
  getResults(horizon: 'short' | 'swing', methods: string[]) {
    return request.get<MethodSelectionResult>('/stock-selection/results', {
      params: { horizon, methods: [...methods].sort().join(','), mode: 'blend', limit: 15 },
    })
  },
  getLatest(date?: string) {
    return request.get<AiStockSelectionLatest>('/ai-stock-selection/latest', {
      params: date ? { date } : undefined,
    })
  },
}
