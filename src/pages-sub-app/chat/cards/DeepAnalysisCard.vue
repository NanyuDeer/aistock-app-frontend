<template>
  <view v-if="hasData" class="da-card">
    <view class="da-header">
      <text class="da-title">{{ card.title }}</text>
      <text v-if="workerLabel" class="da-tag">{{ workerLabel }}</text>
    </view>
    <text v-if="summary" class="da-summary">{{ summary }}</text>
    <view v-if="symbols.length > 0" class="da-symbols">
      <text v-for="s in symbols" :key="s" class="da-symbol">{{ s }}</text>
    </view>
    <view v-if="tagCodes.length > 0" class="da-tags">
      <text v-for="t in tagCodes" :key="t" class="da-tag-chip">{{ t }}</text>
    </view>
    <text v-if="createdText" class="da-time">{{ createdText }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import type { ChatCard } from '@/shared/api/modules/agent'
import type { DeepReportRef } from '@/shared/api/modules/agent'

const props = defineProps<{ card: ChatCard }>()

/** data 即 DeepReportRef 结构（契约字典：worker/report_id/question/summary/symbols/tag_codes/created_at） */
const data = computed(() => props.card.data as unknown as DeepReportRef)

/** worker 标签映射：与 DeepSummaryCard 的 WORKER_LABELS 模式一致 */
const WORKER_LABELS: Record<string, string> = {
  stock: '个股',
  sector: '板块',
  hot_burst: '机构调研热门股',
}
const workerLabel = computed(() => {
  const w = data.value.worker
  return w ? WORKER_LABELS[w] ?? w : ''
})
const summary = computed(() => data.value.summary ?? '')
const symbols = computed(() => data.value.symbols ?? [])
const tagCodes = computed(() => data.value.tag_codes ?? [])
const createdText = computed(() => {
  const iso = data.value.created_at
  if (!iso) return ''
  const d = dayjs(iso)
  if (!d.isValid()) return ''
  return d.isSame(dayjs(), 'day') ? d.format('HH:mm') : d.format('MM-DD HH:mm')
})
const hasData = computed(() => !!workerLabel.value || !!summary.value || symbols.value.length > 0 || tagCodes.value.length > 0 || !!createdText.value)
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.da-card {
  margin-bottom: 12rpx;
  border-radius: $r-md;
  overflow: hidden;
  box-shadow: $shadow-card;
}
.da-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 20rpx;
  background: $brand-gradient;
}
.da-title { flex: 1; font-size: 26rpx; font-weight: 700; color: #fff; }
.da-tag {
  font-size: 20rpx;
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
  border-radius: $r-xs;
  padding: 2rpx 10rpx;
}
.da-summary {
  display: block;
  padding: 14rpx 20rpx 0;
  font-size: 24rpx;
  color: $ink-soft;
  line-height: 1.6;
}
.da-symbols {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  padding: 12rpx 20rpx 0;
}
.da-symbol {
  font-size: 20rpx;
  color: $primary;
  background: $primary-50;
  border-radius: $r-xs;
  padding: 2rpx 10rpx;
}
.da-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  padding: 8rpx 20rpx 0;
}
.da-tag-chip {
  font-size: 20rpx;
  color: $ink-soft;
  background: $bg-soft;
  border-radius: $r-xs;
  padding: 2rpx 10rpx;
}
.da-time {
  display: block;
  padding: 10rpx 20rpx 14rpx;
  font-size: 20rpx;
  color: $ink-mute;
}
</style>
