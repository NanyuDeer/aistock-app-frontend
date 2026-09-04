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
        <MarketInsightCard :presentation="presentation" />

        <!-- 大盘归因链（P1 chain-attribution）：大盘根 → 主驱动板块分支（relation 徽 + 一句话驱动卡）；
             链空/接口失败由组件内空态承接（无链日不报错，不阻断报告内容） -->
        <view class="chain-view-block">
          <AttributionChainView :date="displayedDate" />
        </view>

        <!-- 主因板块 · 板块研判：仅当日存在大盘主因候选（review_primary/both）时渲染；
             拉取失败静默置空 → 整块不渲染，不阻断主内容 -->
        <view v-if="primarySectorCandidates.length" class="primary-sector-block">
          <view class="primary-sector-head">
            <text class="primary-sector-title">主因板块 · 板块研判</text>
            <view class="primary-sector-more" @tap="goSectorLoop">
              <text class="primary-sector-more-text">全部板块 ›</text>
            </view>
          </view>
          <view v-for="c in primarySectorCandidates" :key="c.ts_code" class="primary-sector-card">
            <SectorInsightCard :candidate="c" :date="displayedDate" />
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
import { ref, watch } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SectorInsightCard from '@/shared/components/SectorInsightCard.vue'
import { LoadingState, EmptyState, Button, Card } from '@/shared/components'
import { agentApi } from '@/shared/api/modules/agent'
import type { SectorInsightCandidate } from '@/shared/api/modules/agent'
import { predictionApi } from '@/shared/api/modules/prediction'
import { shanghaiDateString, addCalendarDays } from '@/shared/utils/tradingTime'
import { traceDateCandidates } from '@/shared/utils/traceDate'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { toMarketTracePresentation, type MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'
import MarketInsightCard from '@/modules/analytics/components/MarketInsightCard.vue'
import AttributionChainView from '@/modules/market/components/AttributionChainView.vue'

const loading = ref(false)
const error = ref(false)
const presentation = ref<MarketTracePresentation | null>(null)
const reportAvailability = ref<'pending' | 'failed' | null>(null)

/** 当前实际展示报告的日期（回退后为上一交易日） */
const displayedDate = ref('')

/** 当前导航到的目标交易日（切日基准；默认今天） */
const date = ref(shanghaiDateString())

async function fetchData(strictTarget?: string) {
  loading.value = true
  error.value = false
  presentation.value = null
  reportAvailability.value = null

  try {
    // strictTarget 提供时严格只看该日（切日不回退）；否则从 date 起向前回退找最近 completed（进入页面/轮询默认体验）
    const candidates = strictTarget ? [strictTarget] : traceDateCandidates(date.value, 3)

    for (const cdate of candidates) {
      // 先取报告，再用报告真实日期关联预测：后端 review 查询会回退返回最近可用报告
      // （如请求 08-28 返回 08-27 报告），预测记录以报告真实日期落库（source_id=review:{report_date}），
      // 若按请求日期查会查空 → 预判显示"暂无预判"
      const record = await agentApi.getMarketTraceReview(cdate)
      const predDate = record?.report_date || cdate
      const predResp = await predictionApi
        .list({ source_id: `review:${predDate}` })
        .then((r) => ({ ok: true as const, r }))
        .catch(() => ({ ok: false as const, r: null }))

      // 找到已完成报告：采用该日期，并透传 prediction 供预判块展示
      if (record && record.status === 'completed') {
        const model = toMarketTracePresentation(record, cdate, predResp.ok ? (predResp.r?.items?.[0] ?? null) : null)
        if (model) {
          // 采用报告真实日期展示（请求日无报告时后端回退到最近可用报告，标签跟随真实日期）
          displayedDate.value = record.report_date
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

function retry() {
  void fetchData()
}

function goPredictionHistory() {
  uni.navigateTo({ url: '/modules/analytics/pages/prediction-history' })
}

/* ===== 主因板块 · 板块研判（板块四环聚合，2026-09-02） ===== */

/** 当日大盘复盘主因板块的聚合候选（source 含 review_primary）；空 → 整块不渲染 */
const primarySectorCandidates = ref<SectorInsightCandidate[]>([])

/** 拉取主因板块研判：失败静默置空，不阻断原有报告内容 */
async function loadPrimarySectorInsight(d: string) {
  if (!d) return
  try {
    const res = await agentApi.getSectorInsight(d)
    primarySectorCandidates.value = (res?.candidates ?? []).filter(
      (c) => c.source === 'review_primary' || c.source === 'both'
    )
  } catch (err) {
    console.error('主因板块研判加载失败:', err)
    primarySectorCandidates.value = []
  }
}

// 复盘报告实际展示日期确定后（成功展示/切日），追加拉取主因板块研判
watch(displayedDate, (d) => {
  if (d) void loadPrimarySectorInsight(d)
})

/** 全部板块入口：跳板块四环页并定位到当前展示日期（traceability 当日为交易日、接口按交易日落库） */
function goSectorLoop() {
  const q = displayedDate.value ? `?date=${encodeURIComponent(displayedDate.value)}` : ''
  uni.navigateTo({ url: `/modules/market/pages/sector-loop${q}` })
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

/* ===== 大盘归因链（水平内边距与 MarketInsightCard/主因板块对齐） ===== */
.chain-view-block {
  padding: $spacing-xs $spacing-base 0;
}

/* ===== 主因板块 · 板块研判（卡外小标题 + SectorInsightCard，水平内边距与 MarketInsightCard 对齐） ===== */
.primary-sector-block {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: $spacing-xs $spacing-base $spacing-base;
}

.primary-sector-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: $spacing-sm 0 $spacing-xs;
}

.primary-sector-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-color-title;
}

.primary-sector-more {
  padding: 6rpx 16rpx;
  background: $primary-50;
  border-radius: $r-xs;

  &:active {
    opacity: 0.8;
  }
}

.primary-sector-more-text {
  font-size: $font-size-sm;
  color: $primary;
  font-weight: 500;
}

</style>
