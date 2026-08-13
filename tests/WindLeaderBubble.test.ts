import { describe, expect, it } from 'vitest'
import {
  calcBubbleColor,
  calcBubbleRadius,
  getSectorDays,
  getSectorStrength,
} from '@/modules/market/utils/windLeaderBubble'
import type { WindLeaderSector } from '@/shared/api/modules/stock'

describe('calcBubbleRadius', () => {
  it('长线 30 天 → 27.5（120 天满格线性）', () => expect(calcBubbleRadius('long', 30)).toBe(27.5))
  it('长线 0 天 → 20（下限）', () => expect(calcBubbleRadius('long', 0)).toBe(20))
  it('长线 120 天 → 50（满格上限）', () => expect(calcBubbleRadius('long', 120)).toBe(50))
  it('长线 90 天 → 42.5', () => expect(calcBubbleRadius('long', 90)).toBe(42.5))
  it('短线 5 天 → 35（10 天满格）', () => expect(calcBubbleRadius('short', 5)).toBe(35))
  it('短线 30 天 → 50（封顶）', () => expect(calcBubbleRadius('short', 30)).toBe(50))
})

describe('calcBubbleColor', () => {
  it('长线 0.5 → 普通蓝', () => expect(calcBubbleColor('long', 0.5)).toBe('rgb(59, 130, 246)'))
  it('长线 0.3 → 最浅蓝', () => expect(calcBubbleColor('long', 0.3)).toBe('rgb(219, 234, 254)'))
  it('越界值收敛到 0.1~0.9 档位内', () => {
    expect(calcBubbleColor('long', 2)).toBe('rgb(18, 26, 68)')
    expect(calcBubbleColor('long', -1)).toBe('rgb(219, 234, 254)')
  })
})

describe('getSectorDays / getSectorStrength', () => {
  const both: WindLeaderSector = {
    name: '光伏', cycle: 'both',
    ai_analysis: { long_term_days: 45, long_confidence: 0.8, short_term_days: 5, short_heat: 0.6 },
  }
  it('长线取 long_term_days', () => expect(getSectorDays(both, 'long')).toBe(45))
  it('短线取 short_term_days', () => expect(getSectorDays(both, 'short')).toBe(5))
  it('长线取 long_confidence', () => expect(getSectorStrength(both, 'long')).toBe(0.8))
  it('短线取 short_heat', () => expect(getSectorStrength(both, 'short')).toBe(0.6))
  it('缺省 0', () => expect(getSectorDays({ name: 'x' }, 'long')).toBe(0))
})
