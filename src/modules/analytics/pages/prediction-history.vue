<template>
  <view class="page-prediction-history">
    <SubPageCard title="预测验证">
      <LoadingState v-if="loading" />

      <EmptyState v-else-if="error" title="预测数据暂不可用" description="服务暂时不可用，请稍后重试">
        <Button size="sm" @click="loadData">重试</Button>
      </EmptyState>

      <template v-else>
        <!-- 顶部统计栏 -->
        <view class="stats-bar">
          <view class="stat-item">
            <text class="stat-value">{{ stats.total }}</text>
            <text class="stat-label">预测总数</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ stats.pendingCount }}</text>
            <text class="stat-label">进行中</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ stats.verifiedCount }}</text>
            <text class="stat-label">已结束</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ stats.skippedCount }}</text>
            <text class="stat-label">已跳过</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ hitRateText }}</text>
            <text class="stat-label">档位命中率</text>
          </view>
        </view>

        <!-- 状态筛选 -->
        <view class="filter-tabs">
          <view
            v-for="tab in FILTER_TABS"
            :key="tab.value"
            class="filter-tab"
            :class="{ active: activeFilter === tab.value }"
            @tap="switchFilter(tab.value)"
          >
            <text class="filter-tab-text">{{ tab.label }}</text>
          </view>
        </view>

        <EmptyState v-if="!list.length" title="暂无预测记录" description="大盘溯源产生预测后会展示在这里" />

        <view v-else class="prediction-list">
          <view v-for="record in list" :key="record.id" class="prediction-card" @tap="goDetail(record.id)">
            <view class="card-head">
              <text class="card-date">{{ record.report_date }} 溯源预测</text>
              <view class="head-right">
                <text class="card-status">{{ predictionStatusLabel(record) }}</text>
                <view v-if="record.status === 'skipped'" class="badge badge-skipped">
                  <text class="badge-text">已跳过</text>
                </view>
                <view v-else class="badge" :class="isVerified(record) ? 'badge-done' : 'badge-ongoing'">
                  <text class="badge-text">{{ isVerified(record) ? '已结束' : '进行中' }}</text>
                </view>
              </view>
            </view>
            <view v-if="record.status !== 'skipped' && record.prediction?.attribution_summary" class="card-summary">
              <text class="summary-text">{{ record.prediction.attribution_summary }}</text>
            </view>
            <!-- skipped 记录不渲染 horizon 结果（prediction 可能只有 skip_reason） -->
            <view v-if="record.status !== 'skipped'" class="card-horizons">
              <template v-for="h in HORIZON_ORDER" :key="h">
                <view v-if="record.due_dates[h]" class="horizon-row">
                  <text class="horizon-name">{{ HORIZON_LABELS[h] }}</text>
                  <text class="horizon-due">到期 {{ record.due_dates[h] }}</text>
                  <view class="horizon-result" :class="resultClass(record, h)">
                    <text class="horizon-result-text">{{ resultText(record, h) }}</text>
                  </view>
                </view>
              </template>
            </view>
          </view>
        </view>
      </template>
    </SubPageCard>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import { LoadingState, EmptyState, Button } from '@/shared/components'
import { predictionApi, type PredictionRecord, type PredictionHorizonKey } from '@/shared/api/modules/prediction'
import { shanghaiDateString } from '@/shared/utils/tradingTime'
import {
  HORIZON_ORDER,
  HORIZON_LABELS,
  horizonStage,
  overallStatus,
  computeStats,
  type PredictionStatsView,
} from '@/modules/analytics/utils/predictionHistory'

const FILTER_TABS = [
  { label: '全部', value: 'all' },
  { label: '进行中', value: 'pending' },
  { label: '已结束', value: 'verified' },
] as const

type FilterValue = (typeof FILTER_TABS)[number]['value']

const loading = ref(false)
const error = ref(false)
const list = ref<PredictionRecord[]>([])
const stats = ref<PredictionStatsView>({ total: 0, pendingCount: 0, verifiedCount: 0, skippedCount: 0, hitRate: null })
const activeFilter = ref<FilterValue>('all')
const today = shanghaiDateString()

const hitRateText = computed(() => {
  const rate = stats.value.hitRate
  return rate === null ? '暂无' : `${Math.round(rate * 100)}%`
})

function isVerified(record: PredictionRecord): boolean {
  return overallStatus(record, today) === 'verified'
}

function predictionStatusLabel(record: PredictionRecord): string {
  const map: Record<string, string> = { confirmed: '已确认', hypothesis: '假设推演', insufficient: '证据不足' }
  // skipped 记录 prediction 可能只有 skip_reason（无 prediction_status），防御访问
  return map[record.prediction?.prediction_status || ''] || record.prediction?.prediction_status || '已跳过'
}

async function loadData() {
  loading.value = true
  error.value = false
  try {
    const data = await predictionApi.list({ status: activeFilter.value })
    list.value = data?.items ?? []
    if (data?.stats) {
      stats.value = data.stats
    } else {
      // 后端未返回 stats（旧版本）时按当前页兜底估算
      stats.value = computeStats(list.value, today)
    }
  } catch (err: unknown) {
    console.error('[prediction-history] load failed:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

function switchFilter(value: FilterValue) {
  activeFilter.value = value
  void loadData()
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/modules/analytics/pages/prediction-detail?id=${id}` })
}

function resultText(record: PredictionRecord, horizon: PredictionHorizonKey): string {
  const stage = horizonStage(record, horizon, today)
  if (stage.kind === 'verified') {
    const map: Record<string, string> = { hit: '命中', miss: '未命中', insufficient: '无法验证' }
    const actual = stage.entry.actual ? ` ${stage.entry.actual}` : ''
    return `${map[stage.result] || ''}${actual}`
  }
  if (stage.kind === 'due_pending') return '待验证·已到期'
  return '待验证'
}

function resultClass(record: PredictionRecord, horizon: PredictionHorizonKey): string {
  const stage = horizonStage(record, horizon, today)
  if (stage.kind === 'verified') {
    if (stage.result === 'hit') return 'result-hit'
    if (stage.result === 'miss') return 'result-miss'
    return 'result-insufficient'
  }
  return 'result-pending'
}

onShow(() => {
  void loadData()
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.page-prediction-history { height: 100%; }

.stats-bar {
  display: flex;
  margin: $spacing-sm $spacing-base $spacing-sm;
  padding: $spacing-base 0;
  background: $bg-card;
  border-radius: $r-md;
  box-shadow: $shadow-card;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.stat-value {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $text-color-title;
}

.stat-label {
  font-size: $font-size-xs;
  color: $text-color-secondary;
}

.filter-tabs {
  display: flex;
  gap: $spacing-sm;
  padding: 0 $spacing-base $spacing-sm;
}

.filter-tab {
  padding: 8rpx 28rpx;
  border-radius: $r-full;
  background: $bg-soft;
}

.filter-tab.active {
  background: $primary;
}

.filter-tab-text {
  font-size: $font-size-sm;
  color: $text-color-secondary;
}

.filter-tab.active .filter-tab-text {
  color: $white;
}

.prediction-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: 0 $spacing-base $spacing-lg;
}

.prediction-card {
  padding: $spacing-base;
  background: $bg-card;
  border-radius: $r-md;
  box-shadow: $shadow-card;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-sm;
}

.card-date {
  font-size: $font-size-md;
  font-weight: 600;
  color: $text-color-title;
}

.head-right {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.card-status {
  font-size: $font-size-xs;
  color: $text-color-tertiary;
}

.badge {
  padding: 4rpx 16rpx;
  border-radius: $r-lg;
}

.badge-ongoing { background: $primary-50; }
.badge-ongoing .badge-text { font-size: $font-size-xs; color: $primary; }
.badge-done { background: $bg-soft; }
.badge-done .badge-text { font-size: $font-size-xs; color: $text-color-tertiary; }
.badge-skipped { background: $bg-soft; }
.badge-skipped .badge-text { font-size: $font-size-xs; color: $text-color-tertiary; }

.card-summary {
  margin-bottom: $spacing-sm;
  padding: $spacing-sm $spacing-base;
  background: $bg-soft;
  border-radius: $r-sm;
}

.summary-text {
  font-size: $font-size-base;
  color: $text-color-secondary;
}

.card-horizons { display: flex; flex-direction: column; gap: $spacing-xs; }

.horizon-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.horizon-name {
  width: 80rpx;
  font-size: $font-size-sm;
  font-weight: 500;
  color: $text-color-title;
}

.horizon-due {
  flex: 1;
  font-size: $font-size-sm;
  color: $text-color-tertiary;
}

.horizon-result {
  padding: 2rpx 12rpx;
  border-radius: $r-md;
}

.result-hit { background: $up-bg; }
.result-hit .horizon-result-text { font-size: $font-size-xs; color: $up; }
.result-miss { background: $down-bg; }
.result-miss .horizon-result-text { font-size: $font-size-xs; color: $down; }
.result-insufficient { background: $bg-soft; }
.result-insufficient .horizon-result-text { font-size: $font-size-xs; color: $text-color-tertiary; }
.result-pending { background: $warning-bg; }
.result-pending .horizon-result-text { font-size: $font-size-xs; color: $warning; }
</style>
