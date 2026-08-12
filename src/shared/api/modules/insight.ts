// src/shared/api/modules/insight.ts
import request from '../request'

export interface InsightDriver {
  label: string
  category: 'industry_theme' | 'company_event' | 'earnings' | 'market' | 'trading_sentiment'
  confidence: 'high' | 'medium' | 'low'
  evidence_quote?: string
  source_ids?: string[]
}

export interface WatchlistInsight {
  event_id: string
  symbol: string
  stock_name: string
  trade_date: string
  event_type: 'limit_up_radar' | 'midday_price_move' | 'close_price_move'
  direction: 'up' | 'down'
  move_bps?: number
  open_price?: number
  latest_price?: number
  price_source?: 'realtime_snapshot' | 'kline_backfill'
  attribution_status: 'confirmed' | 'unconfirmed' | null
  confidence?: 'high' | 'medium' | 'low' | 'unconfirmed'
  primary_driver?: InsightDriver | null
  secondary_drivers?: InsightDriver[]
  display_report?: { summary?: string; details?: string }
  created_at?: string
  title?: string
  keywords?: string[]
  source_url?: string
  published_at?: string
}

export const watchlistInsightApi = {
  getInsights(): Promise<WatchlistInsight[]> {
    return request.get<WatchlistInsight[]>('/cn/favorites/insights')
  },
  getInsightDetail(eventId: string): Promise<WatchlistInsight> {
    return request.get<WatchlistInsight>(`/cn/favorites/insights/${eventId}`)
  },
}
