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
    <!-- 机构调研热门股入口 -->
    <view class="as-tab-item as-extra-entry" @tap="goHotBurst">
      <SvgIcon name="search-eye-line" size="28rpx" color="#9ca3af" />
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
  { id: 'discover', name: '发现', icon: 'rocket-line', path: '' },
  { id: 'market', name: '行情', icon: 'bar-chart-line', path: '/modules/analytics/pages/forecast' },
  { id: 'event', name: '事件传导', icon: 'flow-chart', path: '/modules/chat/pages/event/list' },
  { id: 'morning', name: '早点听', icon: 'broadcast-line', path: '/modules/home/pages/index' },
  { id: 'alert', name: '提醒', icon: 'bell-line', path: '/modules/favorites/pages/index' },
]

/** 根据当前页面路由自动检测活跃 Tab */
const activeTabId = computed(() => {
  try {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const route = currentPage?.route || ''

    // 事件传导页面 → 激活 event tab
    if (route.includes('chat/pages/event')) return 'event'
    // 首页 → 激活 morning tab
    if (route.includes('home/pages/index')) return 'morning'
    // 提醒页 → 激活 alert tab
    if (route.includes('favorites/pages/index')) return 'alert'
    // 行情/业绩预测 → 激活 market tab
    if (route.includes('analytics/pages/forecast')) return 'market'

  } catch (_) { /* ignore */ }

  // 兜底：使用外部传入的 currentTab
  return props.currentTab
})

const handleTabTap = (tab: typeof tabs[0]) => {
  if (tab.path) {
    // 如果当前已在该页面，不重复跳转
    if (activeTabId.value === tab.id) return
    uni.navigateTo({ url: tab.path })
  } else {
    uni.showToast({ title: `${tab.name}功能开发中`, icon: 'none' })
  }
  emit('change', tab.id)
}

function goHotBurst() {
  uni.navigateTo({ url: '/modules/market/pages/hot-burst' })
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

/* 额外功能入口 */
.as-extra-entry {
  opacity: 0.7;
  transition: opacity 0.2s ease;

  &:active {
    opacity: 1;
  }
}
</style>
