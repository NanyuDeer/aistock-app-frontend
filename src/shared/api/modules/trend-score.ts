import request from '../request'

export interface TrendIndicator {
  name: string
  key: string
  value: string
  score: number
}

export interface TrendKLineData {
  dates: string[]
  ohlc: [number, number, number, number][]
}

export interface TrendTechnicalDetail {
  kline: TrendKLineData
  conceptKline: TrendKLineData & { name: string }
  indicators: {
    lowPointGain: number
    ma60Position: 'above' | 'below'
    ma60Trend: 'up' | 'flat' | 'down'
    isNewHigh250: boolean
    isNewHigh120: boolean
    maxDrawdown: number
  }
}

export interface TrendTrackDetail {
  sectorListCount60d: number
  sectorName: string
  marketRecognition: number
  policyTrend: string
  weeklyListingTrend?: number[]
  sectorStrength?: string
  policyItems?: Array<{ name: string; desc: string; color: 'up' | 'gold' }>
}

export interface TrendNewsItem {
  title: string
  summary: string
  source: string
  publishTime: string
  url?: string
  sentiment?: 'positive' | 'negative' | 'neutral'
}

export interface TrendNewsDetail {
  news: TrendNewsItem[]
  researchCount: number
  hardCatalyst: string
}

export interface FundamentalSubDimension {
  name: string
  weight: number
  score: number
  indicators: TrendIndicator[]
}

export interface TrendFundamentalDetail {
  subDimensions: FundamentalSubDimension[]
}

export type TrendDimensionDetail =
  | TrendTechnicalDetail
  | TrendTrackDetail
  | TrendNewsDetail
  | TrendFundamentalDetail

export interface TrendDimension {
  name: string
  weight: number
  score: number
  indicators: TrendIndicator[]
  detail: TrendDimensionDetail
}

export interface TrendScoreListItem {
  symbol: string
  name: string
  industry: string
  score: number
  label: string
  expectedMultiple: string
  scoreDate: string
  dimScores: number[]
  description: string
}

export interface TrendScoreDetail {
  symbol?: string
  score: number
  scoreDate?: string
  label: string
  expectedMultiple: string
  description: string
  aiConclusion?: string
  dimScores: number[]
  dimensions: TrendDimension[]
  updatedAt: string
}

export interface TrendScoreVetoed {
  vetoed: true
  symbol: string
  reasons: string[]
  avgAmount?: number
  isSt?: boolean
}

export const trendScoreApi = {
  getTop(limit = 30) {
    return request.get<TrendScoreListItem[]>('/cn/stocks/trend-score/top', { params: { limit } })
  },

  getDetail(symbol: string) {
    return request.get<TrendScoreDetail | TrendScoreVetoed>(`/cn/stocks/${symbol}/trend-score/detail`)
  },
}

export function isTrendScoreVetoed(
  value: TrendScoreDetail | TrendScoreVetoed,
): value is TrendScoreVetoed {
  return 'vetoed' in value && value.vetoed === true
}
