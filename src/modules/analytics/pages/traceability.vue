<template>
  <view class="page-traceability">
    <SubPageCard title="大盘溯源">
      <!-- 报告元数据 -->
      <Card class="summary-card">
        <view class="summary-header">
          <view class="summary-icon">
            <SvgIcon name="bar-chart-line" size="32rpx" color="#ffffff" />
          </view>
          <view class="summary-text">
            <text class="summary-title">每日大盘复盘</text>
            <text class="summary-desc">基于已完成的收盘复盘报告</text>
          </view>
          <Badge :type="statusBadgeType">{{ statusText }}</Badge>
        </view>
        <view class="summary-body">
          <view class="summary-row">
            <text class="row-label">报告日期</text>
            <text class="row-value">{{ report?.reportDate || '--' }}</text>
          </view>
          <view class="summary-row">
            <text class="row-label">生成时间</text>
            <text class="row-value">{{ generatedAtText }}</text>
          </view>
          <view class="summary-row">
            <text class="row-label">数据来源</text>
            <text class="row-value">{{ report?.sourceLabel || '--' }}</text>
          </view>
          <view class="summary-row">
            <text class="row-label">归因可信度</text>
            <text class="row-value">{{ confidenceText }}</text>
          </view>
          <text v-if="report?.isFallback" class="fallback-notice">
            当日报告尚未生成，当前显示最近可用报告（{{ report.reportDate }}）
          </text>
        </view>
      </Card>

      <!-- 复盘报告内容 -->
      <view class="section-title">
        <text class="title-text">复盘分析</text>
      </view>

      <LoadingState v-if="loading" />

      <Card v-else-if="error" class="error-state">
        <EmptyState title="复盘报告暂不可用" description="报告内容不完整或服务暂时不可用，请稍后重试" icon="cloud-off-line">
          <Button size="sm" @click="retry">重试</Button>
        </EmptyState>
      </Card>

      <EmptyState
        v-else-if="reportAvailability === 'pending'"
        title="复盘报告生成中"
        description="报告生成完成后将在此展示"
      />

      <EmptyState
        v-else-if="reportAvailability === 'failed'"
        title="暂无可用的复盘报告"
        description="当前最新复盘报告未能完成，请等待后续报告"
      />

      <EmptyState v-else-if="!report" text="当日暂无已完成复盘报告" />

      <view v-else class="report-content">
        <Card class="report-summary-card">
          <text class="report-summary">{{ report.summary }}</text>
        </Card>

        <view v-if="report.sectors.length" class="sector-section">
          <text class="subsection-title">影响板块</text>
          <view class="sector-list">
            <Tag v-for="sector in report.sectors" :key="sector" type="neutral" size="sm">{{ sector }}</Tag>
          </view>
        </view>

        <Card class="details-card">
          <rich-text :nodes="detailsHtml" class="report-html" />
        </Card>

        <Card v-if="report.risks.length" class="risk-card">
          <text class="subsection-title">风险提示</text>
          <view v-for="risk in report.risks" :key="risk" class="risk-item">
            <text class="risk-dot">·</text>
            <text class="risk-text">{{ risk }}</text>
          </view>
        </Card>
      </view>
    </SubPageCard>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { LoadingState, EmptyState, Tag, Badge, Button, Card } from '@/shared/components'
import { agentApi } from '@/shared/api/modules/agent'
import { formatShanghaiDateTime } from '@/shared/utils/datetime'
import { shanghaiDateString } from '@/shared/utils/tradingTime'
import { markdownToHtml } from '@/shared/utils/markdown'
import { toMarketTraceViewModel, type MarketTraceViewModel } from '@/modules/analytics/utils/marketTraceReview'

const loading = ref(false)
const error = ref(false)
const report = ref<MarketTraceViewModel | null>(null)
const reportAvailability = ref<'pending' | 'failed' | null>(null)

const statusBadgeType = computed<'warning' | 'danger' | 'success' | 'info'>(() => {
  if (loading.value) return 'warning'
  if (error.value) return 'danger'
  if (reportAvailability.value === 'pending') return 'warning'
  if (reportAvailability.value === 'failed') return 'danger'
  if (report.value) return 'success'
  return 'info'
})

const statusText = computed(() => {
  if (loading.value) return '分析中'
  if (error.value) return '失败'
  if (reportAvailability.value === 'pending') return '生成中'
  if (reportAvailability.value === 'failed') return '不可用'
  if (report.value) return '已更新'
  return '待更新'
})

const generatedAtText = computed(() => {
  const generatedAt = report.value?.generatedAt
  return generatedAt ? formatShanghaiDateTime(generatedAt) || generatedAt : '--'
})

const confidenceText = computed(() => {
  const confidence = report.value?.confidence
  if (!confidence) return '未提供'
  const labels: Record<'high' | 'medium' | 'low', string> = {
    high: '高',
    medium: '中',
    low: '低',
  }
  return labels[confidence]
})

const detailsHtml = computed(() => (report.value ? markdownToHtml(report.value.details) : ''))

async function fetchData() {
  loading.value = true
  error.value = false
  report.value = null
  reportAvailability.value = null
  const requestedDate = shanghaiDateString()

  try {
    const record = await agentApi.getMarketTraceReview(requestedDate)
    if (record && record.status !== 'completed') {
      reportAvailability.value = record.status === 'queued' || record.status === 'processing'
        ? 'pending'
        : 'failed'
      return
    }
    report.value = record ? toMarketTraceViewModel(record, requestedDate) : null
    if (record && !report.value) {
      throw new Error('复盘报告字段不完整')
    }
  } catch (err: unknown) {
    console.error('Failed to fetch market trace review:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

function retry() {
  void fetchData()
}

onShow(() => {
  void fetchData()
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.page-traceability {
  height: 100%;
}

/* ===== 摘要卡片 ===== */
.summary-card {
  margin: $spacing-base;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-base;
}

.summary-icon {
  width: 60rpx;
  height: 60rpx;
  border-radius: 14rpx;
  background: $brand-gradient;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4rpx 12rpx rgba(77, 124, 254, 0.3);
}

.summary-text {
  flex: 1;
}

.summary-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-color-title;
  display: block;
}

.summary-desc {
  font-size: 22rpx;
  color: $text-color-secondary;
  margin-top: 4rpx;
  display: block;
}

.summary-body {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid $line-soft;

  &:last-child { border-bottom: none; }
}

.row-label {
  font-size: 24rpx;
  color: $text-color-secondary;
}

.row-value {
  font-size: 24rpx;
  color: $text-color-title;
  font-weight: 500;
}

.fallback-notice {
  padding-top: $spacing-sm;
  color: $warning;
  font-size: 22rpx;
  line-height: 1.5;
}

/* ===== 区块标题 ===== */
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $spacing-base;
  margin: $spacing-base 0 $spacing-sm;
}

.title-text {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-color-title;
}

.report-content {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: 0 $spacing-base;
}

.report-summary-card,
.details-card,
.risk-card {
  margin: 0;
}

.report-summary {
  display: block;
  color: $text-color-title;
  font-size: 26rpx;
  line-height: 1.65;
}

.sector-section {
  padding: $spacing-sm;
  background: $bg-card;
  border-radius: $r-md;
  box-shadow: $shadow-card;
}

.subsection-title {
  display: block;
  margin-bottom: $spacing-sm;
  color: $text-color-title;
  font-size: 26rpx;
  font-weight: 600;
}

.sector-list {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.report-html {
  display: block;
  color: $text-color;
  font-size: 24rpx;
  line-height: 1.7;
}

.report-html :deep(.md-h2) {
  margin: 12rpx 0;
  color: $text-color-title;
  font-size: 28rpx;
  font-weight: 600;
}

.report-html :deep(.md-h1) {
  margin: 12rpx 0;
  color: $text-color-title;
  font-size: 30rpx;
  font-weight: 600;
}

.report-html :deep(.md-h3) {
  margin: 10rpx 0;
  color: $text-color-title;
  font-size: 26rpx;
  font-weight: 600;
}

.risk-item {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  margin-top: 8rpx;
}

.risk-dot {
  color: $warning;
  font-size: 28rpx;
  line-height: 1.4;
}

.risk-text {
  flex: 1;
  color: $text-color;
  font-size: 24rpx;
  line-height: 1.5;
}
</style>
