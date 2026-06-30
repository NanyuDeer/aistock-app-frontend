<template>
  <view class="as-bottom-bar">
    <!-- Tab切换行：背景透明，缩小尺寸 -->
    <view class="as-tab-row">
      <view
        v-for="tab in tabs"
        :key="tab.id"
        class="as-tab-item"
        :class="{ active: currentTab === tab.id }"
        @tap="handleTabTap(tab)"
      >
        <!-- 选中状态：胶囊背景+文字 -->
        <text v-if="currentTab === tab.id" class="as-tab-active-text">{{ tab.name }}</text>
        <!-- 未选中状态：图标 -->
        <text v-else :class="['as-tab-icon', `as-icon-${tab.icon}`]">{{ tab.iconText }}</text>
      </view>
    </view>

    <!-- AI对话行：保持不变 -->
    <view class="as-chat-row">
      <view class="as-side-btn" @tap="handleTrade">
        <text class="as-side-text">交易</text>
      </view>

      <view class="as-chat-input" @tap="handleChatTap">
        <text class="as-chat-placeholder">搜问或按住说</text>
        <view class="as-chat-right">
          <text class="as-unread-badge" v-if="unreadCount > 0">未读{{ unreadCount }}</text>
          <text class="as-voice-icon">🔊</text>
        </view>
      </view>

      <view class="as-side-btn" @tap="handleFavorites">
        <text class="as-side-text">自选</text>
      </view>
    </view>

    <view class="as-disclaimer">
      <text class="as-disclaimer-text">内容由AI生成，不构成投资建议</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  currentTab?: string
  unreadCount?: number
}>(), {
  currentTab: 'morning',
  unreadCount: 11
})

const emit = defineEmits<{
  (e: 'change', tab: string): void
  (e: 'chat-click'): void
}>()

const tabs = [
  { id: 'discover', name: '发现', icon: 'discover', iconText: '✈️', path: '' },
  { id: 'market', name: '行情', icon: 'market', iconText: '📊', path: '' },
  { id: 'morning', name: '早点听', icon: 'radio', iconText: '📻', path: '/pages/index/index' },
  { id: 'alert', name: '提醒', icon: 'alert', iconText: '🔔', path: '/pages/favorites/index' },
]

const handleTabTap = (tab: typeof tabs[0]) => {
  if (tab.path) {
    uni.redirectTo({ url: tab.path })
  } else {
    uni.showToast({ title: `${tab.name}功能开发中`, icon: 'none' })
  }
  emit('change', tab.id)
}

const handleChatTap = () => {
  uni.navigateTo({ url: '/pages-sub-app/chat/index' })
  emit('chat-click')
}

const handleTrade = () => {
  uni.showToast({ title: '交易功能开发中', icon: 'none' })
}

const handleFavorites = () => {
  uni.navigateTo({ url: '/pages/stock/favorites' })
}
</script>

<style lang="scss" scoped>
.as-bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: transparent;  // 整体背景透明
  padding-top: 12rpx;
  padding-bottom: env(safe-area-inset-bottom);
}

// Tab行：背景透明，缩小1/3，间隔紧凑但有边距
.as-tab-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 32rpx 12rpx;  // 边距确保图标离边缘有距离
  gap: 12rpx;              // 图标间隔紧凑
}

.as-tab-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54rpx;            // 缩小1/3（原80rpx）
  height: 40rpx;           // 缩小1/3（原60rpx）
  transition: all 0.2s ease;

  // 选中状态：胶囊背景
  &.active {
    width: auto;
    padding: 0 20rpx;
    height: 42rpx;
    border-radius: 21rpx;
    background: rgba(77, 124, 254, 0.15);
  }
}

.as-tab-icon {
  font-size: 28rpx;        // 缩小1/3（原44rpx）
  color: #9ca3af;
  line-height: 1;
}

.as-tab-active-text {
  font-size: 20rpx;        // 缩小1/3（原30rpx）
  font-weight: 600;
  color: #4d7cfe;
}

// AI对话行：保持不变
.as-chat-row {
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  gap: 20rpx;
}

// 左右按钮：圆形背景，与对话框统一样式
.as-side-btn {
  flex-shrink: 0;
  width: 88rpx;                  // 略大于对话框高度80rpx
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 44rpx;          // 圆形
  box-shadow: 0 2rpx 12rpx rgba(77, 124, 254, 0.08);
  border: 2rpx solid rgba(77, 124, 254, 0.15);
}

.as-side-text {
  font-size: 28rpx;              // 字体跟随圆形背景放大（原24rpx）
  font-weight: 600;
  color: #6b7280;                // 略微灰色
  letter-spacing: 1rpx;
}

.as-chat-input {
  flex: 1;
  height: 80rpx;
  background: #ffffff;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  padding: 0 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(77, 124, 254, 0.08);
  border: 2rpx solid rgba(77, 124, 254, 0.15);
}

.as-chat-placeholder {
  flex: 1;
  font-size: 28rpx;
  color: #9ca3af;
}

.as-chat-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.as-unread-badge {
  font-size: 22rpx;
  color: #4d7cfe;
  background: rgba(77, 124, 254, 0.12);
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
}

.as-voice-icon {
  font-size: 36rpx;
}

.as-disclaimer {
  text-align: center;
  padding: 8rpx 0 4rpx;
}

.as-disclaimer-text {
  font-size: 20rpx;
  color: #c0c4cc;
}
</style>
