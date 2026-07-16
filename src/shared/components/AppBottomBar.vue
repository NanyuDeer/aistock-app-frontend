<template>
  <view class="as-tab-bar" :style="{ bottom: tabBarBottomPx + 'px' }">
    <view
      v-for="tab in tabs"
      :key="tab.id"
      class="as-tab-item"
      :class="{ active: activeTabId === tab.id }"
      @tap="handleTabTap(tab)"
    >
      <text v-if="activeTabId === tab.id" class="as-tab-active-text">{{ tab.name }}</text>
      <SvgIcon v-else :name="tab.icon" size="28rpx" color="#9ca3af" />
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

const tabs = [
  { id: 'morning', name: '早点听', icon: 'broadcast-line', path: '/modules/home/pages/index' },
  { id: 'insight', name: '洞察', icon: 'search-eye-line', path: '/modules/analytics/pages/index' },
  { id: 'forecast', name: '业绩', icon: 'bar-chart-line', path: '/modules/home/pages/index?tab=forecast' },
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

    // 首页 → 默认激活 morning tab，但如果 URL 带 tab=forecast 则激活 forecast tab
    if (route.includes('home/pages/index')) {
      const page = currentPage as unknown as { $page?: { options?: Record<string, string> }; options?: Record<string, string> }
      const options = page?.$page?.options || page?.options || {}
      return options.tab === 'forecast' ? 'forecast' : 'morning'
    }
    // 洞察主页或机构调研/趋势评分 → 激活 insight tab
    if (route.includes('analytics/pages/index')) return 'insight'
    if (route.includes('market/pages/hot-burst')) return 'insight'
    if (route.includes('analytics/pages/trend-score')) return 'insight'
    // 提醒页 → 激活 alert tab
    if (route.includes('favorites/pages/index')) return 'alert'

  } catch (_) { /* ignore */ }

  return 'morning'
})

const handleTabTap = (tab: typeof tabs[0]) => {
  // 如果当前已在该Tab，不重复触发
  if (activeTabId.value === tab.id) return
  // 仅触发 change 事件，由父组件（MainTabs）决定如何切换
  // 不再使用 reLaunch，避免销毁整个页面导致闪烁
  emit('change', tab.id)
}
</script>

<style lang="scss" scoped>
/* Tab栏：固定底部，位于 GlobalChatBar 上方（bottom 由 JS 动态计算） */
.as-tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 32rpx 4rpx;
  gap: 12rpx;
  background: #f5f7fb;
}

.as-tab-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54rpx;
  height: 40rpx;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &.active {
    width: auto;
    padding: 0 20rpx;
    height: 42rpx;
    border-radius: 21rpx;
    background: rgba(77, 124, 254, 0.15);
  }
}

.as-tab-active-text {
  font-size: 20rpx;
  font-weight: 600;
  color: #4d7cfe;
  animation: tab-fade-in 0.2s ease;
}

@keyframes tab-fade-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

</style>
