<template>
  <SubPageCard title="事件传导">
    <view class="event-chain-page">
      <!-- AI 关注焦点区域 -->
      <view class="ai-focus-section">
        <text class="section-title">重大事件</text>
        <!-- 动态布局：1 个重大事件 → 单卡全宽；>= 2 个 → 左右双卡 -->
        <view :class="headlineCount === 1 ? 'headline-single' : 'headline-cards'">
          <EventHeadlineCard
            v-if="headlinePositive"
            type="positive"
            :title="headlinePositive.title"
            :importance="(headlinePositive.importance ?? 0) >= 4 ? 'major' : 'normal'"
            :industries="headlinePositive.affectedIndustries"
            :event-id="headlinePositive.eventId"
            @click="handleHeadlineClick"
          />
          <EventHeadlineCard
            v-if="headlineNegative"
            type="negative"
            :title="headlineNegative.title"
            :importance="(headlineNegative.importance ?? 0) >= 4 ? 'major' : 'normal'"
            :industries="headlineNegative.affectedIndustries"
            :event-id="headlineNegative.eventId"
            @click="handleHeadlineClick"
          />
        </view>
      </view>

      <!-- 分隔线 -->
      <view class="section-divider" />

      <!-- 全部事件列表 -->
      <view class="all-events-section">
        <text class="section-title">全部事件</text>

        <!-- 分类Tab -->
        <scroll-view scroll-x class="tab-scroll" :show-scrollbar="false">
          <Segmented :modelValue="activeType" :items="tabItems" @change="(v: string | number) => handleFilterChange(String(v))" />
        </scroll-view>

        <!-- 加载中 -->
        <view v-if="loading && events.length === 0" class="state-container">
          <text class="state-text">加载中...</text>
        </view>

        <!-- 空状态 -->
        <view v-else-if="isEmpty" class="state-container">
          <SvgIcon name="inbox-line" size="64rpx" color="#9ca3af" />
          <text class="state-text">暂无事件数据</text>
          <view class="retry-btn" @tap="refresh">
            <text class="retry-text">点击刷新</text>
          </view>
        </view>

        <!-- 错误状态 -->
        <view v-else-if="error" class="state-container">
          <SvgIcon name="error-warning-line" size="64rpx" color="#ef4444" />
          <text class="state-text error-text">{{ error }}</text>
          <view class="retry-btn" @tap="refresh">
            <text class="retry-text">重试</text>
          </view>
        </view>

        <!-- 事件列表 -->
        <template v-else>
          <view class="event-list">
            <EventItemCard
              v-for="event in events"
              :key="event.eventId"
              :event="event"
              @view-detail="goToDetail"
              @view-news="goToNews"
              @toggle-follow="handleFollow"
            />
          </view>

          <!-- 加载更多 -->
          <view class="load-more-area">
            <view v-if="loading" class="load-more-btn">
              <text class="load-more-text">加载中...</text>
            </view>
            <view v-else-if="hasMore" class="load-more-btn" @tap="loadMore">
              <text class="load-more-text">加载更多</text>
            </view>
            <view v-else-if="events.length > 0" class="load-more-btn">
              <text class="load-more-text done-text">— 已加载全部 {{ total }} 条事件 —</text>
            </view>
          </view>
        </template>
      </view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
/**
 * 事件传导页面
 *
 * 页面结构：
 * - AI 关注焦点区域（顶部高亮卡片）
 * - 全部事件列表（真实事件数据）
 */
import { onMounted, computed } from 'vue'
import type { EventItem } from '@/modules/chat/event/types'
import { useEventList } from '@/modules/chat/event/composables/useEventList'
import { useEventFollow } from '@/modules/chat/event/composables/useEventFollow'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import Segmented from '@/shared/components/Segmented.vue'
import EventItemCard from '@/modules/chat/event/components/EventItemCard.vue'
import EventHeadlineCard from '@/modules/chat/event/components/EventHeadlineCard.vue'
import { EVENT_TYPES } from '@/modules/chat/event/constants'

// ========== 分类 Tab 项（全部 + 事件类型，对齐 Segmented items 格式） ==========
const tabItems = [{ label: '全部', value: '全部' }, ...EVENT_TYPES.map(v => ({ label: v, value: v }))]

// ========== Composables ==========
const {
  events,
  loading,
  error,
  total,
  hasMore,
  isEmpty,
  activeType,
  refresh,
  loadMore,
  setEventType,
  updateFollowStatus,
} = useEventList()

const { toggleFollow } = useEventFollow()

// ========== 重大事件（从真实事件列表派生） ==========

/** 判断事件整体方向：利好行业占比高 → positive，利空占比高 → negative */
function eventDirection(event: EventItem): 'positive' | 'negative' | null {
  const industries = event.affectedIndustries
  if (!industries.length) return null
  const bullish = industries.filter((i) => i.sentiment === 'bullish').length
  const bearish = industries.filter((i) => i.sentiment === 'bearish').length
  if (bullish > bearish) return 'positive'
  if (bearish > bullish) return 'negative'
  return null
}

/** 从事件列表派生重大事件：取 importance >= 4 的事件，按方向分组取第一条 */
const headlinePositive = computed<EventItem | null>(() => {
  return (
    events.value
      .filter((e) => (e.importance ?? 0) >= 4 && eventDirection(e) === 'positive')
      .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))[0] ?? null
  )
})

const headlineNegative = computed<EventItem | null>(() => {
  return (
    events.value
      .filter((e) => (e.importance ?? 0) >= 4 && eventDirection(e) === 'negative')
      .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))[0] ?? null
  )
})

/** 重大事件卡片数量（0/1/2），驱动单卡全宽 / 双卡布局 */
const headlineCount = computed(() => {
  return (headlinePositive.value ? 1 : 0) + (headlineNegative.value ? 1 : 0)
})

// ========== 生命周期 ==========
onMounted(() => {
  refresh()
})

// ========== 事件处理 ==========

/** 重大事件卡片点击 → 进入 APP 原文详情页（与列表标题跳转一致，不依赖 WebView） */
function handleHeadlineClick(eventId: string) {
  uni.navigateTo({
    url: `/pages-sub-app/event-article/index?eventId=${eventId}`
  })
}

/** 事件类型筛选切换 */
function handleFilterChange(value: string) {
  setEventType(value)
}

/** 跳转详情 */
function goToDetail(event: EventItem) {
  uni.navigateTo({
    url: `/modules/chat/pages/event/detail?id=${event.eventId}`,
  })
}

/** 点击事件标题 → 进入 APP 原文详情页（不跳外部网页，不依赖 WebView） */
function goToNews(event: EventItem) {
  uni.navigateTo({
    url: `/pages-sub-app/event-article/index?eventId=${event.eventId}`,
  })
}

/** 关注/取消关注 */
async function handleFollow(event: EventItem) {
  const success = await toggleFollow(event.eventId, event.isFollowed)
  if (success) {
    updateFollowStatus(event.eventId, !event.isFollowed)
  }
}
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

.event-chain-page {
  padding: 0 $spacing-lg $spacing-lg;
}

// ========== 分类 Tab 滚动容器（Segmented 不自带横向滚动，7 个分类需滚动） ==========
.tab-scroll {
  width: 100%;
  white-space: nowrap;
  padding: 16rpx 0 8rpx;
}

.tab-scroll :deep(.as-segmented) {
  display: inline-flex;
}

// ========== AI 关注焦点区域 ==========
.ai-focus-section {
  margin-bottom: $spacing-sm;
}

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 10rpx;
  letter-spacing: 0.5rpx;
}

.headline-cards {
  display: flex;
  flex-direction: column; /* 最大利好 / 最大利空 纵向排列 */
  min-width: 0;
  /* 卡片间距用 margin 实现（见下方），不依赖 flex gap（部分旧 Android WebView 不渲染 gap） */
}

/* 双卡纵向排列：第二张卡片起顶部留 8rpx 间距 */
.headline-cards :deep(.headline-card + .headline-card) {
  margin-top: 8rpx;
}

/* 单个重大事件：单卡占满内容宽度（EventHeadlineCard 根节点 flex:1 自动填充） */
.headline-single {
  display: flex;
}

// ========== 分隔线 ==========
.section-divider {
  height: 1px;
  background: $border-color;
  margin: $spacing-lg 0;
}

// ========== 全部事件列表 ==========
.all-events-section {
  // 无额外样式
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

// ========== 状态容器 ==========
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx $spacing-lg;
}

.state-text {
  font-size: $font-size-base;
  color: $text-color-secondary;
  margin: $spacing-base 0;
}

.error-text {
  color: $error-color;
}

.retry-btn {
  padding: $spacing-sm $spacing-lg;
  border-radius: $radius-pill;
  background: rgba($brand-color, 0.1);
  border: 1px solid $brand-color;
}

.retry-text {
  font-size: $font-size-sm;
  color: $brand-color;
  font-weight: 500;
}

// ========== 加载更多 ==========
.load-more-area {
  padding: $spacing-base;
  display: flex;
  justify-content: center;
}

.load-more-btn {
  padding: $spacing-sm $spacing-lg;
  border-radius: $radius-pill;
  background: rgba($brand-color, 0.1);
  border: 1px solid $border-color;
}

.load-more-btn:active {
  background: rgba($brand-color, 0.15);
}

.load-more-text {
  font-size: $font-size-sm;
  color: $brand-color;
  font-weight: 500;
}

.done-text {
  color: $text-color-secondary;
}
</style>