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

/** 每日 intraday 快照（盘前/正午/盘后），缺失为 null */
export interface FearGreedSnapshot {
  date: string
  pre: number | null
  noon: number | null
  post: number | null
}

/** DB 历史快照集合：日级 composite 均值 + 每日3次快照 */
export interface FearGreedHistorySnapshots {
  index_key: string
  dates: string[]              // 升序
  composite: number[]          // 升序 - 每日均值，用于中热度线/均线
  snapshots: FearGreedSnapshot[] // 升序 - 每日3次快照，用于短热度线
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
  historySnapshots?: FearGreedHistorySnapshots
}

export const fearGreedApi = {
  /** 获取韭圈儿恐贪指数主面板数据 */
  getDashboard(index = 'jq') {
    return request.get<FearGreedDashboard>('/fear-greed/dashboard', { params: { index } })
  },
}
