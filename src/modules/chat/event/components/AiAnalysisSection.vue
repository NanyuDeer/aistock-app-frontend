<template>
  <view class="analysis-section" :class="{ 'is-pending': status === 'pending' }">
    <!-- 步骤头部：蓝色编号圆 + 标题 + 状态 -->
    <view class="section-header">
      <view class="section-number" :class="numStatusClass">
        <text class="section-num-text">{{ padNumber }}</text>
      </view>
      <text class="section-title">{{ title }}</text>
      <view class="section-status" v-if="status === 'processing' || status === 'generating'">
        <LoadingState size="sm" layout="horizontal" :text="status === 'processing' ? 'AI开始分析...' : 'AI正在生成...'" />
      </view>
      <view class="section-status" v-else-if="status === 'completed'">
        <text class="status-label done">✓ 完成</text>
      </view>
      <text class="section-status pending-label" v-else>等待中</text>
    </view>

    <!-- 流式生成文本 -->
    <view class="section-stream" v-if="(status === 'processing' || status === 'generating') && streamingText">
      <StreamingText :text="streamingText" />
    </view>

    <!-- completed 后：折叠式思考过程（Collapse 组件） -->
    <Collapse
      v-if="status === 'completed' && (streamingText || explanation)"
      :items="thinkingItems"
      v-model="thinkingKeys"
      accordion
      class="thinking-collapse"
    >
      <template #thinking>
        <text class="thinking-body">{{ streamingText || explanation }}</text>
      </template>
    </Collapse>

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
 * 视觉：白底卡片 + 蓝色实心编号圆 01-05（方案C），状态用右侧标签表达。
 *
 * Props:
 * - stepNumber: 步骤序号
 * - title: 步骤标题
 * - status: pending | processing | generating | completed
 * - explanation: AI 完成后的解释文本
 * - streamingText: 流式输出的实时文本
 * - isFirst / isLast: 连接线控制（保留兼容，卡片化后不再用 border-bottom 分隔）
 *
 * Slot: default — completed 后的业务组件
 */
import { computed, ref, watch } from 'vue'
import LoadingState from '@/shared/components/LoadingState.vue'
import StreamingText from '@/shared/components/StreamingText.vue'
import { Collapse } from '@/shared/components'

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

/** 思考过程折叠面板配置（单条目，手风琴模式） */
const thinkingItems = [{ key: 'thinking', title: '查看思考过程' }]
/** 当前展开的折叠面板 key 列表（v-model 绑定 Collapse） */
const thinkingKeys = ref<string[]>([])

// 每次开始新的 processing/generating 时重置折叠状态
watch(() => props.status, (val) => {
  if (val === 'processing' || val === 'generating' || val === 'pending') {
    thinkingKeys.value = ['thinking'] // 流式输出时展开
  } else if (val === 'completed') {
    thinkingKeys.value = [] // 完成后折叠
  }
})

/** 编号圆配色：completed/processing/generating 用品牌蓝实心，pending 用浅灰 */
const numStatusClass = computed(() => {
  if (props.status === 'pending') return 'num-pending'
  return 'num-active'
})
</script>

<style scoped lang="scss">
/* 卡片化（方案C）：白底 + 边框 + 圆角，卡片间留间距 */
.analysis-section {
  position: relative;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
  padding: 28rpx 28rpx 24rpx;
  margin-bottom: 20rpx;
  transition: opacity 0.3s ease;
}

.analysis-section.is-pending {
  opacity: 0.55;
}

/* ===== 步骤头部 ===== */
.section-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

/* 蓝色实心编号圆 01-05（方案C 标识） */
.section-number {
  flex-shrink: 0;
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

/* 活跃态（processing/generating/completed）：品牌蓝实心 + 白字 */
.num-active {
  background: $primary;
  box-shadow: 0 2rpx 8rpx rgba(11, 95, 255, 0.25);
}

/* 等待态：浅灰底 + 灰字 */
.num-pending {
  background: rgba(138, 150, 176, 0.15);
}

.section-num-text {
  font-size: 22rpx;
  font-weight: 700;
  transition: color 0.3s ease;
}

.num-active .section-num-text { color: #ffffff; }
.num-pending .section-num-text { color: $ink-mute; }

.section-title {
  flex: 1;
  font-size: 28rpx;
  font-weight: 700;
  color: $ink;
  min-width: 0;
}
.is-pending .section-title { color: $ink-mute; }

/* 状态标签 */
.section-status {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.status-label { font-size: 22rpx; color: $primary; font-weight: 500; }
.status-label.done { color: $down; }
.pending-label { font-size: 22rpx; color: $ink-mute; }

/* ===== 流式文本 ===== */
.section-stream {
  min-height: 48rpx;
  margin-bottom: 14rpx;
}

/* ===== 思考过程折叠（Collapse 组件） ===== */
.thinking-collapse {
  margin-bottom: 14rpx;
}
.thinking-body {
  font-size: 22rpx;
  color: $ink-mute;
  line-height: 1.6;
}

/* ===== 分析内容 ===== */
.section-body {
  /* 子组件自管理 */
}
</style>
