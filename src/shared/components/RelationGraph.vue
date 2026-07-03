<template>
  <view class="as-relation-graph">
    <view v-if="title" class="as-graph-header">
      <text class="as-graph-title">{{ title }}</text>
    </view>
    <view v-if="!nodes.length" class="as-graph-empty">
      <text class="as-graph-empty-text">暂无关系数据</text>
    </view>
    <view v-else class="as-graph-canvas">
      <!-- 中心节点 -->
      <view
        class="as-node as-node-center"
        :style="centerNodeStyle"
        @tap="$emit('node-click', centerNode)"
      >
        <text class="as-node-label">{{ centerNode?.label }}</text>
        <text v-if="centerNode?.subLabel" class="as-node-sub">{{ centerNode.subLabel }}</text>
      </view>
      <!-- 周边节点（径向布局） -->
      <view
        v-for="(node, idx) in peripheralNodes"
        :key="idx"
        :class="['as-node', `as-node-${node.type || 'related'}`]"
        :style="getNodeStyle(idx)"
        @tap="$emit('node-click', node)"
      >
        <text class="as-node-label">{{ node.label }}</text>
        <text v-if="node.factor" class="as-node-factor">{{ (node.factor * 100).toFixed(0) }}%</text>
      </view>
      <!-- 连接线（SVG 仅 H5，其他端用伪元素简化） -->
      <!-- #ifdef H5 -->
      <svg class="as-graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line
          v-for="(node, idx) in peripheralNodes"
          :key="idx"
          x1="50" y1="50"
          :x2="50 + 40 * Math.cos(getAngle(idx))"
          :y2="50 + 40 * Math.sin(getAngle(idx))"
          :stroke="getLineColor(node.type)"
          stroke-width="0.3"
          opacity="0.4"
        />
      </svg>
      <!-- #endif -->
    </view>
    <!-- 图例 -->
    <view class="as-graph-legend">
      <view class="as-legend-item">
        <view class="as-legend-dot upstream" />
        <text class="as-legend-text">上游</text>
      </view>
      <view class="as-legend-item">
        <view class="as-legend-dot downstream" />
        <text class="as-legend-text">下游</text>
      </view>
      <view class="as-legend-item">
        <view class="as-legend-dot related" />
        <text class="as-legend-text">关联</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface GraphNode {
  id: string
  label: string
  subLabel?: string
  type?: 'main' | 'upstream' | 'downstream' | 'related'
  factor?: number
}

const props = withDefaults(defineProps<{
  nodes: GraphNode[]
  title?: string
}>(), {
  title: ''
})

const emit = defineEmits<{ (e: 'node-click', node: GraphNode): void }>()

const centerNode = computed(() => props.nodes.find(n => n.type === 'main') || props.nodes[0])
const peripheralNodes = computed(() => props.nodes.filter(n => n.type !== 'main' && n.id !== centerNode.value?.id))

const centerNodeStyle = computed(() => ({
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)'
}))

function getAngle(idx: number): number {
  const count = peripheralNodes.value.length || 1
  return (idx / count) * 2 * Math.PI - Math.PI / 2
}

function getNodeStyle(idx: number): Record<string, string> {
  const angle = getAngle(idx)
  const radius = 38 // 百分比半径
  const x = 50 + radius * Math.cos(angle)
  const y = 50 + radius * Math.sin(angle)
  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)'
  }
}

function getLineColor(type?: string): string {
  if (type === 'upstream') return '#4d7cfe'
  if (type === 'downstream') return '#f43f5e'
  return '#9ca3af'
}
</script>

<style lang="scss" scoped>
.as-relation-graph { background: #ffffff; border-radius: 12rpx; padding: 24rpx; }

.as-graph-header { margin-bottom: 16rpx; }
.as-graph-title { font-size: 28rpx; font-weight: 600; color: #1a1d24; }

.as-graph-canvas {
  position: relative;
  width: 100%;
  height: 500rpx;
  background: #fafbfc;
  border-radius: 8rpx;
}

.as-graph-lines {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
}

.as-node {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12rpx 16rpx;
  border-radius: 8rpx;
  min-width: 100rpx;
  max-width: 160rpx;
  z-index: 2;
}

.as-node-center {
  background: linear-gradient(135deg, #4d7cfe, #6366f1);
  box-shadow: 0 4rpx 16rpx rgba(77, 124, 254, 0.3);
  min-width: 140rpx;
}

.as-node-upstream { background: rgba(77, 124, 254, 0.1); border: 1rpx solid rgba(77, 124, 254, 0.3); }
.as-node-downstream { background: rgba(244, 63, 94, 0.1); border: 1rpx solid rgba(244, 63, 94, 0.3); }
.as-node-related { background: #f5f7fa; border: 1rpx solid #e5e7eb; }

.as-node-label { font-size: 22rpx; color: #1a1d24; text-align: center; }
.as-node-center .as-node-label { color: #ffffff; font-weight: 600; font-size: 24rpx; }
.as-node-sub { font-size: 18rpx; color: rgba(255, 255, 255, 0.8); margin-top: 2rpx; }
.as-node-factor { font-size: 18rpx; color: #6b7280; margin-top: 2rpx; }

.as-graph-empty { height: 300rpx; display: flex; align-items: center; justify-content: center; }
.as-graph-empty-text { font-size: 26rpx; color: #9ca3af; }

.as-graph-legend { display: flex; gap: 24rpx; justify-content: center; margin-top: 16rpx; }
.as-legend-item { display: flex; align-items: center; gap: 6rpx; }
.as-legend-dot { width: 16rpx; height: 16rpx; border-radius: 50%; }
.as-legend-dot.upstream { background: #4d7cfe; }
.as-legend-dot.downstream { background: #f43f5e; }
.as-legend-dot.related { background: #9ca3af; }
.as-legend-text { font-size: 20rpx; color: #6b7280; }
</style>
