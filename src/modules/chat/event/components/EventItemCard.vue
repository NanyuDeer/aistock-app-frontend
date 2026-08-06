<template>
  <Card class="event-card" flat clickable @click="$emit('view-detail', event)">
    <!-- 第一行：事件类型 + 来源 + 时间 + 重要程度 -->
    <view class="card-header">
      <view class="header-left">
        <text class="card-type" :style="{ color: typeColor.text, background: typeColor.bg }">
          {{ event.eventType }}
        </text>
        <Tag size="sm" :type="sourceTagType">
          {{ sourceLabel }}
        </Tag>
        <text class="card-time">{{ formatTime(event.publishTime) }}</text>
      </view>
      <Rate :modelValue="event.importance" :readonly="true" type="gold" size="18rpx" :gap="2" />
    </view>

    <!-- 事件标题（最多2行，点击跳转新闻） -->
    <text class="card-title" @tap.stop="$emit('view-news', event)">{{ event.title }}</text>

    <!-- Top5 影响行业（排序后取前5，横向滑动查看完整名称，隐藏滚动条） -->
    <scroll-view scroll-x :show-scrollbar="false" class="card-top5">
      <!-- uni-app scroll-view 内部有 .uni-scroll-view-content 包裹层，
           横向滚动必须由内层容器承载 flex 行布局（外层直接 flex 无效） -->
      <view class="card-top5-inner">
        <text
          v-for="ind in top5Industries"
          :key="ind.name"
          class="top5-item"
          :class="'t5-' + ind.sentiment"
        >
          {{ ind.name }}<text class="t5-arrow">{{ ind.sentiment === 'bullish' ? '↑' : ind.sentiment === 'bearish' ? '↓' : '→' }}</text>
        </text>
      </view>
    </scroll-view>

    <!-- AI 摘要 + 操作按钮 -->
    <view class="card-bottom">
      <view class="card-ai-summary" v-if="event.aiSummary">
        <Badge type="primary" :dot="false" size="sm" class="ai-badge">AI</Badge>
        <text class="ai-text">{{ event.aiSummary }}</text>
      </view>
      <view class="card-actions">
        <Button
          type="ghost"
          size="sm"
          class="follow-btn"
          :class="{ followed: event.isFollowed }"
          @click.stop="$emit('toggle-follow', event)"
        >
          {{ event.isFollowed ? '已关注' : '关注' }}
        </Button>
        <Button
          type="primary"
          size="sm"
          class="detail-btn"
          @click.stop="$emit('view-detail', event)"
        >
          AI解析
        </Button>
      </view>
    </view>
  </Card>
</template>

<script setup lang="ts">
/**
 * 事件列表核心卡片组件
 *
 * Props:
 * - event: EventItem — 事件数据
 *
 * Emits:
 * - toggle-follow — 切换关注状态
 * - view-detail — 查看详情
 * - view-news — 查看新闻原文
 *
 * 视觉层已对齐组件库：Card 容器 + Rate 重要性 + Tag 来源标签 + SvgIcon 图标。
 */
import { computed } from 'vue'
import type { EventItem } from '../types'
import { EVENT_TYPE_COLORS } from '../constants'
import { Card, Button, Tag, Badge } from '@/shared/components'
import Rate from '@/shared/components/Rate.vue'

// ========== Props ==========

interface Props {
  event: EventItem
}

const props = defineProps<Props>()

// ========== Emits ==========

defineEmits<{
  'toggle-follow': [event: EventItem]
  'view-detail': [event: EventItem]
  'view-news': [event: EventItem]
}>()

// ========== 设计令牌（避免硬编码颜色） ==========

// typeColor 兜底色用于内联 style，无法使用 SCSS 变量

// ========== 计算属性 ==========

/** 事件类型颜色（按类型映射） */
const typeColor = computed(() => {
  return EVENT_TYPE_COLORS[props.event.eventType] || { bg: '#f0f2f5', text: '#4b5a7a' }
})

/** 来源标签文案 */
const sourceLabel = computed(() => {
  return props.event.sourceInfo?.name || props.event.source || '来源暂不可验证'
})

/** 来源是否可验证：无可验证来源时用 warning 色提示，否则用 neutral */
const sourceTagType = computed<'neutral' | 'warning'>(() => {
  return props.event.sourceInfo?.name || props.event.source ? 'neutral' : 'warning'
})

/** 按 impactLevel 降序取前5个行业 */
const top5Industries = computed(() => {
  return [...props.event.affectedIndustries]
    .sort((a, b) => b.impactLevel - a.impactLevel)
    .slice(0, 5)
})

// ========== 工具函数 ==========

/** 格式化发布时间 */
function formatTime(time: string): string {
  if (!time) return ''
  const d = new Date(time)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time.slice(11, 16)}`
}
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

/* Card 容器覆盖：恢复事件卡的紧凑内边距与圆角 */
.event-card.as-card {
  padding: 20rpx 22rpx;
  border-radius: $r-lg;
  background: $bg-card;
  border: 2rpx solid $line;
  box-shadow: $shadow-xs;
}

.event-card {
  /* 兜底，确保根节点表现为块级卡片 */
  display: block;
}

/* ========== 第一行：事件类型 + 时间 + 重要程度 ========== */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.card-type {
  font-size: 20rpx;
  font-weight: 600;
  padding: 4rpx 14rpx;
  border-radius: $r-xs;
  letter-spacing: 0.5rpx;
}

.card-time {
  font-size: 20rpx;
  color: $ink-mute;
}

/* ========== 标题（最多2行，超出省略） ========== */
.card-title {
  font-size: $font-size-md;
  font-weight: 600;
  color: $ink;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12rpx;
  transition: color $t-fast;
  -webkit-tap-highlight-color: transparent;
}

.card-title:active {
  color: $primary;
}

/* ========== AI 摘要（最多2行，超出省略） ========== */
.card-ai-summary {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  min-width: 0;
  padding: 10rpx 14rpx;
  background: linear-gradient(135deg, $primary-50, rgba($primary, 0.05));
  border-radius: $r-sm;
  border-left: 4rpx solid $primary;
  margin-bottom: 12rpx;
}

/* AI 徽标：外观由 Badge 组件管理，此处仅保留定位 */
.ai-badge {
  flex-shrink: 0;
  margin-top: 2rpx;
}

.ai-text {
  flex: 1;
  font-size: $font-size-xs;
  color: $ink-soft;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ========== Top5 影响行业（最多5个：横向滑动一行展示，名称不压缩，隐藏滚动条） ========== */
.card-top5 {
  width: 100%;
  white-space: nowrap;
  margin-bottom: 12rpx;
}

/* 内层 flex 行容器：承载横向布局，宽度超出即产生横向滚动 */
.card-top5-inner {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 6rpx;
}

.top5-item {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  font-size: 22rpx;
  font-weight: 600;
  line-height: 1.5;
  padding: 4rpx 12rpx;
  border-radius: $r-xs;
  white-space: nowrap;
}

.t5-arrow {
  margin-left: 2rpx;
  font-weight: 700;
  font-size: 18rpx;
}

.t5-bullish {
  background: $up-soft;
  border: 1px solid rgba($up, 0.15);
  color: $up;
}

.t5-bearish {
  background: $down-soft;
  border: 1px solid rgba($down, 0.15);
  color: $down;
}

.t5-neutral {
  background: $bg-deep;
  border: 1px solid rgba($ink-faint, 0.1);
  color: $ink-mute;
}

/* ========== 底部：AI 摘要 + 操作按钮 ========== */
.card-bottom {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding-top: 10rpx;
  border-top: 1px solid $line;
}

/* 按钮组 */
.card-actions {
  display: flex;
  gap: 8rpx;
  flex-shrink: 0;
}

/* 关注按钮：ghost 类型，followed 时切换为 warning 配色 */
.follow-btn.as-btn {
  height: auto;
  padding: 8rpx 16rpx;
  border-radius: $r-full;
}

.follow-btn.as-btn--ghost.followed {
  background: $warning-soft;
  color: $warning;
}

/* 查看详情按钮：primary 类型，覆写为紧凑圆角胶囊 */
.detail-btn.as-btn {
  height: auto;
  padding: 8rpx 18rpx;
  border-radius: $r-full;
}
</style>
