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
        <view v-if="loggedIn" class="notification-filter">
          <view :class="['notification-filter__option', !unreadOnly ? 'is-active' : '']" @tap="setUnreadOnly(false)">全部</view>
          <view :class="['notification-filter__option', unreadOnly ? 'is-active' : '']" @tap="setUnreadOnly(true)">未读{{ unreadCount ? ` ${unreadCount}` : '' }}</view>
        </view>
        <view
          v-if="loggedIn && unreadCount"
          class="notification-panel__read-all"
          @tap="markAllRead"
        >
          <text>全标已读</text>
          <SvgIcon name="checkbox-circle-line" size="30rpx" color="#a8afbd" />
        </view>
      </view>
      <!-- 自选股筛选：就地下拉框（不跳转其他页面），默认「全部自选股」 -->
      <view v-if="loggedIn" class="notification-stockbar-wrap">
        <view class="notification-stockbar" @tap="toggleStockPicker">
          <SvgIcon name="filter-3-line" size="26rpx" color="#8a94a6" />
          <text class="notification-stockbar__label">{{ stockFilterName }}</text>
          <SvgIcon
            name="arrow-down-s-line"
            size="26rpx"
            color="#8a94a6"
            :class="['notification-stockbar__caret', stockPickerOpen ? 'is-open' : '']"
          />
        </view>
        <view v-if="stockPickerOpen" class="notification-stockbar__dropdown">
          <scroll-view scroll-y class="notification-stockbar__options">
            <view
              v-for="option in stockOptions"
              :key="option.symbol || '__all__'"
              :class="['stock-option', stockFilter === option.symbol ? 'is-active' : '']"
              @tap="selectStock(option.symbol)"
            >
              <text class="stock-option__name">{{ option.name }}</text>
              <text v-if="option.symbol" class="stock-option__code">{{ option.symbol }}</text>
              <SvgIcon v-if="stockFilter === option.symbol" name="check-line" size="30rpx" color="#0b5fff" />
            </view>
          </scroll-view>
        </view>
      </view>
      <!-- 下拉展开时点击面板其余区域收起 -->
      <view v-if="stockPickerOpen" class="notification-stockbar__backdrop" @tap="closeStockPicker" />
      <view v-if="!loggedIn" class="notification-panel__state">登录后查看自选消息</view>
      <view v-else-if="loading" class="notification-panel__loading">
        <LoadingState text="" />
      </view>
      <scroll-view v-else class="notification-panel__list" scroll-y @scrolltolower="loadMore">
        <view v-if="unavailable" class="notification-panel__state">消息暂不可用</view>
        <view v-else-if="!displayItems.length" class="notification-panel__state">{{ emptyText }}</view>
        <view v-for="item in displayItems" :key="item.id" class="notification-item" @tap="openItem(item)">
          <view class="notification-item__main">
            <view class="notification-item__headline">
              <view v-if="!item.readAt" class="notification-item__dot" />
              <text class="notification-item__title">{{ item.title }}</text>
              <text v-if="categoryLabel(item.category)" class="notification-item__tag">{{ categoryLabel(item.category) }}</text>
            </view>
            <text class="notification-item__summary">{{ item.summary }}</text>
            <text class="notification-item__time">{{ formatTime(item.occurredAt || item.createdAt) }}</text>
          </view>
        </view>
        <view v-if="loadingMore" class="notification-panel__footer">加载中...</view>
        <view v-else-if="!nextCursor && displayItems.length" class="notification-panel__footer">没有更多消息</view>
      </scroll-view>
    </view>
    <NotificationInsightModal
      :visible="detailOpen"
      :notification="selectedNotification"
      @close="closeDetail"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch, onActivated, onMounted } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import LoadingState from '@/shared/components/LoadingState.vue'
import NotificationInsightModal from '@/shared/components/NotificationInsightModal.vue'
import { notificationApi, type NotificationCategory, type UserNotification } from '@/shared/api/modules/notifications'
import { useNotificationSocket } from '@/shared/utils/useNotificationSocket'
import { useNotificationPanel } from '@/shared/utils/notificationPanel'
import { useUserStore } from '@/shared/store/modules/user'
import { useFavoritesStore } from '@/shared/store/modules/favorites'
import { storage, STORAGE_KEYS } from '@/shared/utils/storage'
import { formatShanghaiDateTime } from '@/shared/utils/datetime'

/** 消息分类 → 中文标签（未知分类返回空串 → 不渲染标签，降级安全） */
const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  price_movement: '异动',
  insight: '洞察',
  stock_info: '个股情报',
  forecast: '预测',
  performance_report: '业绩',
}

function categoryLabel(category: NotificationCategory): string {
  return CATEGORY_LABEL[category] ?? ''
}

const userStore = useUserStore()
// 面板开合走共享状态：首页悬浮卡「查看全部」是兄弟组件，需跨组件唤起（不承载数据）
const { open, targetSymbol } = useNotificationPanel()
const loading = ref(false)
const loadingMore = ref(false)
const unavailable = ref(false)
const items = ref<UserNotification[]>([])
const unreadCount = ref(0)
const nextCursor = ref<string | null>(null)
const detailOpen = ref(false)
const selectedNotification = ref<UserNotification | null>(null)
const unreadOnly = ref(false)
const loggedIn = computed(() => userStore.isLoggedIn())

// ── 自选股筛选 ──────────────────────────────────────────────
const favoritesStore = useFavoritesStore()
/** 当前筛选的股票代码；空串 = 全部自选股（持久化，下次打开恢复） */
const stockFilter = ref<string>(storage.get<string>(STORAGE_KEYS.NOTIFICATION_STOCK_FILTER) || '')
const stockPickerOpen = ref(false)
/** 弹窗选项：首项「全部自选股」+ 每只自选股 */
const stockOptions = computed(() => [
  { symbol: '', name: '全部自选股' },
  ...favoritesStore.stocks.map(stock => ({ symbol: stock.symbol, name: stock.name })),
])
/** 入口展示的当前选择名称（股票已移出自选时回退显示代码，保证仍可筛历史消息） */
const stockFilterName = computed(() => {
  if (!stockFilter.value) return '全部自选股'
  return favoritesStore.stocks.find(stock => stock.symbol === stockFilter.value)?.name || stockFilter.value
})
/** 空态文案随「未读」与「自选股筛选」两个维度变化，避免筛选中误读为整体无消息 */
const emptyText = computed(() => {
  if (unreadOnly.value) return stockFilter.value ? '该股票暂无未读消息' : '暂无未读消息'
  return stockFilter.value ? '该股票暂无消息' : '暂无自选消息'
})
/**
 * 列表展示项：按「自选股筛选」+「未读」两个维度过滤。
 * 自选股筛选在后端支持 `symbol` 参数前由前端兜底（当前后端为远程部署，
 * 新旧后端都安全：新后端已只返回该股票数据，前端过滤为幂等子集）。
 */
const displayItems = computed(() => {
  let list = items.value
  if (stockFilter.value) list = list.filter(item => item.symbol === stockFilter.value)
  if (unreadOnly.value) list = list.filter(item => !item.readAt)
  return list
})
let latestLoadRequest = 0
let notificationRevision = 0

function formatTime(value: string) { return formatShanghaiDateTime(value) }

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
    const page = await notificationApi.list({ limit: 20, cursor: reset ? undefined : nextCursor.value || undefined, unread: unreadOnly.value || undefined, symbol: stockFilter.value || undefined })

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

function setUnreadOnly(next: boolean) {
  if (unreadOnly.value === next) return
  unreadOnly.value = next
  nextCursor.value = null
  void load()
}

/** 就地展开/收起自选股下拉框（自选股列表为空时静默补拉一次） */
function toggleStockPicker() {
  stockPickerOpen.value = !stockPickerOpen.value
  if (stockPickerOpen.value && !favoritesStore.stocks.length) {
    void favoritesStore.fetchFavorites({ silent: true })
  }
}

function closeStockPicker() {
  stockPickerOpen.value = false
}

/** 应用自选股筛选：写状态 + 持久化 + 重置游标（不含重拉，调用方决定何时 load） */
function applyStockFilter(symbol: string) {
  stockFilter.value = symbol
  storage.set(STORAGE_KEYS.NOTIFICATION_STOCK_FILTER, symbol)
  nextCursor.value = null
}

/** 选择自选股：持久化并重拉（筛选需重取数据） */
function selectStock(symbol: string) {
  stockPickerOpen.value = false
  if (stockFilter.value === symbol) return
  applyStockFilter(symbol)
  void (async () => { await load(); await fillUntilVisible() })()
}

/**
 * 筛选态下补齐数据：前端只能过滤「已加载」的消息，而目标股票的消息可能落在
 * 更早的页里。首屏未命中该股票时继续翻页（上限 5 页 ≈ 100 条），避免空列表
 * 被误读为「该股票没有消息」。后端支持 `symbol` 参数后一次到位，此循环自然不触发。
 */
async function fillUntilVisible() {
  if (!stockFilter.value) return
  let guard = 0
  while (!displayItems.value.length && nextCursor.value && guard < 5) {
    guard += 1
    await load(false)
  }
}

async function markAllRead() {
  if (!unreadCount.value) return
  try {
    await notificationApi.markAllRead()
  } catch {
    return
  }
  const readAt = new Date().toISOString()
  items.value = unreadOnly.value ? [] : items.value.map(item => item.readAt ? item : { ...item, readAt })
  unreadCount.value = 0
  nextCursor.value = null
}

async function markRead(item: UserNotification) {
  if (item.readAt) return
  try {
    await notificationApi.markRead([item.id])
  } catch {
    return
  }
  // 未读数只在消息真正由未读翻成已读时才减：并发请求带回同一批 id 时，
  // 后返回的那次在这里已经看到 readAt 有值，不会重复扣减。
  const readAt = new Date().toISOString()
  let becameRead = false
  items.value = items.value.map(current => {
    if (current.id !== item.id || current.readAt) return current
    becameRead = true
    return { ...current, readAt }
  })
  if (becameRead) unreadCount.value = Math.max(0, unreadCount.value - 1)
  if (unreadOnly.value && becameRead) items.value = items.value.filter(current => current.id !== item.id)
}

function toggle() {
  open.value = !open.value
}

// 面板展开时拉取数据（含首页悬浮卡「查看全部」跨组件唤起）；收起时同步关掉自选股下拉
watch(open, async (visible) => {
  if (!visible) {
    stockPickerOpen.value = false
    return
  }
  if (!loggedIn.value) return
  // 悬浮卡「查看全部」唤起时带股票代码 → 自动筛选到该股票（一次性意图，消费后清空）
  if (targetSymbol.value) {
    applyStockFilter(targetSymbol.value)
    targetSymbol.value = null
  }
  await load()
  // 持久化的筛选股票可能不在首屏，补齐后再展示（避免误显示空态）
  await fillUntilVisible()
})

function loadMore() {
  if (!nextCursor.value || loadingMore.value || unavailable.value) return
  void load(false)
}

async function openItem(item: UserNotification) {
  await markRead(item)
  selectedNotification.value = item
  detailOpen.value = true
}

function close() {
  open.value = false
}

function closeDetail() {
  detailOpen.value = false
  selectedNotification.value = null
}

watch(() => [userStore.token, userStore.userInfo?.openid] as const, ([token, openid]) => {
  items.value = []
  unreadCount.value = 0
  nextCursor.value = null
  unavailable.value = false
  if (openid || token) {
    if (token) socket.refresh()
    else socket.close()
    void load()
  } else {
    socket.close()
  }
}, { immediate: true })


onMounted(() => {
  if (loggedIn.value) void load()
})


onActivated(() => {
  if (loggedIn.value) {
    socket.refresh()
    void load()
  }
})

</script>

<style lang="scss" scoped>
.notification-entry { position: relative; z-index: $z-modal; }
.bell-button { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; width: 64rpx; height: 64rpx; border: 2rpx solid $primary-100; border-radius: $r-full; background: $primary-50; box-shadow: $shadow-sm; }
.bell-button:active { background: $primary-100; }
.bell-badge { position: absolute; top: -6rpx; right: -10rpx; min-width: 28rpx; height: 28rpx; padding: 0 4rpx; border-radius: 14rpx; background: $up; color: #fff; font-size: 18rpx; line-height: 28rpx; text-align: center; }
.notification-backdrop { position: fixed; z-index: $z-modal; inset: 0; background: $overlay-base; }
/* 锚定下拉面板：相对左上角铃铛向下展开（不再是居中弹窗） */
.notification-panel { position: absolute; z-index: $z-modal + 1; top: calc(100% + 12rpx); left: 0; width: 620rpx; max-width: 86vw; height: 640rpx; max-height: 60vh; display: flex; flex-direction: column; overflow: hidden; border: 2rpx solid $line; border-radius: $r-lg; background: $bg-card; box-shadow: $shadow-card; }
.notification-panel__header { position: relative; display: flex; align-items: center; gap: 12rpx; min-height: 84rpx; padding: $s-3; border-bottom: 2rpx solid $line-soft; }
.notification-panel__title { font-size: $font-size-base; font-weight: 600; color: $ink; }
.notification-panel__footer { font-size: $font-size-xs; color: $ink-mute; }
.notification-panel__read-all { display: inline-flex; flex: none; align-items: center; gap: 6rpx; margin-left: auto; padding: 8rpx 0 8rpx 8rpx; color: #a8afbd; font-size: $font-size-sm; font-weight: 400; line-height: 1.2; white-space: nowrap; }
.notification-filter { display: inline-flex; flex: none; align-items: center; gap: 4rpx; padding: 4rpx; border-radius: $r-full; background: $bg-soft; }
.notification-filter__option { min-width: 56rpx; padding: 8rpx 10rpx; border-radius: $r-full; color: $ink-mute; font-size: $font-size-xs; line-height: 1.2; text-align: center; white-space: nowrap; }
.notification-filter__option.is-active { background: $bg-card; box-shadow: $shadow-sm; color: $primary; font-weight: 600; }
.notification-panel__list { flex: 1; height: 0; min-height: 0; }
.notification-panel__state, .notification-panel__footer { padding: $s-4; text-align: center; }
.notification-panel__loading { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 30vh; }
.notification-item { min-height: 128rpx; padding: $s-2 $s-4 $s-2 $s-3; border-bottom: 2rpx solid $line-soft; }
.notification-item__main { display: flex; flex-direction: column; gap: 4rpx; min-width: 0; }
/* 标题行：未读点（前置圆点）+ 标题 + 分类标签 */
.notification-item__headline { display: flex; align-items: center; gap: $s-1; min-width: 0; }
.notification-item__title, .notification-item__summary { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notification-item__title { flex: 1; min-width: 0; font-size: $font-size-sm; font-weight: 600; color: $ink; }
.notification-item__summary { font-size: $font-size-xs; color: $ink-soft; }
.notification-item__time { font-size: 20rpx; color: $ink-mute; }
.notification-item__dot { flex: none; width: 12rpx; height: 12rpx; border-radius: 50%; background: $up; }
.notification-item__tag { flex: none; padding: 2rpx 10rpx; border-radius: $r-full; background: $bg-soft; color: $ink-soft; font-size: 20rpx; line-height: 28rpx; }
/* 自选股筛选入口（header 下方一行）+ 就地下拉框 */
.notification-stockbar-wrap { position: relative; z-index: 3; flex: none; }
.notification-stockbar { display: flex; align-items: center; gap: 8rpx; padding: $s-2 $s-3; border-bottom: 2rpx solid $line-soft; background: $bg-soft; }
.notification-stockbar__label { flex: 1; min-width: 0; overflow: hidden; color: $ink-soft; font-size: $font-size-xs; text-overflow: ellipsis; white-space: nowrap; }
.notification-stockbar__caret { transition: transform 0.2s; }
.notification-stockbar__caret.is-open { transform: rotate(180deg); }
.notification-stockbar__dropdown { position: absolute; z-index: 3; top: 100%; left: 0; right: 0; overflow: hidden; border: 2rpx solid $line; border-top: none; border-radius: 0 0 $r-lg $r-lg; background: $bg-card; box-shadow: $shadow-card; }
.notification-stockbar__options { max-height: 44vh; }
.notification-stockbar__backdrop { position: absolute; z-index: 2; inset: 0; }
.stock-option { display: flex; align-items: center; gap: $s-2; padding: $s-2 $s-3; border-bottom: 2rpx solid $line-soft; }
.stock-option.is-active { background: $primary-50; }
.stock-option__name { flex: 1; min-width: 0; overflow: hidden; color: $ink; font-size: $font-size-sm; text-overflow: ellipsis; white-space: nowrap; }
.stock-option.is-active .stock-option__name { color: $primary; font-weight: 600; }
.stock-option__code { color: $ink-mute; font-size: $font-size-xs; }
</style>
