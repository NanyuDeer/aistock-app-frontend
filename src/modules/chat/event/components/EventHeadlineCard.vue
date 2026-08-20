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

        <!-- 重大标签（第二视觉）：Badge gold/info，emoji 🔥 替换为 SvgIcon -->
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
        <!-- 股票趋势图标：统一走 SvgIcon，APP/H5 双通道（H5 mask / APP data-URI image） -->
        <view class="trend-icon">
          <SvgIcon :name="trendIconName" size="48rpx" :color="trendColor" />
        </view>

        <view
          v-for="(industry, index) in displayIndustries"
          :key="index"
          class="industry-item"
          :class="'industry--' + (industry.sentiment || 'neutral')"
        >
          <text v-if="industry.sentiment === 'bullish'" class="industry-arrow">↑</text>
          <text v-else-if="industry.sentiment === 'bearish'" class="industry-arrow">↓</text>
          <text class="industry-name">{{ industry.name }}</text>
        </view>
        <view v-if="remainingCount > 0" class="industry-item industry--neutral">+{{ remainingCount }}</view>
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
import type { AffectedIndustry } from '../types'
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
  /** 影响行业（最多展示5个，一行压缩展示，含涨跌方向） */
  industries?: AffectedIndustry[]
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

// 趋势图标：SvgIcon 资源名（网格用固定灰 #9CA3AF，折线用 currentColor 由下方色值统一替换）
const trendIconName = computed(() => {
  if (props.type === 'positive') return 'trend-up-line'
  if (props.type === 'negative') return 'trend-down-line'
  return 'trend-mixed-line'
})
// 折线颜色，保持与原内联 SVG 视觉一致（红升/绿降/紫综合）
const trendColor = computed(() => {
  if (props.type === 'positive') return '#DC2626'
  if (props.type === 'negative') return '#059669'
  return '#7C3AED'
})

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

// 展示的行业（最多3个，超过显示 +N；正常字号自然排列，不压缩）
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
  min-width: 0; /* 防止双卡横向排列时被内部内容撑破 */
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

/* 内层容器：标题区域更突出；左右 padding 恢复适中，行业区自然高度 */
.card-inner {
  position: relative;
  padding: 3rpx 12rpx; /* 极致收紧上下留白，仍保留左右 12rpx 呼吸 */
  display: flex;
  flex-direction: column;
  gap: 2rpx; /* 仅保留必要区块间距，几乎贴行 */
  min-height: 0; /* 不设下限：高度完全由内容决定，杜绝留白 */
  min-width: 0; /* 窄卡下允许内部收缩，避免行业溢出推宽卡片 */
  /* 不设 max-height / 固定高度：行业标签换行时自适应，避免截断 */
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

/* ========== 事件标题（最多两行，超出省略号；不再单行截断） ========== */
.event-title {
  font-size: 24rpx;
  font-weight: 600;
  color: $ink;
  line-height: 1.2;
  /* 最多两行，超出省略（uni-app H5 用 -webkit-box 多行截断） */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
  word-break: break-all;
  position: relative;
  z-index: 1;
}

/* ========== 影响行业（最多3个 + N；辅助信息：小标签、弱化视觉，标题优先） ========== */
.industries-container {
  display: flex;
  align-items: center;
  flex-wrap: wrap; /* 行业标签允许换行，避免长行业名挤压/溢出卡片右缘 */
  flex-shrink: 0;
  min-width: 0; /* 窄卡下行业区可收缩，防止把卡片撑宽 */
  position: relative;
  z-index: 1;
  /* 间距用 margin 实现（见 .industry-item），避免依赖 flex gap（部分旧 Android WebView 不渲染 gap） */
}

/* 行业标签：小字号辅助展示，不抢占标题空间 */
.industry-item {
  display: inline-flex;
  align-items: center;
  font-size: 20rpx;
  font-weight: 500;
  line-height: 1.15; /* 收紧行高，减少行业标签纵向高度 */
  padding: 1rpx 8rpx; /* 上下仅留 1rpx，几乎贴字 */
  border-radius: $r-xs;
  white-space: nowrap;
  margin-right: 6rpx; /* 替代 flex gap 的横向间距 */
  margin-bottom: 2rpx; /* 换行后的最小行间距 */
}

/* 行业名称：纵向全宽后空间充足，适当放宽宽度；仍保留省略兜底，防极端长名撑破 */
.industry-name {
  max-width: 240rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.industry-arrow {
  font-size: 16rpx;
  margin-right: 2rpx;
}

/* 上涨（红 ↑） / 下跌（绿 ↓） / 中性（含 +N） */
.industry--bullish {
  background: rgba($up, 0.12);
  color: $up;
}

.industry--bearish {
  background: rgba($down, 0.12);
  color: $down;
}

.industry--neutral {
  background: $bg-deep;
  color: $ink-mute;
}

/* ========== 股票趋势图标（SvgIcon 渲染，尺寸由 SvgIcon size 决定） ========== */
.trend-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  margin-right: 6rpx; /* 与行业标签间距保持一致（同 .industry-item） */
  flex-shrink: 0;
}
</style>
