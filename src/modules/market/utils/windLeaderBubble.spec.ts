import { describe, expect, it } from 'vitest'
import {
  TODAY_BUBBLE_GREEN_SCALE,
  TODAY_BUBBLE_NEUTRAL,
  TODAY_BUBBLE_RED_SCALE,
  calcTodayBubbleColor,
  calcTodayBubbleRadius,
} from './windLeaderBubble'

describe('calcTodayBubbleRadius：成交额线性映射', () => {
  it('20~50px 线性', () => {
    expect(calcTodayBubbleRadius(0, 100)).toBe(20)
    expect(calcTodayBubbleRadius(50, 100)).toBe(35)
    expect(calcTodayBubbleRadius(100, 100)).toBe(50)
  })

  it('空值 / 0 / 非法值归一为最小半径', () => {
    expect(calcTodayBubbleRadius(null, 0)).toBe(20)
    expect(calcTodayBubbleRadius(undefined, 100)).toBe(20)
    expect(calcTodayBubbleRadius(Number.NaN, 100)).toBe(20)
  })

  it('超过最大成交额封顶 50px', () => {
    expect(calcTodayBubbleRadius(200, 100)).toBe(50)
  })
})

describe('calcTodayBubbleColor：红 9 + 绿 9 + 灰 1', () => {
  it('平盘与无数据为灰', () => {
    expect(calcTodayBubbleColor(0)).toBe(TODAY_BUBBLE_NEUTRAL)
    expect(calcTodayBubbleColor(null)).toBe(TODAY_BUBBLE_NEUTRAL)
    expect(calcTodayBubbleColor(undefined)).toBe(TODAY_BUBBLE_NEUTRAL)
  })

  it('上涨每 1% 一档，共 9 档，越涨越深', () => {
    expect(calcTodayBubbleColor(0.2)).toBe(TODAY_BUBBLE_RED_SCALE[0])
    expect(calcTodayBubbleColor(1)).toBe(TODAY_BUBBLE_RED_SCALE[0])
    expect(calcTodayBubbleColor(1.01)).toBe(TODAY_BUBBLE_RED_SCALE[1])
    expect(calcTodayBubbleColor(2)).toBe(TODAY_BUBBLE_RED_SCALE[1])
    expect(calcTodayBubbleColor(5.5)).toBe(TODAY_BUBBLE_RED_SCALE[5])
    expect(calcTodayBubbleColor(8)).toBe(TODAY_BUBBLE_RED_SCALE[7])
    expect(calcTodayBubbleColor(9)).toBe(TODAY_BUBBLE_RED_SCALE[8])
    expect(calcTodayBubbleColor(20)).toBe(TODAY_BUBBLE_RED_SCALE[8])
  })

  it('下跌按绝对值每 1% 一档，共 9 档，越跌越深', () => {
    expect(calcTodayBubbleColor(-0.5)).toBe(TODAY_BUBBLE_GREEN_SCALE[0])
    expect(calcTodayBubbleColor(-3)).toBe(TODAY_BUBBLE_GREEN_SCALE[2])
    expect(calcTodayBubbleColor(-8)).toBe(TODAY_BUBBLE_GREEN_SCALE[7])
    expect(calcTodayBubbleColor(-9)).toBe(TODAY_BUBBLE_GREEN_SCALE[8])
    expect(calcTodayBubbleColor(-20)).toBe(TODAY_BUBBLE_GREEN_SCALE[8])
  })
})
