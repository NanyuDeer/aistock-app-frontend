import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

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

vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', template: '<view class="svg-stub" />' },
}))

vi.mock('@/shared/components/LoadingState.vue', () => ({
  default: { name: 'LoadingState', template: '<view class="loading-stub" />' },
}))

vi.stubGlobal('uni', {
  navigateTo: vi.fn(),
})

import NotificationDropdown from './NotificationDropdown.vue'

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
    vi.mocked(uni.navigateTo).mockReset()

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
    expect(notificationApiMock.list).toHaveBeenCalledWith({ limit: 20, cursor: undefined })
    expect(wrapper.find('.bell-badge').text()).toBe('2')
  })

  it('打开列表不会自动标记已读，点击单条消息才标记并跳转', async () => {
    const wrapper = mount(NotificationDropdown)
    await flushPromises()

    await wrapper.find('.bell-button').trigger('tap')
    await flushPromises()
    expect(notificationApiMock.markRead).not.toHaveBeenCalled()

    await wrapper.findAll('.notification-item')[0].trigger('tap')
    await flushPromises()
    expect(notificationApiMock.markRead).toHaveBeenCalledWith([firstItem.id])
    expect(uni.navigateTo).toHaveBeenCalledWith({ url: firstItem.targetPath })
    expect(wrapper.find('.bell-badge').text()).toBe('1')
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

    expect(notificationApiMock.list).toHaveBeenCalledWith({ limit: 20, cursor: 'next-page' })
  })
})
