import request from '../request'

/** 恐贪指数首页主面板数据（后端 /api/fear-greed/dashboard 返回的 data 体） */
export interface FearGreedPieItem {
  name: string
  value: number
  color: string
}

export interface FearGreedBarItem {
  label: string
  value: number
  color: string
}

export interface FearGreedLineData {
  currentIndex: number
  neutralLine: number
  recentValues: number[]
  dates: string[]
}

export interface FearGreedHistory {
  dates: string[]
  scores: number[]
}

export interface FearGreedIndicator {
  key: string
  name: string
  desc: string
  score: number
  raw: number
  label: string
  history: FearGreedHistory
  excluded?: boolean
}

export interface FearGreedDashboard {
  updateTime: string
  indexName: string
  currentIndex: number
  label: string
  pieData: FearGreedPieItem[]
  barData: FearGreedBarItem[]
  lineData: FearGreedLineData
  updateProgress: { fearGreed: number; indexValue: number }
  indicators: FearGreedIndicator[]
  history: FearGreedHistory
}

export const fearGreedApi = {
  /** 获取韭圈儿恐贪指数主面板数据 */
  getDashboard(index = 'jq') {
    return request.get<FearGreedDashboard>('/fear-greed/dashboard', { params: { index } })
  },
}
