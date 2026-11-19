<template>
  <SubPageCard title="事件传导">
    <view class="event-list-content">
      <!-- AI关注焦点区域：标题行（含关注 / 时间轴入口）始终显示，卡片仅在有焦点事件时渲染 -->
      <view class="ai-focus-section">
        <!-- 标题行：重大事件（左）+ 关注/时间轴入口（行最右，胶囊按钮） -->
        <view class="section-title-row">
          <text class="section-title">重大事件</text>
          <view class="section-entries">
            <!-- 关注 / 时间轴合并为一个分段控件：单一胶囊外轮廓 + 内部细分割线，两段统一主题蓝。
                 关注数量以右上角角标呈现，0 件时不渲染角标（避免被误认为未读提醒）。
                 仍用 v-if/v-else 两个带 key 的节点整体切态：实测同一节点只刷新文案、
                 动态 class 与图标未跟随，整节点重建可确保配色和图标同步切换 -->
            <view class="seg">
              <view
                v-if="followedCountValue > 0"
                key="followed"
                class="seg-item seg-item--badged"
                @tap.stop="goToFollowed"
              >
                <SvgIcon name="bookmark-fill" size="24rpx" color="#0b5fff" />
                <text class="seg-text">已关注</text>
                <view class="seg-badge">{{ followedCountValue }}</view>
              </view>
              <view v-else key="unfollowed" class="seg-item" @tap.stop="goToFollowed">
                <SvgIcon name="bookmark-line" size="24rpx" color="#0b5fff" />
                <text class="seg-text">关注</text>
              </view>
              <view class="seg-split" />
              <view class="seg-item" @tap.stop="goToTimeline">
                <SvgIcon name="calendar-line" size="24rpx" color="#0b5fff" />
                <text class="seg-text">时间轴</text>
              </view>
            </view>
          </view>
        </view>
        <!-- 固定左利好/右利空；单一时单卡全宽，不保留空白卡位 -->
        <view v-if="focusEvents.length > 0" :class="headlineCount === 1 ? 'headline-single' : 'headline-cards'">
          <EventHeadlineCard
            v-if="positiveEvent"
            type="positive"
            :title="positiveEvent.title"
            :importance="positiveEvent.importance"
            :industries="positiveEvent.affectedIndustries ?? []"
            :event-id="positiveEvent.eventId"
            :source-info="positiveEvent.sourceInfo"
            @click="handleHeadlineClick"
            @view-news="goToNewsFromHeadline"
          />
          <EventHeadlineCard
            v-if="negativeEvent"
            type="negative"
            :title="negativeEvent.title"
            :importance="negativeEvent.importance"
            :industries="negativeEvent.affectedIndustries ?? []"
            :event-id="negativeEvent.eventId"
            :source-info="negativeEvent.sourceInfo"
            @click="handleHeadlineClick"
            @view-news="goToNewsFromHeadline"
          />
        </view>
      </view>

      <!-- 自选股相关事件卡片：位于重大事件卡片下方，固定展示 3 条、其余内部滚动；标题行始终渲染 -->
      <FavoriteRelatedCard :rows="favoriteRelatedRows" />

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
  </SubPageCard>
</template>

<script setup lang="ts">
/**
 * 事件传导 — 子页面
 *
 * 从早点听卡片入口进入，展示 AI 事件影响链分析。
 * 支持分类筛选、分页加载、关注事件。
 */
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import type { EventItem } from '@/modules/chat/event/types'
import type { FocusEventViewModel } from '@/modules/chat/event/types'
import { useEventList } from '@/modules/chat/event/composables/useEventList'
import { useEventFollow } from '@/modules/chat/event/composables/useEventFollow'
import { getFocusEvents } from '@/modules/chat/event/api/eventService'
import { loadFavoriteRelatedEvents } from '@/modules/chat/event/favoriteRelated'
import type { RelatedEventRow } from '@/modules/chat/event/favoriteRelated'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import Segmented from '@/shared/components/Segmented.vue'
import EventItemCard from '@/modules/chat/event/components/EventItemCard.vue'
import EventHeadlineCard from '@/modules/chat/event/components/EventHeadlineCard.vue'
import FavoriteRelatedCard from '@/modules/chat/event/components/FavoriteRelatedCard.vue'
import { EVENT_TYPES } from '@/modules/chat/event/constants'
import { followRevision, followedCount, isEventFollowed } from '@/modules/chat/event/eventFollowStore'

// ========== 分类 Tab 项（全部 + 事件类型，对齐 Segmented items 格式） ==========
const tabItems = [{ label: '全部', value: '全部' }, ...EVENT_TYPES.map(v => ({ label: v, value: v }))]

// ========== 重大事件（基于 Global Importance 排序，由 eventService 提供） ==========
const focusEvents = ref<FocusEventViewModel[]>([])

// ========== 自选股相关事件（独立拉取，不干扰主列表分页） ==========
const favoriteRelatedRows = ref<RelatedEventRow[]>([])

/** 加载自选股相关事件：未登录 / 无自选股 / 无相关事件时为空数组（卡片不渲染） */
async function loadFavoriteRelated() {
  favoriteRelatedRows.value = await loadFavoriteRelatedEvents()
}

/** 左卡 = 利好事件（positive），右卡 = 利空事件（negative）；忽略 mixed */
const positiveEvent = computed(() => focusEvents.value.find(e => e.direction === 'positive') ?? null)
const negativeEvent = computed(() => focusEvents.value.find(e => e.direction === 'negative') ?? null)

/** 重大事件卡片数量（0/1/2），驱动单卡全宽 / 双卡布局 */
const headlineCount = computed(() => (positiveEvent.value ? 1 : 0) + (negativeEvent.value ? 1 : 0))

/**
 * 加载重大事件：调用 getFocusEvents() 获取 rank=1（当前焦点）和 rank=2（持续影响）的事件
 * 数据流（第三阶段）：getEventList（直出 chain_summary）→ adapter 生成 affectedIndustries → getFocusEvents 直接消费，不再请求详情
 */
async function loadFocusEvents() {
  try {
    focusEvents.value = await getFocusEvents()
  } catch (error) {
    console.error('加载重大事件失败:', error)
  }
}

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

/** 已关注条数（「关注/已关注 · N」入口角标）
 *
 * 用 computed 订阅 followRevision：关注写入（本页卡片、关注页取关、详情页关注）
 * 都会自增版本号，角标随存储真值自动重算，不依赖各调用点手动同步。
 */
const followedCountValue = computed(() => {
  void followRevision.value
  return followedCount()
})

// ========== 生命周期 ==========
onMounted(() => {
  refresh()
  loadFocusEvents()
  loadFavoriteRelated()
})

// 从关注页返回时可能已取关：不重新拉接口，只用本地真实状态校正内存中的卡片
onShow(() => {
  events.value.forEach((event) => {
    updateFollowStatus(event.eventId, isEventFollowed(event.eventId))
  })
})

// ========== 事件处理 ==========

/** AI 今日精选卡片点击 - 跳转到事件详情页 */
function handleHeadlineClick(eventId: string) {
  uni.navigateTo({
    url: `/modules/chat/pages/event/detail?id=${eventId}`
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

/** 跳转重大事件时间线（按事件发生时间组织，含未来事件） */
function goToTimeline() {
  uni.navigateTo({
    url: '/modules/chat/pages/event/timeline',
  })
}

/** 跳转「事件关注」聚合页（本地快照，类比收藏夹） */
function goToFollowed() {
  uni.navigateTo({
    url: '/modules/chat/pages/event/followed',
  })
}

/** 点击事件标题 → 跨端跳转原文：H5 新标签打开，APP 内 web-view 打开；无链接友好提示 */
function goToNews(event: EventItem) {
  const url = event.sourceInfo?.url
  openNewsUrl(url)
}

/** 重大事件卡片标题 → 跳转原文（已校验过 URL，直接打开） */
function goToNewsFromHeadline(url: string) {
  openNewsUrl(url)
}

/** 跨端打开原文链接：H5 新标签，APP 内 web-view；无链接友好提示 */
function openNewsUrl(url?: string) {
  if (!url) {
    uni.showToast({ title: '暂无原文链接', icon: 'none' })
    return
  }
  // #ifdef H5
  window.open(url, '_blank')
  // #endif
  // #ifndef H5
  uni.navigateTo({ url: `/pages-sub-app/webview/index?url=${encodeURIComponent(url)}` })
  // #endif
}

/** 关注/取消关注（toggleFollow 返回切换后的真实状态；角标由 followRevision 自动联动） */
async function handleFollow(event: EventItem) {
  const followed = await toggleFollow(event)
  updateFollowStatus(event.eventId, followed)
}
</script>

<style scoped>
.event-list-content {
  padding: 0 32rpx 40rpx;
}

/* 分类 Tab 滚动容器（Segmented 不自带横向滚动，7 个分类需滚动） */
.tab-scroll {
  width: 100%;
  white-space: nowrap;
  padding: 16rpx 12rpx 8rpx;
  background: #e6eef9; /* 浅蓝背景横贯整行，覆盖全部事件类型标签（含右侧需滚动到的「监管变化/公司公告」） */
  border-radius: 16rpx;
}

.tab-scroll :deep(.as-segmented) {
  display: inline-flex;
  flex-direction: row;
  flex-wrap: nowrap;
  background: transparent; /* 背景移交 .tab-scroll，避免只包内容宽度 */
}

.tab-scroll :deep(.as-segmented__item) {
  flex-shrink: 0;
  white-space: nowrap;
}

/* 事件类型筛选：选中态文字由主题蓝改为行业标签灰 $ink-soft (#4b5a7a) */
.tab-scroll :deep(.as-segmented__item.is-active) {
  color: #4b5a7a;
}

/* ========== AI 关注焦点区域 ========== */
.ai-focus-section {
  margin-bottom: 20rpx;
}

/* 标题行：重大事件（左）+ 关注/时间轴入口（行最右，space-between 撑满整行） */
.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #1A1A1A;
  letter-spacing: 0.5rpx;
}

/* 标题行右侧入口组：关注 / 时间轴合并为一个分段控件（行本身不可点，两段各自独立热区） */
.section-entries {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* 分段控件：单一胶囊外轮廓包住两个入口，内部用细分割线区分。
   两段统一使用主题蓝，避免两套色系并排后色块打架。
   1rpx 在高 DPI 下会被渲染成 0.5px，描边发虚导致轮廓感弱，故用 2rpx 实描边；
   再加一层极轻投影把控件从白色卡片背景上托起来 */
.seg {
  display: flex;
  align-items: center;
  padding: 6rpx;
  background: #ffffff;
  border: 2rpx solid #d9e3f2;
  border-radius: 9999rpx;
  box-shadow: 0 2rpx 8rpx rgba(11, 95, 255, 0.06);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

/* 单个分段：独立热区；position 供右上角数量角标定位。
   过渡 + hover/active 让用户明确感知"这里可以点" */
.seg-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 18rpx;
  border-radius: 9999rpx;
  transition: background-color 0.15s ease, transform 0.12s ease;
}

/* 已关注态：右侧留出角标空间，避免圆形角标压到「已关注」文字右上角 */
.seg-item--badged {
  padding-right: 22rpx;
}

/* hover 只在支持悬停的设备（H5 桌面鼠标）生效，避免触屏端出现 sticky hover */
@media (hover: hover) {
  .seg-item:hover {
    background: rgba(11, 95, 255, 0.07);
  }
}

/* 按下反馈：H5 点击与移动端手指按下都生效 */
.seg-item:active {
  background: rgba(11, 95, 255, 0.13);
  transform: scale(0.96);
}

.seg-text {
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1;
  color: #0b5fff;
}

/* 两段之间的细分割线 */
.seg-split {
  width: 1rpx;
  height: 22rpx;
  background: #e1e9f5;
  flex-shrink: 0;
}

/* 关注数量角标：右上角；0 件时模板不渲染该节点。
   top/right 取 -6rpx（等于 .seg 的 padding），让角标贴齐胶囊外轮廓但**不溢出**——
   溢出到胶囊外会被父级裁切导致圆形被遮挡一点 */
.seg-badge {
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  z-index: 1;
  min-width: 26rpx;
  height: 26rpx;
  padding: 0 6rpx;
  box-sizing: border-box;
  border-radius: 9999rpx;
  background: #0b5fff;
  color: #ffffff;
  font-size: 17rpx;
  font-weight: 700;
  line-height: 26rpx;
  text-align: center;
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

.event-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 32rpx;
}

.state-icon {
  font-size: 64rpx;
  margin-bottom: 24rpx;
}

.state-text {
  font-size: 28rpx;
  color: var(--ev-text-muted);
  margin-bottom: 24rpx;
}

.error-text {
  color: var(--ev-negative);
}

.retry-btn {
  padding: 16rpx 48rpx;
  border-radius: 9999rpx;
  background: var(--ev-accent-soft);
  border: 1px solid var(--ev-accent);
}

.retry-text {
  font-size: 26rpx;
  color: var(--ev-accent);
  font-weight: 500;
}

.load-more-area {
  padding: 32rpx;
  display: flex;
  justify-content: center;
}

.load-more-btn {
  padding: 20rpx 56rpx;
  border-radius: 9999rpx;
  background: var(--ev-accent-soft);
  border: 1px solid var(--ev-border);
}

.load-more-btn:active {
  background: var(--ev-accent-bg);
}

.load-more-text {
  font-size: 26rpx;
  color: var(--ev-accent);
  font-weight: 500;
}

.done-text {
  color: var(--ev-text-muted);
}
</style>
