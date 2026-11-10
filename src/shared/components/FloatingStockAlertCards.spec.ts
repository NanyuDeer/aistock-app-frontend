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

function translateYOf(el: VueWrapper): number {
  const matched = /translateY\((-?[\d.]+)px\)/.exec(styleOf(el))
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

/** 上滑拖动到指定位移后保持按住 */
async function dragUp(wrapper: VueWrapper, dy: number): Promise<void> {
  const top = cards(wrapper)[0].element
  fireTouch(top, 'touchstart', 200, 400)
  fireTouch(top, 'touchmove', 200, 400 - dy)
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

  it('上滑时上层卡 1:1 跟手位移并关闭 CSS 过渡', async () => {
    const wrapper = mountStack()
    await nextTick()
    await dragUp(wrapper, 60)

    const top = cards(wrapper)[0]
    expect(translateYOf(top)).toBe(-60)
    expect(top.classes()).toContain('is-dragging')
    // 跟手阶段必须无过渡，否则卡片会滞后于手指
    expect(styleOf(top)).toContain('translateY(-60px)')
  })

  it('拖动中下层卡保持静态堆叠位（不随拖动升位，切换改为点击置顶）', async () => {
    const wrapper = mountStack()
    await nextTick()
    const next = cards(wrapper)[1]
    const restingBottom = bottomOf(next)
    const restingScale = scaleOf(next)
    expect(restingBottom).toBeGreaterThan(0)
    expect(restingScale).toBeLessThan(1)

    await dragUp(wrapper, 60)
    expect(bottomOf(next)).toBeCloseTo(restingBottom, 1)
    expect(scaleOf(next)).toBeCloseTo(restingScale, 2)
  })

  it('左右滑动已取消：不跟手、不关闭', async () => {
    const wrapper = mountStack()
    await nextTick()
    expect(topCardName(wrapper)).toBe('平安银行')

    await dragTo(wrapper, -160)
    releaseAt(wrapper, 40, 400)
    vi.advanceTimersByTime(300)
    await nextTick()

    expect(translateXOf(cards(wrapper)[0])).toBe(0)
    expect(topCardName(wrapper)).toBe('平安银行')
    expect(wrapper.emitted('close')).toBeUndefined()

    await dragTo(wrapper, 160)
    releaseAt(wrapper, 360, 400)
    vi.advanceTimersByTime(300)
    await nextTick()

    expect(translateXOf(cards(wrapper)[0])).toBe(0)
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('下滑已取消：不跟手、不关闭', async () => {
    const wrapper = mountStack()
    await nextTick()
    const top = cards(wrapper)[0].element

    fireTouch(top, 'touchstart', 200, 400)
    fireTouch(top, 'touchmove', 200, 560)
    await nextTick()
    expect(translateYOf(cards(wrapper)[0])).toBe(0)

    fireTouch(top, 'touchend', 200, 560)
    vi.advanceTimersByTime(300)
    await nextTick()
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(topCardName(wrapper)).toBe('平安银行')
  })

  it('上滑未达阈值：回弹归位且不关闭', async () => {
    const wrapper = mountStack()
    await nextTick()

    await dragUp(wrapper, 60)
    releaseAt(wrapper, 200, 340)
    vi.advanceTimersByTime(300)
    await nextTick()

    expect(wrapper.emitted('close')).toBeUndefined()
    expect(topCardName(wrapper)).toBe('平安银行')
    expect(translateYOf(cards(wrapper)[0])).toBe(0)
    expect(cards(wrapper)[0].classes()).not.toContain('is-dragging')
  })

  it('触摸被系统中断：直接回弹归位', async () => {
    const wrapper = mountStack()
    await nextTick()

    await dragUp(wrapper, 60)
    fireTouch(cards(wrapper)[0].element, 'touchcancel', 200, 340)
    await nextTick()

    expect(translateYOf(cards(wrapper)[0])).toBe(0)
    expect(cards(wrapper)[0].classes()).not.toContain('is-dragging')
  })

  it('上滑达关闭阈值：卡片向上飞出后 emit close（叉掉该卡，不再用于切换）', async () => {
    const wrapper = mountStack()
    await nextTick()
    const top = cards(wrapper)[0].element

    fireTouch(top, 'touchstart', 200, 400)
    fireTouch(top, 'touchmove', 200, 260) // 上移 140px > 关闭阈值（220rpx ≈ 114.4px）
    await nextTick()
    // 跟手：只向上位移，不产生横向位移
    expect(translateYOf(cards(wrapper)[0])).toBe(-140)
    expect(translateXOf(cards(wrapper)[0])).toBe(0)
    expect(cards(wrapper)[0].classes()).toContain('is-dragging')

    fireTouch(top, 'touchend', 200, 260)
    vi.advanceTimersByTime(300)
    await nextTick()

    expect(wrapper.emitted('close')).toEqual([['SH600000']])
    // 关闭不是切换：顺序不轮转（真实场景由父组件把该卡从 cards 中移除）
    expect(topCardName(wrapper)).toBe('平安银行')
  })

  it('上滑未达关闭阈值：回弹归位，既不关闭也不切换', async () => {
    const wrapper = mountStack()
    await nextTick()
    const top = cards(wrapper)[0].element

    fireTouch(top, 'touchstart', 200, 400)
    fireTouch(top, 'touchmove', 200, 360) // 上移 40px，未达关闭阈值
    await nextTick()
    fireTouch(top, 'touchend', 200, 360)
    vi.advanceTimersByTime(300)
    await nextTick()

    expect(wrapper.emitted('close')).toBeUndefined()
    expect(translateYOf(cards(wrapper)[0])).toBe(0)
    expect(cards(wrapper)[0].classes()).not.toContain('is-dragging')
    expect(topCardName(wrapper)).toBe('平安银行')
  })

  it('H5 桌面：鼠标上下拖动同样叉掉卡片（电脑端演示）', async () => {
    const wrapper = mountStack()
    await nextTick()
    const top = cards(wrapper)[0].element

    top.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 200, clientY: 400 }))
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 200, clientY: 260 }))
    await nextTick()
    expect(cards(wrapper)[0].classes()).toContain('is-dragging')
    expect(translateYOf(cards(wrapper)[0])).toBe(-140)

    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 200, clientY: 260 }))
    vi.advanceTimersByTime(300)
    await nextTick()
    expect(wrapper.emitted('close')).toEqual([['SH600000']])
  })

  it('H5 桌面：鼠标左右拖动已取消（不跟手、不关闭）', async () => {
    const wrapper = mountStack()
    await nextTick()
    const top = cards(wrapper)[0].element

    top.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 200, clientY: 400 }))
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 60, clientY: 402 }))
    await nextTick()
    expect(translateXOf(cards(wrapper)[0])).toBe(0)
    expect(translateYOf(cards(wrapper)[0])).toBe(0)

    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 60, clientY: 402 }))
    vi.advanceTimersByTime(300)
    await nextTick()
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(topCardName(wrapper)).toBe('平安银行')
  })

  it('拖动下层卡不移动上层卡（此前鼠标拖动「拖错卡」的回归护栏）', async () => {
    const wrapper = mountStack()
    await nextTick()
    const lower = cards(wrapper)[1].element

    lower.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 200, clientY: 470 }))
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 60, clientY: 470 }))
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 60, clientY: 470 }))
    vi.advanceTimersByTime(300)
    await nextTick()

    expect(translateXOf(cards(wrapper)[0])).toBe(0)
    expect(cards(wrapper)[0].classes()).not.toContain('is-dragging')
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('点击下层卡把它置顶（浏览其它卡不关闭）', async () => {
    const wrapper = mountStack()
    await nextTick()
    expect(topCardName(wrapper)).toBe('平安银行')

    await cards(wrapper)[1].trigger('tap')
    await nextTick()

    expect(topCardName(wrapper)).toBe('宁德时代')
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('一键关闭：右上角悬浮圆钮 emit closeAll', async () => {
    const wrapper = mountStack()
    await nextTick()

    await wrapper.find('.fsac__close-all-float').trigger('tap')
    expect(wrapper.emitted('closeAll')).toHaveLength(1)
    // 单卡关闭 × 与一键关闭是两个不同事件，不能互相串
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('小程序：上滑同样可叉掉（关闭手势不区分平台），横拖无效果', async () => {
    vi.resetModules()
    vi.doMock('@/shared/utils/platform', () => ({ isH5: false, isApp: false, isMp: true }))
    const { default: MpComponent } = await import('./FloatingStockAlertCards.vue')
    const wrapper = mount(MpComponent, { props: { cards: CARDS }, attachTo: document.body })
    mounted.push(wrapper as unknown as VueWrapper)
    await nextTick()

    const mpCards = cards(wrapper as unknown as VueWrapper)
    // 横拖：不跟手、不关闭
    fireTouch(mpCards[0].element, 'touchstart', 200, 400)
    fireTouch(mpCards[0].element, 'touchmove', 40, 400)
    await nextTick()
    expect(translateXOf(mpCards[0])).toBe(0)
    fireTouch(mpCards[0].element, 'touchend', 40, 400)
    vi.advanceTimersByTime(300)
    await nextTick()
    expect(wrapper.emitted('close')).toBeUndefined()

    // 上滑：超阈值关闭
    fireTouch(mpCards[0].element, 'touchstart', 200, 400)
    fireTouch(mpCards[0].element, 'touchmove', 200, 260)
    await nextTick()
    fireTouch(mpCards[0].element, 'touchend', 200, 260)
    vi.advanceTimersByTime(300)
    await nextTick()
    expect(wrapper.emitted('close')).toEqual([['SH600000']])
  })
})
