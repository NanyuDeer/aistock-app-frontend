<template>
  <view class="page-movement">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 列表 -->
    <view v-else-if="items.length" class="mv-list">
      <view
        v-for="ev in items"
        :key="ev.event_id"
        class="mv-card"
        @click="goDetail(ev.event_id)"
      >
        <view class="mv-head">
          <text class="mv-name">{{ ev.stock_name }}（{{ ev.symbol }}）</text>
          <text :class="['mv-tag', ev.direction === 'up' ? 'tag-up' : 'tag-down']">{{ ev.direction === 'up' ? '上涨' : '下跌' }}</text>
        </view>
        <view class="mv-meta">
          <text :class="ev.direction === 'up' ? 'up' : 'down'">{{ ev.direction === 'up' ? '+' : '' }}{{ ev.change_pct }}%</text>
          <text class="mv-time">{{ fmtTime(ev.triggered_at) }}</text>
          <text class="mv-status">{{ statusText(ev.analysis_status) }}</text>
        </view>
        <view v-if="ev.movement_view?.primaryCandidate" class="mv-verdict">
          <text class="verdict-label">{{ layerText(ev.movement_view.primaryCandidate.layer) }}</text>
          <text class="verdict-text">{{ ev.movement_view.primaryCandidate.verdict }}</text>
        </view>
      </view>
    </view>

    <!-- 空态 -->
    <EmptyState v-else title="暂无异动数据" description="自选股出现尾盘异动时将在此展示" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { stockTraceApi, type StockTraceEvent } from '@/shared/api/modules/stockTrace'
import EmptyState from '@/shared/components/EmptyState.vue'

const items = ref<StockTraceEvent[]>([])
const loading = ref(false)

const layerText = (l?: string): string =>
  ({ company: '公司', sector: '板块', market: '市场', capital: '资金', technical: '技术' }[l ?? ''] ?? '')

const statusText = (s: StockTraceEvent['analysis_status']): string =>
  ({ pending: '待归因', processing: '归因中', completed: '已归因', unavailable: '暂不可用' }[s] ?? s)

const fmtTime = (t: string): string => {
  if (!t) return '--'
  const date = new Date(t)
  if (Number.isNaN(date.getTime())) return '--'
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

const goDetail = (id: string) => {
  uni.navigateTo({ url: `/modules/favorites/pages/movement-detail?event_id=${encodeURIComponent(id)}` })
}

onLoad(async () => {
  loading.value = true
  try {
    const page = await stockTraceApi.list(20)
    items.value = page.items
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
})

onPullDownRefresh(async () => {
  try {
    const page = await stockTraceApi.list(20)
    items.value = page.items
  } catch {
    // 刷新失败时保留旧数据
  } finally {
    uni.stopPullDownRefresh()
  }
})
</script>

<style lang="scss" scoped>
.page-movement {
  min-height: 100%;
  padding: $s-3;
  background: $bg-page;
}

.loading-wrap {
  padding: $s-10;
  text-align: center;
}
.loading-text {
  font-size: $font-size-sm;
  color: $ink-soft;
}

.mv-list {
  display: flex;
  flex-direction: column;
  gap: $s-2;
}

.mv-card {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: $s-3;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
}

.mv-head {
  display: flex;
  align-items: center;
  gap: $s-2;
}

.mv-name {
  font-size: $font-size-base;
  font-weight: 600;
  color: $ink;
}

.mv-tag {
  padding: 2rpx 12rpx;
  border-radius: $r-xs;
  font-size: $font-size-xs;
  font-weight: 500;
}

.tag-up {
  color: $up;
  background: $up-bg;
}

.tag-down {
  color: $down;
  background: $down-bg;
}

.mv-meta {
  display: flex;
  align-items: center;
  gap: $s-2;
  font-size: $font-size-sm;
}

.up {
  font-weight: 600;
  color: $up;
}

.down {
  font-weight: 600;
  color: $down;
}

.mv-time {
  color: $ink-soft;
}

.mv-status {
  color: $ink-mute;
  font-size: $font-size-xs;
}

.mv-verdict {
  display: flex;
  align-items: center;
  gap: $s-1;
  padding: 6rpx 12rpx;
  background: $bg-soft;
  border-radius: $r-xs;
  font-size: $font-size-xs;
}

.verdict-label {
  color: $primary;
  font-weight: 500;
  flex-shrink: 0;
}

.verdict-text {
  color: $ink;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
