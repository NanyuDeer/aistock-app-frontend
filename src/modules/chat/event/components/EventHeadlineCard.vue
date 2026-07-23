<template>
  <view
    class="event-headline-card"
    :class="[`event-headline-card--${type}`]"
    @tap="handleClick"
  >
    <!-- AI装饰光斑 -->
    <view class="ai-glow-decoration" :class="`ai-glow-decoration--${type}`"></view>

    <!-- 标签行 -->
    <view class="card-header">
      <!-- 方向标签（第一视觉） -->
      <view class="direction-badge" :class="`direction-badge--${type}`">
        <text class="direction-icon">{{ directionIcon }}</text>
        <text class="direction-text">{{ directionText }}</text>
      </view>

      <!-- 重大标签（第二视觉） -->
      <view v-if="importance === 'major'" class="importance-badge importance-badge--major">
        <text class="importance-icon">🔥</text>
        <text class="importance-text">重大</text>
      </view>
      <view v-else class="importance-badge">
        <text class="importance-text">重要</text>
      </view>
    </view>

    <!-- 事件标题 -->
    <text class="event-title">{{ title }}</text>

    <!-- 影响行业 -->
    <view class="industries-container">
      <!-- 股票趋势图标 -->
      <view class="trend-icon" :class="`trend-icon--${type}`">
        <!-- 上升趋势图 -->
        <svg v-if="type === 'positive'" width="48" height="28" viewBox="0 0 48 28" fill="none">
          <!-- Y轴 -->
          <path d="M8 4L8 24" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round"/>
          <!-- X轴 -->
          <path d="M8 24L44 24" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round"/>
          <!-- Y轴箭头 -->
          <path d="M6 6L8 4L10 6" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- X轴箭头 -->
          <path d="M42 22L44 24L42 26" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- 上升趋势线 -->
          <path d="M12 22L18 18L24 20L30 12L36 14L42 6" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- 趋势线箭头 -->
          <path d="M40 6L42 6L42 8" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <!-- 下降趋势图 -->
        <svg v-else width="48" height="28" viewBox="0 0 48 28" fill="none">
          <!-- Y轴 -->
          <path d="M8 4L8 24" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round"/>
          <!-- X轴 -->
          <path d="M8 24L44 24" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round"/>
          <!-- Y轴箭头 -->
          <path d="M6 6L8 4L10 6" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- X轴箭头 -->
          <path d="M42 22L44 24L42 26" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- 下降趋势线 -->
          <path d="M12 6L18 10L24 8L30 16L36 14L42 22" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- 趋势线箭头 -->
          <path d="M40 22L42 22L42 20" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </view>

      <view
        v-for="(industry, index) in displayIndustries"
        :key="index"
        class="industry-tag"
      >
        <text class="industry-text">{{ industry }}</text>
      </view>
      <view v-if="remainingCount > 0" class="industry-tag industry-tag--more">
        <text class="industry-text">+{{ remainingCount }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * EventHeadlineCard - AI 关注焦点高亮卡片
 *
 * 展示重大利好或重大利空事件的紧凑型卡片。
 * 用途：事件传导页面顶部的 AI 关注焦点区域。
 */
import { computed } from 'vue'

interface Props {
  /** 事件方向：利好/利空 */
  type: 'positive' | 'negative'
  /** 事件标题 */
  title: string
  /** 重要性：重大/重要 */
  importance?: 'major' | 'normal'
  /** 影响行业（最多展示3个，超过显示 +N） */
  industries?: string[]
  /** 事件ID（用于跳转） */
  eventId?: string
}

const props = withDefaults(defineProps<Props>(), {
  importance: 'normal',
  industries: () => [],
  eventId: ''
})

// 定义事件
const emit = defineEmits<{
  click: [eventId: string]
}>()

// 点击处理
function handleClick() {
  if (props.eventId) {
    emit('click', props.eventId)
  }
}

// 计算方向图标
const directionIcon = computed(() => {
  return props.type === 'positive' ? '▲' : '▼'
})

// 计算方向文本（更符合投资用户理解）
const directionText = computed(() => {
  return props.type === 'positive' ? '机会' : '风险'
})

// 展示的行业（最多3个）
const displayIndustries = computed(() => {
  return props.industries.slice(0, 3)
})

// 剩余行业数量
const remainingCount = computed(() => {
  return Math.max(0, props.industries.length - 3)
})
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

// ========== 基础卡片样式（横向紧凑卡片） ==========
.event-headline-card {
  position: relative;
  padding: 12rpx 12rpx;
  border-radius: $radius-base;
  border-left: 8rpx solid;
  overflow: hidden;
  min-height: 140rpx;
  max-height: 160rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex: 1;
}

.event-headline-card:active {
  transform: scale(0.98);
}

// ========== AI装饰光斑 ==========
.ai-glow-decoration {
  position: absolute;
  top: -20rpx;
  right: -20rpx;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  opacity: 0.4;
  pointer-events: none;
}

.ai-glow-decoration--positive {
  background: radial-gradient(circle, rgba(239, 68, 68, 0.35) 0%, rgba(239, 68, 68, 0.1) 50%, transparent 70%);
}

.ai-glow-decoration--negative {
  background: radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.08) 50%, transparent 70%);
}

// ========== 利好卡片样式（机会） - 视觉权重55% ==========
.event-headline-card--positive {
  background: linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 55%, #FECDD3 100%);
  border-left-color: #EF4444;
  box-shadow: 0 12rpx 40rpx rgba(239, 68, 68, 0.25);
}

// ========== 利空卡片样式（风险） - 视觉权重45% ==========
.event-headline-card--negative {
  background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 55%, #A7F3D0 100%);
  border-left-color: #10B981;
  box-shadow: 0 12rpx 40rpx rgba(16, 185, 129, 0.18);
}

// ========== 标签行 ==========
.card-header {
  display: flex;
  align-items: center;
  gap: 6rpx;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

// ========== 方向标签（第一视觉） ==========
.direction-badge {
  display: flex;
  align-items: center;
  gap: 2rpx;
  padding: 3rpx 10rpx;
  border-radius: $radius-pill;
  font-weight: 700;
}

.direction-badge--positive {
  background: rgba(239, 68, 68, 0.20);
}

.direction-badge--negative {
  background: rgba(16, 185, 129, 0.16);
}

.direction-icon {
  font-size: 20rpx;
}

.direction-badge--positive .direction-icon {
  color: #DC2626;
}

.direction-badge--negative .direction-icon {
  color: #059669;
}

.direction-text {
  font-size: 22rpx;
  font-weight: 700;
}

.direction-badge--positive .direction-text {
  color: #DC2626;
}

.direction-badge--negative .direction-text {
  color: #059669;
}

// ========== 重大标签（第二视觉） ==========
.importance-badge {
  display: flex;
  align-items: center;
  gap: 2rpx;
  padding: 3rpx 10rpx;
  border-radius: $radius-pill;
  background: rgba(0, 0, 0, 0.05);
  font-weight: 700;
}

.importance-badge--major {
  background: rgba(245, 158, 11, 0.15);
}

.importance-icon {
  font-size: 20rpx;
}

.importance-text {
  font-size: 22rpx;
  font-weight: 700;
  color: $text-color;
}

// ========== 事件标题 ==========
.event-title {
  font-size: 24rpx;
  font-weight: 600;
  color: $text-color;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;
  z-index: 1;
}

// ========== 影响行业 ==========
.industries-container {
  display: flex;
  align-items: center;
  gap: 6rpx;
  flex-shrink: 0;
  flex-wrap: nowrap;
  position: relative;
  z-index: 1;
}

// ========== 股票趋势图标 ==========
.trend-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 28rpx;
  margin-right: 4rpx;
  flex-shrink: 0;
}

.industry-tag {
  padding: 2rpx 6rpx;
  border-radius: 4rpx;
  background: rgba(0, 0, 0, 0.04);
  flex-shrink: 0;
}

.industry-tag--more {
  background: rgba(0, 0, 0, 0.06);
}

.industry-text {
  font-size: 20rpx;
  color: $text-color-secondary;
}
</style>