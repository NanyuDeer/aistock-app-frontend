/**
 * 动态估值 API
 */
import request from '../request'

export interface ValuationDimension {
  label: string
  score: number
  comment?: string
}

export interface ValuationData {
  symbol: string
  level: string
  score: number
  dimensions: Record<string, ValuationDimension> | ValuationDimension[]
  narrative: string
}

export const valuationApi = {
  /** 获取个股动态估值 */
  get(symbol: string) {
    return request.get<ValuationData>(`/agent/valuation/${symbol}`)
  }
}
