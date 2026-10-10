import request from '../request'

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

/** 读取服务端最近一次 AI 帮我选生成结果；普通用户只有读取权限。 */
export const aiStockSelectionApi = {
  getLatest(date?: string) {
    return request.get<AiStockSelectionLatest>('/ai-stock-selection/latest', {
      params: date ? { date } : undefined,
    })
  },
}
