<template>
  <view class="transmission-analysis" v-if="data">
    <!-- 顶部步骤指示器（Steps） -->
    <view class="steps-wrap">
      <Steps :steps="stepItems" :current="stepItems.length - 1" direction="horizontal" status="finish" />
    </view>

    <!-- 步骤1: 影响机制 -->
    <view class="inner-step">
      <view class="inner-step-head">
        <text class="inner-step-title">{{ stepItems[0].title }}</text>
      </view>
      <view class="mechanism-text">{{ data.mechanism }}</view>
      <view class="core-industry" v-if="data.coreIndustry">
        <text class="ci-label">核心行业</text>
        <text class="ci-name">{{ data.coreIndustry.name }}</text>
        <text class="ci-impact">{{ data.coreIndustry.impact }}</text>
        <text class="ci-reason">{{ data.coreIndustry.reason }}</text>
      </view>
    </view>

    <!-- 步骤2: 关键变量 -->
    <view class="inner-step">
      <view class="inner-step-head">
        <text class="inner-step-title">{{ stepItems[1].title }}</text>
      </view>
      <view class="variable-list" v-if="data.variables.length">
        <view v-for="(v, idx) in data.variables" :key="idx" class="var-row" :class="'var-' + v.direction">
          <view class="var-left">
            <text class="var-name">{{ v.name }}</text>
            <text class="var-direction">{{ v.direction === 'bullish' ? '↑ 正向' : v.direction === 'bearish' ? '↓ 负向' : '→ 中性' }}</text>
          </view>
          <view class="var-strength">
            <Rate :modelValue="Math.round(v.strength * 5)" :readonly="true" type="gold" size="18rpx" :gap="2" />
          </view>
          <text class="var-reason">{{ v.explanation }}</text>
        </view>
      </view>
    </view>

    <!-- 步骤3: 产业链传导 -->
    <view class="inner-step">
      <view class="inner-step-head">
        <text class="inner-step-title">{{ stepItems[2].title }}</text>
      </view>
      <view class="chain-view" v-if="data.chain.length">
        <view v-for="(c, ci) in data.chain" :key="ci" class="chain-node">
          <view class="chain-dot-col">
            <view class="chain-dot" :class="'dot-' + c.direction" />
            <view class="chain-line" v-if="ci < data.chain.length - 1" />
          </view>
          <view class="chain-info">
            <view class="chain-top">
              <text class="chain-industry">{{ c.industry }}</text>
              <text class="chain-level">L{{ c.level }} {{ c.relation }}</text>
            </view>
            <text class="chain-reason">{{ c.reason }}</text>
            <view class="chain-bar-wrap">
              <Progress class="chain-progress" :value="Math.round(c.impactStrength * 100)" :status="chainProgressStatus(c.direction)" />
              <text class="chain-pct">{{ Math.round(c.impactStrength * 100) }}%</text>
            </view>
          </view>
        </view>
      </view>
    </view>
    <!-- 步骤4: 产业链关系图谱 -->
    <view class="inner-step">
      <view class="inner-step-head">
        <text class="inner-step-title">{{ stepItems[3].title }}</text>
      </view>
      <EventTransmissionGraph :data="data" :event-title="eventTitle" />
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * AiTransmissionAnalysis — AI 影响传导推理主容器
 *
 * 步骤1 分析事件机制 → 步骤2 识别关键变量 → 步骤3 推演产业链影响 → 步骤4 产业链图谱
 *
 * Props: data — TransmissionAnalysis, eventTitle — 事件标题
 *
 * 视觉层对齐组件库：Steps 步骤指示器 + Rate 强度星级 + Progress 传导强度进度条。
 */
import type { TransmissionAnalysis, TransmissionChainNode } from '../../types'
import EventTransmissionGraph from '../EventTransmissionGraph.vue'
import Steps from '@/shared/components/Steps.vue'
import Rate from '@/shared/components/Rate.vue'
import Progress from '@/shared/components/Progress.vue'

interface Props {
  data?: TransmissionAnalysis | null
  eventTitle?: string
}

defineProps<Props>()

/** 步骤标题（Steps 与各分区块共用，避免重复） */
const stepItems = [
  { title: '分析事件机制' },
  { title: '识别关键变量' },
  { title: '推演产业链影响' },
  { title: '事件传导产业链关系图谱' },
]

/** 传导链方向 → Progress status（A 股红涨绿跌：bullish=利好=红 danger，bearish=利空=绿 success） */
function chainProgressStatus(direction: TransmissionChainNode['direction']): 'primary' | 'success' | 'danger' {
  if (direction === 'bullish') return 'danger'
  if (direction === 'bearish') return 'success'
  return 'primary'
}
</script>

<style scoped>
.transmission-analysis {
  display: flex;
  flex-direction: column;
}

/* ===== 顶部步骤指示器 ===== */
.steps-wrap {
  padding: 8rpx 0 20rpx;
  border-bottom: 1px solid var(--ev-border-light);
  margin-bottom: 8rpx;
}

/* ===== 内部步骤 ===== */
.inner-step {
  padding: 20rpx 0;
  border-bottom: 1px solid var(--ev-border-light);
}
.inner-step:last-child { border-bottom: none; }

.inner-step-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 14rpx;
}

.inner-step-title {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--ev-text-primary);
}

/* ===== 步骤1: 机制文字 + 核心行业 ===== */
.mechanism-text {
  font-size: 24rpx;
  color: var(--ev-text-secondary);
  line-height: 1.65;
  margin-bottom: 16rpx;
}

.core-industry {
  padding: 16rpx 18rpx;
  border-radius: 10rpx;
  background: var(--ev-accent-bg);
  border-left: 4rpx solid var(--ev-accent);
}

.ci-label { display: block; font-size: 20rpx; color: var(--ev-accent); font-weight: 600; margin-bottom: 6rpx; }
.ci-name { display: block; font-size: 24rpx; color: var(--ev-text-primary); font-weight: 700; margin-bottom: 4rpx; }
.ci-impact { display: block; font-size: 22rpx; color: var(--ev-text-secondary); margin-bottom: 4rpx; }
.ci-reason { display: block; font-size: 20rpx; color: var(--ev-text-muted); line-height: 1.5; }

/* ===== 步骤2: 变量 ===== */
.variable-list { display: flex; flex-direction: column; gap: 14rpx; }

.var-row {
  padding: 14rpx 18rpx;
  border-radius: 10rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.var-bullish { background: var(--ev-negative-bg); border: 1px solid var(--ev-negative-soft); }
.var-bearish { background: var(--ev-positive-bg); border: 1px solid var(--ev-positive-soft); }
.var-neutral { background: var(--ev-border-light); border: 1px solid rgba(148, 163, 184, 0.08); }

.var-left { display: flex; align-items: center; gap: 12rpx; }
.var-name { font-size: 24rpx; font-weight: 600; color: var(--ev-text-primary); }
.var-direction { font-size: 20rpx; font-weight: 500; }
.var-bullish .var-direction { color: var(--ev-negative); }
.var-bearish .var-direction { color: var(--ev-positive); }
.var-neutral .var-direction { color: var(--ev-text-tertiary); }

.var-strength { display: flex; align-items: center; }
.var-reason { font-size: 20rpx; color: var(--ev-text-muted); line-height: 1.5; }

/* ===== 步骤3: 传导链 ===== */
.chain-view { display: flex; flex-direction: column; }

.chain-node { display: flex; gap: 12rpx; }

.chain-dot-col {
  display: flex; flex-direction: column; align-items: center; flex-shrink: 0;
  width: 16rpx; padding-top: 8rpx;
}

.chain-dot { width: 12rpx; height: 12rpx; border-radius: 50%; }
.dot-bullish { background: var(--ev-negative); box-shadow: 0 0 6rpx rgba(244,63,94,0.3); }
.dot-bearish { background: var(--ev-positive); box-shadow: 0 0 6rpx rgba(34,197,94,0.3); }
.dot-neutral { background: var(--ev-text-muted); }

.chain-line { width: 2rpx; flex: 1; background: var(--ev-border); margin: 4rpx 0; }

.chain-info { flex: 1; padding-bottom: 14rpx; }
.chain-top { display: flex; align-items: center; gap: 10rpx; margin-bottom: 4rpx; }
.chain-industry { font-size: 24rpx; font-weight: 600; color: var(--ev-text-primary); }
.chain-level { font-size: 18rpx; padding: 1rpx 8rpx; border-radius: 9999rpx; background: var(--ev-border-light); color: var(--ev-text-muted); }
.chain-reason { font-size: 20rpx; color: var(--ev-text-muted); line-height: 1.45; display: block; margin-bottom: 6rpx; }

.chain-bar-wrap { display: flex; align-items: center; gap: 8rpx; }
/* Progress 组件在 flex 容器中占满剩余宽度 */
.chain-bar-wrap :deep(.as-progress) { flex: 1; }
.chain-pct { font-size: 18rpx; color: var(--ev-text-muted); flex-shrink: 0; }
</style>
