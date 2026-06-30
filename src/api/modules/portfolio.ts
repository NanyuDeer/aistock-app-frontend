/**
 * 持仓陪伴 API
 */
import request from '../request'

export interface HoldingStock {
  symbol: string
  name: string
  costPrice: number
  amount: number
  currentPrice?: number
  changePercent?: number
}

export interface PortfolioOverview {
  totalCost: number
  totalValue: number
  totalProfit: number
  totalProfitPercent: number
  holdings: HoldingStock[]
}

export const portfolioApi = {
  /** 获取持仓概览 */
  getOverview() {
    return request.get<PortfolioOverview>('/agent/portfolio/overview')
  },

  /** 获取异动提醒列表 */
  getAlertList() {
    return request.get('/agent/alert/list')
  },

  /** 订阅异动提醒 */
  subscribeAlert(symbols: string[]) {
    return request.post('/agent/alert/subscribe', { symbols })
  }
}
