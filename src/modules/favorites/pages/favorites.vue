<template>
  <SubPageCard title="自选" active-panel="favorites">
    <view class="favorites-content">
      <view v-if="favoritesStore.syncError" class="sync-error" @tap="retrySync">
        <text>同步失败，点击重试</text>
      </view>
      <!-- 顶部统计 -->
      <view class="stats-bar">
        <view class="stat-item">
          <text class="stat-label">平均涨幅</text>
          <view class="stat-value-wrap">
            <text :class="['stat-value', avgChange >= 0 ? 'up' : 'down']">
              {{ avgChange >= 0 ? '+' : '' }}{{ avgChange.toFixed(2) }}%
            </text>
            <text :class="['stat-arrow', avgChange >= 0 ? 'up' : 'down']">{{ avgChange >= 0 ? '↑' : '↓' }}</text>
          </view>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-label">加自选后</text>
          <view class="stat-value-wrap">
            <text :class="['stat-value', totalChange >= 0 ? 'up' : 'down']">
              {{ totalChange >= 0 ? '+' : '' }}{{ totalChange.toFixed(2) }}%
            </text>
            <text :class="['stat-arrow', totalChange >= 0 ? 'up' : 'down']">{{ totalChange >= 0 ? '↑' : '↓' }}</text>
          </view>
        </view>
        <view class="stat-add-btn" @tap="goSearch">
          <text class="add-btn-text">+ 自选</text>
        </view>
      </view>

      <!-- 表头：工具图标 + 排序列名（结构与 stock-row 完全一致确保对齐） -->
      <view class="table-header">
        <view class="header-left">
          <SvgIcon name="edit-line" size="28rpx" color="#9ca3af" />
          <SvgIcon name="menu-line" size="28rpx" color="#9ca3af" />
          <SvgIcon name="grid-line" size="28rpx" color="#9ca3af" />
          <SvgIcon name="file-copy-line" size="28rpx" color="#9ca3af" />
        </view>
        <view class="header-right">
          <view class="header-col header-col-price" :class="{ active: sortKey === 'price' }" @tap="toggleSort('price')">
            <text class="col-label">最新</text>
            <text v-if="sortKey === 'price'" class="col-arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</text>
          </view>
          <view class="header-col header-col-change" :class="{ active: sortKey === 'changePercent' }" @tap="toggleSort('changePercent')">
            <text class="col-label">涨幅</text>
            <text v-if="sortKey === 'changePercent'" class="col-arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</text>
          </view>
          <view class="header-col header-col-amount" :class="{ active: sortKey === 'changeAmount' }" @tap="toggleSort('changeAmount')">
            <text class="col-label">涨跌</text>
            <text v-if="sortKey === 'changeAmount'" class="col-arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</text>
          </view>
        </view>
      </view>

      <!-- 股票列表 -->
      <view v-if="sortedStocks.length" class="stock-list">
        <view
          v-for="stock in sortedStocks"
          :key="stock.symbol"
          class="stock-row-wrap"
        >
          <!-- 删除按钮（左滑后露出） -->
          <view
            class="remove-stock-btn"
            :class="{ disabled: favoritesStore.isPending(stock.symbol) }"
            @tap.stop="confirmRemove(stock)"
          >
            <text class="remove-text">删除</text>
          </view>
          <!-- 可滑动内容层 -->
          <view
            class="stock-row"
            :style="{ transform: openSwipeSymbol === stock.symbol ? 'translateX(-140rpx)' : 'translateX(0)' }"
            @touchstart="onSwipeStart($event, stock.symbol)"
            @touchmove="onSwipeMove"
            @touchend="onSwipeEnd"
            @tap="openSwipeSymbol === stock.symbol ? closeSwipe() : goDetail(stock.symbol)"
          >
            <view class="stock-left">
              <text class="stock-name">{{ stock.name }}</text>
              <view class="stock-tags">
                <text class="stock-code">{{ stock.symbol }}</text>
                <text v-if="stock.margin" class="tag-margin">融</text>
                <text v-if="stock.specialAlert" class="tag-alert">特别提醒</text>
              </view>
            </view>
            <view class="stock-right">
              <text class="stock-price">{{ stock.price ? stock.price.toFixed(2) : '--' }}</text>
              <text :class="['stock-change', stock.changePercent >= 0 ? 'up' : 'down']">
                {{ stock.changePercent >= 0 ? '+' : '' }}{{ stock.changePercent.toFixed(2) }}%
              </text>
              <text :class="['stock-amount', stock.changeAmount >= 0 ? 'up' : 'down']">
                {{ stock.changeAmount >= 0 ? '+' : '' }}{{ stock.changeAmount.toFixed(2) }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="empty-state">
        <SvgIcon class="empty-icon" name="file-list-line" size="80rpx" color="#d1d5db" />
        <text class="empty-text">暂无自选股</text>
        <text class="empty-tip">去搜索添加感兴趣的股票</text>
        <view class="empty-btn" @tap="goSearch">
          <text class="empty-btn-text">添加股票</text>
        </view>
      </view>

      <!-- 底部添加按钮 -->
      <view v-if="sortedStocks.length" class="add-stock-btn" @tap="goSearch">
        <text class="add-stock-text">+ 添加股票</text>
      </view>

      <!-- 底部留白，避免被 GlobalChatBar 遮挡 -->
      <view class="bottom-spacer"></view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useFavoritesStore } from '@/shared/store/modules/favorites'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

/* ===== 类型定义 ===== */
interface StockItem {
  symbol: string
  name: string
  price: number
  changePercent: number
  changeAmount: number
  margin: boolean
  specialAlert: boolean
}

/* ===== 排序状态 ===== */
type SortKey = 'price' | 'changePercent' | 'changeAmount'
const sortKey = ref<SortKey>('price')
const sortDir = ref<'asc' | 'desc'>('asc')

const sortColumns = [
  { key: 'price' as SortKey, label: '最新' },
  { key: 'changePercent' as SortKey, label: '涨幅' },
  { key: 'changeAmount' as SortKey, label: '涨跌' },
]

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

/* ===== 数据 ===== */
const favoritesStore = useFavoritesStore()

const stocks = computed<StockItem[]>(() => {
  const list = favoritesStore.stocks
  return list.map((stock) => ({
    symbol: stock.symbol,
    name: stock.name,
    price: stock.price || 0,
    changePercent: stock.changePercent || 0,
    changeAmount: stock.price && stock.changePercent ? stock.price * stock.changePercent / 100 : 0,
    margin: false,
    specialAlert: false,
  }))
})

const sortedStocks = computed(() => {
  const list = [...stocks.value]
  const dir = sortDir.value === 'asc' ? 1 : -1
  return list.sort((a, b) => (a[sortKey.value] - b[sortKey.value]) * dir)
})

const avgChange = computed(() => {
  const list = stocks.value
  if (!list.length) return 0
  return list.reduce((sum, s) => sum + (s.changePercent || 0), 0) / list.length
})

const totalChange = computed(() => {
  const list = stocks.value
  if (!list.length) return 0
  return list.reduce((sum, s) => sum + (s.changePercent || 0), 0)
})

onShow(() => favoritesStore.fetchFavorites({ silent: false }))

/* ===== 左滑删除 ===== */
const openSwipeSymbol = ref('')
const swipingSymbol = ref('')
const swipeStartX = ref(0)
const swipeStartY = ref(0)
const swipeDeltaX = ref(0)
const swipeDeltaY = ref(0)
const isSwiping = ref(false)

function onSwipeStart(e: unknown, symbol: string) {
  const touch = (e as TouchEvent).touches[0] || (e as TouchEvent).changedTouches[0]
  swipeStartX.value = touch.clientX
  swipeStartY.value = touch.clientY
  swipeDeltaX.value = 0
  swipeDeltaY.value = 0
  isSwiping.value = false
  swipingSymbol.value = symbol
  // 如果触摸的是其他行，先关闭当前打开的行
  if (openSwipeSymbol.value && openSwipeSymbol.value !== symbol) {
    openSwipeSymbol.value = ''
  }
}

function onSwipeMove(e: unknown) {
  const touch = (e as TouchEvent).touches[0] || (e as TouchEvent).changedTouches[0]
  swipeDeltaX.value = touch.clientX - swipeStartX.value
  swipeDeltaY.value = touch.clientY - swipeStartY.value
  // 水平滑动大于垂直滑动时标记为正在滑动
  if (Math.abs(swipeDeltaX.value) > 10 && Math.abs(swipeDeltaX.value) > Math.abs(swipeDeltaY.value)) {
    isSwiping.value = true
  }
}

function onSwipeEnd() {
  if (!isSwiping.value) {
    swipingSymbol.value = ''
    return
  }
  // 左滑超过阈值 → 打开删除按钮
  if (swipeDeltaX.value < -50) {
    openSwipeSymbol.value = swipingSymbol.value
  } else if (swipeDeltaX.value > 30) {
    // 右滑 → 关闭
    openSwipeSymbol.value = ''
  }
  isSwiping.value = false
  swipingSymbol.value = ''
}

function closeSwipe() {
  openSwipeSymbol.value = ''
}

function retrySync() {
  void favoritesStore.fetchFavorites({ silent: false })
}

function confirmRemove(stock: StockItem) {
  if (favoritesStore.isPending(stock.symbol)) return
  uni.showModal({
    title: '删除自选股',
    content: `确认将 ${stock.name} 从自选股中删除吗？`,
    confirmText: '删除',
    success: async ({ confirm }) => {
      if (!confirm) return
      const removed = await favoritesStore.remove(stock.symbol)
      if (removed) uni.showToast({ title: '已移除自选', icon: 'none' })
    },
  })
}

function goDetail(symbol: string) {
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` })
}

function goSearch() {
  uni.navigateTo({ url: '/modules/favorites/pages/search' })
}
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

.favorites-content {
  padding: 0 24rpx 24rpx;
}

.sync-error {
  margin-bottom: $spacing-sm;
  padding: $spacing-sm $spacing-base;
  color: $error-color;
  font-size: $font-size-base;
  text-align: center;
  background: rgba(244, 63, 94, 0.08);
  border-radius: $radius-base;
}

/* ===== 统计栏 ===== */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.stat-label {
  font-size: 22rpx;
  color: #9ca3af;
}

.stat-value-wrap {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.stat-value {
  font-size: 30rpx;
  font-weight: 600;
}

.stat-arrow {
  font-size: 24rpx;
  font-weight: 600;
}

.stat-divider {
  width: 1rpx;
  height: 48rpx;
  background: #e5e7eb;
}

.stat-add-btn {
  margin-left: auto;
  padding: 10rpx 24rpx;
  background: linear-gradient(135deg, #4d7cfe, #6366f1);
  border-radius: 24rpx;
}

.add-btn-text {
  font-size: 24rpx;
  color: #ffffff;
  font-weight: 500;
}

/* ===== 表头：工具图标 + 排序列名 ===== */
/* 表头结构必须与 stock-row 完全一致：左侧 flex:1，右侧 flex-shrink:0 + 相同 gap + 相同列宽 */
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 24rpx; /* 与 stock-row 的 padding 一致 */
  margin-bottom: 4rpx;
}

.header-left {
  display: flex;
  gap: 16rpx;
  flex: 1; /* 与 stock-left 的 flex:1 对应 */
}

.tool-icon {
  font-size: 28rpx;
  color: #9ca3af;
}

/* header-right 与 stock-right 结构完全一致 */
.header-right {
  display: flex;
  align-items: center;
  gap: 24rpx; /* 与 stock-right 的 gap 一致 */
  flex-shrink: 0; /* 与 stock-right 的 flex-shrink:0 对应 */
}

/* 每列的宽度与 stock-right 中的对应列完全一致，用 text-align:right 右对齐（与数据列一致） */
.header-col {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2rpx;

  .col-label {
    font-size: 24rpx;
    color: #9ca3af;
  }

  .col-arrow {
    font-size: 20rpx;
    color: #9ca3af;
  }

  &.active {
    .col-label {
      color: #4d7cfe;
      font-weight: 600;
    }
    .col-arrow {
      color: #4d7cfe;
    }
  }
}

/* 三列宽度与 stock-price / stock-change / stock-amount 的 min-width 完全一致 */
/* 同时强制 header-col 内部用 text-align:right 与数据列的 text-align:right 保持一致 */
.header-col-price  { min-width: 100rpx; text-align: right; }
.header-col-change { min-width: 90rpx;  text-align: right; }
.header-col-amount { min-width: 80rpx;  text-align: right; }

/* ===== 股票列表 ===== */
.stock-list {
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.stock-row-wrap {
  position: relative;
  overflow: hidden;
}

.remove-stock-btn {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 140rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $error-color;
  gap: 6rpx;

  &.disabled {
    opacity: 0.5;
  }
}

.remove-text {
  color: #ffffff;
  font-size: $font-size-sm;
  font-weight: 500;
}

.stock-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f3f4f6;
  background: #ffffff;
  position: relative;
  z-index: 1;
  transition: transform 0.25s ease;

  &:last-child {
    border-bottom: none;
  }
}

.stock-left {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  flex: 1;
}

.stock-name {
  font-size: 30rpx;
  color: #1a1d24;
  font-weight: 500;
}

.stock-tags {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.stock-code {
  font-size: 22rpx;
  color: #9ca3af;
}

.tag-margin {
  font-size: 18rpx;
  color: #f59f0b;
  background: rgba(245, 159, 11, 0.1);
  padding: 1rpx 6rpx;
  border-radius: 4rpx;
}

.tag-alert {
  font-size: 18rpx;
  color: #f43f5e;
  background: rgba(244, 63, 94, 0.1);
  padding: 1rpx 6rpx;
  border-radius: 4rpx;
}

.stock-right {
  display: flex;
  align-items: center;
  gap: 24rpx;
  flex-shrink: 0;
}

.stock-price {
  font-size: 30rpx;
  color: #1a1d24;
  font-weight: 600;
  min-width: 100rpx;
  text-align: right;
}

.stock-change {
  font-size: 24rpx;
  font-weight: 500;
  min-width: 90rpx;
  text-align: right;
}

.stock-amount {
  font-size: 24rpx;
  font-weight: 500;
  min-width: 80rpx;
  text-align: right;
}

.up { color: #f43f5e; }
.down { color: #22c55e; }

/* ===== 空状态 ===== */
.empty-state {
  text-align: center;
  padding: 120rpx 0;

  .empty-icon {
    display: block;
    font-size: 80rpx;
    margin-bottom: 20rpx;
  }
  .empty-text {
    display: block;
    font-size: 28rpx;
    color: #1a1d24;
    margin-bottom: 10rpx;
  }
  .empty-tip {
    display: block;
    font-size: 24rpx;
    color: #9ca3af;
    margin-bottom: 30rpx;
  }
  .empty-btn {
    display: inline-block;
    padding: 16rpx 48rpx;
    background: linear-gradient(135deg, #4d7cfe, #6366f1);
    border-radius: 40rpx;
  }
  .empty-btn-text {
    font-size: 26rpx;
    color: #ffffff;
  }
}

/* ===== 底部添加按钮 ===== */
.add-stock-btn {
  text-align: center;
  padding: 24rpx;
  margin-top: 16rpx;
  background: #ffffff;
  border-radius: 16rpx;
  border: 2rpx dashed #d1d5db;
}

.add-stock-text {
  font-size: 26rpx;
  color: #4d7cfe;
  font-weight: 500;
}

/* 底部留白，SubPageCard padding-bottom 已处理，此处仅少量额外间距 */
.bottom-spacer {
  height: 20rpx;
}
</style>
