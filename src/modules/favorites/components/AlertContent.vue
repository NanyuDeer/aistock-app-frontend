<template>
  <view class="alert-content">
    <view class="content-wrap">
      <view class="alert-module">
        <view class="module-header" @tap="goAlertCatcher">
          <text class="module-title">异动捕手</text>
          <text class="module-more">实时监控</text>
        </view>
        <view v-if="captureList.length" class="capture-list">
          <view v-for="item in captureList" :key="item.event_id" class="capture-item" @tap="goEvent(item.event_id)">
            <view :class="['capture-badge', item.direction]"><text>{{ item.direction === 'up' ? '涨' : '跌' }}</text></view>
            <view class="capture-info">
              <text class="capture-name">{{ item.stock_name }}</text>
              <text class="capture-detail">价格异动 {{ signedChange(item.change_pct) }}，阈值 {{ item.threshold_pct.toFixed(0) }}%</text>
            </view>
            <text class="capture-time">{{ formatTime(item.triggered_at) }}</text>
          </view>
        </view>
        <view v-else class="empty-hint"><text>暂无价格异动</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { stockTraceApi, type StockTraceEvent } from '@/shared/api/modules/stockTrace'

const captureList = ref<StockTraceEvent[]>([])

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function signedChange(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

async function loadCaptureList() {
  try {
    const result = await stockTraceApi.list(4)
    captureList.value = result.items
  } catch {
    captureList.value = []
  }
}

function goAlertCatcher() {
  uni.navigateTo({ url: '/modules/favorites/pages/alert-catcher' })
}

function goEvent(eventId: string) {
  uni.navigateTo({ url: `/modules/favorites/pages/alert-catcher?event_id=${encodeURIComponent(eventId)}` })
}

onMounted(() => {
  void loadCaptureList()
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;
.alert-content { background: $bg-color-grey; }
.content-wrap { padding: $spacing-base; }
.module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: $spacing-sm; }
.module-title { font-size: $font-size-lg; font-weight: 600; color: $text-color-title; }
.module-more { color: $brand-color; font-size: $font-size-sm; }
.capture-list { background: #fff; border-radius: $radius-base; }
.capture-item { display: flex; align-items: center; gap: $spacing-sm; padding: $spacing-base; border-bottom: 1rpx solid #edf0f5; }
.capture-item:last-child { border-bottom: 0; }
.capture-badge { width: 44rpx; height: 44rpx; display: flex; align-items: center; justify-content: center; border-radius: 6rpx; font-size: 22rpx; font-weight: 600; }
.capture-badge.up { background: rgba(239, 68, 68, .1); color: #ef4444; }.capture-badge.down { background: rgba(34, 197, 94, .12); color: #22c55e; }
.capture-info { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 4rpx; }.capture-name { color: $text-color-title; font-size: $font-size-base; }.capture-detail, .capture-time, .empty-hint { color: $text-color-secondary; font-size: $font-size-sm; }.capture-detail { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.empty-hint { padding: 40rpx; text-align: center; background: #fff; border-radius: $radius-base; }
</style>
