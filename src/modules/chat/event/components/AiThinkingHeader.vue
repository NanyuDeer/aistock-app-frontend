<template>
  <view class="thinking-header" :class="{ done: isComplete }">
    <!-- 第一行：返回 + 标题 -->
    <view class="header-row title-row">
      <view class="back-btn" @tap="handleBack">
        <text class="back-arrow">←</text>
      </view>
      <text class="header-icon">🤖</text>
      <text class="header-title">AI事件分析</text>
    </view>

    <!-- 第二行：思考日志 bullets -->
    <view class="header-row logs-row" v-if="!isComplete && thinkingLogs.length">
      <view v-for="(log, idx) in thinkingLogs" :key="idx" class="log-item" :class="{ active: idx === activeLogIdx, done: idx < activeLogIdx }">
        <text class="log-dot">{{ idx < activeLogIdx ? '✓' : idx === activeLogIdx ? '●' : '○' }}</text>
        <text class="log-text">{{ log }}</text>
      </view>
      <!-- 额外步骤日志：当前分析步骤名 -->
      <view class="log-item active" v-if="currentStepText && activeLogIdx >= thinkingLogs.length">
        <text class="log-dot">●</text>
        <text class="log-text">{{ currentStepText }}</text>
      </view>
    </view>

    <!-- 完成态：简短完成提示 -->
    <view class="header-row done-row" v-else-if="isComplete">
      <text class="done-text">✓ 分析完成</text>
    </view>

    <!-- 第三行：当前分析阶段 -->
    <view class="header-row phase-row" v-if="currentStepTitle && !isComplete">
      <text class="phase-label">{{ currentStepTitle }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * AiThinkingHeader — AI 思考状态头部（sticky）
 *
 * 三行布局：
 * 1. 标题（🤖 AI事件分析）
 * 2. 思考日志（● reading / ✓ done）
 * 3. 当前阶段（正在分析：事件理解）
 *
 * Props 全部来自 useAiReasoning 的响应式数据。
 */
import { computed } from 'vue'

type ThinkingPhase = 'idle' | 'reading' | 'identifying' | 'analyzing' | 'done'

interface Props {
  phase?: ThinkingPhase
  thinkingLogs?: string[]
  currentStepTitle?: string
  currentStepText?: string
  isComplete?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  phase: 'idle',
  thinkingLogs: () => [],
  currentStepTitle: '',
  currentStepText: '',
  isComplete: false,
})

const emit = defineEmits<{ back: [] }>()

function handleBack() { emit('back') }

const phaseMap: Record<string, number> = { reading: 0, identifying: 1, analyzing: 2, done: 99 }
const activeLogIdx = computed(() => {
  if (props.isComplete) return props.thinkingLogs.length
  return phaseMap[props.phase] ?? -1
})
</script>

<style scoped>
.thinking-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  padding: 20rpx 32rpx 16rpx;
  background: rgba(15, 17, 25, 0.94);
  backdrop-filter: blur(20rpx);
  border-bottom: 1px solid var(--ev-accent-soft);
  transition: border-color 0.4s;
}

.thinking-header.done { border-bottom-color: var(--ev-positive-soft); }

.header-row { display: flex; align-items: center; }

/* 第一行 */
.title-row { gap: 10rpx; margin-bottom: 12rpx; }
.back-btn {
  width: 48rpx; height: 48rpx; border-radius: 50%;
  background: rgba(255,255,255,0.06);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.back-btn:active { background: rgba(255,255,255,0.12); }
.back-arrow { font-size: 28rpx; color: var(--ev-text-tertiary); line-height: 1; }
.header-icon { font-size: 30rpx; line-height: 1; }
.header-title { font-size: 30rpx; font-weight: 700; color: var(--ev-text-primary); }

/* 第二行：日志 */
.logs-row { gap: 20rpx; flex-wrap: wrap; margin-bottom: 8rpx; }

.log-item { display: flex; align-items: center; gap: 6rpx; transition: all 0.4s; }
.log-dot { font-size: 18rpx; color: var(--ev-text-muted); flex-shrink: 0; width: 20rpx; text-align: center; }
.log-text { font-size: 20rpx; color: var(--ev-text-muted); }

.log-item.active .log-dot { color: var(--ev-accent); animation: pulse 1s ease-in-out infinite; }
.log-item.active .log-text { color: var(--ev-text-secondary); }
.log-item.done .log-dot { color: var(--ev-positive); }
.log-item.done .log-text { color: var(--ev-text-muted); }

@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

/* 完成行 */
.done-row { margin-bottom: 4rpx; }
.done-text { font-size: 22rpx; color: var(--ev-positive); font-weight: 500; }

/* 第三行 */
.phase-row { padding-top: 4rpx; }
.phase-label { font-size: 22rpx; color: var(--ev-accent); font-weight: 500; }
</style>
