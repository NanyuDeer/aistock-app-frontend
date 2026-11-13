<template>
  <SubPageCard title="事件关注">
    <view class="followed-content">
      <!-- 空态：没有任何关注事件 -->
      <view v-if="eventItems.length === 0" class="state-container">
        <SvgIcon name="inbox-line" size="64rpx" color="#9ca3af" />
        <text class="state-text">还没有关注的事件</text>
        <view class="retry-btn" @tap="goEventList">
          <text class="retry-text">去事件传导看看</text>
        </view>
      </view>

      <!-- 关注列表：卡片恒为已关注，取消关注立即从列表移除 -->
      <template v-else>
        <text class="followed-tip">共 {{ eventItems.length }} 条 · 关注保存在本机</text>
        <view class="event-list">
          <EventItemCard
            v-for="item in eventItems"
            :key="item.eventId"
            :event="item"
            @view-detail="goToDetail"
            @view-news="goToNews"
            @toggle-follow="handleFollow"
          />
        </view>
      </template>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
/**
 * 事件关注 — 聚合页
 *
 * 数据源是本地关注快照（eventFollowStore）：关注时已把事件展示字段存到本机，
 * 本页直接读快照渲染，不逐条回源拉详情（详情报告有 7 天 TTL，老事件可能已归档）。
 *
 * 已知边界（设计取舍，接后端关注接口后消失）：
 * - 换设备 / 清缓存 / 重装 App 后列表丢失
 * - 无推送，关注只做聚合展示
 */
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listFollowedEntries, toEventItem } from '@/modules/chat/event/eventFollowStore'
import type { FollowedEntry } from '@/modules/chat/event/eventFollowStore'
import type { EventItem } from '@/modules/chat/event/types'
import { useEventFollow } from '@/modules/chat/event/composables/useEventFollow'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import EventItemCard from '@/modules/chat/event/components/EventItemCard.vue'

const { toggleFollow } = useEventFollow()

const entries = ref<FollowedEntry[]>([])

/** 快照 → 卡片数据（isFollowed 恒为 true） */
const eventItems = computed<EventItem[]>(() => entries.value.map(toEventItem))

/** 重新读取本地快照：首次展示、取消关注、从详情页返回都走这里 */
function reload() {
  entries.value = listFollowedEntries()
}

// 用 onShow 而非 onMounted：从详情页返回时本地快照可能已变化
onShow(() => {
  reload()
})

/** 取消关注：立即从列表移除并提示 */
async function handleFollow(event: EventItem) {
  const followed = await toggleFollow(event)
  reload()
  uni.showToast({ title: followed ? '已关注' : '已取消关注', icon: 'none' })
}

/** 跳转详情（老事件报告可能已被后端归档，由详情页展示错误态） */
function goToDetail(event: EventItem) {
  uni.navigateTo({
    url: `/modules/chat/pages/event/detail?id=${event.eventId}`,
  })
}

/** 打开原文：H5 新标签，APP 内 web-view；无链接友好提示 */
function goToNews(event: EventItem) {
  const url = event.sourceInfo?.url
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

/** 空态引导：从事件传导页进来的直接返回，其他入口（我的页）新开列表页 */
function goEventList() {
  const pages = getCurrentPages()
  const prev = pages[pages.length - 2] as { route?: string } | undefined
  const prevRoute = prev?.route?.replace(/^\//, '')
  // 用包含匹配：H5 hash/history 模式与各端 route 前缀不一致，精确相等会误判
  if (prevRoute?.includes('pages/event/list')) {
    uni.navigateBack({ delta: 1 })
    return
  }
  uni.navigateTo({ url: '/modules/chat/pages/event/list' })
}
</script>

<style scoped>
.followed-content {
  padding: 0 32rpx 40rpx;
}

.followed-tip {
  display: block;
  margin-bottom: 16rpx;
  font-size: 22rpx;
  color: var(--ev-text-muted);
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* 空态（与事件列表页同款） */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 32rpx;
}

.state-text {
  font-size: 28rpx;
  color: var(--ev-text-muted);
  margin: 24rpx 0;
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
}
</style>
