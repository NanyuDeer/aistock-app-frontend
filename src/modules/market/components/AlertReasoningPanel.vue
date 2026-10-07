<template>
  <view v-if="steps.length > 0" class="alert-reasoning-panel">
    <view class="arp-think-header" @tap="toggleExpanded">
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
import { ref, watch } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'
import { markdownToHtml } from '@/shared/utils/markdown'
import type { ReasoningStep } from '@/shared/api/modules/agent'

const props = defineProps<{ steps: ReasoningStep[] }>()

// 有 streaming 步骤时默认展开（实时解说可见），否则折叠（与 chat 的 ReasoningPanel 同语义）。
// 需在 props 后续变化时仍保持"出现 streaming 即自动展开"，同时尊重用户手动折叠。
const expanded = ref(props.steps.some(s => s.status === 'streaming'))
// 用户是否手动操作过展开/折叠：一旦手动操作，就不再被 streaming 自动改写（用户操作优先）
let userToggled = false

function toggleExpanded(): void {
  userToggled = true
  expanded.value = !expanded.value
}

// 真实链路里 steps 初值为 []，随 reasoning 帧流式增长——首个 streaming 步骤到达后自动展开
watch(
  () => props.steps.some(s => s.status === 'streaming'),
  (hasStreaming) => {
    if (!userToggled && hasStreaming) expanded.value = true
  },
)

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
.arp-title { flex: 1; font-size: $font-size-sm; color: $ink-soft; }
.arp-stats { font-size: $font-size-xs; color: $ink-mute; }
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
.arp-step-node { font-size: $font-size-xs; color: $ink-soft; font-weight: 600; }
:deep(.arp-step-text) {
  font-size: $font-size-sm;
  color: $ink-soft;
  line-height: 1.5;
  word-break: keep-all;
  overflow-wrap: break-word;
}
</style>