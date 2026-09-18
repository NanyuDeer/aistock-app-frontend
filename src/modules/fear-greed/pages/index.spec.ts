import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

/**
 * 恐贪页入口卡「接线层」页面级挂载测试（零产品行为改动，仅锁定既有契约）。
 *
 * 手法对齐既有先例（modules/favorites/pages/monitor.spec.ts / insight-detail.spec.ts），
 * 并按本批次 spec 做三处**必要加强**：
 *  1. uni 存储桩用**可变 Map**（先例是 `getStorageSync: vi.fn(() => 'fake-token')` 常量桩，
 *     会让摘要拉取日恒 ≠ 今日 → 跨日门控恒走 'summary'，断言必假红且不可修）。
 *  2. 假时钟只伪造 Date（`{ toFake: ['Date'] }`）——无参 `vi.useFakeTimers()` 会连
 *     `setImmediate` 一起伪造，而 `flushPromises()` 正是靠 `setImmediate` 排程 → 永不 resolve。
 *  3. barrel 桩：index.vue 从 `@/shared/components`（barrel）导入 `InsightCard`，先例只用深路径，
 *     故默认桩 barrel。
 */

const h = vi.hoisted(() => ({
  /** onShow 生命周期回调（vitest 下 injectHook 不可用，捕获后由用例手动触发以断言调用次数） */
  onShowCb: null as null | (() => void),
  /** uni 存储后端（可变 Map，支撑跨日门控用例） */
  storage: new Map<string, unknown>(),
}))

const fearGreedApiMock = vi.hoisted(() => ({
  getDashboard: vi.fn(),
  getSectors: vi.fn(),
}))
vi.mock('@/shared/api/modules/fear-greed', () => ({ fearGreedApi: fearGreedApiMock }))

const agentApiMock = vi.hoisted(() => ({
  getRhythmMasterCalendar: vi.fn(),
}))
vi.mock('@/shared/api/modules/agent', () => ({ agentApi: agentApiMock }))

// SubPageCard 深路径桩（避免渲染 GlobalChatBar/FloatingPodcast 等副作用）
vi.mock('@/shared/components/SubPageCard.vue', () => ({
  default: {
    name: 'SubPageCard',
    props: ['title', 'noChatBar'],
    template: '<view class="subpage-stub"><slot /></view>',
  },
}))

// barrel 桩：index.vue:233 自 `@/shared/components` 导入 InsightCard（该 barrel 在本模块仅此一处被用）
vi.mock('@/shared/components', () => ({
  InsightCard: { name: 'InsightCard', props: ['title', 'trace', 'structured', 'time'], template: '<view class="insight-card-stub" />' },
}))

vi.stubGlobal('uni', {
  navigateTo: vi.fn(),
  getStorageSync: (key: string) => (h.storage.has(key) ? h.storage.get(key) : ''),
  setStorageSync: (key: string, value: unknown) => {
    h.storage.set(key, value)
  },
  removeStorageSync: (key: string) => {
    h.storage.delete(key)
  },
})

vi.mock('@dcloudio/uni-app', () => ({
  onShow: (cb: () => void) => {
    h.onShowCb = cb
  },
}))

import fearGreedIndexPage from './index.vue'

const SUMMARY_STORAGE_KEY = 'fg_rhythm_summary_date'
const TODAY = '2026-09-14'
const YESTERDAY = '2026-09-13'

/** 主面板夹具（currentIndex=12 → 冰点档；空 history/pie/bar 由页面内 `?? []` 兜底） */
const dashboardFixture = {
  updateTime: '2026-09-14 15:00',
  indexName: '韭圈儿恐贪指数',
  currentIndex: 12,
  label: '冰点',
  pieData: [],
  barData: [],
  lineData: { currentIndex: 12, neutralLine: 50, recentValues: [], dates: [] },
  updateProgress: { fearGreed: 100, indexValue: 100 },
  indicators: [],
  history: { dates: [], scores: [] },
}

const sectorBoardFixture = {
  availability: false,
  tradeDate: '',
  source: '',
  sectors: { topGainers: [], topInflows: [], topLosers: [], topOutflows: [] },
}

/** 摘要夹具：level=active（chip 短码「活」/色 #f59e0b）、position_band.text 用**真实生产者格式**（全角冒号），
 *  使「剥离前缀」断言对旧版正则（只吃「建议仓位」+ 其后的空白）具备鉴别力：旧正则会残留「：」→ 断言必红 */
const summaryDaysFixture = [
  {
    date: '2026-09-14',
    refresh_slot: 'after_close',
    level: 'active',
    score: null,
    basis_date: '2026-09-14',
    position_band: { text: '建议仓位：5 成' },
  },
]

/** 归一化内联色值：happy-dom 可能把 `background: #f59e0b` 序列化为 `rgb(245, 158, 11)` */
function hexToRgbCss(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})`
}

function inlineStyleHasColor(styleAttr: string | undefined, hex: string): boolean {
  const s = (styleAttr ?? '').replace(/\s/g, '').toLowerCase()
  return s.includes(hex.toLowerCase()) || s.includes(hexToRgbCss(hex).replace(/\s/g, '').toLowerCase())
}

function setStoredSummaryDay(day: string): void {
  h.storage.set(SUMMARY_STORAGE_KEY, day)
}

/** mount + 手动触发首次 onShow（真实 uni-app 首屏即触发）并等待首个 microtask 链结算 */
async function mountAndShow() {
  const wrapper = mount(fearGreedIndexPage)
  h.onShowCb?.()
  await flushPromises()
  return wrapper
}

describe('fear-greed/pages/index.vue 入口卡接线层', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(`${TODAY}T10:00:00`))
    h.onShowCb = null
    h.storage.clear()
    fearGreedApiMock.getDashboard.mockReset().mockResolvedValue(dashboardFixture)
    fearGreedApiMock.getSectors.mockReset().mockResolvedValue(sectorBoardFixture)
    agentApiMock.getRhythmMasterCalendar.mockReset().mockResolvedValue({ days: summaryDaysFixture })
    vi.mocked(uni.navigateTo).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('外壳三态常驻：loading 态下入口卡外壳与免责声明仍渲染', async () => {
    fearGreedApiMock.getDashboard.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountAndShow()
    expect(wrapper.find('.fg-rhythm').exists()).toBe(true)
    expect(wrapper.find('.fg-rhythm__title').text()).toBe('波段操作节奏')
    expect(wrapper.find('.fg-disclaimer').exists()).toBe(true)
    expect(wrapper.find('.fg-state').text()).toContain('加载中')
  })

  it('外壳三态常驻：无缓存 error 态下入口卡外壳与免责声明仍渲染，且错误态出现', async () => {
    fearGreedApiMock.getDashboard.mockRejectedValue(new Error('network'))
    const wrapper = await mountAndShow()
    expect(wrapper.find('.fg-rhythm').exists()).toBe(true)
    expect(wrapper.find('.fg-rhythm__title').text()).toBe('波段操作节奏')
    expect(wrapper.find('.fg-disclaimer').exists()).toBe(true)
    expect(wrapper.find('.fg-retry').exists()).toBe(true)
    expect(wrapper.find('.fg-state').text()).toContain('network')
  })

  it('摘要态渲染：档位短码 + 档位色 + 仓位文本 + 数据截至标签', async () => {
    const wrapper = await mountAndShow()
    expect(wrapper.find('.fg-rhythm__row').exists()).toBe(true)
    expect(wrapper.find('.fg-rhythm__chip-text').text()).toBe('活')
    expect(inlineStyleHasColor(wrapper.find('.fg-rhythm__chip').attributes('style'), '#f59e0b')).toBe(true)
    expect(wrapper.find('.fg-rhythm__band').text()).toBe('5 成')
    expect(wrapper.find('.fg-rhythm__date').text()).toBe('数据截至 09-14')
  })

  it('摘要失败降级：纯导航卡（无摘要行/不置错误态），且主面板成功内容仍正常渲染', async () => {
    agentApiMock.getRhythmMasterCalendar.mockRejectedValue(new Error('network'))
    const wrapper = await mountAndShow()
    expect(wrapper.find('.fg-rhythm__row').exists()).toBe(false)
    expect(wrapper.find('.fg-rhythm').exists()).toBe(true)
    expect(wrapper.find('.fg-retry').exists()).toBe(false)
    // 后半句是牙齿所在：摘要失败不得污染 dashboard 成功分支
    expect(wrapper.find('.fg-hero__value').text()).toBe('12')
  })

  it('跳转 URL：恒取该行 date（非 basis_date），防「落到前一张卡」回归', async () => {
    agentApiMock.getRhythmMasterCalendar.mockResolvedValue({
      days: [
        {
          date: '2026-09-14',
          refresh_slot: 'after_close',
          level: 'active',
          score: null,
          basis_date: '2026-09-13',
          position_band: { text: '建议仓位：七成~八成' },
        },
      ],
    })
    const wrapper = await mountAndShow()
    await wrapper.find('.fg-rhythm').trigger('tap')
    expect(wrapper.find('.fg-rhythm__band').text()).toBe('七成~八成')
    expect(uni.navigateTo).toHaveBeenCalledWith({ url: '/modules/rhythm/pages/index?date=2026-09-14' })
  })

  it('onShow 三态分发①：摘要存储日 = 今日且主面板已加载 → 不再发起任何请求', async () => {
    const wrapper = await mountAndShow()
    expect(wrapper.find('.fg-rhythm__row').exists()).toBe(true)
    expect(fearGreedApiMock.getDashboard).toHaveBeenCalledTimes(1)
    expect(agentApiMock.getRhythmMasterCalendar).toHaveBeenCalledTimes(1)

    h.onShowCb?.()
    await flushPromises()

    expect(fearGreedApiMock.getDashboard).toHaveBeenCalledTimes(1)
    expect(agentApiMock.getRhythmMasterCalendar).toHaveBeenCalledTimes(1)
  })

  it('onShow 三态分发②：摘要存储日为昨日（主面板为今日）→ 只补拉摘要，不重拉主面板', async () => {
    await mountAndShow()
    expect(fearGreedApiMock.getDashboard).toHaveBeenCalledTimes(1)

    setStoredSummaryDay(YESTERDAY)
    h.onShowCb?.()
    await flushPromises()

    expect(agentApiMock.getRhythmMasterCalendar).toHaveBeenCalledTimes(2)
    expect(fearGreedApiMock.getDashboard).toHaveBeenCalledTimes(1)
  })

  it('缓存期加载态（I1）：跨日刷新带缓存时不得用「加载中」覆盖旧看板', async () => {
    fearGreedApiMock.getDashboard.mockResolvedValueOnce(dashboardFixture)
    const wrapper = await mountAndShow()
    expect(wrapper.find('.fg-state').exists()).toBe(false)
    expect(wrapper.find('.fg-hero__value').text()).toBe('12')

    // 跨日 + 主面板拉取挂起（模拟慢刷新）→ 旧看板必须原样保留、不得出现加载态
    vi.setSystemTime(new Date('2026-09-15T10:00:00'))
    fearGreedApiMock.getDashboard.mockReturnValue(new Promise(() => {}))
    h.onShowCb?.()
    await flushPromises()

    expect(fearGreedApiMock.getDashboard).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.fg-state').exists()).toBe(false)
    expect(wrapper.find('.fg-hero__value').text()).toBe('12')
  })
})
