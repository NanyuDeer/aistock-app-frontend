<template>
  <view class="as-tab-bar">
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
  { id: 'forecast', name: '业绩', icon: 'bar-chart-line', path: '/modules/analytics/pages/forecast' },
  { id: 'alert', name: '提醒', icon: 'bell-line', path: '/modules/favorites/pages/index' },
]

/** 根据当前页面路由自动检测活跃 Tab */
const activeTabId = computed(() => {
  try {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const route = currentPage?.route || ''

    // 首页 → 激活 morning tab
    if (route.includes('home/pages/index')) return 'morning'
    // 洞察主页或机构调研/趋势评分 → 激活 insight tab
    if (route.includes('analytics/pages/index')) return 'insight'
    if (route.includes('market/pages/hot-burst')) return 'insight'
    if (route.includes('analytics/pages/trend-score')) return 'insight'
    // 业绩预测 → 激活 forecast tab
    if (route.includes('analytics/pages/forecast')) return 'forecast'
    // 提醒页 → 激活 alert tab
    if (route.includes('favorites/pages/index')) return 'alert'

  } catch (_) { /* ignore */ }

  // 兜底：使用外部传入的 currentTab
  return props.currentTab
})

const handleTabTap = (tab: typeof tabs[0]) => {
  // 如果当前已在该页面，不重复跳转
  if (activeTabId.value === tab.id) return
  uni.navigateTo({ url: tab.path })
  emit('change', tab.id)
}
</script>

<style lang="scss" scoped>
/* Tab栏：固定底部，位于 GlobalChatBar 上方 */
.as-tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 147rpx;
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
