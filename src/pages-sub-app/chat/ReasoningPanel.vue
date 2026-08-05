<template>
  <view v-if="steps.length > 0 || execSteps.length > 0" class="reasoning-panel">
    <!-- 顶部：AI 思考过程（原 ReasoningCard 主体，P3-fix 起；仅 steps 非空时渲染，避免空态"0 步"头） -->
    <view v-if="steps.length > 0" class="rp-think">
      <view class="rp-think-header" @tap="thinkingExpanded = !thinkingExpanded">
        <SvgIcon name="lightbulb-flash-line" size="28rpx" :color="inkMute" />
        <text class="rp-title">AI 思考过程</text>
        <text class="rp-stats">{{ steps.length }} 步</text>
        <SvgIcon :name="thinkingExpanded ? 'arrow-up-s-line' : 'arrow-down-s-line'" size="28rpx" :color="inkMute" />
      </view>
      <view v-if="thinkingExpanded" class="rp-think-body">
        <view v-for="(step, i) in steps" :key="i" class="rp-step" :class="step.status">
          <view class="rp-step-row">
            <view class="rp-step-dot" />
            <text class="rp-step-node">{{ nodeLabel(step.node) }}</text>
          </view>
          <mp-html :content="markdownToHtml(step.text)" class="rp-step-text" />
        </view>
      </view>
    </view>

    <!-- 底部子区：执行细节（原 ExecStepsPanel 内容，P3 起），独立折叠互不影响 -->
    <view v-if="execSteps.length > 0" class="rp-exec">
      <view class="rp-exec-header" @tap="execExpanded = !execExpanded">
        <text class="rp-exec-title">执行细节</text>
        <text class="rp-exec-stats">{{ nodeCount }} 节点 / {{ toolCount }} 工具</text>
        <SvgIcon :name="execExpanded ? 'arrow-up-s-line' : 'arrow-down-s-line'" size="28rpx" :color="inkMute" />
      </view>
      <view v-if="execExpanded" class="rp-exec-body">
        <view v-for="(node, i) in execSteps" :key="i" class="rp-node">
          <view class="rp-node-row">
            <view class="rp-node-dot" />
            <text class="rp-node-label">{{ node.label }}</text>
            <text v-if="node.thinkingMs != null" class="rp-thinking">思考 {{ fmtMs(node.thinkingMs) }}</text>
            <text class="rp-duration">{{ fmtMs(duration(node)) }}</text>
          </view>
          <view v-for="(t, j) in node.tools" :key="j" class="rp-tool">
            <text :class="['rp-tool-mark', t.status === 'done' ? 'ok' : 'fail']">
              {{ t.status === 'done' ? '✓' : '!' }}
            </text>
            <text class="rp-tool-name">{{ t.label || t.tool }}</text>
            <text class="rp-tool-duration">{{ fmtMs(toolDuration(t)) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'
import { markdownToHtml } from '@/shared/utils/markdown'
import type { ReasoningStep, ExecStepNode, ExecToolStep } from '@/shared/api/modules/agent'

const props = defineProps<{ steps: ReasoningStep[]; execSteps: ExecStepNode[] }>()

// 有 streaming 步骤时思考链默认展开（实时思考过程可见），否则折叠（ReasoningCard 既有语义）
const thinkingExpanded = ref(props.steps.some(s => s.status === 'streaming'))
// 执行细节默认折叠（ExecStepsPanel 既有语义），与思考链互不影响
const execExpanded = ref(false)

// SvgIcon 的 color prop 是运行时字符串，无法引用 SCSS 变量；用设计令牌实值映射（同 AiThinkingHeader 做法）
const inkMute = '#8a96b0' // $ink-mute

const _NODE_LABELS: Record<string, string> = {
  qa_router: '理解问题',
  skill_executor: '收集证据',
  synth_answer: '综合回答',
  escalate: '深度分析',
}

function nodeLabel(node: string): string {
  return _NODE_LABELS[node] || node
}

const nodeCount = computed(() => props.execSteps.length)
const toolCount = computed(() => props.execSteps.reduce((sum, n) => sum + n.tools.length, 0))

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

.reasoning-panel {
  margin-bottom: 12rpx;
  padding: 12rpx 16rpx;
  background: $primary-50;
  border-radius: 12rpx;
  border-left: 4rpx solid $primary;
}
.rp-think-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.rp-title { flex: 1; font-size: 24rpx; color: $ink-soft; }
.rp-stats { font-size: 22rpx; color: $ink-mute; }
.rp-think-body { margin-top: 8rpx; }
.rp-step { padding: 8rpx 0; border-top: 1rpx dashed $line-soft; }
.rp-step:first-child { border-top: none; }
.rp-step-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 4rpx; }
.rp-step-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: $primary; }
.rp-step.streaming .rp-step-dot { animation: pulse 1s ease-in-out infinite; }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.rp-step-node { font-size: 22rpx; color: $ink-soft; font-weight: 600; }
:deep(.rp-step-text) {
  font-size: 24rpx;
  color: $ink-soft;
  line-height: 1.5;
  word-break: keep-all;
  overflow-wrap: break-word;
}

/* 底部执行细节子区（原 ExecStepsPanel 样式语义） */
.rp-exec {
  margin-top: 12rpx;
  border-top: 1rpx solid $line-soft;
  padding-top: 8rpx;
}
.rp-exec-header { display: flex; align-items: center; gap: 12rpx; padding: 4rpx 0; }
.rp-exec-title { font-size: 22rpx; color: $ink-mute; }
.rp-exec-stats { flex: 1; font-size: 22rpx; color: $ink-mute; }
.rp-exec-body { padding: 8rpx 0 4rpx; }
.rp-node { margin-bottom: 8rpx; }
.rp-node-row { display: flex; align-items: center; gap: 10rpx; }
.rp-node-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: $primary; flex-shrink: 0; }
.rp-node-label { font-size: 24rpx; color: $ink; flex: 1; min-width: 0; }
.rp-thinking { font-size: 20rpx; color: $ink-mute; flex-shrink: 0; }
.rp-duration { font-size: 20rpx; color: $ink-mute; flex-shrink: 0; }
.rp-tool { display: flex; align-items: center; gap: 10rpx; padding: 4rpx 0 4rpx 22rpx; }
.rp-tool-mark { width: 28rpx; font-size: 22rpx; flex-shrink: 0; text-align: center; }
.rp-tool-mark.ok { color: $down; font-weight: 700; }
.rp-tool-mark.fail { color: $up; font-weight: 700; }
.rp-tool-name { font-size: 22rpx; color: $ink-soft; flex: 1; min-width: 0; }
.rp-tool-duration { font-size: 20rpx; color: $ink-mute; flex-shrink: 0; }
</style>
