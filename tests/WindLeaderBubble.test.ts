import { describe, expect, it } from 'vitest'
import {
  calcBubbleOpacity,
  calcBubbleRadius,
  getSectorDays,
  getSectorStrength,
} from '@/modules/market/utils/windLeaderBubble'
import type { WindLeaderSector } from '@/shared/api/modules/stock'

describe('calcBubbleRadius', () => {
  it('长线 30 天 → 44', () => expect(calcBubbleRadius('long', 30)).toBe(44))
  it('长线 0 天 → 26', () => expect(calcBubbleRadius('long', 0)).toBe(26))
  it('长线 90 天 → 封顶 65', () => expect(calcBubbleRadius('long', 90)).toBe(65))
  it('短线 5 天 → 32', () => expect(calcBubbleRadius('short', 5)).toBe(32))
  it('短线 30 天 → 62', () => expect(calcBubbleRadius('short', 30)).toBe(62))
})

describe('calcBubbleOpacity', () => {
  it('置信度 0.8 → 0.88', () => expect(calcBubbleOpacity('long', 0.8)).toBeCloseTo(0.88))
  it('热度 0.5 → 0.7', () => expect(calcBubbleOpacity('short', 0.5)).toBeCloseTo(0.7))
  it('越界值收敛到 0~1', () => {
    expect(calcBubbleOpacity('long', 2)).toBe(1)
    expect(calcBubbleOpacity('long', -1)).toBe(0.4)
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
