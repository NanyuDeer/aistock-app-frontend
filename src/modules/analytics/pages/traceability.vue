<template>
  <view class="page-traceability">
    <SubPageCard title="市场洞见">
      <template #header-right>
        <view class="header-right-actions">
          <view v-if="displayedDate" class="date-label">
            <text class="date-label-text">{{ displayedDate }}</text>
          </view>
          <view class="history-btn" @tap="goPredictionHistory">
            <text class="history-btn-text">预测验证</text>
          </view>
        </view>
      </template>
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

      <EmptyState v-else-if="!presentation" text="当日暂无已完成复盘报告" />

      <view v-else class="report-content">
        <MarketTraceHeader :presentation="presentation" />
        <MarketTracePhenomenon :presentation="presentation" />
        <MarketTraceTimeline :presentation="presentation" />
        <MarketTraceAlternatives :presentation="presentation" />
        <MarketTraceRejected :presentation="presentation" />
        <MarketTracePendingRisks :presentation="presentation" />
        <MarketTracePrediction :prediction="presentation.prediction" />
        <!-- 空态占位：prediction 为 null（prediction_records 暂无记录）时不影响其他报告内容 -->
        <view v-if="presentation.prediction === null" class="prediction-placeholder">
          <text class="prediction-placeholder-text">{{ predictionPlaceholderText }}</text>
          <text v-if="predictErr" class="prediction-retry" @tap="retryPrediction">点击重试</text>
        </view>

        <!-- 折叠兜底：完整 markdown -->
        <view class="markdown-section">
          <view class="section-title" @tap="toggleMarkdown">
            <text class="title-text">完整报告（原始）</text>
            <text class="toggle-icon" :class="{ 'is-open': showMarkdown }">▾</text>
          </view>
          <view v-if="showMarkdown" class="markdown-card">
            <rich-text :nodes="markdownHtml" class="report-html" />
          </view>
        </view>
      </view>

      <!-- 日期切换（放在 footer 插槽，固定在底部不依赖 scroll-view 滚动） -->
      <template #footer>
        <view class="date-nav">
          <view class="date-btn" @click="changeDate(-1)">
            <SvgIcon name="arrow-left-line" size="32rpx" color="#0b5fff" />
            <text class="date-btn-text">前一天</text>
          </view>
          <view class="date-btn" @click="changeDate(1)">
            <text class="date-btn-text">后一天</text>
            <SvgIcon name="arrow-right-line" size="32rpx" color="#0b5fff" />
          </view>
        </view>
      </template>
    </SubPageCard>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import { LoadingState, EmptyState, Button, Card } from '@/shared/components'
import { agentApi } from '@/shared/api/modules/agent'
import type { MarketTraceReviewRecord } from '@/shared/api/modules/agent'
import { predictionApi } from '@/shared/api/modules/prediction'
import { shanghaiDateString, shanghaiDateTimeParts, addCalendarDays } from '@/shared/utils/tradingTime'
import { traceDateCandidates } from '@/shared/utils/traceDate'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { markdownToHtml } from '@/shared/utils/markdown'
import { toMarketTracePresentation, type MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'
import MarketTraceHeader from '@/modules/analytics/components/MarketTraceHeader.vue'
import MarketTracePendingRisks from '@/modules/analytics/components/MarketTracePendingRisks.vue'
import MarketTracePhenomenon from '@/modules/analytics/components/MarketTracePhenomenon.vue'
import MarketTraceTimeline from '@/modules/analytics/components/MarketTraceTimeline.vue'
import MarketTraceAlternatives from '@/modules/analytics/components/MarketTraceAlternatives.vue'
import MarketTraceRejected from '@/modules/analytics/components/MarketTraceRejected.vue'
import MarketTracePrediction from '@/modules/analytics/components/MarketTracePrediction.vue'

const loading = ref(false)
const error = ref(false)
const presentation = ref<MarketTracePresentation | null>(null)
const reportAvailability = ref<'pending' | 'failed' | null>(null)
const showMarkdown = ref(false)

/** 当前实际展示报告的日期（回退后为上一交易日；用于预判占位文案的"今日"判断） */
const displayedDate = ref('')
/** 预测接口独立失败标记（report 成功但 prediction 拉取失败时置 true） */
const predictErr = ref(false)
/** 最近一次 completed 的 Report 原文，供预测重试时重组 presentation */
const fetchedReport = ref<MarketTraceReviewRecord | null>(null)

const markdownHtml = computed(() => {
  return presentation.value ? markdownToHtml(presentation.value.markdownDetails) : ''
})

/** 当前导航到的目标交易日（切日基准；默认今天） */
const date = ref(shanghaiDateString())

async function fetchData(strictTarget?: string) {
  loading.value = true
  error.value = false
  presentation.value = null
  reportAvailability.value = null
  predictErr.value = false

  try {
    // strictTarget 提供时严格只看该日（切日不回退）；否则从 date 起向前回退找最近 completed（进入页面/轮询默认体验）
    const candidates = strictTarget ? [strictTarget] : traceDateCandidates(date.value, 3)

    for (const cdate of candidates) {
      const [record, predResp] = await Promise.all([
        agentApi.getMarketTraceReview(cdate),
        predictionApi
          .list({ source_id: `review:${cdate}` })
          .then((r) => ({ ok: true as const, r }))
          .catch(() => ({ ok: false as const, r: null })),
      ])

      // 找到已完成报告：采用该日期，并落 prediction（失败则 predictErr，占位给重试）
      if (record && record.status === 'completed') {
        const model = toMarketTracePresentation(record, cdate, predResp.ok ? (predResp.r?.items?.[0] ?? null) : null)
        if (model) {
          fetchedReport.value = record
          displayedDate.value = cdate
          predictErr.value = !predResp.ok
          // 清除此前候选日残留的 'pending'，确保已采用的历史报告正常展示
          reportAvailability.value = null
          presentation.value = model
          return
        }
        // schema/字段不完整：走整页 error
        error.value = true
        return
      }
      // 记录是否处于"生成中"（queued/processing）——仅当全候选都非 completed 时用
      if (record && (record.status === 'queued' || record.status === 'processing')) {
        reportAvailability.value = 'pending'
      }
      // 严格目标模式：该日无 completed 即结束，不回退到更早日期
      if (strictTarget) {
        if (!reportAvailability.value) reportAvailability.value = 'failed'
        return
      }
      // 其余（null / failed / pending）：继续向前回退到更早日期
    }

    // 没有任何 completed 报告：pending（存在生成中）/ failed
    if (!reportAvailability.value) reportAvailability.value = 'failed'
  } catch (err: unknown) {
    // getMarketTraceReview 抛错（网络/401/服务器）：报告拉取失败非"日期不存在"，停止回退并走整页 error
    console.error('Failed to fetch market trace review:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

/** 前一天/后一天：按交易日历跳档，自动跳过非交易日；接口异常时退回自然日加减 */
async function changeDate(delta: number) {
  let target: string
  try {
    target = delta > 0
      ? await agentApi.getNextTradingDay(date.value)
      : await agentApi.getPreviousTradingDay(date.value)
  } catch (err) {
    console.error('切换交易日失败，退回自然日加减:', err)
    target = addCalendarDays(date.value, delta)
  }
  date.value = target
  await fetchData(target)
}

/** 预判卡片空态占位文案：失败态 / 回退日期 / 当日分时感知 */
const predictionPlaceholderText = computed(() => {
  if (predictErr.value) return '预判加载失败'
  // 回退到历史日期：无“生成中”概念，只表示该日无预判
  if (displayedDate.value !== shanghaiDateString()) return '该日暂无预判数据'
  const { hour, minute } = shanghaiDateTimeParts()
  return hour * 60 + minute >= 20 * 60 + 30
    ? '今日暂无预判数据'
    : '预判生成中（今日 20:30 后可见）'
})

function retry() {
  void fetchData()
}

function toggleMarkdown() {
  showMarkdown.value = !showMarkdown.value
}

function goPredictionHistory() {
  uni.navigateTo({ url: '/modules/analytics/pages/prediction-history' })
}

/** 跨 20:30 / 15:30 切日自动刷新定时器句柄 */
let refreshTimer: ReturnType<typeof setInterval> | null = null

function startRefreshTimer() {
  stopRefreshTimer()
  // 60s 轮询：捕捉 15:30 当日报告完成、20:30 预判落库的自动切换
  refreshTimer = setInterval(() => { void fetchData() }, 60_000)
}

function stopRefreshTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

async function retryPrediction() {
  const report = fetchedReport.value
  const date = displayedDate.value
  if (!report || !date || predictErr.value === false) return
  predictErr.value = false
  const predResp = await predictionApi
    .list({ source_id: `review:${date}` })
    .then((r) => ({ ok: true as const, r }))
    .catch(() => ({ ok: false as const, r: null }))
  if (!predResp.ok) {
    predictErr.value = true
    uni.showToast({ title: '预判加载失败，请重试', icon: 'none' })
    return
  }
  const model = toMarketTracePresentation(report, date, predResp.r?.items?.[0] ?? null)
  if (model) {
    presentation.value = model
  } else {
    // 拉到了但未命中 completed/预判为 null → 展示占位（无失败）即可
    presentation.value = toMarketTracePresentation(report, date, null)
  }
}

onShow(() => {
  void fetchData()
  startRefreshTimer()
})
onHide(stopRefreshTimer)
onUnload(stopRefreshTimer)
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.page-traceability { height: 100%; }
.report-content { display: flex; flex-direction: column; gap: 0; padding: 0 0 $spacing-base 0; }
.error-state { margin: $spacing-base; }

.header-right-actions {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.history-btn {
  padding: 8rpx 16rpx;
  background: $primary-50;
  border-radius: $r-xs;
}

.history-btn-text {
  font-size: $font-size-sm;
  color: $primary;
  font-weight: 500;
}

.date-label {
  padding: 8rpx 16rpx;
  background: $bg-soft;
  border-radius: $r-xs;
}

.date-label-text {
  font-size: $font-size-sm;
  color: $text-color-secondary;
  font-weight: 500;
}

/* 底部日期切换（对齐 agent-report.vue 的 date-nav） */
.date-nav {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 32rpx;
  background: $bg-page;
  border-top: 2rpx solid $line-soft;
}

.date-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 14rpx 22rpx;
  background: #ffffff;
  border-radius: 999rpx;
  box-shadow: 0 2rpx 8rpx rgba(11, 95, 255, 0.08);
}

.date-btn-text {
  font-size: 26rpx;
  color: $primary;
  font-weight: 500;
}

.markdown-section { padding: 0 $spacing-base; margin-top: $spacing-base; }
.markdown-section .section-title {
  display: flex; align-items: center; justify-content: space-between;
  padding: $spacing-sm; background: $bg-soft; border-radius: $r-md;
}
.title-text { font-size: 26rpx; font-weight: 500; color: $text-color-title; }
.toggle-icon { font-size: 24rpx; color: $text-color-secondary; transition: transform 0.2s; }
.toggle-icon.is-open { transform: rotate(180deg); }
.markdown-card {
  margin-top: $spacing-sm; padding: $spacing-base;
  background: $bg-card; border-radius: $r-md; box-shadow: $shadow-card;
}

.prediction-placeholder {
  margin: 0 $spacing-base $spacing-sm;
  padding: $spacing-base;
  background: $bg-card;
  border-radius: $r-md;
  box-shadow: $shadow-card;
}

.prediction-placeholder-text {
  font-size: $font-size-base;
  color: $text-color-secondary;
}

.prediction-retry {
  display: inline-block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: $primary;
  text-decoration: underline;
}
.report-html { display: block; color: $text-color; font-size: 24rpx; line-height: 1.7; }
.report-html :deep(.md-h2) { margin: 12rpx 0; color: $text-color-title; font-size: 28rpx; font-weight: 600; }
.report-html :deep(.md-h1) { margin: 12rpx 0; color: $text-color-title; font-size: 30rpx; font-weight: 600; }
.report-html :deep(.md-h3) { margin: 10rpx 0; color: $text-color-title; font-size: 26rpx; font-weight: 600; }
</style>
