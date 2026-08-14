<template>
  <view class="page-prediction-detail">
    <SubPageCard title="预测详情">
      <LoadingState v-if="loading" />

      <EmptyState v-else-if="error || !record" title="预测记录不存在" description="该预测可能已删除或数据暂不可用">
        <Button size="sm" @click="back">返回</Button>
      </EmptyState>

      <template v-else>
        <view class="detail-head">
          <text class="detail-date">{{ record.report_date }} 溯源预测</text>
          <view v-if="record.status === 'skipped'" class="badge badge-skipped">
            <text class="badge-text">已跳过</text>
          </view>
          <view v-else class="badge" :class="overallStatus(record, today) === 'verified' ? 'badge-done' : 'badge-ongoing'">
            <text class="badge-text">{{ overallStatus(record, today) === 'verified' ? '已结束' : '进行中' }}</text>
          </view>
        </view>
        <MarketTracePrediction :prediction="predictionPresentation" />
        <PredictionVerification :record="record" :today="today" />
      </template>
    </SubPageCard>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import { LoadingState, EmptyState, Button } from '@/shared/components'
import { predictionApi, type PredictionRecord } from '@/shared/api/modules/prediction'
import type { MarketTracePrediction as MarketTracePredictionData } from '@/shared/api/modules/agent'
import { shanghaiDateString } from '@/shared/utils/tradingTime'
import { toPredictionPresentation, type PredictionPresentation } from '@/modules/analytics/utils/marketTraceReview'
import { overallStatus } from '@/modules/analytics/utils/predictionHistory'
import MarketTracePrediction from '@/modules/analytics/components/MarketTracePrediction.vue'
import PredictionVerification from '@/modules/analytics/components/PredictionVerification.vue'

const loading = ref(false)
const error = ref(false)
const record = ref<PredictionRecord | null>(null)
const today = shanghaiDateString()

const predictionPresentation = computed<PredictionPresentation | null>(() => {
  if (!record.value) return null
  return toPredictionPresentation(record.value.prediction as MarketTracePredictionData)
})

function load(id: number) {
  loading.value = true
  error.value = false
  predictionApi
    .detail(id)
    .then((data) => {
      record.value = data ?? null
    })
    .catch((err: unknown) => {
      console.error('[prediction-detail] load failed:', err)
      error.value = true
    })
    .finally(() => {
      loading.value = false
    })
}

function back() {
  uni.navigateBack()
}

onLoad((options) => {
  const id = Number(options?.id)
  if (!Number.isInteger(id) || id < 1) {
    error.value = true
    return
  }
  load(id)
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.page-prediction-detail { height: 100%; }

.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-sm $spacing-base;
}

.detail-date { font-size: $font-size-md; font-weight: 600; color: $text-color-title; }

.badge { padding: 4rpx 16rpx; border-radius: $r-lg; }
.badge-ongoing { background: $primary-50; }
.badge-ongoing .badge-text { font-size: $font-size-xs; color: $primary; }
.badge-done { background: $bg-soft; }
.badge-done .badge-text { font-size: $font-size-xs; color: $text-color-tertiary; }
.badge-skipped { background: $bg-soft; }
.badge-skipped .badge-text { font-size: $font-size-xs; color: $text-color-tertiary; }
</style>
