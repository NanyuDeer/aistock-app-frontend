<template>
  <view class="notification-entry">
    <view class="bell-button" @tap="toggle">
      <SvgIcon name="notification-2-line" size="34rpx" color="#0b5fff" />
      <view v-if="unreadCount" class="bell-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</view>
    </view>

    <view v-if="open" class="notification-backdrop" @tap="close" />
    <view v-if="open" class="notification-panel">
      <view class="notification-panel__header">
        <text class="notification-panel__title">自选消息</text>
        <text v-if="loggedIn" class="notification-panel__count">{{ unreadCount ? `${unreadCount} 条未读` : '已读' }}</text>
      </view>
      <view v-if="!loggedIn" class="notification-panel__state">登录后查看自选消息</view>
      <scroll-view v-else class="notification-panel__list" scroll-y @scroll="handleScroll" @scrolltolower="loadMore">
        <view v-if="loading" class="notification-panel__state">加载中...</view>
        <view v-else-if="unavailable" class="notification-panel__state">消息暂不可用</view>
        <view v-else-if="!items.length" class="notification-panel__state">暂无自选消息</view>
        <view v-for="item in items" :key="item.id" class="notification-item" @tap="openItem(item)">
          <view class="notification-item__main">
            <text class="notification-item__title">{{ item.title }}</text>
            <text class="notification-item__summary">{{ item.summary }}</text>
            <text class="notification-item__time">{{ formatTime(item.createdAt) }}</text>
          </view>
          <view v-if="!item.readAt || sessionUnreadIds.has(item.id)" class="notification-item__dot" />
        </view>
        <view v-if="loadingMore" class="notification-panel__footer">加载中...</view>
        <view v-else-if="!nextCursor && items.length" class="notification-panel__footer">没有更多消息</view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { notificationApi, type UserNotification } from '@/shared/api/modules/notifications'
import { useNotificationSocket } from '@/shared/utils/useNotificationSocket'
import { useUserStore } from '@/shared/store/modules/user'
import { formatShanghaiClock } from '@/shared/utils/datetime'

const userStore = useUserStore()
const open = ref(false)
const loading = ref(false)
const loadingMore = ref(false)
const unavailable = ref(false)
const items = ref<UserNotification[]>([])
const unreadCount = ref(0)
const nextCursor = ref<string | null>(null)
const sessionUnreadIds = ref(new Set<string>())
const loggedIn = computed(() => Boolean(userStore.token))
const rowHeightPx = Math.max(1, uni.upx2px(128))
const visibleRows = 5
let latestLoadRequest = 0
let notificationRevision = 0

function formatTime(value: string) { return formatShanghaiClock(value) }

function mergeItem(notification: UserNotification) {
  notificationRevision += 1
  items.value = [notification, ...items.value.filter(item => item.id !== notification.id)]
}

const socket = useNotificationSocket(
  () => userStore.token,
  notification => {
    if (!loggedIn.value) return
    const exists = items.value.some(item => item.id === notification.id)
    mergeItem(notification)
    if (!exists && !notification.readAt) unreadCount.value += 1
  },
  // 断线期间产生的通知不会补发，重连后重新拉一页对齐
  () => { void load() },
)

async function load(reset = true) {
  if (!loggedIn.value) return
  const requestId = ++latestLoadRequest
  const revisionAtRequest = notificationRevision
  if (reset) {
    loading.value = true
    unavailable.value = false
  } else {
    loadingMore.value = true
  }
  try {
    const page = await notificationApi.list({ limit: 20, cursor: reset ? undefined : nextCursor.value || undefined })
    if (requestId !== latestLoadRequest) return
    // 请求期间若已经收到 WS 新消息，不能让这次可能过期的 HTTP 响应覆盖实时状态。
    if (revisionAtRequest !== notificationRevision) {
      void load(reset)
      return
    }
    items.value = reset ? page.items : [...items.value, ...page.items.filter(item => !items.value.some(current => current.id === item.id))]
    nextCursor.value = page.nextCursor
    unreadCount.value = page.unreadCount
  } catch (error: any) {
    if (requestId !== latestLoadRequest) return
    if (error?.statusCode === 401) {
      userStore.clearSession()
      return
    }
    if (error?.statusCode === 503 || String(error?.message || '').includes('(503)')) unavailable.value = true
    if (reset) {
      items.value = []
      unreadCount.value = 0
    }
  } finally {
    if (requestId === latestLoadRequest) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

async function markVisible(start = 0) {
  const targets = items.value.slice(start, start + visibleRows).filter(item => !item.readAt)
  if (!targets.length) return
  const targetIds = new Set(targets.map(item => item.id))
  try {
    await notificationApi.markRead([...targetIds])
  } catch {
    return
  }
  // 未读数只在消息真正由未读翻成已读时才减：并发请求带回同一批 id 时，
  // 后返回的那次在这里已经看到 readAt 有值，不会重复扣减。
  const readAt = new Date().toISOString()
  let turnedRead = 0
  items.value = items.value.map(item => {
    if (!targetIds.has(item.id) || item.readAt) return item
    turnedRead += 1
    sessionUnreadIds.value.add(item.id)
    return { ...item, readAt }
  })
  if (turnedRead > 0) unreadCount.value = Math.max(0, unreadCount.value - turnedRead)
}

async function toggle() {
  if (open.value) {
    close()
    return
  }
  open.value = true
  if (!loggedIn.value) return
  await load()
  await markVisible()
}

function handleScroll(event: { detail?: { scrollTop?: number } }) {
  const start = Math.max(0, Math.floor((event.detail?.scrollTop || 0) / rowHeightPx))
  void markVisible(start)
}

function loadMore() {
  if (!nextCursor.value || loadingMore.value || unavailable.value) return
  void load(false)
}

function openItem(item: UserNotification) {
  close()
  if (item.targetPath) uni.navigateTo({ url: item.targetPath })
}

function close() {
  open.value = false
  sessionUnreadIds.value = new Set()
}

watch(() => userStore.token, (token) => {
  items.value = []
  unreadCount.value = 0
  nextCursor.value = null
  sessionUnreadIds.value = new Set()
  unavailable.value = false
  if (token) {
    socket.refresh()
    void load()
  } else {
    socket.close()
  }
}, { immediate: true })

</script>

<style lang="scss" scoped>
.notification-entry { position: relative; z-index: 20; }
.bell-button { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; width: 64rpx; height: 64rpx; border: 2rpx solid $primary-100; border-radius: $r-full; background: $primary-50; box-shadow: $shadow-sm; }
.bell-button:active { background: $primary-100; }
.bell-badge { position: absolute; top: -6rpx; right: -10rpx; min-width: 28rpx; height: 28rpx; padding: 0 4rpx; border-radius: 14rpx; background: $up; color: #fff; font-size: 18rpx; line-height: 28rpx; text-align: center; }
.notification-backdrop { position: fixed; z-index: 0; inset: 0; background: transparent; }
.notification-panel { position: absolute; z-index: 1; top: 76rpx; left: 0; width: 620rpx; overflow: hidden; border: 2rpx solid $line; border-radius: $r-md; background: $bg-card; box-shadow: $shadow-card; }
.notification-panel__header { display: flex; align-items: center; justify-content: space-between; padding: $s-3; border-bottom: 2rpx solid $line-soft; }
.notification-panel__title { font-size: $font-size-base; font-weight: 600; color: $ink; }
.notification-panel__count, .notification-panel__footer { font-size: $font-size-xs; color: $ink-mute; }
.notification-panel__list { max-height: 640rpx; }
.notification-panel__state, .notification-panel__footer { padding: $s-4; text-align: center; }
.notification-item { position: relative; min-height: 128rpx; padding: $s-2 $s-4 $s-2 $s-3; border-bottom: 2rpx solid $line-soft; }
.notification-item__main { display: flex; flex-direction: column; gap: 4rpx; min-width: 0; }
.notification-item__title, .notification-item__summary { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notification-item__title { font-size: $font-size-sm; font-weight: 600; color: $ink; }
.notification-item__summary { font-size: $font-size-xs; color: $ink-soft; }
.notification-item__time { font-size: 20rpx; color: $ink-mute; }
.notification-item__dot { position: absolute; top: $s-3; right: $s-2; width: 14rpx; height: 14rpx; border-radius: 50%; background: $up; }
</style>
