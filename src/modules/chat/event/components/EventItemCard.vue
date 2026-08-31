<template>
  <Card class="event-card" flat clickable @click="$emit('view-detail', event)">
    <!-- 第一行：事件类型 + 来源 + 时间 + 重要程度 -->
    <view class="card-header">
      <view class="header-left">
        <Tag v-if="event.eventType" type="gray" size="sm" class="card-type-tag">
          {{ event.eventType }}
        </Tag>
        <Tag size="sm" :type="sourceTagType" :class="sourceTagType === 'gray' ? 'source-tag-muted' : ''">
          {{ sourceLabel }}
        </Tag>
        <text class="card-time">{{ formatDateTime(event.publishTime) }}</text>
      </view>
      <!-- 重要程度星级：由 chain 最大 impactStrength 映射；无有效评分时隐藏（不显示假评分） -->
      <Rate v-if="event.importance" :modelValue="event.importance" :readonly="true" type="gold" size="18rpx" :gap="2" />
    </view>

    <!-- 事件标题（最多2行，点击跳转新闻） -->
    <text class="card-title" @click.stop="$emit('view-news', event)">{{ event.title }}</text>

    <!-- Top5 影响行业（排序后取前5，横向滑动查看完整名称，隐藏滚动条；空数据展示降级文案） -->
    <scroll-view scroll-x :show-scrollbar="false" class="card-top5">
      <!-- uni-app scroll-view 内部有 .uni-scroll-view-content 包裹层，
           横向滚动必须由内层容器承载 flex 行布局（外层直接 flex 无效） -->
      <view class="card-top5-inner">
        <text v-if="top5Industries.length === 0" class="top5-empty">暂无明确行业影响</text>
        <Tag
          v-for="ind in top5Industries"
          :key="ind.name"
          type="gray"
          class="t5-tag"
        >
          <text>{{ ind.name }}</text>
          <text class="t5-arrow" :class="'t5-arrow--' + ind.sentiment">
            {{ ind.sentiment === 'bullish' ? '↑' : ind.sentiment === 'bearish' ? '↓' : '→' }}
          </text>
        </Tag>
      </view>
    </scroll-view>

    <!-- AI 摘要 + 操作按钮 -->
    <view class="card-bottom">
      <view class="card-ai-summary" v-if="event.aiSummary">
        <InsightTag type="event" size="sm" class="ai-badge">洞见</InsightTag>
        <text class="ai-text">{{ event.aiSummary }}</text>
      </view>
      <view class="card-actions">
        <Button
          type="secondary"
          size="sm"
          class="follow-btn"
          :class="{ followed: event.isFollowed }"
          @click.stop="$emit('toggle-follow', event)"
        >
          {{ event.isFollowed ? '已关注' : '关注' }}
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
import { formatDateTime } from '@/shared/utils/datetime'
import { Card, Button, Tag, InsightTag } from '@/shared/components'
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

// ========== 计算属性 ==========

/** 来源标签文案 */
const sourceLabel = computed(() => {
  return props.event.sourceInfo?.name || props.event.source || '来源暂不可验证'
})

/** 来源是否可验证：无可验证来源时用 warning 色提示，否则用中性灰 gray */
const sourceTagType = computed<'gray' | 'warning'>(() => {
  return props.event.sourceInfo?.name || props.event.source ? 'gray' : 'warning'
})

/** 按 impactLevel 降序取前5个行业 */
const top5Industries = computed(() => {
  return [...props.event.affectedIndustries]
    .sort((a, b) => b.impactLevel - a.impactLevel)
    .slice(0, 5)
})
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

/* 事件类型：复用 <Tag type="gray"> 中性标签，不再按事件类型渲染多色 */
.card-type-tag {
  flex-shrink: 0;
}

/* 事件类型 / 可验证来源 / 行业 标签统一白底，与卡片底色一致（覆盖 Tag gray 的 $bg-soft 浅灰） */
.card-type-tag,
.source-tag-muted,
.t5-tag {
  background: $bg-card !important;
}

/* 事件类型文字：class 合并到 Tag 根节点，需命中内部的 .as-tag__text（后代）才生效；
   统一为 $ink-mute(22rpx/400)，覆盖 Tag 默认更深的 $ink-soft 与 sm 的 20rpx/600 */
.card-type-tag :deep(.as-tag__text) {
  font-size: $font-size-xs;
  font-weight: 400;
  color: $ink-mute;
}

/* 来源标签：同样命中内部的 .as-tag__text，统一为 $ink-mute(22rpx/400) */
.source-tag-muted :deep(.as-tag__text) {
  font-size: $font-size-xs;
  font-weight: 400;
  color: $ink-mute;
}

.card-time {
  font-size: $font-size-xs; /* 22rpx，与事件类型/来源同一字号 */
  font-weight: 400;
  color: $ink-mute; /* 与来源/事件类型/洞见摘要同一灰阶 */
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
  align-items: center; /* 洞见之眼 logo 与右侧一句话横向居中对齐 */
  gap: 8rpx;
  min-width: 0;
  padding: 10rpx 14rpx;
  background: $bg-card; /* 与事件卡片一致的白底，去掉浅蓝底 */
  border-radius: $r-sm;
  border-left: 4rpx solid $primary;
  margin-bottom: 12rpx;
}

/* AI 洞见徽标：复用 InsightTag，缩小胶囊与瞳孔，保持与一句话水平对齐 */
.card-ai-summary .ai-badge {
  flex-shrink: 0;
  padding: 2rpx 10rpx;
  font-size: 20rpx;
  line-height: 1;
}

.card-ai-summary .ai-badge :deep(.as-insight-tag__eye) {
  width: 18rpx;
  height: 18rpx;
}

.ai-text {
  flex: 1;
  font-size: $font-size-xs;
  color: $ink-mute; /* 洞见一句话总结与事件类型/来源/时间同一灰阶 */
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

/* 空行业降级文案（情况3：chain 为空时展示，不暴露系统内部异常） */
.top5-empty {
  font-size: 22rpx;
  font-weight: 500;
  color: $ink-mute;
  white-space: nowrap;
}

/* 行业标签：复用 <Tag type="gray"> 中性容器（浅底灰黑字），不按涨跌染色 */
.t5-tag {
  flex-shrink: 0;
  white-space: nowrap;
}

/* 方向箭头：位于行业名右侧；保留小面积语义色（涨红 / 跌绿 / 中性灰），行业名保持中性 */
.t5-arrow {
  margin-left: 4rpx;
  font-weight: 700;
  font-size: 18rpx;
}

.t5-arrow--bullish { color: $up; }
.t5-arrow--bearish { color: $down; }
.t5-arrow--neutral { color: $ink-mute; }

/* ========== 底部：AI 摘要 + 操作按钮 ========== */
.card-bottom {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding-top: 10rpx;
  border-top: 1px solid $line;
}

/* 按钮组：靠右对齐（洞见摘要缺省时也贴右缘） */
.card-actions {
  display: flex;
  gap: 8rpx;
  flex-shrink: 0;
  margin-left: auto;
}

/* 关注按钮：secondary 类型（组件库灰色字 + 灰色细边框圆角），followed 时切 warning 配色 */
.follow-btn.as-btn {
  height: auto;
  padding: 8rpx 16rpx;
  border-radius: $r-full;
}

.follow-btn.as-btn--secondary.followed {
  background: $warning-soft;
  color: $warning;
}
</style>
