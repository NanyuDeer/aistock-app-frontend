import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import FloatingStockAlertCards from './FloatingStockAlertCards.vue'
import type { StockAlertCard } from '@/shared/utils/useStockAlerts'

vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name', 'size', 'color'], template: '<view class="svg-stub" />' },
}))

// rpx2px 在 H5 分支固定按 390px 基准换算 → SWITCH_DISTANCE_PX = 240 * 390 / 750 = 124.8px
const CARD_HEIGHT_PX = 120

const selectorQuery = {
  in: () => selectorQuery,
  selectAll: () => selectorQuery,
  boundingClientRect: () => selectorQuery,
  exec: () => undefined,
}

vi.stubGlobal('uni', {
  getSystemInfoSync: vi.fn(() => ({ windowWidth: 390, windowHeight: 844 })),
  createSelectorQuery: vi.fn(() => selectorQuery),
})

function makeCard(symbol: string, stockName: string): StockAlertCard {
  return {
    symbol,
    stockName,
    direction: 'up',
    changePct: 1.23,
    isLimitUp: false,
    timeText: '09:30',
    rows: [{ key: 'price_movement', label: '异动', title: `${stockName}快速拉升`, count: 1 }],
    totalCount: 1,
    unreadCount: 1,
    sortTime: 1,
  }
}

const CARDS: StockAlertCard[] = [
  makeCard('SH600000', '平安银行'),
  makeCard('SZ300750', '宁德时代'),
  makeCard('SH601318', '中国平安'),
]

let mounted: VueWrapper[] = []

function mountStack(): VueWrapper {
  const wrapper = mount(FloatingStockAlertCards, { props: { cards: CARDS }, attachTo: document.body })
  mounted.push(wrapper)
  return wrapper
}

/** 构造触摸事件：happy-dom 无 TouchEvent 构造器，直接给事件挂 touches/changedTouches */
function fireTouch(el: Element, type: string, x: number, y: number): void {
  const evt = new Event(type, { bubbles: true })
  const point = { clientX: x, clientY: y }
  Object.defineProperty(evt, 'touches', { value: type === 'touchend' || type === 'touchcancel' ? [] : [point] })
  Object.defineProperty(evt, 'changedTouches', { value: [point] })
  el.dispatchEvent(evt)
}

function cards(wrapper: VueWrapper): VueWrapper[] {
  return wrapper.findAll('.fsac__card') as unknown as VueWrapper[]
}

function styleOf(el: VueWrapper): string {
  return el.attributes('style') ?? ''
}

function topCardName(wrapper: VueWrapper): string {
  return cards(wrapper)[0].find('.fsac__name').text()
}

function translateXOf(el: VueWrapper): number {
  const matched = /translateX\((-?[\d.]+)px\)/.exec(styleOf(el))
  return matched ? Number(matched[1]) : 0
}

function scaleOf(el: VueWrapper): number {
  const matched = /scale\(([\d.]+)\)/.exec(styleOf(el))
  return matched ? Number(matched[1]) : 1
}

function bottomOf(el: VueWrapper): number {
  const matched = /bottom:\s*(-?[\d.]+)px/.exec(styleOf(el))
  return matched ? Number(matched[1]) : 0
}

/** 横向拖动到指定位移后保持按住 */
async function dragTo(wrapper: VueWrapper, dx: number): Promise<void> {
  const top = cards(wrapper)[0].element
  fireTouch(top, 'touchstart', 200, 400)
  fireTouch(top, 'touchmove', 200 + dx, 400)
  await nextTick()
}

function releaseAt(wrapper: VueWrapper, x: number, y: number): void {
  fireTouch(cards(wrapper)[0].element, 'touchend', x, y)
}

describe('FloatingStockAlertCards 左右跟手堆叠滑动（方案 A）', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // happy-dom 无布局，offsetHeight 恒为 0 会导致「未测高只渲染顶层卡」，此处给出可信高度
    Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => CARD_HEIGHT_PX,
    })
  })

  afterEach(() => {
    mounted.forEach((w) => w.unmount())
    mounted = []
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('拖动中上层卡 1:1 跟手位移并关闭 CSS 过渡', async () => {
    const wrapper = mountStack()
    await nextTick()
    await dragTo(wrapper, -60)

    const top = cards(wrapper)[0]
    expect(translateXOf(top)).toBe(-60)
    expect(top.classes()).toContain('is-dragging')
    // 跟手阶段必须无过渡，否则卡片会滞后于手指
    expect(styleOf(top)).toContain('rotate(-1.92')
  })

  it('拖动进度驱动下一张卡升位（底边下移、放大、变清晰）', async () => {
    const wrapper = mountStack()
    await nextTick()
    const next = cards(wrapper)[1]
    const restingBottom = bottomOf(next)
    const restingScale = scaleOf(next)
    expect(restingBottom).toBeGreaterThan(0)
    expect(restingScale).toBeLessThan(1)

    await dragTo(wrapper, -60)
    // 进度 = 60 / 124.8 ≈ 0.48 → 底边按比例向完整展开位（0）收敛
    expect(bottomOf(next)).toBeCloseTo(restingBottom * (1 - 60 / 124.8), 1)
    expect(scaleOf(next)).toBeGreaterThan(restingScale)
  })

  it('左滑达到切换距离：上层卡飞出后顺序轮转（看下一张）', async () => {
    const wrapper = mountStack()
    await nextTick()
    expect(topCardName(wrapper)).toBe('平安银行')

    await dragTo(wrapper, -160)
    releaseAt(wrapper, 40, 400)
    vi.advanceTimersByTime(300)
    await nextTick()

    expect(topCardName(wrapper)).toBe('宁德时代')
    expect(cards(wrapper)).toHaveLength(3)
    // 轮转后回到静态堆叠位（无残余位移）
    expect(translateXOf(cards(wrapper)[0])).toBe(0)
  })

  it('右滑达到切换距离：顺序反向轮转（看上一张）', async () => {
    const wrapper = mountStack()
    await nextTick()

    await dragTo(wrapper, 160)
    releaseAt(wrapper, 360, 400)
    vi.advanceTimersByTime(300)
    await nextTick()

    expect(topCardName(wrapper)).toBe('中国平安')
  })

  it('未达切换距离：回弹归位且顺序不变', async () => {
    const wrapper = mountStack()
    await nextTick()

    await dragTo(wrapper, -60)
    releaseAt(wrapper, 140, 400)
    vi.advanceTimersByTime(300)
    await nextTick()

    expect(topCardName(wrapper)).toBe('平安银行')
    expect(translateXOf(cards(wrapper)[0])).toBe(0)
    expect(cards(wrapper)[0].classes()).not.toContain('is-dragging')
  })

  it('触摸被系统中断：直接回弹归位', async () => {
    const wrapper = mountStack()
    await nextTick()

    await dragTo(wrapper, -60)
    fireTouch(cards(wrapper)[0].element, 'touchcancel', 140, 400)
    await nextTick()

    expect(translateXOf(cards(wrapper)[0])).toBe(0)
    expect(cards(wrapper)[0].classes()).not.toContain('is-dragging')
  })

  it('保留上下滑动：上滑看下一张、下滑看上一张，且不产生横向跟手位移', async () => {
    const wrapper = mountStack()
    await nextTick()
    const top = cards(wrapper)[0].element

    fireTouch(top, 'touchstart', 200, 400)
    fireTouch(top, 'touchmove', 200, 340)
    await nextTick()
    // 纵向手势不进入跟手：无 is-dragging、无横向位移
    expect(cards(wrapper)[0].classes()).not.toContain('is-dragging')
    expect(translateXOf(cards(wrapper)[0])).toBe(0)

    fireTouch(top, 'touchend', 200, 340)
    await nextTick()
    expect(topCardName(wrapper)).toBe('宁德时代')

    fireTouch(top, 'touchstart', 200, 400)
    fireTouch(top, 'touchend', 200, 460)
    await nextTick()
    expect(topCardName(wrapper)).toBe('平安银行')
  })

  it('小程序（非 H5/App）不启用横向跟手拖动，仅保留上下滑动', async () => {
    vi.resetModules()
    vi.doMock('@/shared/utils/platform', () => ({ isH5: false, isApp: false, isMp: true }))
    const { default: MpComponent } = await import('./FloatingStockAlertCards.vue')
    const wrapper = mount(MpComponent, { props: { cards: CARDS }, attachTo: document.body })
    mounted.push(wrapper as unknown as VueWrapper)
    await nextTick()

    const top = cards(wrapper as unknown as VueWrapper)[0]
    fireTouch(top.element, 'touchstart', 200, 400)
    fireTouch(top.element, 'touchmove', 40, 400)
    await nextTick()
    expect(translateXOf(top)).toBe(0)

    fireTouch(top.element, 'touchend', 40, 400)
    vi.advanceTimersByTime(300)
    await nextTick()
    expect(top.find('.fsac__name').text()).toBe('平安银行')
  })
})
