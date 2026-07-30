/**
 * 历史事件时间线
 *
 * 视觉层对齐组件库：使用 shared Timeline 组件渲染，本组件作为数据适配器。
 * 保留业务逻辑：HistoryEvent 数据映射 + sentiment 颜色映射。
 * 注意：A 股红涨绿跌——bullish(利好)=红(up)，bearish(利空)=绿(down)，neutral=中性
 *
 * 数据映射：
 * - year → time
 * - title → title
 * - industryChange → description
 * - sentiment → type (bullish=up, bearish=down, neutral=neutral)
 * - changePercentage → extra ("+X%" / "X%")
 */
<template>
  <Timeline v-if="items.length > 0" :items="items" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { HistoryEvent, MarketSentiment } from '../types'
import Timeline from '@/shared/components/Timeline.vue'

/** Timeline 条目类型（与 shared Timeline 组件 props 对齐） */
type TimelineType = 'up' | 'down' | 'neutral'
interface TimelineItem {
  time: string
  title: string
  description?: string
  type?: TimelineType
  extra?: string
}

interface Props {
  events?: HistoryEvent[]
}

const props = defineProps<Props>()

/** sentiment → Timeline type（A 股红涨绿跌） */
function sentimentToType(sentiment: MarketSentiment): 'up' | 'down' | 'neutral' {
  if (sentiment === 'bullish') return 'up'
  if (sentiment === 'bearish') return 'down'
  return 'neutral'
}

/** 把 HistoryEvent[] 适配为 Timeline 的 items */
const items = computed<TimelineItem[]>(() => {
  if (!props.events) return []
  return props.events.map(ev => ({
    time: ev.year,
    title: ev.title,
    description: ev.industryChange,
    type: sentimentToType(ev.sentiment),
    extra: `${ev.changePercentage >= 0 ? '+' : ''}${ev.changePercentage}%`,
  }))
})
</script>
