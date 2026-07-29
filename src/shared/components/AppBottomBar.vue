/**
 * AppBottomBar 底部标签栏
 * 视觉层同步自 aistock-component-lib/src/components/TabBar.vue（同步时间：2026-07-28）
 * 保留 app 前端业务逻辑：固定 Tab 列表 + 路由检测 + getTabBarBottomPx 动态偏移
 */
<template>
  <view class="as-tab-bar" :style="{ bottom: tabBarBottomPx + 'px' }">
    <view
      v-for="tab in tabs"
      :key="tab.id"
      class="as-tab-bar__item"
      :class="{ 'as-tab-bar__item--active': activeTabId === tab.id }"
      @tap="handleTabTap(tab)"
    >
      <view class="as-tab-bar__icon-wrap">
        <SvgIcon
          :name="tab.icon"
          size="28rpx"
          :color="activeTabId === tab.id ? activeColor : inactiveColor"
        />
        <!-- 红点徽章 -->
        <view v-if="tab.badge === 'dot'" class="as-tab-bar__badge-dot"></view>
        <!-- 数字徽章 -->
        <view v-else-if="tab.badge" class="as-tab-bar__badge-num">
          <text class="as-tab-bar__badge-num-text">{{ tab.badge }}</text>
        </view>
      </view>
      <text v-if="activeTabId === tab.id" class="as-tab-bar__text">{{ tab.name }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { getTabBarBottomPx } from '@/shared/utils/layout'

/** 外部传入的当前 Tab（可选，优先级高于自动检测） */
const props = withDefaults(defineProps<{
  currentTab?: string
}>(), {
  currentTab: 'morning',
})

const emit = defineEmits<{
  (e: 'change', tab: string): void
}>()

interface TabItem {
  id: string
  name: string
  icon: string
  path: string
  /** 徽章：'dot' 为红点，数字字符串为数字徽章 */
  badge?: string
}

const tabs: TabItem[] = [
  { id: 'morning', name: '早点听', icon: 'broadcast-line', path: '/modules/home/pages/index' },
  { id: 'stock', name: '选股', icon: 'bar-chart-line', path: '/modules/home/pages/index?tab=stock' },
  { id: 'alert', name: '提醒', icon: 'bell-line', path: '/modules/favorites/pages/index' },
]

/** Tab 栏 bottom 定位值（px）= GlobalChatBar 高度（含安全区补偿） */
const tabBarBottomPx = getTabBarBottomPx()

/** 活跃 Tab：优先使用外部传入的 currentTab，否则根据路由自动检测 */
const activeTabId = computed(() => {
  // 外部显式传入时直接使用（MainTabs 统一容器模式）
  if (props.currentTab) return props.currentTab

  try {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const route = currentPage?.route || ''

    // 首页 → 默认激活 morning tab，如果 URL 带 tab=stock 则激活 stock tab
    if (route.includes('home/pages/index')) {
      const page = currentPage as unknown as { $page?: { options?: Record<string, string> }; options?: Record<string, string> }
      const options = page?.$page?.options || page?.options || {}
      return options.tab === 'stock' ? 'stock' : 'morning'
    }
    // 选股相关页面 → 激活 stock tab
    if (route.includes('analytics/pages/index')) return 'stock'
    if (route.includes('market/pages/hot-burst')) return 'stock'
    if (route.includes('analytics/pages/trend-score')) return 'stock'
    if (route.includes('analytics/pages/forecast')) return 'stock'
    if (route.includes('analytics/pages/reports')) return 'stock'
    // 提醒页 → 激活 alert tab
    if (route.includes('favorites/pages/index')) return 'alert'

  } catch (_) { /* ignore */ }

  return 'morning'
})

const handleTabTap = (tab: TabItem) => {
  // 如果当前已在该Tab，不重复触发
  if (activeTabId.value === tab.id) return
  // 仅触发 change 事件，由父组件（MainTabs）决定如何切换
  // 不再使用 reLaunch，避免销毁整个页面导致闪烁
  emit('change', tab.id)
}

/* 选中/未选中图标色（对应 $primary / $ink-mute，SVG 需传字面色值） */
const activeColor = '#0b5fff'
const inactiveColor = '#8a96b0'
</script>

<style lang="scss" scoped>
/* Tab栏：固定底部，位于 GlobalChatBar 上方（bottom 由 JS 动态计算） */
.as-tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  z-index: $z-fixed;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: $s-2 $s-4 0;
  background: $bg-page;
}

.as-tab-bar__item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56rpx;
  padding: 0 $s-1;
  border-radius: $r-full;
  transition: all $t-base;

  /* 选中项：淡蓝胶囊背景 + 文字 */
  &.as-tab-bar__item--active {
    background: rgba($primary, 0.15);
    padding: 0 $s-3;
    gap: $s-1;
  }
}

.as-tab-bar__icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 红点徽章 */
.as-tab-bar__badge-dot {
  position: absolute;
  top: -2rpx;
  right: -2rpx;
  width: 14rpx;
  height: 14rpx;
  background: $up;
  border-radius: $r-full;
  border: 2rpx solid $bg-page;
}

/* 数字徽章 */
.as-tab-bar__badge-num {
  position: absolute;
  top: -10rpx;
  right: -16rpx;
  min-width: 28rpx;
  height: 28rpx;
  padding: 0 6rpx;
  background: $up;
  border-radius: $r-full;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid $bg-page;
}

.as-tab-bar__badge-num-text {
  font-size: 18rpx;
  color: $white;
  line-height: 1;
}

.as-tab-bar__text {
  font-size: $font-size-xs;
  font-weight: 600;
  color: $primary;
  line-height: 1;
  white-space: nowrap;
}
</style>
