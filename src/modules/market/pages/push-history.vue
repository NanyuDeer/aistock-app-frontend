<template>
  <SubPageCard title="推送历史">
    <view class="push-history-content">
      <!-- 日期筛选区域 -->
      <view class="filter-section">
        <uni-datetime-picker
          v-model="selectedDate"
          type="date"
          :clear-icon="true"
          @change="loadData"
        />
      </view>

      <!-- 推送记录列表 -->
      <uni-list v-if="!loading && records.length">
        <uni-list-item
          v-for="item in records"
          :key="item.stock_code + item.push_date"
          :title="item.stock_name"
          :note="formatNote(item)"
        >
          <template #header>
            <text class="item-date">{{ formatDate(item.push_date) }}</text>
          </template>
          <template #footer>
            <view class="item-footer">
              <text class="item-return" :class="getReturnClass(item)">
                {{ formatReturn(item) }}
              </text>
              <text class="item-time">{{ item.realtime_time || '--' }}</text>
            </view>
          </template>
        </uni-list-item>
      </uni-list>

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

.loading-state,
.empty-state {
  padding: 48rpx;
  text-align: center;
  color: #6b7280;
}

.item-date {
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