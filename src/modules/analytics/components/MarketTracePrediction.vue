<!-- src/modules/analytics/components/MarketTracePrediction.vue -->
<template>
  <view class="prediction-section" v-if="prediction">
    <view class="section-title">
      <text class="title-text">影响持续性预判</text>
    </view>
    <Card class="prediction-card">
      <view class="status-row">
        <text class="status-label">预测状态：</text>
        <text class="status-value" :class="statusClass">{{ statusText }}</text>
      </view>

      <view v-if="prediction.attributionSummary" class="summary-row">
        <text class="summary-text">{{ prediction.attributionSummary }}</text>
      </view>

      <!-- 条件化预判：大盘/板块/个股一切有条件化预判统一用 ConditionalForecastBlock
           （2026-09-02 从 InsightCard structured 抽取的通用预判块；2.0 旧记录为空数组不渲染） -->
      <ConditionalForecastBlock
        v-if="prediction.conditions.length > 0"
        :structured="condStructured"
      />

      <view v-for="(h, idx) in prediction.horizons" :key="`h-${idx}`" class="horizon-item">
        <view class="horizon-head">
          <view class="tag horizon-tag">{{ horizonLabel(h.horizon) }}</view>
          <view class="tag direction-tag" :class="directionClass(h.direction)">{{ directionText(h.direction) }}</view>
          <view class="tag confidence-tag" :class="confidenceClass(h.confidence)">置信{{ confidenceText(h.confidence) }}</view>
        </view>
        <view class="horizon-meta">
          <text class="meta-target">{{ h.target }}</text>
          <text class="meta-project">{{ h.metricProjection }}</text>
        </view>
        <view class="horizon-phase">{{ phaseText(h.phase) }} · {{ h.remainingEstimate }}</view>
      </view>

      <view v-if="prediction.evolutionSteps.length > 0 || prediction.evolutionNarrative" class="narrative-block">
        <text class="narrative-label">演化路径</text>
        <view class="timeline-steps">
          <!-- 有结构化 steps 直接用（后端 B2 输出）；旧记录回退 narrative 按标点拆分 -->
          <view v-for="(step, idx) in timelineSteps" :key="`n-${idx}`" class="step-item">
            <view class="step-rail">
              <view class="step-dot" />
              <view v-if="idx < timelineSteps.length - 1" class="step-line" />
            </view>
            <view class="step-body">
              <text class="step-label" v-if="step.label">{{ step.label }}</text>
              <text class="step-text">{{ step.text }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="prediction.risks.length > 0" class="risks-section">
        <text class="risks-title">风险因素：</text>
        <view v-for="(risk, idx) in prediction.risks" :key="`risk-${idx}`" class="risk-item">
          <text class="risk-factor">{{ risk.factor }}</text>
          <text class="risk-detail">：{{ risk.invalidation }}</text>
        </view>
      </view>
    </Card>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/shared/components/Card.vue'
import ConditionalForecastBlock from '@/shared/components/ConditionalForecastBlock.vue'
import type { PredictionPresentation } from '../utils/marketTraceReview'

const props = defineProps<{
  prediction: PredictionPresentation | null
}>()

const statusText = computed(() => {
  const map: Record<string, string> = {
    confirmed: '已确认',
    hypothesis: '假设推演',
    insufficient: '证据不足',
  }
  return map[props.prediction?.status || ''] || ''
})

const statusClass = computed(() => {
  const status = props.prediction?.status
  if (status === 'confirmed') return 'status-confirmed'
  if (status === 'hypothesis') return 'status-hypothesis'
  return 'status-insufficient'
})

/** 时间轴步骤：优先后端结构化 evolutionSteps；旧记录回退 narrative 按分号/句号拆分（无 label） */
const timelineSteps = computed<Array<{ label: string; text: string }>>(() => {
  const prediction = props.prediction
  if (!prediction) return []
  if (prediction.evolutionSteps.length > 0) {
    return prediction.evolutionSteps
  }
  const text = prediction.evolutionNarrative || ''
  return text
    .split(/[；;。]/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => ({ label: '', text: s }))
})

/** 条件化预判结构化数据（映射为通用预判块 ConditionalForecastBlock 输入，与板块/个股同构） */
const HORIZON_KEYS = ['short', 'mid', 'long'] as const
type HorizonKey = typeof HORIZON_KEYS[number]
const DIRECTION_KEYS = ['bullish', 'bearish', 'neutral'] as const
type DirectionKey = typeof DIRECTION_KEYS[number]

function toHorizonKey(v: string | undefined): HorizonKey | undefined {
  return v && (HORIZON_KEYS as readonly string[]).includes(v) ? (v as HorizonKey) : undefined
}

function toDirectionKey(v: string | undefined): DirectionKey | undefined {
  return v && (DIRECTION_KEYS as readonly string[]).includes(v) ? (v as DirectionKey) : undefined
}

const condStructured = computed(() => {
  const p = props.prediction
  if (!p) return null
  return {
    horizons: p.horizons.map((h) => ({
      horizon: h.horizon,
      remaining: h.remainingEstimate || undefined,
      direction: h.direction,
      confidence: h.confidence
    })),
    conditions: p.conditions.map((c) => ({
      // anchor.horizon 缺失时默认挂 short（沿用旧分组语义）；anchor 阈值/指标缺失则不渲染 chip
      horizon: toHorizonKey(c.anchor?.horizon) ?? 'short',
      direction: toDirectionKey(c.anchor?.direction),
      condition: c.condition,
      scenario: c.scenario,
      anchor: c.anchor && (c.anchor.threshold || c.anchor.metric)
        ? { metric: c.anchor.metric || undefined, threshold: c.anchor.threshold || undefined }
        : undefined,
      met: undefined
    }))
  }
})

function horizonLabel(horizon: string): string {
  const map: Record<string, string> = {
    short: '短线(1-5交易日)',
    mid: '中线(1-4周)',
    long: '长线(1-6月)',
  }
  return map[horizon] || horizon
}

function phaseText(phase: string): string {
  const map: Record<string, string> = {
    building: '影响形成',
    peaking: '影响高峰',
    decaying: '影响衰减',
    returning: '回归常态',
  }
  return map[phase] || phase
}

function directionText(direction: string): string {
  const map: Record<string, string> = {
    bullish: '看多',
    bearish: '看空',
    neutral: '中性',
  }
  return map[direction] || direction
}

function directionClass(direction: string): string {
  if (direction === 'bullish') return 'direction-bullish'
  if (direction === 'bearish') return 'direction-bearish'
  return 'direction-neutral'
}

function confidenceClass(confidence: string): string {
  if (confidence === 'high') return 'confidence-high'
  if (confidence === 'medium') return 'confidence-medium'
  return 'confidence-low'
}

function confidenceText(confidence: string): string {
  const map: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  }
  return map[confidence] || confidence
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.prediction-section {
  padding: 0 $spacing-base;
  margin-bottom: $spacing-sm;
}

.section-title {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin: $spacing-base 0 $spacing-sm;
}

.title-text {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-color-title;
}

.status-row {
  margin-bottom: $spacing-sm;
}

.status-label {
  font-size: 28rpx;
  color: $text-color-secondary;
}

.status-value {
  font-size: 28rpx;
  font-weight: 600;
}

.status-confirmed { color: $up; }
.status-hypothesis { color: $warning; }
.status-insufficient { color: $text-color-tertiary; }

.summary-row {
  margin-bottom: $spacing-sm;
  padding: $spacing-sm $spacing-base;
  background: $bg-soft;
  border-radius: $r-sm;
}

.summary-text {
  font-size: 28rpx;
  color: $text-color-title;
}

.horizon-item {
  padding: $spacing-sm 0;
  border-top: 2rpx solid $line;
}

.horizon-head {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  flex-wrap: wrap;
  margin-bottom: $spacing-xs;
}

/* 气泡标签：对齐个股详情 research-tag（圆角胶囊、浅底深字） */
.tag {
  display: inline-flex;
  align-items: center;
  padding: 6rpx 20rpx;
  border-radius: 28rpx;
  font-size: 24rpx;
  font-weight: 500;
  line-height: 1.4;
}

.horizon-tag {
  background: $primary-50;
  color: $primary;
  border: 1rpx solid $primary-100;
}

/* 方向：A 股红涨绿跌；中性用品牌蓝 */
.direction-tag { border: 1rpx solid transparent; }
.direction-bullish {
  background: $up-bg;
  color: $up;
  border-color: rgba(229, 77, 94, 0.25);
}
.direction-bearish {
  background: $down-bg;
  color: $down;
  border-color: rgba(24, 160, 88, 0.25);
}
.direction-neutral {
  background: $primary-50;
  color: $primary;
  border-color: $primary-100;
}

/* 置信度：高/中/低 三档 */
.confidence-tag { border: 1rpx solid transparent; }
.confidence-high {
  background: $up-bg;
  color: $up;
  border-color: rgba(229, 77, 94, 0.25);
}
.confidence-medium {
  background: $warning-bg;
  color: $warning;
  border-color: rgba(240, 160, 32, 0.25);
}
.confidence-low {
  background: $bg-soft;
  color: $text-color-tertiary;
  border-color: $line;
}

.horizon-meta {
  font-size: 24rpx;
  color: $text-color-secondary;
}

.meta-target {
  font-weight: 500;
  color: $text-color-title;
  margin-right: $spacing-xs;
}

.meta-project {
  color: $text-color-secondary;
}

.horizon-phase {
  margin-top: $spacing-xs;
  font-size: 24rpx;
  color: $text-color-tertiary;
}

.narrative-block {
  margin-top: $spacing-sm;
  padding-top: $spacing-sm;
  border-top: 2rpx solid $line;
}

.narrative-label {
  display: block;
  font-size: 28rpx;
  color: $text-color-title;
  font-weight: 500;
  margin-bottom: $spacing-sm;
}

/* 演化路径时间轴：对齐主因时间线（MarketTraceTimeline step 样式） */
.timeline-steps { display: flex; flex-direction: column; gap: $spacing-sm; }

.step-item { position: relative; display: flex; flex: 1; padding-left: 40rpx; }
.step-rail { position: absolute; left: 0; top: 0; width: 32rpx; height: 100%; }

.step-dot {
  width: 20rpx; height: 20rpx; border-radius: $r-full;
  background: $primary; box-shadow: 0 0 0 6rpx rgba(11, 95, 255, 0.15);
  position: absolute; top: 8rpx; left: 50%; transform: translateX(-50%);
}

.step-line {
  background: $line-soft;
  position: absolute; top: 28rpx; bottom: -1 * ($spacing-sm + 8rpx);
  left: 50%; transform: translateX(-50%); width: 2rpx;
}

.step-body { flex: 1; }
.step-label {
  display: block;
  font-size: 22rpx;
  color: $primary;
  font-weight: 600;
  margin-bottom: 4rpx;
}
.step-text { display: block; font-size: 26rpx; color: $text-color; line-height: 1.5; }

.risks-section {
  margin-top: $spacing-sm;
  padding-top: $spacing-sm;
  border-top: 2rpx solid $line;
}

.risks-title {
  font-size: 28rpx;
  color: $text-color-title;
  font-weight: 500;
  display: block;
  margin-bottom: $spacing-xs;
}

.risk-item {
  padding: $spacing-xs 0;
  font-size: 26rpx;
  color: $text-color-secondary;
}

.risk-factor {
  font-weight: 500;
  color: $text-color-title;
}
</style>
