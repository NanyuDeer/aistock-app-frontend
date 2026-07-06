<template>
  <SubPageCard title="推送历史">
    <view class="push-history-content">
      <!-- 日期筛选区域 -->
      <view class="filter-section">
        <view v-if="selectedDate" class="filter-active">
          <text class="filter-label">筛选日期: {{ selectedDate }}</text>
          <text class="filter-clear" @tap="clearFilter">清除</text>
        </view>
        <view v-else class="filter-hint">
          <text class="filter-label">显示全部推送记录</text>
        </view>
      </view>

      <!-- 推送记录列表 -->
      <view v-if="!loading && records.length" class="record-list">
        <view
          v-for="item in records"
          :key="item.stock_code + item.push_date"
          class="record-item"
        >
          <view class="item-header">
            <text class="item-date">{{ formatDate(item.push_date) }}</text>
            <text class="item-name">{{ item.stock_name }}</text>
          </view>
          <view class="item-body">
            <text class="item-note">{{ formatNote(item) }}</text>
            <view class="item-footer">
              <text class="item-return" :class="getReturnClass(item)">
                {{ formatReturn(item) }}
              </text>
              <text class="item-time">{{ item.realtime_time || '--' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>

      <!-- 空状态 -->
      <view v-if="!loading && !records.length" class="empty-state">
        <text>暂无推送记录</text>
      </view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { stockApi } from '@/shared/api/modules/stock'
import type { PushHistoryItem } from '@/shared/api/modules/stock'
import SubPageCard from '@/shared/components/SubPageCard.vue'

const selectedDate = ref('')
const loading = ref(false)
const records = ref<PushHistoryItem[]>([])

async function loadData() {
  loading.value = true
  try {
    const params = selectedDate.value ? { date: selectedDate.value } : undefined
    const res: any = await stockApi.getPushHistory(params)
    // luch-request 响应拦截器已处理，直接返回 data 部分
    // 后端可能返回 { items: [] } 或 { data: { items: [] } }
    records.value = res?.items || res?.data?.items || []
  } catch (error) {
    console.error('加载推送历史失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function formatDate(date: string): string {
  if (!date) return '--'
  const d = new Date(date)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

function formatNote(item: PushHistoryItem): string {
  const pushPrice = item.push_price ? `推送: ${item.push_price.toFixed(2)}` : '--'
  const currentPrice = item.realtime_price || item.latest_price
  const priceText = currentPrice ? `现价: ${currentPrice.toFixed(2)}` : '--'
  return `${pushPrice} | ${priceText}`
}

function formatReturn(item: PushHistoryItem): string {
  const returnPct = item.realtime_return_pct || item.return_pct
  if (!returnPct) return '--'
  return `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`
}

function getReturnClass(item: PushHistoryItem): string {
  const returnPct = item.realtime_return_pct || item.return_pct
  if (!returnPct) return ''
  return returnPct >= 0 ? 'up' : 'down'
}

function clearFilter() {
  selectedDate.value = ''
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.push-history-content {
  padding: 24rpx;
}

.filter-section {
  margin-bottom: 24rpx;
}

.filter-active,
.filter-hint {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 20rpx;
  background: #f0f2f5;
  border-radius: 8rpx;
}

.filter-label {
  font-size: 24rpx;
  color: #6b7280;
}

.filter-clear {
  font-size: 24rpx;
  color: #4d7cfe;
  font-weight: 500;
}

.loading-state,
.empty-state {
  padding: 48rpx;
  text-align: center;
  color: #6b7280;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.record-item {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.item-date {
  font-size: 24rpx;
  color: #6b7280;
}

.item-name {
  font-size: 28rpx;
  color: #1a1d24;
  font-weight: 600;
}

.item-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-note {
  font-size: 24rpx;
  color: #6b7280;
}

.item-footer {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.item-return {
  font-size: 28rpx;
  font-weight: 600;

  &.up {
    color: #f43f5e;
  }

  &.down {
    color: #22c55e;
  }
}

.item-time {
  font-size: 22rpx;
  color: #9ca3af;
}
</style>