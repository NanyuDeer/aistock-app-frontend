<template>
  <Card
    class="headline-card"
    :class="`headline-card--${type}`"
    flat
    clickable
    @click="handleClick"
  >
    <view class="card-inner">
      <!-- AI装饰光斑 -->
      <view class="ai-glow-decoration" :class="`ai-glow-decoration--${type}`" />

      <!-- 标签行 -->
      <view class="card-header">
        <!-- 方向标签（第一视觉）：Tag up/down/neutral -->
        <Tag :type="type === 'positive' ? 'up' : type === 'negative' ? 'down' : 'neutral'" size="sm">
          <SvgIcon :name="type === 'positive' ? 'arrow-up-line' : type === 'negative' ? 'arrow-down-line' : 'arrow-up-down-line'" size="20rpx" :color="dirIconColor" />
          <text class="direction-text">{{ directionText }}</text>
        </Tag>

        <!-- 重大标签（第二视觉）：Badge gold/info -->
        <Badge v-if="importance === 'major'" type="gold" size="sm">
          <SvgIcon name="fire-line" size="20rpx" :color="fireColor" />
          <text class="importance-text">重大</text>
        </Badge>
        <Badge v-else type="info" size="sm">
          <text class="importance-text">重要</text>
        </Badge>
      </view>

      <!-- 事件标题 -->
      <text class="event-title">{{ title }}</text>

      <!-- 影响行业 -->
      <view class="industries-container">
        <!-- 股票趋势图标 -->
        <view class="trend-icon" :class="`trend-icon--${type}`">
          <!-- 上升趋势图 -->
          <svg v-if="type === 'positive'" width="48" height="28" viewBox="0 0 48 28" fill="none">
            <path d="M8 4L8 24" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M8 24L44 24" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M6 6L8 4L10 6" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M42 22L44 24L42 26" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 22L18 18L24 20L30 12L36 14L42 6" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M40 6L42 6L42 8" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <!-- 下降趋势图 -->
          <svg v-else-if="type === 'negative'" width="48" height="28" viewBox="0 0 48 28" fill="none">
            <path d="M8 4L8 24" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M8 24L44 24" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M6 6L8 4L10 6" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M42 22L44 24L42 26" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 6L18 10L24 8L30 16L36 14L42 22" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M40 22L42 22L42 20" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <!-- 综合趋势图（紫色波浪） -->
          <svg v-else width="48" height="28" viewBox="0 0 48 28" fill="none">
            <path d="M8 4L8 24" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M8 24L44 24" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M6 6L8 4L10 6" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M42 22L44 24L42 26" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 14L18 8L24 20L30 10L36 18L42 12" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
        </view>

        <Badge v-for="(industry, index) in displayIndustries" :key="index" type="info" size="sm">
          {{ industry }}
        </Badge>
        <Badge v-if="remainingCount > 0" type="info" size="sm">+{{ remainingCount }}</Badge>
      </view>
    </view>
  </Card>
</template>

<script setup lang="ts">
/**
 * EventHeadlineCard - AI 关注焦点高亮卡片
 *
 * 展示重大利好或重大利空事件的紧凑型卡片。
 * 用途：事件传导页面顶部的 AI 关注焦点区域。
 *
 * 视觉层对齐组件库：Card 容器 + Tag 方向 + Badge 重要性/行业 + SvgIcon 替代 emoji。
 * 渐变/光斑为焦点卡刻意设计，通过覆盖 Card 默认样式保留。
 */
import { computed } from 'vue'
import Card from '@/shared/components/Card.vue'
import Tag from '@/shared/components/Tag.vue'
import Badge from '@/shared/components/Badge.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

interface Props {
  /** 事件方向：利好/利空/综合 */
  type: 'positive' | 'negative' | 'mixed'
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

// 设计令牌（SvgIcon color 需具体色值）
const dirIconColor = computed(() => {
  if (props.type === 'positive') return '#e54d5e' // $up
  if (props.type === 'negative') return '#18a058' // $down
  return '#7c3aed' // purple for mixed
})
const fireColor = '#a67c1f' // $gold-deep

// 点击处理
function handleClick() {
  if (props.eventId) {
    emit('click', props.eventId)
  }
}

// 计算方向文本（更符合投资用户理解）
const directionText = computed(() => {
  if (props.type === 'positive') return '机会'
  if (props.type === 'negative') return '风险'
  return '综合'
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

/* Card 容器覆盖：恢复焦点卡的渐变 + 左侧色条 + 紧凑尺寸 */
.headline-card.as-card {
  padding: 0;
  border: none;
  border-left: 8rpx solid;
  border-radius: $r-md;
  overflow: hidden;
  position: relative;
  box-shadow: $shadow-xs;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex: 1;
  width: 100%;
}

.headline-card.as-card:active {
  transform: scale(0.98);
}

.headline-card :deep(.as-card__body) {
  padding: 0;
}

/* 利好卡片样式（机会） */
.headline-card--positive.as-card {
  background: linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 55%, #FECDD3 100%);
  border-left-color: $up;
  box-shadow: 0 12rpx 40rpx rgba($up, 0.25);
}

/* 利空卡片样式（风险） */
.headline-card--negative.as-card {
  background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 55%, #A7F3D0 100%);
  border-left-color: $down;
  box-shadow: 0 12rpx 40rpx rgba($down, 0.18);
}

/* 综合卡片样式（mixed） */
.headline-card--mixed.as-card {
  background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 55%, #DDD6FE 100%);
  border-left-color: #7c3aed;
  box-shadow: 0 12rpx 40rpx rgba(124, 58, 237, 0.18);
}

/* 内层容器：保留原焦点卡的紧凑布局 */
.card-inner {
  position: relative;
  padding: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-height: 140rpx;
  max-height: 160rpx;
}

/* ========== AI装饰光斑 ========== */
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
  background: radial-gradient(circle, rgba($up, 0.35) 0%, rgba($up, 0.1) 50%, transparent 70%);
}

.ai-glow-decoration--negative {
  background: radial-gradient(circle, rgba($down, 0.25) 0%, rgba($down, 0.08) 50%, transparent 70%);
}

.ai-glow-decoration--mixed {
  background: radial-gradient(circle, rgba(124, 58, 237, 0.25) 0%, rgba(124, 58, 237, 0.08) 50%, transparent 70%);
}

/* ========== 标签行 ========== */
.card-header {
  display: flex;
  align-items: center;
  gap: 6rpx;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.direction-text {
  font-size: 22rpx;
  font-weight: 700;
  margin-left: 2rpx;
}

.importance-text {
  font-size: 22rpx;
  font-weight: 700;
}

/* ========== 事件标题 ========== */
.event-title {
  font-size: 24rpx;
  font-weight: 600;
  color: $ink;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;
  z-index: 1;
}

/* ========== 影响行业 ========== */
.industries-container {
  display: flex;
  align-items: center;
  gap: 6rpx;
  flex-shrink: 0;
  flex-wrap: nowrap;
  position: relative;
  z-index: 1;
}

/* ========== 股票趋势图标 ========== */
.trend-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 28rpx;
  margin-right: 4rpx;
  flex-shrink: 0;
}
</style>
