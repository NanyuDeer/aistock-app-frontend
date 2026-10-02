import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// mock stocktrace API（页面唯一数据源）
const stockTraceApiMock = vi.hoisted(() => ({ list: vi.fn() }))
vi.mock('@/shared/api/modules/stockTrace', () => ({ stockTraceApi: stockTraceApiMock }))

// mock favorites store：stocks 置空、fetchFavorites no-op，
// 隔离 refreshQuotes / uni.showToast 等真实 store 副作用
const favoritesStoreMock = vi.hoisted(() => ({
  stocks: [] as Array<{ symbol: string }>,
  fetchFavorites: vi.fn(),
}))
vi.mock('@/shared/store/modules/favorites', () => ({
  useFavoritesStore: () => favoritesStoreMock,
}))

// mock app store：alertEnabled 默认 false 避免 onMounted 触发 subscribeAlerts / WS；
// 用可变对象以便用例内切换开关态（update 为 no-op，config 由用例直接改写）
const appStoreMock = vi.hoisted(() => ({
  config: { alertEnabled: false, firstLaunch: false, theme: 'light' as const },
  update: vi.fn(),
}))
vi.mock('@/shared/store/modules/app', () => ({
  useAppStore: () => appStoreMock,
}))

// SubPageCard2 桩：避免 GlobalChatBar / FloatingPodcast 等副作用
vi.mock('@/shared/components/SubPageCard2.vue', () => ({
  default: { name: 'SubPageCard2', props: ['title', 'subtitle'], template: '<view class="subpage-stub"><slot /></view>' },
}))

// SvgIcon 桩（EmptyState / LoadingState 内部引用）
vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name', 'size', 'color'], template: '<view class="svg-stub" />' },
}))

// WS 回调捕获（页面在 #ifdef APP-PLUS 内订阅；vitest 不处理条件编译，代码会执行）
const wsHandlers = vi.hoisted(() => ({
  onOpen: null as null | (() => void),
  onMessage: null as null | ((res: { data: string }) => void),
}))

vi.stubGlobal('uni', {
  navigateTo: vi.fn(),
  // 返回可用的 SocketTask 桩并捕获 onMessage（开关打开时 onMounted 会订阅 WS）
  connectSocket: vi.fn(() => ({
    onOpen: (cb: () => void) => { wsHandlers.onOpen = cb },
    onMessage: (cb: (res: { data: string }) => void) => { wsHandlers.onMessage = cb },
    onClose: vi.fn(),
    onError: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
  })),
  getStorageSync: vi.fn(() => 'fake-token'),
  showToast: vi.fn(),
})

// vitest 下 injectHook 不可用，onShow 同步触发
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (cb: () => void) => {
    cb()
  },
}))

import monitor from './monitor.vue'

/** 构造一条 stocktrace 价格异动 */
function movement(over: Record<string, unknown> = {}) {
  return {
    event_id: 'mv:1',
    trigger_revision: 1,
    symbol: '601318',
    stock_name: '中国平安',
    event_type: 'price',
    direction: 'up',
    triggered_at: '2026-09-18T07:26:22.789Z',
    latest_price: 110,
    previous_close: 100,
    change_pct: 8.5,
    threshold_pct: 7,
    severity: 'high',
    rule_version: 'price-v1',
    analysis_status: 'completed',
    primary_cause: '大盘系统性下跌',
    ...over,
  }
}

/** 挂载页面并打开订阅（WS 订阅需自选股非空 + alertEnabled=true） */
async function mountWithWs() {
  favoritesStoreMock.stocks = [{ symbol: '600519' }]
  appStoreMock.config.alertEnabled = true
  const wrapper = mount(monitor)
  await flushPromises()
  return wrapper
}

/** 模拟服务端推一条 WS 报文 */
async function pushWs(message: unknown) {
  wsHandlers.onMessage?.({ data: JSON.stringify(message) })
  await flushPromises()
}

describe('monitor.vue 自选股异动页（模板统一到个股情报/自选股洞察同款）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    stockTraceApiMock.list.mockReset()
    favoritesStoreMock.fetchFavorites.mockReset()
    favoritesStoreMock.stocks = []
    appStoreMock.config.alertEnabled = false
    appStoreMock.update.mockReset()
    wsHandlers.onOpen = null
    wsHandlers.onMessage = null
    vi.mocked(uni.navigateTo).mockClear()
    stockTraceApiMock.list.mockResolvedValue({ items: [], nextCursor: null })
  })

  it('渲染方向筛选栏：全部 / 上涨 / 下跌', async () => {
    const wrapper = mount(monitor)
    await flushPromises()
    const labels = wrapper.findAll('.as-segmented__label').map((n) => n.text())
    expect(labels).toEqual(['全部', '上涨', '下跌'])
  })

  it('订阅状态卡用组件库 Switch 承载开关态（监控范围 N 只自选股）', async () => {
    favoritesStoreMock.stocks = [{ symbol: '600519' }, { symbol: '000001' }]
    appStoreMock.config.alertEnabled = true
    const wrapper = mount(monitor)
    await flushPromises()
    expect(wrapper.find('.subscribe-card').exists()).toBe(true)
    expect(wrapper.find('.subscribe-value').text()).toBe('2 只自选股')
    const sw = wrapper.find('.as-switch')
    expect(sw.exists()).toBe(true)
    expect(sw.classes()).toContain('is-on')
  })

  it('点击 Switch 关闭监控 → appStore.update(alertEnabled: false)', async () => {
    appStoreMock.config.alertEnabled = true
    const wrapper = mount(monitor)
    await flushPromises()
    await wrapper.find('.as-switch').trigger('click')
    expect(appStoreMock.update).toHaveBeenCalledWith({ alertEnabled: false })
  })

  it('立即检测用组件库 Button 承载，点击重新拉取列表', async () => {
    const wrapper = mount(monitor)
    await flushPromises()
    const btn = wrapper.findAll('.as-btn').find((b) => b.text().includes('立即检测'))
    expect(btn).toBeTruthy()
    expect(stockTraceApiMock.list).toHaveBeenCalledTimes(1)
    await btn!.trigger('click')
    await flushPromises()
    expect(stockTraceApiMock.list).toHaveBeenCalledTimes(2)
  })

  it('列表行改用组件库 Card 三段式模板（event-top / event-title / event-bottom）', async () => {
    stockTraceApiMock.list.mockResolvedValue({ items: [movement()], nextCursor: null })
    const wrapper = mount(monitor)
    await flushPromises()
    const card = wrapper.find('.as-card')
    expect(card.exists()).toBe(true)
    expect(card.find('.event-top').exists()).toBe(true)
    expect(card.find('.event-title').exists()).toBe(true)
    expect(card.find('.event-bottom').exists()).toBe(true)
    // 上行：股票名 + 代码 + 涨跌幅
    expect(card.find('.stock-name').text()).toBe('中国平安')
    expect(card.find('.stock-code').text()).toBe('601318')
    expect(card.find('.stock-move').text()).toBe('+8.5%')
    // 中行：主因正文
    expect(card.find('.event-title').text()).toBe('主因：大盘系统性下跌')
  })

  it('下行只在涨停事件上渲染「涨停」Badge', async () => {
    stockTraceApiMock.list.mockResolvedValue({
      items: [
        movement({ event_id: 'mv:limit', symbol: '600519', stock_name: '贵州茅台', triggered_at: '2026-09-18T07:26:00.000Z', is_limit_up: true }),
        movement({ event_id: 'mv:plain', symbol: '000001', stock_name: '平安银行', triggered_at: '2026-09-17T07:26:00.000Z' }),
      ],
      nextCursor: null,
    })
    const wrapper = mount(monitor)
    await flushPromises()
    const cards = wrapper.findAll('.as-card')
    expect(cards.length).toBe(2)
    expect(cards[0].find('.as-badge').text()).toBe('涨停')
    expect(cards[1].find('.as-badge').exists()).toBe(false)
  })

  it('切到「上涨」只保留上涨异动，切到「下跌」只保留下跌异动', async () => {
    stockTraceApiMock.list.mockResolvedValue({
      items: [
        movement({ event_id: 'mv:up', symbol: '601318', stock_name: '中国平安', direction: 'up', change_pct: 8.5, triggered_at: '2026-09-18T07:26:00.000Z' }),
        movement({ event_id: 'mv:down', symbol: '000001', stock_name: '平安银行', direction: 'down', change_pct: -7.9, triggered_at: '2026-09-17T07:26:00.000Z' }),
      ],
      nextCursor: null,
    })
    const wrapper = mount(monitor)
    await flushPromises()
    expect(wrapper.findAll('.as-card').length).toBe(2)

    const tabs = wrapper.findAll('.as-segmented__item')
    await tabs[1].trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.as-card').length).toBe(1)
    expect(wrapper.find('.stock-name').text()).toBe('中国平安')

    await tabs[2].trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.as-card').length).toBe(1)
    expect(wrapper.find('.stock-name').text()).toBe('平安银行')
  })

  it('点击卡片 → navigateTo insight-detail-move?event_id=', async () => {
    stockTraceApiMock.list.mockResolvedValue({ items: [movement({ event_id: 'mv:x' })], nextCursor: null })
    const wrapper = mount(monitor)
    await flushPromises()
    await wrapper.find('.as-card').trigger('tap')
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: `/modules/favorites/pages/insight-detail-move?event_id=${encodeURIComponent('mv:x')}`,
    })
  })

  it('洞察报告入口只挂在归因完成的行上，点击跳详情页并自动开始生成', async () => {
    stockTraceApiMock.list.mockResolvedValue({
      items: [
        movement({ event_id: 'mv:done', symbol: '600519', stock_name: '贵州茅台', analysis_status: 'completed', triggered_at: '2026-09-18T07:26:00.000Z' }),
        movement({ event_id: 'mv:doing', symbol: '000001', stock_name: '平安银行', analysis_status: 'processing', triggered_at: '2026-09-17T07:26:00.000Z' }),
      ],
      nextCursor: null,
    })
    const wrapper = mount(monitor)
    await flushPromises()
    const cards = wrapper.findAll('.as-card')
    expect(cards[0].find('.report-link').exists()).toBe(true)
    expect(cards[1].find('.report-link').exists()).toBe(false)

    await cards[0].find('.report-link').trigger('tap')
    await flushPromises()
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: `/modules/favorites/pages/insight-detail-move?event_id=${encodeURIComponent('mv:done')}&autostart=1`,
    })
  })

  it('接口失败/无数据 → 渲染空态（不渲染卡片）', async () => {
    stockTraceApiMock.list.mockRejectedValue(new Error('network'))
    const wrapper = mount(monitor)
    await flushPromises()
    expect(wrapper.findAll('.as-card').length).toBe(0)
    expect(wrapper.find('.as-empty').exists()).toBe(true)
  })

  // ===== WS 实时推送（App 端 #ifdef APP-PLUS 分支）=====

  it('WS movement.created（alert 外壳）→ 顶部插入一条三段式卡片', async () => {
    const wrapper = await mountWithWs()
    await pushWs({
      type: 'alert',
      data: {
        type: 'movement.created', event_id: 'mv:ws', trigger_revision: 1, symbol: '600519',
        stock_name: '贵州茅台', event_type: 'price', direction: 'up',
        triggered_at: '2026-09-24T01:55:35.941Z', window_end_at: '2026-09-24T01:55:35.941Z',
        change_pct: 10.01, severity: 'critical',
        // 后端 toPublicEvent 已改为与列表派生口径一致的 'processing'（原硬编码 'pending'）
        analysis_status: 'processing', is_limit_up: false,
      },
    })
    expect(wrapper.findAll('.as-card').length).toBe(1)
    expect(wrapper.find('.stock-name').text()).toBe('贵州茅台')
    expect(wrapper.find('.stock-move').text()).toBe('+10.01%')
    expect(wrapper.find('.event-title').text()).toBe('归因中')
  })

  it('WS movement.updated（severity_upgraded）→ 就地更新涨跌幅，不新增卡片', async () => {
    stockTraceApiMock.list.mockResolvedValue({ items: [movement({ event_id: 'mv:sev', change_pct: 8.5 })], nextCursor: null })
    const wrapper = await mountWithWs()
    expect(wrapper.find('.stock-move').text()).toBe('+8.5%')

    await pushWs({
      type: 'movement.updated',
      data: {
        event_id: 'mv:sev', trigger_revision: 2, symbol: '601318', stock_name: '中国平安',
        severity: 'critical', change_pct: 11.2, push_reason: 'severity_upgraded',
      },
    })
    expect(wrapper.findAll('.as-card').length).toBe(1)
    expect(wrapper.find('.stock-move').text()).toBe('+11.2%')
  })

  it('WS movement.updated（a_grade_major_cause）→ 就地更新主因正文并放出「报告 ›」入口', async () => {
    stockTraceApiMock.list.mockResolvedValue({
      items: [movement({ event_id: 'mv:cause', analysis_status: 'processing', primary_cause: null })],
      nextCursor: null,
    })
    const wrapper = await mountWithWs()
    expect(wrapper.find('.event-title').text()).toBe('归因中')
    expect(wrapper.find('.report-link').exists()).toBe(false)

    await pushWs({
      type: 'movement.updated',
      data: {
        event_id: 'mv:cause', artifact_id: 'a1', push_reason: 'a_grade_major_cause',
        movement_view: { schemaVersion: 'movement-view-v2', status: 'confirmed', primaryCandidate: { layer: 'sector', status: 'supported', verdict: '白酒板块集体走强', supportingEvidenceIds: [] } },
      },
    })
    expect(wrapper.findAll('.as-card').length).toBe(1)
    expect(wrapper.find('.event-title').text()).toBe('主因：白酒板块集体走强')
    expect(wrapper.find('.report-link').exists()).toBe(true)
  })

  it('WS 非 price 报文（老 insight.created）→ 忽略，不插入残缺卡片', async () => {
    const wrapper = await mountWithWs()
    await pushWs({
      type: 'alert',
      data: { type: 'insight.created', eventId: 'wi_1', content: '【自选股洞察】东方钽业(000962) 涨停板', symbol: '000962' },
    })
    await pushWs({
      type: 'movement.updated',
      data: { push_reason: 'severity_upgraded' },
    })
    expect(wrapper.findAll('.as-card').length).toBe(0)
  })
})
