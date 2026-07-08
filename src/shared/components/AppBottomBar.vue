<template>
  <view class="as-tab-bar">
    <view
      v-for="tab in tabs"
      :key="tab.id"
      class="as-tab-item"
      :class="{ active: currentTab === tab.id }"
      @tap="handleTabTap(tab)"
    >
      <text v-if="currentTab === tab.id" class="as-tab-active-text">{{ tab.name }}</text>
      <SvgIcon v-else :name="tab.icon" size="28rpx" color="#9ca3af" />
    </view>
  </view>
</template>

<script setup lang="ts">
import SvgIcon from '@/shared/components/SvgIcon.vue'

withDefaults(defineProps<{
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
  { id: 'morning', name: '早点听', icon: 'broadcast-line', path: '/pages/index/index' },
  { id: 'alert', name: '提醒', icon: 'bell-line', path: '/pages/favorites/index' },
]

const handleTabTap = (tab: typeof tabs[0]) => {
  if (tab.path) {
    uni.navigateTo({ url: tab.path })
  } else {
    uni.showToast({ title: `${tab.name}功能开发中`, icon: 'none' })
  }
  emit('change', tab.id)
}
</script>

<style lang="scss" scoped>
/* Tab栏：固定底部，位于 GlobalChatBar 上方 */
.as-tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 147rpx; /* GlobalChatBar高度，Tab栏紧贴底栏无间距 */
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
  transition: all 0.2s ease;

  &.active {
    width: auto;
    padding: 0 20rpx;
    height: 42rpx;
    border-radius: 21rpx;
    background: rgba(77, 124, 254, 0.15);
  }
}

.as-tab-icon {
  font-size: 28rpx;
  color: #9ca3af;
  line-height: 1;
}

.as-tab-active-text {
  font-size: 20rpx;
  font-weight: 600;
  color: #4d7cfe;
}
</style>
