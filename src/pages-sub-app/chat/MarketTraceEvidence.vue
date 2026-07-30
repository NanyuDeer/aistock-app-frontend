/**
 * 市场复盘问答 - 证据溯源区域组件
 *
 * 从 chat/index.vue 提取，用于独立测试渲染行为。
 * 接收标准化的 MarketTraceQaTrace，展示证据溯源信息。
 * 当 trace.degraded = true 时，显示降级横幅和原因。
 */
<template>
  <view class="evidence-area">
    <view class="evidence-header">
      <text class="evidence-title">证据溯源</text>
      <text :class="['confidence-badge', `confidence-${trace.confidence}`]">
        {{ confidenceLabel(trace.confidence) }}
      </text>
    </view>
    <view class="evidence-row">
      <text class="evidence-label">数据截至</text>
      <text class="evidence-value">{{ trace.as_of || '截至时间未验证' }}</text>
    </view>
    <view class="evidence-section">
      <text class="evidence-label">来源</text>
      <template v-if="trace.sources.length > 0">
        <view v-for="(src, sIdx) in trace.sources" :key="sIdx" class="source-item">
          <text class="source-kind-tag">{{ sourceKindLabel(src.kind) }}</text>
          <text class="source-title">{{ src.title }}</text>
          <text class="source-provider">{{ src.provider }}</text>
          <text class="source-id">{{ src.source_id }}</text>
        </view>
      </template>
      <text v-else class="evidence-value">无可用来源</text>
    </view>
    <view class="evidence-section">
      <text class="evidence-label">不确定性</text>
      <template v-if="trace.uncertainty.length > 0">
        <text v-for="(u, uIdx) in trace.uncertainty" :key="uIdx" class="uncertainty-item">{{ u }}</text>
      </template>
      <text v-else-if="trace.degraded" class="uncertainty-item">
        无法验证：{{ trace.degraded_reason || '降级原因未提供' }}
      </text>
      <text v-else class="evidence-value">无已知未解决问题</text>
    </view>
    <view :class="['evidence-row', { 'degraded-banner': trace.degraded }]">
      <text class="evidence-label">降级状态</text>
      <text :class="trace.degraded ? 'degraded-text' : 'evidence-value'">
        {{ trace.degraded ? (trace.degraded_reason || '数据降级') : '未降级' }}
      </text>
    </view>
    <view class="evidence-row evidence-audit">
      <text class="evidence-label">工件 ID</text>
      <text class="evidence-value evidence-mono">{{ trace.artifact_id || '未提供' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { MarketTraceQaTrace, MarketTraceQaSource } from '@/shared/api/modules/agent'

defineProps<{
  trace: MarketTraceQaTrace
}>()

function confidenceLabel(confidence: MarketTraceQaTrace['confidence']): string {
  const map: Record<string, string> = { high: '高置信度', medium: '中置信度', low: '低置信度' }
  return map[confidence] || confidence
}

function sourceKindLabel(kind: MarketTraceQaSource['kind']): string {
  const map: Record<string, string> = { market_fact: '市场事实', event_evidence: '事件证据' }
  return map[kind] || kind
}
</script>

<style lang="scss" scoped>
.evidence-area {
  margin-top: 16rpx;
  padding: 20rpx;
  background: $bg-soft;
  border-radius: 12rpx;
  border: 1rpx solid #e8eaed;
}

.evidence-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.evidence-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
}

.confidence-badge {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.confidence-high {
  background: #e8f5e9;
  color: #2e7d32;
}

.confidence-medium {
  background: #fff3e0;
  color: #e65100;
}

.confidence-low {
  background: #fce4ec;
  color: #c62828;
}

.evidence-row {
  display: flex;
  align-items: flex-start;
  margin-top: 8rpx;
}

.evidence-label {
  font-size: 24rpx;
  color: #999;
  width: 120rpx;
  flex-shrink: 0;
}

.evidence-value {
  font-size: 24rpx;
  color: #333;
}

.evidence-section {
  margin-top: 8rpx;
}

.source-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 4rpx;
}

.source-kind-tag {
  font-size: 20rpx;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  background: #e3f2fd;
  color: #1565c0;
}

.source-title {
  font-size: 24rpx;
  color: #333;
}

.source-provider {
  font-size: 22rpx;
  color: #999;
}

.source-id {
  font-size: 20rpx;
  color: #bbb;
}

.uncertainty-item {
  display: block;
  font-size: 24rpx;
  color: #e65100;
  margin-top: 4rpx;
}

.degraded-banner {
  background: #fff3e0;
  border-radius: 8rpx;
  padding: 8rpx 12rpx;
}

.degraded-text {
  font-size: 24rpx;
  color: #e65100;
  font-weight: 500;
}

.evidence-audit {
  margin-top: 12rpx;
  padding-top: 8rpx;
  border-top: 1rpx solid #e8eaed;
}

.evidence-mono {
  font-family: monospace;
  font-size: 22rpx;
  color: #666;
}
</style>
