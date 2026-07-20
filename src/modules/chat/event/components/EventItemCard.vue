<template>
  <view class="event-card">
    <!-- 第一行：事件类型 + 来源 + 时间 + 重要程度 -->
    <view class="card-header">
      <view class="header-left">
        <text class="card-type" :style="{ color: typeColor.text, background: typeColor.bg }">
          {{ event.eventType }}
        </text>
        <text class="card-source" :class="{ 'source-unverified': !event.sourceInfo?.name && !event.source }">
          {{ event.sourceInfo?.name || event.source || '来源暂不可验证' }}
        </text>
        <text class="card-time">{{ formatTime(event.publishTime) }}</text>
      </view>
      <ImportanceStars :level="event.importance" :size="18" />
    </view>

    <!-- 事件标题（最多2行，点击跳转新闻） -->
    <text class="card-title" @tap.stop="$emit('view-news', event)">{{ event.title }}</text>

    <!-- Top5 影响行业（排序后取前5，不换行） -->
    <view class="card-top5">
      <text
        v-for="ind in top5Industries"
        :key="ind.name"
        class="top5-item"
        :class="'t5-' + ind.sentiment"
      >
        {{ ind.name }}<text class="t5-arrow">{{ ind.sentiment === 'bullish' ? '↑' : ind.sentiment === 'bearish' ? '↓' : '→' }}</text>
      </text>
    </view>

    <!-- AI 摘要 + 操作按钮 -->
    <view class="card-bottom">
      <view class="card-ai-summary" v-if="event.aiSummary">
        <text class="ai-badge">AI</text>
        <text class="ai-text">{{ event.aiSummary }}</text>
      </view>
      <view class="card-actions">
        <view
          class="follow-btn"
          :class="{ followed: event.isFollowed }"
          @tap.stop="$emit('toggle-follow', event)"
        >
          <text class="follow-text">{{ event.isFollowed ? '✓ 已关注' : '+ 关注' }}</text>
        </view>
        <view class="detail-btn" @tap.stop="$emit('view-detail', event)">
          <view class="robot-avatar">
            <SvgIcon name="robot-line" size="28rpx" color="#4d7cfe" />
          </view>
          <text class="detail-text">AI解析 ›</text>
        </view>
      </view>
    </view>
  </view>
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
 */
import { computed } from 'vue'
import type { EventItem } from '../types'
import { EVENT_TYPE_COLORS } from '../constants'
import ImportanceStars from './ImportanceStars.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

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

/** 事件类型颜色（按类型映射） */
const typeColor = computed(() => {
  return EVENT_TYPE_COLORS[props.event.eventType] || { bg: '#f0f2f5', text: '#6b7280' }
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

<style scoped>
.event-card {
  background: var(--ev-bg-card);
  border-radius: 20rpx;
  padding: 20rpx 22rpx;
  border: 1px solid var(--ev-border);
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
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
  border-radius: 5rpx;
  letter-spacing: 0.5rpx;
}

.card-time {
  font-size: 20rpx;
  color: var(--ev-text-muted);
}

.card-source {
  font-size: 20rpx;
  color: var(--ev-text-muted);
}

.source-unverified {
  font-style: italic;
  color: var(--ev-text-tertiary);
  opacity: 0.7;
}

/* ========== 标题（最多2行，超出省略） ========== */
.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--ev-text-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12rpx;
  transition: color 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.card-title:active {
  color: var(--ev-accent);
}

/* ========== AI 摘要（最多2行，超出省略） ========== */
.card-ai-summary {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  padding: 10rpx 14rpx;
  background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(59,130,246,0.05));
  border-radius: 10rpx;
  border-left: 4rpx solid var(--ev-accent);
  margin-bottom: 12rpx;
}

.ai-badge {
  flex-shrink: 0;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: var(--ev-accent);
  color: #FFFFFF;
  font-size: 16rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  margin-top: 2rpx;
}

.ai-text {
  flex: 1;
  font-size: 22rpx;
  color: var(--ev-text-tertiary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ========== Top5 影响行业 ========== */
.card-top5 {
  display: flex;
  flex-wrap: nowrap;
  gap: 6rpx;
  margin-bottom: 12rpx;
  overflow: hidden;
}

.top5-item {
  font-size: 20rpx;
  font-weight: 600;
  padding: 4rpx 12rpx;
  border-radius: 5rpx;
  white-space: nowrap;
  flex-shrink: 0;
}

.t5-arrow {
  margin-left: 2rpx;
  font-weight: 700;
  font-size: 18rpx;
}

.t5-bullish {
  background: rgba(244, 63, 94, 0.08);
  border: 1px solid rgba(244, 63, 94, 0.15);
  color: #F43F5E;
}

.t5-bearish {
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.15);
  color: #22C55E;
}

.t5-neutral {
  background: var(--ev-border);
  border: 1px solid rgba(148, 163, 184, 0.1);
  color: var(--ev-text-tertiary);
}

/* ========== 底部：AI 摘要 + 操作按钮 ========== */
.card-bottom {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding-top: 10rpx;
  border-top: 1px solid var(--ev-border);
}

/* AI 摘要 */
.card-ai-summary {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  min-width: 0;
}

.ai-badge {
  flex-shrink: 0;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: var(--ev-accent);
  color: #FFFFFF;
  font-size: 16rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  margin-top: 2rpx;
}

.ai-text {
  flex: 1;
  font-size: 22rpx;
  color: var(--ev-text-tertiary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 按钮组 */
.card-actions {
  display: flex;
  gap: 8rpx;
  flex-shrink: 0;
}
.follow-btn {
  padding: 8rpx 16rpx;
  border-radius: 9999rpx;
  border: 1px solid rgba(148, 163, 184, 0.15);
  transition: all 0.2s;
}

.follow-text {
  font-size: 20rpx;
  font-weight: 500;
  color: var(--ev-text-tertiary);
  white-space: nowrap;
}

.follow-btn.followed {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.25);
}

.follow-btn.followed .follow-text {
  color: var(--ev-warning);
}

/* 查看详情按钮 */
.detail-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 18rpx 8rpx 12rpx;
  border-radius: 9999rpx;
  background: var(--ev-blue-gradient);
  box-shadow: 0 2rpx 10rpx var(--ev-blue-shadow);
  transition: all 0.2s;
}

.detail-btn:active {
  opacity: 0.85;
  transform: scale(0.97);
}

/* 机器人头像 */
.robot-avatar {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(59,130,246,0.15));
  border: 1px solid rgba(99,102,241,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  animation: avatar-pulse 2s ease-in-out infinite;
}

@keyframes avatar-pulse {
  0%, 100% { box-shadow: 0 0 0 rgba(99,102,241,0.2); }
  50% { box-shadow: 0 0 10rpx rgba(99,102,241,0.4); }
}

.robot-face {
  font-size: 16rpx;
  line-height: 1;
}

.detail-text {
  font-size: 20rpx;
  font-weight: 500;
  color: #FFFFFF;
  white-space: nowrap;
}
</style>
