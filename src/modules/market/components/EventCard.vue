<template>
  <view class="as-event-card" @tap="$emit('click', event)">
    <view class="as-event-header">
      <text v-if="event.cycle" class="as-event-cycle">{{ event.cycle }}</text>
      <text v-if="event.change_type" :class="['as-event-type', impactClass]">{{ event.change_type }}</text>
    </view>
    <text class="as-event-title">{{ event.title }}</text>
    <text v-if="event.summary" class="as-event-summary">{{ event.summary }}</text>
    <view v-if="event.keywords?.length" class="as-event-keywords">
      <text v-for="(kw, i) in event.keywords.slice(0, 4)" :key="i" class="as-event-keyword">{{ kw }}</text>
    </view>
    <view v-if="event.stocks?.length" class="as-event-stocks">
      <text v-for="(s, i) in event.stocks.slice(0, 3)" :key="i" class="as-event-stock">{{ s.name }}</text>
    </view>
    <text v-if="event.published_at" class="as-event-time">{{ formatTime(event.published_at) }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatTime } from '@/shared/utils/datetime'

interface EventLike {
  id?: string
  title: string
  summary?: string
  cycle?: string
  change_type?: string
  keywords?: string[]
  stocks?: Array<{ symbol: string; name: string }>
  published_at?: string
}

const props = defineProps<{ event: EventLike }>()

defineEmits<{ (e: 'click', event: EventLike): void }>()

const impactClass = computed(() => {
  const t = props.event.change_type || ''
  if (t.includes('利好') || t.includes('上涨')) return 'positive'
  if (t.includes('利空') || t.includes('下跌')) return 'negative'
  return 'neutral'
})
</script>

<style lang="scss" scoped>
.as-event-card {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.as-event-header { display: flex; gap: 12rpx; margin-bottom: 12rpx; }

.as-event-cycle {
  font-size: 20rpx;
  color: #6b7280;
  background: #f5f7fa;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}

.as-event-type {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;

  &.positive { color: #f43f5e; background: rgba(244, 63, 94, 0.1); }
  &.negative { color: #22c55e; background: rgba(34, 197, 94, 0.1); }
  &.neutral { color: #6b7280; background: #f5f7fa; }
}

.as-event-title { font-size: 30rpx; font-weight: 600; color: #1a1d24; display: block; line-height: 1.4; }
.as-event-summary { font-size: 26rpx; color: #6b7280; margin-top: 8rpx; line-height: 1.5; display: block; }

.as-event-keywords { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 12rpx; }
.as-event-keyword { font-size: 22rpx; color: #4d7cfe; background: rgba(77, 124, 254, 0.08); padding: 4rpx 12rpx; border-radius: 6rpx; }

.as-event-stocks { display: flex; gap: 8rpx; margin-top: 12rpx; }
.as-event-stock { font-size: 22rpx; color: #1a1d24; background: #f5f7fa; padding: 4rpx 12rpx; border-radius: 6rpx; }

.as-event-time { font-size: 22rpx; color: #9ca3af; margin-top: 12rpx; display: block; }
</style>
