import { describe, it, expect } from 'vitest'
import {
  AXIS_LOCK_PX,
  dragProgress,
  lerp,
  resolveDragAxis,
  resolveSwipeDirection,
  rotateOrder,
  tiltDegrees,
} from './cardStackSwipe'

describe('resolveDragAxis 手势主轴锁定', () => {
  it('位移未达锁定阈值时返回 none（手指抖动不算滑动）', () => {
    expect(resolveDragAxis(0, 0)).toBe('none')
    expect(resolveDragAxis(5, 2)).toBe('none')
    expect(resolveDragAxis(-3, -6)).toBe('none')
  })

  it('阈值边界：等于 AXIS_LOCK_PX 即锁定', () => {
    expect(resolveDragAxis(AXIS_LOCK_PX, 0)).toBe('horizontal')
    expect(resolveDragAxis(0, AXIS_LOCK_PX)).toBe('vertical')
  })

  it('横向位移占优锁定为 horizontal（含左滑负值）', () => {
    expect(resolveDragAxis(40, 10)).toBe('horizontal')
    expect(resolveDragAxis(-30, 12)).toBe('horizontal')
  })

  it('纵向位移占优锁定为 vertical（保留原有上下滑动）', () => {
    expect(resolveDragAxis(10, 40)).toBe('vertical')
    expect(resolveDragAxis(-12, -30)).toBe('vertical')
  })
})

describe('dragProgress 跟手进度', () => {
  it('按 |dx| / switchPx 线性给出 0~1', () => {
    expect(dragProgress(0, 120)).toBe(0)
    expect(dragProgress(60, 120)).toBe(0.5)
    expect(dragProgress(-90, 120)).toBe(0.75)
  })

  it('超过切换距离截断为 1（下层卡不再继续升起）', () => {
    expect(dragProgress(120, 120)).toBe(1)
    expect(dragProgress(-400, 120)).toBe(1)
  })
})

describe('resolveSwipeDirection 松手切换判定', () => {
  it('|dx| 达到切换距离才切换：左滑看下一张、右滑看上一张', () => {
    expect(resolveSwipeDirection(-120, 120)).toBe(-1)
    expect(resolveSwipeDirection(120, 120)).toBe(1)
  })

  it('未达阈值返回 0（回弹归位）', () => {
    expect(resolveSwipeDirection(0, 120)).toBe(0)
    expect(resolveSwipeDirection(-119, 120)).toBe(0)
    expect(resolveSwipeDirection(119, 120)).toBe(0)
  })
})

describe('tiltDegrees 跟手倾斜', () => {
  it('与位移成正比，方向随位移翻转', () => {
    expect(tiltDegrees(0, 6, 240)).toBe(0)
    expect(tiltDegrees(120, 6, 240)).toBe(3)
    expect(tiltDegrees(-120, 6, 240)).toBe(-3)
  })

  it('按 capPx 截断，避免大幅拖动时翻转过度', () => {
    expect(tiltDegrees(400, 6, 240)).toBe(6)
    expect(tiltDegrees(-400, 6, 240)).toBe(-6)
  })
})

describe('lerp 线性插值', () => {
  it('端点与中点取值正确（进度驱动下层卡升位）', () => {
    expect(lerp(46, 0, 0)).toBe(46)
    expect(lerp(46, 0, 0.5)).toBe(23)
    expect(lerp(46, 0, 1)).toBe(0)
    expect(lerp(0.9, 1, 0.5)).toBe(0.95)
  })
})

describe('rotateOrder 展示顺序循环轮转', () => {
  const order = ['a', 'b', 'c']

  it('dir=-1（看下一张）首位移到末尾', () => {
    expect(rotateOrder(order, -1)).toEqual(['b', 'c', 'a'])
  })

  it('dir=1（看上一张）末位移到首位', () => {
    expect(rotateOrder(order, 1)).toEqual(['c', 'a', 'b'])
  })

  it('dir=0 保持原顺序', () => {
    expect(rotateOrder(order, 0)).toEqual(['a', 'b', 'c'])
  })

  it('不改写入参（返回新数组）', () => {
    rotateOrder(order, -1)
    expect(order).toEqual(['a', 'b', 'c'])
  })

  it('单元素与空数组为恒等变换', () => {
    expect(rotateOrder(['a'], -1)).toEqual(['a'])
    expect(rotateOrder(['a'], 1)).toEqual(['a'])
    expect(rotateOrder([], -1)).toEqual([])
  })
})
