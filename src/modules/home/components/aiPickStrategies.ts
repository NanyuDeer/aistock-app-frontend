export type HorizonCode = 'ai' | 'short' | 'swing' | 'long'

export interface PickMethod {
  code: string
  name: string
}

/** Phase 1 methods; the remaining catalogue remains visible but cannot silently fall back to AI results. */
export const availableMethodCodes = new Set(['volume_breakout', 'momentum_continuation', 'trend_following', 'pullback_stabilization'])

export const horizons: Array<{ code: HorizonCode; name: string }> = [
  { code: 'ai', name: 'AI综合' },
  { code: 'short', name: '短线机会' },
  { code: 'swing', name: '波段趋势' },
  { code: 'long', name: '中长线配置' },
]

export const methodsByHorizon: Record<Exclude<HorizonCode, 'ai'>, PickMethod[]> = {
  short: [
    { code: 'event_catalyst', name: '事件催化' },
    { code: 'volume_breakout', name: '放量突破' },
    { code: 'momentum_continuation', name: '强势延续' },
    { code: 'limit_up_breakout', name: '涨停打板' },
  ],
  swing: [
    { code: 'trend_following', name: '趋势跟随' },
    { code: 'pullback_stabilization', name: '回踩企稳' },
    { code: 'earnings_revision', name: '盈利预期上修' },
    { code: 'industry_strength', name: '行业强势' },
  ],
  long: [
    { code: 'quality_growth', name: '优质成长' },
    { code: 'garp', name: '合理估值成长' },
    { code: 'stable_dividend', name: '红利稳健' },
  ],
}

export const legacyMethodCodes: Record<string, string> = {
  volume_price: 'volume_breakout',
  short_trend: 'momentum_continuation',
  earnings_improvement: 'earnings_revision',
  theme_rotation: 'industry_strength',
  growth: 'quality_growth',
}
