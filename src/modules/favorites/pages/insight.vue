<template>
  <view class="page-insight">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 洞察列表 -->
    <view v-else-if="insights.length" class="insight-list">
      <view
        v-for="item in insights"
        :key="item.event_id"
        class="card"
        @tap="goDetail(item.event_id)"
      >
        <view class="card-title">{{ item.stock_name }}（{{ item.symbol }}）</view>
        <view v-if="item.event_type !== 'limit_up_radar'" class="card-move">
          <text :class="['tag', item.direction === 'up' ? 'tag-up' : 'tag-down']">{{ item.direction === 'up' ? '上涨异动' : '下跌异动' }}</text>
          <text v-if="item.move_bps !== undefined" :class="item.move_bps >= 0 ? 'up' : 'down'">
            {{ (item.move_bps / 100).toFixed(2) }}%
          </text>
        </view>
        <view class="card-sub">
          <text class="meta-date">{{ item.trade_date }}</text>
          <text class="tag" :class="{ 'tag--unconfirmed': item.attribution_status === 'unconfirmed' }">
            {{ item.attribution_status === 'unconfirmed' ? '主因待验证' : item.primary_driver?.label }}
          </text>
          <text v-if="item.confidence" class="conf">{{ confidenceText(item.confidence) }}</text>
        </view>
      </view>
    </view>

    <!-- 空态 -->
    <EmptyState v-else title="暂无自选股洞察" description="自选股出现异动时将在此生成洞察" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { watchlistInsightApi, type WatchlistInsight } from '@/shared/api/modules/insight'
import EmptyState from '@/shared/components/EmptyState.vue'

const insights = ref<WatchlistInsight[]>([])
const loading = ref(false)

function confidenceText(c: string): string {
  return { high: '高置信', medium: '中置信', low: '低置信' }[c as 'high' | 'medium' | 'low'] || c
}

function goDetail(eventId: string) {
  uni.navigateTo({ url: `/modules/favorites/pages/insight-detail?event_id=${encodeURIComponent(eventId)}` })
}

onShow(async () => {
  loading.value = true
  try {
    insights.value = await watchlistInsightApi.getInsights()
  } catch {
    // API 失败时显示空状态
    insights.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.page-insight {
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

.insight-list {
  display: flex;
  flex-direction: column;
  gap: $s-2;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: $s-3;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
}

.card-title {
  font-size: $font-size-base;
  font-weight: 600;
  color: $ink;
}

.card-move {
  display: flex;
  align-items: center;
  gap: $s-2;
}

.tag-up {
  color: $up;
  background: $up-bg;
}

.tag-down {
  color: $down;
  background: $down-bg;
}

.up {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $up;
}

.down {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $down;
}

.card-sub {
  display: flex;
  align-items: center;
  gap: $s-2;
}

.meta-date {
  font-size: $font-size-xs;
  color: $ink-soft;
}

.tag {
  padding: 2rpx 12rpx;
  border-radius: $r-xs;
  font-size: $font-size-xs;
  color: $primary;
  background: $primary-50;
}
.tag--unconfirmed {
  color: $warning;
  background: $warning-bg;
}

.conf {
  font-size: $font-size-xs;
  color: $ink-soft;
}
</style>
