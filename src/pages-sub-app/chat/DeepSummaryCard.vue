<template>
  <view class="deep-summary">
    <view class="ds-header" @tap="expanded = !expanded">
      <view class="ds-title-row">
        <SvgIcon name="line-chart-line" size="28rpx" color="#0b5fff" />
        <text class="ds-title">深度分析</text>
        <text v-if="workerLabel" class="ds-tag">{{ workerLabel }}</text>
      </view>
      <SvgIcon :name="expanded ? 'arrow-up-s-line' : 'arrow-down-s-line'" size="28rpx" color="#9ca3af" />
    </view>
    <text v-if="expanded && report.summary" class="ds-summary">{{ report.summary }}</text>
    <view v-if="symbols.length" class="ds-symbols">
      <text v-for="s in symbols" :key="s" class="ds-symbol">{{ s }}</text>
    </view>
    <text v-if="createdText" class="ds-time">{{ createdText }}</text>
    <view v-if="reportId" class="ds-detail" @tap="goDetail">
      <text class="ds-detail-text">查看详情</text>
      <SvgIcon name="arrow-right-s-line" size="28rpx" color="#0b5fff" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import type { DeepReportRef } from '@/shared/api/modules/agent'

const props = defineProps<{ report: DeepReportRef }>()

const expanded = ref(false)

const WORKER_LABELS: Record<string, string> = {
  stock: '个股',
  sector: '板块',
  hot_burst: '机构调研热门股'
}

const workerLabel = computed(() => {
  const w = props.report.worker
  return w ? WORKER_LABELS[w] ?? w : ''
})
const symbols = computed(() => props.report.symbols ?? [])

/** 改进 19：跳转报告详情入口（与展开/折叠共存，D8）。report_id 缺失（未登录/落库失败）→ 不渲染入口、不跳转（硬约束 8） */
const reportId = computed(() => props.report.report_id ?? '')
const goDetail = () => {
  if (!reportId.value) return
  uni.navigateTo({ url: '/modules/chat/pages/chat-report-detail?reportId=' + reportId.value })
}
const createdText = computed(() => {
  const iso = props.report.created_at
  if (!iso) return ''
  const d = dayjs(iso)
  if (!d.isValid()) return ''
  return d.isSame(dayjs(), 'day') ? d.format('HH:mm') : d.format('MM-DD HH:mm')
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.deep-summary {
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  background: rgba(77, 124, 254, 0.06);
  border-radius: 12rpx;
}
.ds-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ds-title-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.ds-title {
  font-size: 26rpx;
  font-weight: 600;
  color: $ink;
}
.ds-tag {
  font-size: 20rpx;
  color: #0b5fff;
  background: rgba(77, 124, 254, 0.12);
  border-radius: 8rpx;
  padding: 2rpx 10rpx;
}
.ds-summary {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: $ink-soft;
  line-height: 1.6;
}
.ds-symbols {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 12rpx;
}
.ds-symbol {
  font-size: 20rpx;
  color: $ink-soft;
  background: $bg-soft;
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
}
.ds-time {
  display: block;
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #9ca3af;
}
.ds-detail {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4rpx;
  margin-top: 10rpx;
}
.ds-detail-text {
  font-size: 22rpx;
  color: #0b5fff;
}
</style>
