<template>
  <SubPageCard title="自选">
    <view class="favorites-content">
      <!-- 顶部统计 -->
      <view class="stats-bar">
        <view class="stat-item">
          <text class="stat-label">平均涨幅</text>
          <text :class="['stat-value', avgChange >= 0 ? 'up' : 'down']">
            {{ avgChange >= 0 ? '+' : '' }}{{ avgChange.toFixed(2) }}%
          </text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-label">加自选后</text>
          <text :class="['stat-value', totalChange >= 0 ? 'up' : 'down']">
            {{ totalChange >= 0 ? '+' : '' }}{{ totalChange.toFixed(2) }}%
          </text>
        </view>
        <view class="stat-add-btn" @tap="goSearch">
          <text class="add-btn-text">+ 自选</text>
        </view>
      </view>

      <!-- 工具栏 -->
      <view class="toolbar">
        <view class="tool-icons">
          <text class="tool-icon">✎</text>
          <text class="tool-icon">☰</text>
          <text class="tool-icon">▦</text>
        </view>
        <view class="sort-options">
          <text class="sort-item active">最新</text>
          <text class="sort-item">涨幅</text>
          <text class="sort-item">涨跌</text>
        </view>
      </view>

      <!-- 股票列表 -->
      <view v-if="stocks.length" class="stock-list">
        <view
          v-for="stock in stocks"
          :key="stock.symbol"
          class="stock-row"
          @tap="goDetail(stock.symbol)"
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
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="empty-state">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无自选股</text>
        <text class="empty-tip">去搜索添加感兴趣的股票</text>
        <view class="empty-btn" @tap="goSearch">
          <text class="empty-btn-text">添加股票</text>
        </view>
      </view>

      <!-- 底部添加按钮 -->
      <view v-if="stocks.length" class="add-stock-btn" @tap="goSearch">
        <text class="add-stock-text">+ 添加股票</text>
      </view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useFavoritesStore } from '@/store/modules/favorites'
import SubPageCard from '@/components/layout/SubPageCard.vue'

const favoritesStore = useFavoritesStore()
const stocks = computed(() => {
  const list = favoritesStore.stocks
  if (list && list.length) return list
  // mock 数据（未登录或无数据时显示）
  return mockStocks.value
})

const mockStocks = ref([
  { symbol: '603256', name: '宏和科技', price: 265.33, changePercent: -0.74, margin: false, specialAlert: false },
  { symbol: '600740', name: '山西焦化', price: 3.19, changePercent: -2.45, margin: true, specialAlert: false },
  { symbol: '605598', name: '上海港湾', price: 38.43, changePercent: -1.91, margin: false, specialAlert: true },
  { symbol: '600971', name: '恒源煤电', price: 6.90, changePercent: -2.27, margin: true, specialAlert: false },
  { symbol: '603071', name: '物产环能', price: 11.06, changePercent: -1.78, margin: false, specialAlert: false },
])

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

onShow(() => favoritesStore.fetchFavorites())

function goDetail(symbol: string) {
  uni.navigateTo({ url: `/pages/stock/detail?symbol=${symbol}` })
}

function goSearch() {
  uni.navigateTo({ url: '/pages/stock/search' })
}
</script>

<style lang="scss" scoped>
.favorites-content {
  padding: 0 24rpx 24rpx;
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

.stat-value {
  font-size: 30rpx;
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

/* ===== 工具栏 ===== */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 8rpx;
  margin-bottom: 8rpx;
}

.tool-icons {
  display: flex;
  gap: 20rpx;
}

.tool-icon {
  font-size: 28rpx;
  color: #6b7280;
}

.sort-options {
  display: flex;
  gap: 20rpx;
}

.sort-item {
  font-size: 24rpx;
  color: #9ca3af;

  &.active {
    color: #4d7cfe;
    font-weight: 600;
  }
}

/* ===== 股票列表 ===== */
.stock-list {
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.stock-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }
}

.stock-left {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
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
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
}

.stock-price {
  font-size: 30rpx;
  color: #1a1d24;
  font-weight: 600;
}

.stock-change {
  font-size: 24rpx;
  font-weight: 500;
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
</style>
