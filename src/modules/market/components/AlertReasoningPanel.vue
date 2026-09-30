<template>
  <view v-if="steps.length > 0" class="alert-reasoning-panel">
    <view class="arp-think-header" @tap="expanded = !expanded">
      <SvgIcon name="lightbulb-flash-line" size="28rpx" :color="primaryColor" />
      <text class="arp-title">AI 思考过程</text>
      <text class="arp-stats">{{ steps.length }} 步</text>
      <SvgIcon :name="expanded ? 'arrow-up-s-line' : 'arrow-down-s-line'" size="28rpx" :color="inkMute" />
    </view>
    <view v-if="expanded" class="arp-think-body">
      <view v-for="(step, i) in steps" :key="i" class="arp-step" :class="step.status">
        <view class="arp-step-row">
          <view class="arp-step-dot" />
          <text class="arp-step-node">{{ nodeLabel(step.node) }}</text>
        </view>
        <mp-html :content="markdownToHtml(step.text)" class="arp-step-text" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'
import { markdownToHtml } from '@/shared/utils/markdown'
import type { ReasoningStep } from '@/shared/api/modules/agent'

const props = defineProps<{ steps: ReasoningStep[] }>()

// 有 streaming 步骤时默认展开（实时解说可见），否则折叠（与 chat 的 ReasoningPanel 同语义）
const expanded = ref(props.steps.some(s => s.status === 'streaming'))

// SvgIcon 的 color prop 是运行时字符串，无法引用 SCSS 变量；用令牌实值映射
const inkMute = '#8a96b0' // $ink-mute
const primaryColor = '#0b5fff' // $primary

const _NODE_LABELS: Record<string, string> = {
  alert_scan: '多维分析',
  alert_master: '汇聚研判',
}

function nodeLabel(node: string): string {
  return _NODE_LABELS[node] || node
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.alert-reasoning-panel {
  margin-bottom: $s-3;
  padding: 16rpx 20rpx;
  background: $bg-card;
  border-radius: $r-md;
  box-shadow: $shadow-card;
}
.arp-think-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding-bottom: 8rpx;
  border-bottom: 1rpx solid $line-soft;
}
.arp-title { flex: 1; font-size: 24rpx; color: $ink-soft; }
.arp-stats { font-size: 22rpx; color: $ink-mute; }
.arp-think-body { margin-top: 8rpx; }
.arp-step { padding: 8rpx 0; border-top: 1rpx dashed $line-soft; }
.arp-step:first-child { border-top: none; }
.arp-step-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 4rpx; }
.arp-step-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: $primary; }
.arp-step.streaming .arp-step-dot { animation: pulse 1s ease-in-out infinite; }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.arp-step-node { font-size: 22rpx; color: $ink-soft; font-weight: 600; }
:deep(.arp-step-text) {
  font-size: 24rpx;
  color: $ink-soft;
  line-height: 1.5;
  word-break: keep-all;
  overflow-wrap: break-word;
}
</style>