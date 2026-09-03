<!-- src/modules/analytics/components/PredictionVerification.vue -->
<template>
  <view v-if="hasAny" class="verification-section">
    <view class="section-title">
      <text class="title-text">验证结果</text>
    </view>
    <Card class="verification-card">
      <!-- Spec A §4.2/§4.3：3.0 条件化预判验证（verification key = c{i}，独立于 horizon） -->
      <template v-if="conditions.length > 0">
        <view v-for="(cond, idx) in conditions" :key="`c-${idx}`" class="verification-item">
          <view class="item-head">
            <text class="horizon-label">条件 {{ idx + 1 }}</text>
            <view class="result-badge" :class="condBadgeClass(idx)">
              <text class="result-badge-text">{{ condBadgeText(idx) }}</text>
            </view>
          </view>
          <view class="item-meta">
            <text class="meta-line">{{ cond.condition }}</text>
            <text class="meta-line scenario">{{ cond.scenario }}</text>
            <text v-if="condStageOf(idx).kind === 'verified'" class="meta-line">
              实际 {{ condVerifiedEntry(idx)?.actual || '--' }}
            </text>
          </view>
          <view v-if="condStageOf(idx).kind === 'verified' && condVerifiedEntry(idx)?.reason" class="item-reason">
            <text class="reason-text">{{ condVerifiedEntry(idx)?.reason }}</text>
          </view>
        </view>
        <view class="item-divider" />
      </template>

      <!-- 多档位验证（horizon key；含 A1 early_exit 失效信号） -->
      <template v-for="h in HORIZON_ORDER" :key="h">
        <view v-if="record.due_dates[h]" class="verification-item">
          <view class="item-head">
            <text class="horizon-label">{{ HORIZON_LABELS[h] }}</text>
            <view v-if="isEarlyExit(h)" class="result-badge badge-insufficient">
              <text class="result-badge-text">提前失效</text>
            </view>
            <view v-else class="result-badge" :class="badgeClass(stageOf(h))">
              <text class="result-badge-text">{{ badgeText(stageOf(h)) }}</text>
            </view>
          </view>
          <view v-if="!isEarlyExit(h)" class="item-meta">
            <text class="meta-line">到期日 {{ record.due_dates[h] }}</text>
            <text v-if="stageOf(h).kind === 'verified'" class="meta-line">实际 {{ verifiedEntry(h)?.actual || '--' }}</text>
            <text v-if="stageOf(h).kind === 'verified' && verifiedEntry(h)?.verified_at" class="meta-line">
              验证于 {{ formatVerifiedAt(h) }}
            </text>
          </view>
          <view v-else class="item-meta">
            <text class="meta-line">A1 失效触发（{{ earlyExitReason(h) || '技术位破位' }}）</text>
          </view>
          <view v-if="!isEarlyExit(h) && stageOf(h).kind === 'verified' && verifiedEntry(h)?.reason" class="item-reason">
            <text class="reason-text">{{ verifiedEntry(h)?.reason }}</text>
          </view>
        </view>
      </template>
    </Card>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/shared/components/Card.vue'
import type { PredictionRecord, PredictionHorizonKey, PredictionVerificationEntry } from '@/shared/api/modules/prediction'
import { HORIZON_ORDER, HORIZON_LABELS, horizonStage, conditionStage, type HorizonStage, type ConditionStage } from '@/modules/analytics/utils/predictionHistory'

const props = defineProps<{
  record: PredictionRecord
  today: string
}>()

/** Spec A：条件化预判列表（2.0 旧记录为空 → 纯 horizon 渲染） */
const conditions = computed(() => props.record.prediction?.conditions ?? [])

const hasAny = computed(() =>
  conditions.value.length > 0 || HORIZON_ORDER.some((h) => Boolean(props.record.verification?.[h])),
)

/** A1：horizon entry 为 early_exit-only（type==='early_exit'，无 result）→ 失效信号，非已结束 */
function isEarlyExit(h: PredictionHorizonKey): boolean {
  return props.record.verification?.[h]?.type === 'early_exit'
}

function earlyExitReason(h: PredictionHorizonKey): string {
  const entry = props.record.verification?.[h]
  return entry?.early_exit && typeof entry.early_exit === 'object'
    ? String((entry.early_exit as { reason?: unknown }).reason || '')
    : ''
}

function stageOf(h: PredictionHorizonKey): HorizonStage {
  return horizonStage(props.record, h, props.today)
}

/** kind === 'verified' 时返回验证条目，否则 null（模板内跨表达式收窄不可用，收窄统一在此） */
function verifiedEntry(h: PredictionHorizonKey): PredictionVerificationEntry | null {
  const stage = stageOf(h)
  return stage.kind === 'verified' ? stage.entry : null
}

function condStageOf(idx: number): ConditionStage {
  return conditionStage(props.record, idx)
}

function condVerifiedEntry(idx: number): PredictionVerificationEntry | null {
  const stage = condStageOf(idx)
  return stage.kind === 'verified' ? stage.entry : null
}

function formatVerifiedAt(h: PredictionHorizonKey): string {
  const entry = verifiedEntry(h)
  return entry?.verified_at ? formatTime(entry.verified_at) : ''
}

function badgeText(stage: HorizonStage): string {
  if (stage.kind === 'verified') {
    const map: Record<string, string> = { hit: '命中', miss: '未命中', insufficient: '无法验证' }
    return map[stage.result] || '已验证'
  }
  if (stage.kind === 'due_pending') return '待验证·已到期'
  return '待验证'
}

function badgeClass(stage: HorizonStage): string {
  if (stage.kind === 'verified') {
    if (stage.result === 'hit') return 'badge-hit'
    if (stage.result === 'miss') return 'badge-miss'
    return 'badge-insufficient'
  }
  return 'badge-pending'
}

function condBadgeText(idx: number): string {
  const stage = condStageOf(idx)
  if (stage.kind === 'verified') {
    const map: Record<string, string> = { hit: '命中', miss: '未命中', insufficient: '无法验证' }
    return map[stage.result] || '已验证'
  }
  return '待验证'
}

function condBadgeClass(idx: number): string {
  const stage = condStageOf(idx)
  if (stage.kind === 'verified') {
    if (stage.result === 'hit') return 'badge-hit'
    if (stage.result === 'miss') return 'badge-miss'
    return 'badge-insufficient'
  }
  return 'badge-pending'
}

/** verified_at 为 UTC ISO，转上海时区展示 */
function formatTime(iso: string): string {
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return iso
  const d = new Date(ts + 8 * 3600 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.verification-section {
  padding: 0 $spacing-base;
  margin-bottom: $spacing-base;
}

.section-title { margin: $spacing-base 0 $spacing-sm; }
.title-text { font-size: $font-size-md; font-weight: 600; color: $text-color-title; }

.verification-item {
  padding: $spacing-sm 0;
  border-top: 2rpx solid $line;
}

.item-divider { border-top: 2rpx dashed $line; margin-top: $spacing-xs; }

.item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-xs;
}

.horizon-label { font-size: $font-size-base; font-weight: 600; color: $text-color-title; }

.result-badge { padding: 2rpx 16rpx; border-radius: $r-full; }
.result-badge-text { font-size: $font-size-xs; }
.badge-hit { background: $up-bg; }
.badge-hit .result-badge-text { color: $up; }
.badge-miss { background: $down-bg; }
.badge-miss .result-badge-text { color: $down; }
.badge-insufficient { background: $bg-soft; }
.badge-insufficient .result-badge-text { color: $text-color-tertiary; }
.badge-pending { background: $warning-bg; }
.badge-pending .result-badge-text { color: $warning; }

.item-meta { display: flex; flex-direction: column; gap: 4rpx; }
.meta-line { font-size: $font-size-sm; color: $text-color-secondary; }
.meta-line.scenario { font-size: $font-size-sm; color: $text-color-title; font-weight: 500; }

.item-reason { margin-top: $spacing-xs; }
.reason-text { font-size: $font-size-sm; color: $text-color-tertiary; }
</style>