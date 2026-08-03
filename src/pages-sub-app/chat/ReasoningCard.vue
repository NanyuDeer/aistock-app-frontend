<template>
  <view class="reasoning-card">
    <view class="rc-header" @tap="expanded = !expanded">
      <SvgIcon name="lightbulb-flash-line" size="28rpx" color="#9ca3af" />
      <text class="rc-title">AI 思考过程</text>
      <text class="rc-stats">{{ steps.length }} 步</text>
      <SvgIcon :name="expanded ? 'arrow-up-s-line' : 'arrow-down-s-line'" size="28rpx" color="#9ca3af" />
    </view>
    <view v-if="expanded" class="rc-body">
      <view v-for="(step, i) in steps" :key="i" class="rc-step" :class="step.status">
        <view class="rc-step-row">
          <view class="rc-step-dot" />
          <text class="rc-step-node">{{ nodeLabel(step.node) }}</text>
        </view>
        <mp-html :content="markdownToHtml(step.text)" class="rc-step-text" />
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

// 有 streaming 步骤时默认展开（实时思考过程可见），否则折叠
const expanded = ref(props.steps.some(s => s.status === 'streaming'))

const _NODE_LABELS: Record<string, string> = {
  qa_router: '理解问题',
  skill_executor: '收集证据',
  synth_answer: '综合回答',
  escalate: '深度分析',
}

function nodeLabel(node: string): string {
  return _NODE_LABELS[node] || node
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.reasoning-card {
  margin-bottom: 12rpx;
  padding: 12rpx 16rpx;
  background: rgba(11, 95, 255, 0.04);
  border-radius: 12rpx;
  border-left: 4rpx solid $primary;
}
.rc-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.rc-title {
  flex: 1;
  font-size: 24rpx;
  color: $ink-soft;
}
.rc-stats {
  font-size: 22rpx;
  color: #9ca3af;
}
.rc-body {
  margin-top: 8rpx;
}
.rc-step {
  padding: 8rpx 0;
  border-top: 1rpx dashed #e5e7eb;
}
.rc-step:first-child {
  border-top: none;
}
.rc-step-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 4rpx;
}
.rc-step-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: $primary;
}
.rc-step.streaming .rc-step-dot {
  animation: pulse 1s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.rc-step-node {
  font-size: 22rpx;
  color: $ink-soft;
  font-weight: 600;
}
:deep(.rc-step-text) {
  font-size: 24rpx;
  color: $ink-soft;
  line-height: 1.5;
  word-break: keep-all;
  overflow-wrap: break-word;
}
</style>
