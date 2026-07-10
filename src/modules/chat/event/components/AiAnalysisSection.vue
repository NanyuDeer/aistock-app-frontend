<template>
  <view class="analysis-section" :class="{ 'is-pending': status === 'pending', 'is-last': isLast }">
    <!-- 步骤头部：编号圆 + 标题 + 状态 -->
    <view class="section-header">
      <view class="section-number" :class="numStatusClass">
        <text class="section-num-text" v-if="status === 'completed'">✓</text>
        <text class="section-num-text" v-else>{{ padNumber }}</text>
      </view>
      <text class="section-title">{{ title }}</text>
      <view class="section-status" v-if="status === 'processing' || status === 'generating'">
        <view class="status-spinner" />
        <text class="status-label">{{ status === 'processing' ? 'AI开始分析...' : 'AI正在生成...' }}</text>
      </view>
      <view class="section-status" v-else-if="status === 'completed'">
        <text class="status-label done">分析完成</text>
      </view>
      <text class="section-status pending-label" v-else>等待中</text>
    </view>

    <!-- 流式生成文本 -->
    <view class="section-stream" v-if="(status === 'processing' || status === 'generating') && streamingText">
      <text class="stream-text">{{ streamingText }}<text class="stream-cursor">|</text></text>
    </view>

    <!-- completed 后：折叠式思考过程 -->
    <template v-if="status === 'completed' && (streamingText || explanation)">
      <view class="thinking-toggle" @tap="thinkingExpanded = !thinkingExpanded">
        <text class="toggle-text">{{ thinkingExpanded ? '收起思考过程 ▴' : '查看思考过程 ▾' }}</text>
      </view>
      <view class="section-thinking" v-if="thinkingExpanded">
        <text class="thinking-body">{{ streamingText || explanation }}</text>
      </view>
    </template>

    <!-- 分析内容（仅 completed 时展示业务组件） -->
    <view class="section-body" v-if="status === 'completed' && $slots.default">
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * AiAnalysisSection — 统一 AI 推理步骤容器（流式版）
 *
 * 支持 pending / processing / generating / completed 四态。
 * processing + generating 时展示内容的逐字流式输出效果。
 *
 * Props:
 * - stepNumber: 步骤序号
 * - title: 步骤标题
 * - status: pending | processing | generating | completed
 * - explanation: AI 完成后的解释文本
 * - streamingText: 流式输出的实时文本
 * - isFirst / isLast: 连接线控制
 *
 * Slot: default — completed 后的业务组件
 */
import { computed, ref, watch } from 'vue'

type StepStatus = 'pending' | 'processing' | 'generating' | 'completed'

interface Props {
  stepNumber: number
  title: string
  status?: StepStatus
  explanation?: string
  streamingText?: string
  isFirst?: boolean
  isLast?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  status: 'pending',
  isFirst: false,
  isLast: false,
})

const padNumber = computed(() => String(props.stepNumber).padStart(2, '0'))

const thinkingExpanded = ref(false)

// 每次开始新的 processing/generating 时重置折叠状态
watch(() => props.status, (val) => {
  if (val === 'processing' || val === 'generating' || val === 'pending') {
    thinkingExpanded.value = true // 流式输出时展开
  } else if (val === 'completed') {
    thinkingExpanded.value = false // 完成后折叠
  }
})

const numStatusClass = computed(() => {
  if (props.status === 'completed') return 'num-completed'
  if (props.status === 'generating' || props.status === 'processing') return 'num-processing'
  return 'num-pending'
})
</script>

<style scoped>
.analysis-section {
  position: relative;
  padding: 32rpx 32rpx 28rpx;
  border-bottom: 1px solid var(--ev-border);
  transition: opacity 0.3s ease;
}

.analysis-section.is-last { border-bottom: none; }

.analysis-section.is-pending {
  opacity: 0.5;
}

/* ===== 步骤头部 ===== */
.section-header {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 16rpx;
}

.section-number {
  flex-shrink: 0;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.num-pending { background: rgba(148, 163, 184, 0.1); }
.num-processing { background: var(--ev-accent-soft); }
.num-completed { background: var(--ev-positive-soft); }

.section-num-text {
  font-size: 20rpx;
  font-weight: 700;
  transition: color 0.3s ease;
}

.num-pending .section-num-text { color: var(--ev-text-muted); }
.num-processing .section-num-text { color: var(--ev-accent); }
.num-completed .section-num-text { color: var(--ev-positive); }

.section-title {
  flex: 1;
  font-size: 26rpx;
  font-weight: 700;
  color: var(--ev-text-primary);
  min-width: 0;
}
.is-pending .section-title { color: var(--ev-text-muted); }

/* 状态标签 */
.section-status {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.status-spinner {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  border: 2px solid rgba(99, 102, 241, 0.25);
  border-top-color: var(--ev-accent);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.status-label { font-size: 20rpx; color: var(--ev-accent); font-weight: 500; }
.status-label.done { color: var(--ev-positive); }
.pending-label { font-size: 20rpx; color: var(--ev-text-muted); }

/* ===== 流式文本 ===== */
.section-stream {
  min-height: 48rpx;
  margin-bottom: 14rpx;
}

.stream-text {
  font-size: 24rpx;
  color: var(--ev-text-secondary);
  line-height: 1.7;
}
.stream-cursor {
  color: var(--ev-accent);
  animation: blink 0.6s step-end infinite;
}

@keyframes blink { 50% { opacity: 0; } }

/* ===== 思考过程折叠 ===== */
.thinking-toggle {
  padding: 10rpx 0;
  margin-bottom: 8rpx;
}

.thinking-toggle:active { opacity: 0.7; }

.toggle-text {
  font-size: 20rpx;
  color: var(--ev-text-muted);
}
.section-thinking {
  padding: 14rpx 18rpx;
  border-radius: 8rpx;
  background: var(--ev-accent-bg);
  margin-bottom: 14rpx;
}
.thinking-body {
  font-size: 22rpx;
  color: var(--ev-text-tertiary);
  line-height: 1.6;
}

/* ===== 分析内容 ===== */
.section-body {
  /* 子组件自管理 */
}
</style>
