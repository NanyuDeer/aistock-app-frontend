<template>
  <view class="transmission-graph" v-if="data">
    <view class="graph-flow">
      <!-- 事件节点 -->
      <view class="graph-node event-node">
        <text class="node-type-label">事件冲击</text>
        <text class="node-main-text">{{ eventTitle || '事件影响' }}</text>
      </view>

      <view class="graph-arrow">
        <text class="arrow-line">│</text>
        <text class="arrow-head">▼</text>
      </view>

      <!-- 关键变量节点 -->
      <view class="graph-node var-node">
        <text class="node-type-label">关键变量</text>
        <view v-for="(v, vi) in data.variables.slice(0, 2)" :key="vi" class="var-item">
          <text class="var-item-name">{{ v.name }}</text>
          <text class="var-item-dir" :class="'dir-' + v.direction">
            {{ v.direction === 'bullish' ? '↑' : v.direction === 'bearish' ? '↓' : '→' }}
          </text>
        </view>
      </view>

      <view class="graph-arrow">
        <text class="arrow-line">│</text>
        <text class="arrow-head">▼</text>
      </view>

      <!-- 核心行业节点 -->
      <view class="graph-node core-node" :class="'node-' + coreDirection">
        <text class="node-type-label">核心行业</text>
        <text class="node-main-text">{{ data.coreIndustry?.name || '核心行业' }}</text>
        <text class="node-impact-text">{{ data.coreIndustry?.impact || '' }}</text>
      </view>

      <view class="graph-arrow" v-if="upChain.length || downChain.length">
        <view class="arrow-split">
          <text class="arrow-line">│</text>
          <view class="split-lines">
            <text class="split-left">├</text>
            <text class="split-right">┤</text>
          </view>
        </view>
      </view>

      <!-- 上下游分流 -->
      <view class="branch-row" v-if="upChain.length || downChain.length">
        <view class="branch-col" v-if="upChain.length">
          <view class="branch-arrow-left">
            <text class="arrow-head">▼</text>
          </view>
          <view v-for="c in upChain" :key="c.industry" class="graph-node chain-node" :class="'node-' + c.direction">
            <text class="node-type-label">{{ c.relation }}</text>
            <text class="node-main-text small">{{ c.industry }}</text>
          </view>
        </view>
        <view class="branch-col" v-if="downChain.length">
          <view class="branch-arrow-right">
            <text class="arrow-head">▼</text>
          </view>
          <view v-for="c in downChain" :key="c.industry" class="graph-node chain-node" :class="'node-' + c.direction">
            <text class="node-type-label">{{ c.relation }}</text>
            <text class="node-main-text small">{{ c.industry }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- AI 总结语 -->
    <view class="graph-summary">
      <text class="summary-text">AI推理路径：事件首先冲击{{ data.coreIndustry?.name || '核心行业' }}，通过{{ data.variables.slice(0,2).map(v=>v.name).join('和') }}等变量向上下游产业扩散。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * EventTransmissionGraph — 事件传导产业链关系图谱
 *
 * 横向流程图展示核心传导路径：
 * 事件冲击 → 关键变量 → 核心行业 → 上游/下游
 *
 * 数据来源：TransmissionAnalysis（来自 mock-data）
 */
import { computed } from 'vue'
import type { TransmissionAnalysis, TransmissionChainNode } from '../../types'

interface Props {
  data?: TransmissionAnalysis | null
  eventTitle?: string
}

const props = defineProps<Props>()

const coreDirection = computed(() => {
  const bullish = props.data?.variables.filter(v => v.direction === 'bullish').length || 0
  const bearish = props.data?.variables.filter(v => v.direction === 'bearish').length || 0
  return bullish > bearish ? 'bullish' : bearish > bullish ? 'bearish' : 'neutral'
})

const upChain = computed<TransmissionChainNode[]>(() =>
  (props.data?.chain || []).filter(c => c.relation.includes('上游'))
)

const downChain = computed<TransmissionChainNode[]>(() =>
  (props.data?.chain || []).filter(c => c.relation.includes('下游'))
)
</script>

<style scoped>
.transmission-graph {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.graph-flow {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 8rpx 0;
}

/* ===== 节点卡片 ===== */
.graph-node {
  padding: 16rpx 24rpx;
  border-radius: 14rpx;
  min-width: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.event-node { background: linear-gradient(135deg, var(--ev-accent-soft), var(--ev-accent-bg)); border: 1px solid rgba(99,102,241,0.18); }
.var-node { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.15); }

.node-bullish { background: var(--ev-negative-bg); border: 1px solid var(--ev-negative-soft); }
.node-bearish { background: var(--ev-positive-bg); border: 1px solid var(--ev-positive-soft); }
.node-neutral { background: var(--ev-border-light); border: 1px solid rgba(148,163,184,0.1); }

.node-type-label { font-size: 18rpx; color: var(--ev-text-muted); font-weight: 500; }
.node-main-text { font-size: 24rpx; font-weight: 700; color: var(--ev-text-primary); text-align: center; }
.node-main-text.small { font-size: 20rpx; }
.node-impact-text { font-size: 20rpx; color: var(--ev-text-tertiary); text-align: center; }

/* 变量子项 */
.var-item { display: flex; align-items: center; gap: 8rpx; }
.var-item-name { font-size: 22rpx; font-weight: 600; color: var(--ev-text-primary); }
.var-item-dir { font-size: 20rpx; font-weight: 700; }
.dir-bullish { color: var(--ev-negative); }
.dir-bearish { color: var(--ev-positive); }
.dir-neutral { color: var(--ev-text-muted); }

/* ===== 箭头 ===== */
.graph-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rpx 0;
}

.arrow-line { font-size: 18rpx; color: var(--ev-text-muted); line-height: 1; }
.arrow-head { font-size: 18rpx; color: var(--ev-accent); line-height: 1; }

/* 分叉箭头 */
.arrow-split { display: flex; flex-direction: column; align-items: center; }
.split-lines { display: flex; gap: 80rpx; }
.split-left { font-size: 18rpx; color: var(--ev-text-muted); }
.split-right { font-size: 18rpx; color: var(--ev-text-muted); }

/* 上下游行 */
.branch-row { display: flex; gap: 40rpx; width: 100%; justify-content: center; }
.branch-col { display: flex; flex-direction: column; align-items: center; gap: 4rpx; }

.branch-arrow-left, .branch-arrow-right {
  padding: 2rpx 0;
}

.chain-node { min-width: 140rpx; padding: 12rpx 18rpx; }

/* ===== AI 总结 ===== */
.graph-summary {
  width: 100%;
  padding: 14rpx 0 0;
  border-top: 1px solid var(--ev-border-light);
  margin-top: 16rpx;
}

.summary-text {
  font-size: 22rpx;
  color: var(--ev-text-muted);
  line-height: 1.5;
  text-align: center;
}
</style>
