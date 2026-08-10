<template>
  <view v-if="hasData" class="da-card">
    <view class="da-header">
      <text class="da-title">{{ card.title }}</text>
      <text v-if="workerLabel" class="da-tag">{{ workerLabel }}</text>
    </view>
    <mp-html v-if="summaryHtml" :content="summaryHtml" class="da-summary" />
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
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'
import { markdownToHtml } from '@/shared/utils/markdown'
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
/** 摘要为 markdown（标题/表格/加粗），经 markdownToHtml 转 HTML 后用 mp-html 渲染 */
const summaryHtml = computed(() => (summary.value ? markdownToHtml(summary.value) : ''))
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
  padding: 14rpx 20rpx 0;
  font-size: 24rpx;
  color: $ink-soft;
  line-height: 1.6;
  word-break: keep-all;
  overflow-wrap: break-word;
}
/* ===== markdown 渲染样式（mp-html 内容） ===== */
:deep(.da-summary strong),
:deep(.da-summary b) {
  display: inline;
  font-weight: 700;
}
:deep(.da-summary .md-h2) { font-size: 30rpx; font-weight: 700; color: $ink; margin: 12rpx 0 6rpx; }
:deep(.da-summary .md-h3) { font-size: 28rpx; font-weight: 600; color: $ink; margin: 10rpx 0 6rpx; }
:deep(.da-summary .md-h4) { font-size: 26rpx; font-weight: 600; color: $ink; margin: 8rpx 0 4rpx; }
:deep(.da-summary .md-hr) { border: none; border-top: 1rpx solid $line; margin: 10rpx 0; }
:deep(.da-summary .md-ul) { padding-left: 20rpx; margin: 6rpx 0; }
:deep(.da-summary .md-ol) { padding-left: 20rpx; margin: 6rpx 0; }
:deep(.da-summary .md-ul-li) { font-size: 24rpx; color: $ink-soft; line-height: 1.7; }
:deep(.da-summary .md-ol-li) { font-size: 24rpx; color: $ink-soft; line-height: 1.7; }
:deep(.da-summary .md-table) { width: 100%; border-collapse: collapse; margin: 8rpx 0; }
:deep(.da-summary .md-table th) { background: $bg-soft; font-size: 22rpx; font-weight: 600; color: $ink; padding: 6rpx 8rpx; border: 1rpx solid $line; }
:deep(.da-summary .md-table td) { font-size: 22rpx; color: $ink-soft; padding: 6rpx 8rpx; border: 1rpx solid $line; }
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
