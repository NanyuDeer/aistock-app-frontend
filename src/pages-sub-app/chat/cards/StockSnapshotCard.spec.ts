import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import StockSnapshotCard from './StockSnapshotCard.vue'
import type { ChatCard } from '@/shared/api/modules/agent'

// uni 全局桩：断言 navigateTo 精确跳转 + $emit leave-context（与 DeepAnalysisCard.spec 约定一致）
// navigateTo 的 success 回调同步触发，确保 $emit 断言真实执行
vi.stubGlobal('uni', {
  navigateTo: vi.fn((opts: { success?: () => void }) => opts.success?.()),
  $emit: vi.fn(),
})

describe('StockSnapshotCard', () => {
  const card: ChatCard = {
    card_type: 'stock_snapshot',
    title: '贵州茅台',
    data: { name: '贵州茅台', code: '600519', price: 1688.5, change: 12.3, change_pct: 0.73 },
  }

  it('渲染名称/代码/价格/涨跌幅', () => {
    const wrapper = mount(StockSnapshotCard, { props: { card } })
    expect(wrapper.text()).toContain('贵州茅台')
    expect(wrapper.text()).toContain('600519')
    expect(wrapper.text()).toContain('1688.50')
    expect(wrapper.text()).toContain('+0.73%')
  })

  it('缺 pe/pb/market_cap 时指标三栏隐藏（core 5 字段兼容）', () => {
    const wrapper = mount(StockSnapshotCard, { props: { card } })
    expect(wrapper.find('.ss-metrics').exists()).toBe(false)
  })

  it('有 pe/pb/market_cap 时渲染三栏', () => {
    const full: ChatCard = {
      ...card,
      data: { ...card.data, pe: 28.5, pb: 9.1, market_cap: 2.1e12 },
    }
    const wrapper = mount(StockSnapshotCard, { props: { card: full } })
    expect(wrapper.text()).toContain('市盈率')
    expect(wrapper.text()).toContain('市净率')
    expect(wrapper.text()).toContain('2.10万亿')
  })

  it('data 全缺时不渲染', () => {
    const wrapper = mount(StockSnapshotCard, { props: { card: { ...card, data: {} } } })
    expect(wrapper.find('.ss-card').exists()).toBe(false)
  })
})

// ─── 改进 23（Task 7，2026-08-17）：头部两行分层 + 点击跳个股详情（D 出口） ───

describe('StockSnapshotCard 头部两行 + 跳转（改进23）', () => {
  const snap = (overrides: Record<string, unknown> = {}) =>
    ({
      card_type: 'stock_snapshot',
      title: '个股快照',
      data: {
        name: '贵州茅台',
        code: '600519',
        price: 1700.5,
        change_pct: 1.25,
        pe: 30,
        pb: 8,
        market_cap: 2.1e12,
        ...overrides,
      },
    }) as ChatCard

  beforeEach(() => {
    vi.mocked(uni.navigateTo).mockClear()
    vi.mocked(uni.$emit).mockClear()
  })

  it('头部拆两行：名称+代码 与 价格+涨跌幅 分层（不再同行挤压）', () => {
    const wrapper = mount(StockSnapshotCard, { props: { card: snap() } })
    // 第一行：名称 + 代码；第二行：价格 + 涨跌幅
    expect(wrapper.find('.ss-line-1 .ss-name').text()).toBe('贵州茅台')
    expect(wrapper.find('.ss-line-1 .ss-code').text()).toBe('600519')
    expect(wrapper.find('.ss-line-2 .ss-price').text()).toBe('1700.50')
    expect(wrapper.find('.ss-line-2 .ss-pct').text()).toBe('+1.25%')
    // 旧单行两端布局类（.ss-header/.ss-quote）不再存在
    expect(wrapper.find('.ss-header').exists()).toBe(false)
    expect(wrapper.find('.ss-quote').exists()).toBe(false)
  })

  it('点击卡片跳个股详情并发射 leave-context 事件（D 出口）', async () => {
    const wrapper = mount(StockSnapshotCard, { props: { card: snap() } })
    await wrapper.find('.ss-card').trigger('tap')
    expect(uni.navigateTo).toHaveBeenCalledTimes(1)
    expect(uni.navigateTo).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/modules/favorites/pages/detail?symbol=600519' }),
    )
    expect(uni.$emit).toHaveBeenCalledWith('chat:leave-context')
  })

  it('无 code（数据缺失）→ 点击不跳转', async () => {
    const wrapper = mount(StockSnapshotCard, { props: { card: snap({ code: undefined }) } })
    await wrapper.find('.ss-card').trigger('tap')
    expect(uni.navigateTo).not.toHaveBeenCalled()
    expect(uni.$emit).not.toHaveBeenCalled()
  })
})
