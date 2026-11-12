import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'

// 面板开合是模块级共享状态：用例间必须卸载旧实例，否则残留实例的 watch(open)
// 会抢先把「查看全部」的一次性意图消费掉，导致后续用例断言到错误实例上。
enableAutoUnmount(afterEach)

const notificationApiMock = vi.hoisted(() => ({
  list: vi.fn(),
  markRead: vi.fn(),
}))

const socketMock = vi.hoisted(() => ({
  refresh: vi.fn(),
  close: vi.fn(),
  onNotification: null as ((notification: Record<string, unknown>) => void) | null,
}))

const userStoreMock = vi.hoisted(() => ({
  token: 'test-token',
  userInfo: { openid: 'test-openid' } as { openid: string } | null,
  isLoggedIn: vi.fn(() => true),
  clearSession: vi.fn(),
}))

vi.mock('@/shared/api/modules/notifications', () => ({
  notificationApi: notificationApiMock,
}))

vi.mock('@/shared/utils/useNotificationSocket', () => ({
  useNotificationSocket: vi.fn((_: () => string, onNotification: (notification: Record<string, unknown>) => void) => {
    socketMock.onNotification = onNotification
    return { refresh: socketMock.refresh, close: socketMock.close, unsubscribe: vi.fn() }
  }),
}))

vi.mock('@/shared/store/modules/user', () => ({
  useUserStore: () => userStoreMock,
}))

// 自选股筛选（面板内下拉框）依赖自选股列表；未 mock 会在 setup 阶段触发
// "no active Pinia"，5 条既有用例全挂。
const favoritesStoreMock = vi.hoisted(() => ({
  stocks: [] as Array<{ symbol: string; name: string }>,
  fetchFavorites: vi.fn(),
}))

vi.mock('@/shared/store/modules/favorites', () => ({
  useFavoritesStore: () => favoritesStoreMock,
}))

const storageGetMock = vi.hoisted(() => vi.fn((_: string): string => ''))
const storageSetMock = vi.hoisted(() => vi.fn())

vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', template: '<view class="svg-stub" />' },
}))

vi.mock('@/shared/components/LoadingState.vue', () => ({
  default: { name: 'LoadingState', template: '<view class="loading-stub" />' },
}))

vi.mock('@/shared/components/NotificationInsightModal.vue', () => ({
  default: {
    name: 'NotificationInsightModal',
    props: ['visible'],
    template: '<view v-if="visible" class="notification-detail-stub" />',
  },
}))

vi.stubGlobal('uni', {
  navigateTo: vi.fn(),
  getStorageSync: storageGetMock,
  setStorageSync: storageSetMock,
})

import NotificationDropdown from './NotificationDropdown.vue'
import { useNotificationPanel } from '@/shared/utils/notificationPanel'

const firstItem = {
  id: '11111111-1111-4111-8111-111111111111',
  category: 'forecast' as const,
  symbol: '002850',
  stockName: '科达利',
  title: '科达利：业绩预测更新',
  summary: '机构预测已更新',
  targetPath: '/modules/favorites/pages/detail?symbol=002850',
  payload: {},
  createdAt: '2026-08-19T01:00:00.000Z',
  readAt: null,
}

const secondItem = {
  ...firstItem,
  id: '22222222-2222-4222-8222-222222222222',
  stockName: '贵州茅台',
  title: '贵州茅台：财报披露',
}

const firstPage = {
  items: [firstItem, secondItem],
  nextCursor: 'next-page',
  unreadCount: 2,
}

describe('NotificationDropdown', () => {
  beforeEach(() => {
    notificationApiMock.list.mockReset()
    notificationApiMock.markRead.mockReset()
    socketMock.refresh.mockReset()
    socketMock.close.mockReset()
    socketMock.onNotification = null
    userStoreMock.token = 'test-token'
    userStoreMock.userInfo = { openid: 'test-openid' }
    userStoreMock.isLoggedIn.mockReturnValue(true)
    userStoreMock.clearSession.mockReset()
    favoritesStoreMock.stocks = []
    favoritesStoreMock.fetchFavorites.mockReset()
    storageGetMock.mockReset()
    storageGetMock.mockImplementation(() => '')
    storageSetMock.mockReset()
    vi.mocked(uni.navigateTo).mockReset()
    // 面板开合已于 2026-10-16 改为模块级共享状态（供首页悬浮卡跨组件唤起），
    // 不复位会跨用例泄漏：上一次点开面板 → 本次点铃铛变成「关」，面板内容为空。
    const panel = useNotificationPanel()
    panel.open.value = false
    panel.targetSymbol.value = null

    notificationApiMock.list.mockImplementation(({ cursor }: { cursor?: string }) => Promise.resolve(
      cursor
        ? { items: [], nextCursor: null, unreadCount: 2 }
        : firstPage,
    ))
    notificationApiMock.markRead.mockResolvedValue({ ids: [] })
  })

  it('挂载后主动拉取历史通知并展示未读角标', async () => {
    const wrapper = mount(NotificationDropdown)
    await flushPromises()

    expect(notificationApiMock.list).toHaveBeenCalled()
    expect(notificationApiMock.list).toHaveBeenCalledWith({ limit: 20, cursor: undefined, unread: undefined })
    expect(wrapper.find('.bell-badge').text()).toBe('2')
  })

  it('打开列表不会自动标记已读，点击单条消息才标记已读并打开详情', async () => {
    const wrapper = mount(NotificationDropdown)
    await flushPromises()

    await wrapper.find('.bell-button').trigger('tap')
    await flushPromises()
    expect(notificationApiMock.markRead).not.toHaveBeenCalled()

    await wrapper.findAll('.notification-item')[0].trigger('tap')
    await flushPromises()
    expect(notificationApiMock.markRead).toHaveBeenCalledWith([firstItem.id])
    expect(wrapper.find('.notification-detail-stub').exists()).toBe(true)
    expect(uni.navigateTo).not.toHaveBeenCalled()
    expect(wrapper.find('.bell-badge').text()).toBe('1')
  })

  it('未读筛选会剔除接口混入的已读消息', async () => {
    const readItem = { ...secondItem, id: 'read-item', readAt: '2026-08-19T02:00:00.000Z' }
    notificationApiMock.list.mockResolvedValue({
      items: [firstItem, readItem],
      nextCursor: null,
      unreadCount: 1,
    })
    const wrapper = mount(NotificationDropdown)
    await flushPromises()

    await wrapper.find('.bell-button').trigger('tap')
    await flushPromises()
    await wrapper.findAll('.notification-filter__option')[1].trigger('tap')
    await flushPromises()

    expect(notificationApiMock.list).toHaveBeenLastCalledWith({ limit: 20, cursor: undefined, unread: true })
    expect(wrapper.findAll('.notification-item')).toHaveLength(1)
    expect(wrapper.find('.notification-item__title').text()).toBe(firstItem.title)
  })

  it('收到 WS 新通知后立即更新未读角标', async () => {
    const wrapper = mount(NotificationDropdown)
    await flushPromises()

    socketMock.onNotification?.({
      ...firstItem,
      id: '33333333-3333-4333-8333-333333333333',
      title: '多氟多：资讯异动',
    })
    await flushPromises()

    expect(wrapper.find('.bell-badge').text()).toBe('3')
  })

  it('下滑到底时使用游标加载下一页', async () => {
    const wrapper = mount(NotificationDropdown)
    await flushPromises()
    await wrapper.find('.bell-button').trigger('tap')
    await flushPromises()

    await wrapper.find('.notification-panel__list').trigger('scrolltolower')
    await flushPromises()

    expect(notificationApiMock.list).toHaveBeenCalledWith({ limit: 20, cursor: 'next-page', unread: undefined })
  })

  it('自选股筛选：下拉框含「全部自选股」+ 每只自选股，选择后带 symbol 重拉并持久化', async () => {
    const maotai = {
      ...firstItem,
      id: 'maotai-item',
      symbol: '600519',
      stockName: '贵州茅台',
      title: '贵州茅台：公告披露',
    }
    notificationApiMock.list.mockResolvedValue({
      items: [firstItem, maotai],
      nextCursor: null,
      unreadCount: 2,
    })
    favoritesStoreMock.stocks = [
      { symbol: '002850', name: '科达利' },
      { symbol: '600519', name: '贵州茅台' },
    ]

    const wrapper = mount(NotificationDropdown)
    await flushPromises()
    await wrapper.find('.bell-button').trigger('tap')
    await flushPromises()

    expect(wrapper.find('.notification-stockbar__label').text()).toBe('全部自选股')
    await wrapper.find('.notification-stockbar').trigger('tap')
    await flushPromises()

    const options = wrapper.findAll('.stock-option')
    expect(options).toHaveLength(3)
    expect(options[0].text()).toContain('全部自选股')
    expect(options[2].text()).toContain('贵州茅台')

    await options[2].trigger('tap')
    await flushPromises()

    expect(notificationApiMock.list).toHaveBeenLastCalledWith({
      limit: 20, cursor: undefined, unread: undefined, symbol: '600519',
    })
    expect(storageSetMock).toHaveBeenCalledWith('notification_stock_filter', '600519')
    expect(wrapper.find('.notification-stockbar__label').text()).toBe('贵州茅台')
    expect(wrapper.findAll('.notification-item')).toHaveLength(1)
    expect(wrapper.find('.notification-item__title').text()).toBe(maotai.title)
  })

  it('自选股筛选：上次选择的股票从本地恢复，首屏即按该 symbol 拉取', async () => {
    storageGetMock.mockImplementation((key: string) => (key === 'notification_stock_filter' ? '600519' : ''))

    const wrapper = mount(NotificationDropdown)
    await flushPromises()
    await wrapper.find('.bell-button').trigger('tap')
    await flushPromises()

    expect(notificationApiMock.list).toHaveBeenCalledWith({
      limit: 20, cursor: undefined, unread: undefined, symbol: '600519',
    })
    expect(wrapper.find('.notification-stockbar__label').text()).toBe('600519')
  })

  it('悬浮卡「查看全部」唤起动作为一次性意图：开面板即筛到目标股票，列表不混入其它股票', async () => {
    const maotai = {
      ...firstItem,
      id: 'maotai-item',
      symbol: '600519',
      stockName: '贵州茅台',
      title: '贵州茅台：公告披露',
    }
    notificationApiMock.list.mockResolvedValue({
      items: [firstItem, maotai],
      nextCursor: null,
      unreadCount: 2,
    })
    const wrapper = mount(NotificationDropdown)
    await flushPromises()

    // 悬浮卡「查看全部」= 兄弟组件经共享状态唤起
    useNotificationPanel().openPanel('600519')
    await flushPromises()

    expect(notificationApiMock.list).toHaveBeenLastCalledWith({
      limit: 20, cursor: undefined, unread: undefined, symbol: '600519',
    })
    expect(wrapper.findAll('.notification-item')).toHaveLength(1)
    expect(wrapper.find('.notification-item__title').text()).toBe(maotai.title)
    // 意图已被消费，重复开面板不应无限期沿用
    expect(useNotificationPanel().targetSymbol.value).toBeNull()
  })

  it('面板已展开时点悬浮卡「查看全部」：仍要筛到目标股票，不能停留在全部股票', async () => {
    const maotai = {
      ...firstItem,
      id: 'maotai-item',
      symbol: '600519',
      stockName: '贵州茅台',
      title: '贵州茅台：公告披露',
    }
    const ningde = {
      ...firstItem,
      id: 'ningde-item',
      symbol: '300750',
      stockName: '宁德时代',
      title: '宁德时代：异动',
    }
    notificationApiMock.list.mockResolvedValue({
      items: [maotai, ningde],
      nextCursor: null,
      unreadCount: 2,
    })
    const wrapper = mount(NotificationDropdown)
    await flushPromises()

    // 先手动展开面板：此时无筛选，两只股票的消息都在
    await wrapper.find('.bell-button').trigger('tap')
    await flushPromises()
    expect(wrapper.findAll('.notification-item')).toHaveLength(2)

    // 面板不关，直接点悬浮卡「查看全部」（真实布局：铃铛在左上、悬浮卡在底部，二者可同时可见）
    useNotificationPanel().openPanel('600519')
    await flushPromises()

    expect(notificationApiMock.list).toHaveBeenLastCalledWith({
      limit: 20, cursor: undefined, unread: undefined, symbol: '600519',
    })
    expect(wrapper.findAll('.notification-item')).toHaveLength(1)
    expect(wrapper.find('.notification-item__title').text()).toBe(maotai.title)
    expect(useNotificationPanel().targetSymbol.value).toBeNull()
  })

  it('归属错配的消息不展示：贵州茅台列表不得出现「江波龙：资讯异动」（后端脏数据兜底）', async () => {
    const maotai = {
      ...firstItem,
      id: 'maotai-item',
      symbol: '600519',
      stockName: '贵州茅台',
      title: '贵州茅台：资讯异动',
    }
    // 后端历史脏行：同一篇文章被多只股票抓到、冲突更新只改了名字没改 symbol，
    // 于是 symbol=600519 但 stockName=江波龙
    const dirty = {
      ...firstItem,
      id: 'dirty-item',
      symbol: '600519',
      stockName: '江波龙',
      title: '江波龙：资讯异动',
    }
    notificationApiMock.list.mockResolvedValue({
      items: [maotai, dirty],
      nextCursor: null,
      unreadCount: 2,
    })
    favoritesStoreMock.stocks = [{ symbol: '600519', name: '贵州茅台' }]

    const wrapper = mount(NotificationDropdown)
    await flushPromises()
    await wrapper.find('.bell-button').trigger('tap')
    await flushPromises()
    await wrapper.find('.notification-stockbar').trigger('tap')
    await flushPromises()
    await wrapper.findAll('.stock-option')[1].trigger('tap')
    await flushPromises()

    expect(wrapper.find('.notification-stockbar__label').text()).toBe('贵州茅台')
    expect(wrapper.findAll('.notification-item')).toHaveLength(1)
    expect(wrapper.find('.notification-item__title').text()).toBe(maotai.title)
  })
})
