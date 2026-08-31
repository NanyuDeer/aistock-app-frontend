<template>
  <view class="thinking-header" :class="{ done: isComplete }">
    <!-- 第一行：返回 + 标题 -->
    <view class="header-row title-row">
      <view class="back-btn" @tap="handleBack">
        <SvgIcon name="arrow-left-line" size="28rpx" :color="iconArrow" />
      </view>
      <SvgIcon name="robot-line" size="30rpx" :color="iconPrimary" />
      <text class="header-title">事件机会洞见</text>
    </view>

    <!-- 第二行：思考日志（Steps 步骤指示器） -->
    <view class="header-row logs-row" v-if="!isComplete && steps.length">
      <Steps :steps="steps" :current="activeLogIdx" direction="horizontal" status="process" />
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
 * 1. 标题（SvgIcon robot-line + AI事件分析）
 * 2. 思考日志（Steps 步骤指示器：已完成=对勾，当前=进行中，未到=等待）
 * 3. 当前阶段（正在分析：事件理解）
 *
 * Props 全部来自 useAiReasoning 的响应式数据。
 * 视觉层对齐组件库：SvgIcon 替代字符箭头，Steps 替代手写日志 bullets，颜色用设计令牌。
 */
import { computed } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import Steps from '@/shared/components/Steps.vue'

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

// 设计令牌（SvgIcon 的 color 需具体色值，故用常量映射 $primary / $ink-mute）
const iconPrimary = '#0b5fff' // $primary
const iconArrow = '#8a96b0'   // $ink-mute

const phaseMap: Record<string, number> = { reading: 0, identifying: 1, analyzing: 2, done: 99 }
const activeLogIdx = computed(() => {
  if (props.isComplete) return props.thinkingLogs.length
  return phaseMap[props.phase] ?? -1
})

/** Steps 步骤项：思考日志 + 当前分析步骤（当游标越过日志末项时追加） */
const steps = computed(() => {
  const base = props.thinkingLogs.map(log => ({ title: log }))
  if (props.currentStepText && activeLogIdx.value >= props.thinkingLogs.length) {
    base.push({ title: props.currentStepText })
  }
  return base
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
  background: rgba(255, 255, 255, 0.94);
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
  background: rgba(0, 0, 0, 0.04);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.back-btn:active { background: rgba(0, 0, 0, 0.08); }
.header-title { font-size: 30rpx; font-weight: 700; color: var(--ev-text-primary); }

/* 第二行：Steps 日志 */
.logs-row { margin-bottom: 8rpx; }

/* 完成行 */
.done-row { margin-bottom: 4rpx; }
.done-text { font-size: 22rpx; color: var(--ev-positive); font-weight: 500; }

/* 第三行 */
.phase-row { padding-top: 4rpx; }
.phase-label { font-size: 22rpx; color: var(--ev-accent); font-weight: 500; }
</style>
