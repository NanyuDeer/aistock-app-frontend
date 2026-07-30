/**
 * EventCard 事件卡片
 * 视觉层：基于组件库 Card + Tag（同步时间：2026-07-28）
 * 保留业务逻辑：event 数据渲染 + impactClass 计算 + click 事件
 *
 * 组件映射：Card 作为容器（clickable），Tag 用于关键词标签和事件类型标签
 */
<template>
  <Card class="as-event-card" clickable @click="$emit('click', event)">
    <view class="as-event-header">
      <text v-if="event.cycle" class="as-event-cycle">{{ event.cycle }}</text>
      <Tag v-if="event.change_type" :type="tagType">{{ event.change_type }}</Tag>
    </view>
    <text class="as-event-title">{{ event.title }}</text>
    <text v-if="event.summary" class="as-event-summary">{{ event.summary }}</text>
    <view v-if="event.keywords?.length" class="as-event-keywords">
      <Tag v-for="(kw, i) in event.keywords.slice(0, 4)" :key="i" type="neutral" size="sm">{{ kw }}</Tag>
    </view>
    <view v-if="event.stocks?.length" class="as-event-stocks">
      <text v-for="(s, i) in event.stocks.slice(0, 3)" :key="i" class="as-event-stock">{{ s.name }}</text>
    </view>
    <text v-if="event.published_at" class="as-event-time">{{ formatTime(event.published_at) }}</text>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/shared/components/Card.vue'
import Tag from '@/shared/components/Tag.vue'
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

/** impactClass 同时用于 Tag 的 type：利好/上涨→up(红)，利空/下跌→down(绿)，其余→neutral */
const tagType = computed<'up' | 'down' | 'neutral'>(() => {
  const t = props.event.change_type || ''
  if (t.includes('利好') || t.includes('上涨')) return 'up'
  if (t.includes('利空') || t.includes('下跌')) return 'down'
  return 'neutral'
})
</script>

<style lang="scss" scoped>
.as-event-card {
  margin-bottom: $s-2;
}

.as-event-header {
  display: flex;
  align-items: center;
  gap: $s-2;
  margin-bottom: $s-2;
}

.as-event-cycle {
  font-size: $font-size-xs;
  color: $ink-soft;
  background: $bg-soft;
  padding: 2rpx $s-2;
  border-radius: $r-xs;
}

.as-event-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $ink;
  display: block;
  line-height: $lh-tight;
}

.as-event-summary {
  font-size: $font-size-base;
  color: $ink-soft;
  margin-top: $s-1;
  line-height: $lh-base;
  display: block;
}

.as-event-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: $s-1;
  margin-top: $s-2;
}

.as-event-stocks {
  display: flex;
  flex-wrap: wrap;
  gap: $s-1;
  margin-top: $s-2;
}

.as-event-stock {
  font-size: $font-size-xs;
  color: $ink;
  background: $bg-soft;
  padding: 4rpx $s-2;
  border-radius: $r-xs;
}

.as-event-time {
  font-size: $font-size-xs;
  color: $ink-mute;
  margin-top: $s-2;
  display: block;
}
</style>
