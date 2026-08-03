<template>
  <view class="exec-panel">
    <view class="ep-header" @tap="expanded = !expanded">
      <text class="ep-title">执行过程</text>
      <text class="ep-stats">{{ nodeCount }} 节点 / {{ toolCount }} 工具</text>
      <SvgIcon :name="expanded ? 'arrow-up-s-line' : 'arrow-down-s-line'" size="28rpx" color="#9ca3af" />
    </view>
    <view v-if="expanded" class="ep-body">
      <view v-for="(node, i) in steps" :key="i" class="ep-node">
        <view class="ep-node-row">
          <view class="ep-node-dot" />
          <text class="ep-node-label">{{ node.label }}</text>
          <text v-if="node.thinkingMs != null" class="ep-thinking">思考 {{ fmtMs(node.thinkingMs) }}</text>
          <text class="ep-duration">{{ fmtMs(duration(node)) }}</text>
        </view>
        <view v-for="(t, j) in node.tools" :key="j" class="ep-tool">
          <text :class="['ep-tool-mark', t.status === 'done' ? 'ok' : 'fail']">
            {{ t.status === 'done' ? '✓' : '!' }}
          </text>
          <text class="ep-tool-name">{{ t.label || t.tool }}</text>
          <text class="ep-tool-duration">{{ fmtMs(toolDuration(t)) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import type { ExecStepNode, ExecToolStep } from '@/shared/api/modules/agent'

const props = defineProps<{ steps: ExecStepNode[] }>()

const expanded = ref(false)

const nodeCount = computed(() => props.steps.length)
const toolCount = computed(() => props.steps.reduce((sum, n) => sum + n.tools.length, 0))

function duration(node: ExecStepNode): number {
  return (node.endAt ?? node.startAt) - node.startAt
}

function toolDuration(t: ExecToolStep): number {
  return (t.endAt ?? t.startAt) - t.startAt
}

function fmtMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return ''
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.exec-panel {
  margin-top: 12rpx;
  border-top: 1rpx solid #f0f0f0;
  padding-top: 8rpx;
}
.ep-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 4rpx 0;
}
.ep-title {
  font-size: 22rpx;
  color: #9ca3af;
}
.ep-stats {
  flex: 1;
  font-size: 22rpx;
  color: #9ca3af;
}
.ep-body {
  padding: 8rpx 0 4rpx;
}
.ep-node {
  margin-bottom: 8rpx;
}
.ep-node-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.ep-node-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: $primary;
  flex-shrink: 0;
}
.ep-node-label {
  font-size: 24rpx;
  color: $ink;
  flex: 1;
  min-width: 0;
}
.ep-thinking {
  font-size: 20rpx;
  color: #9ca3af;
  flex-shrink: 0;
}
.ep-duration {
  font-size: 20rpx;
  color: #9ca3af;
  flex-shrink: 0;
}
.ep-tool {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 4rpx 0 4rpx 22rpx;
}
.ep-tool-mark {
  width: 28rpx;
  font-size: 22rpx;
  flex-shrink: 0;
  text-align: center;
}
.ep-tool-mark.ok { color: #22c55e; font-weight: 700; }
.ep-tool-mark.fail { color: #f43f5e; font-weight: 700; }
.ep-tool-name {
  font-size: 22rpx;
  color: $ink-soft;
  flex: 1;
  min-width: 0;
}
.ep-tool-duration {
  font-size: 20rpx;
  color: #9ca3af;
  flex-shrink: 0;
}
</style>
