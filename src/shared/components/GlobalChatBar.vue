<template>
  <!-- 全局AI对话栏：交易 | 搜索框 | 自选 + 免责声明 -->
  <!-- 固定在屏幕底部最高层级，背景色与页面背景一致 -->
  <view class="global-chat-bar">
    <view class="gcb-chat-row">
      <!-- 交易按钮：在交易面板页时变为下拉箭头，点击返回 -->
      <view class="gcb-side-btn" :class="{ 'gcb-side-active': activePanel === 'trade' }" @tap="handleTrade">
        <view v-if="activePanel === 'trade'" class="gcb-side-arrow"><text class="gcb-side-arrow-icon">‹</text></view>
        <text v-else class="gcb-side-text">交易</text>
      </view>

      <view class="gcb-chat-input" @tap="handleChatTap">
        <text class="gcb-chat-placeholder">搜问或按住说</text>
        <view class="gcb-chat-right">
          <text class="gcb-unread-badge" v-if="unreadCount > 0">未读{{ unreadCount }}</text>
          <SvgIcon name="mic-line" size="36rpx" color="#9ca3af" />
        </view>
      </view>

      <!-- 自选按钮：在自选面板页时变为下拉箭头，点击返回 -->
      <view class="gcb-side-btn" :class="{ 'gcb-side-active': activePanel === 'favorites' }" @tap="handleFavorites">
        <view v-if="activePanel === 'favorites'" class="gcb-side-arrow"><text class="gcb-side-arrow-icon">‹</text></view>
        <text v-else class="gcb-side-text">自选</text>
      </view>
    </view>

    <view class="gcb-disclaimer">
      <text class="gcb-disclaimer-text">内容由AI生成，不构成投资建议</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import SvgIcon from '@/shared/components/SvgIcon.vue'

const props = withDefaults(defineProps<{
  unreadCount?: number
  /** 当前激活的面板页：'favorites' | 'trade' | '' */
  activePanel?: string
}>(), {
  unreadCount: 0,
  activePanel: ''
})

const handleChatTap = () => {
  uni.navigateTo({ url: '/pages-sub-app/chat/index' })
}

const handleTrade = () => {
  if (props.activePanel === 'trade') {
    uni.navigateBack()
    return
  }
  uni.showToast({ title: '交易功能开发中', icon: 'none' })
}

const handleFavorites = () => {
  if (props.activePanel === 'favorites') {
    uni.navigateBack()
    return
  }
  uni.navigateTo({ url: '/modules/favorites/pages/favorites' })
}
</script>

<style lang="scss" scoped>
/* 全局对话栏：固定底部，最高层级，背景色与页面背景一致 */
.global-chat-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: #f5f7fb;
  padding-top: 8rpx;
  /* 安全区背景填充，防止 App 端底部黑色 */
  padding-bottom: calc(env(safe-area-inset-bottom) + 8rpx);
}

/* AI对话行：交易 | 搜索框 | 自选 */
.gcb-chat-row {
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  gap: 20rpx;
}

/* 左右圆形按钮 */
.gcb-side-btn {
  flex-shrink: 0;
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 44rpx;
  box-shadow: 0 2rpx 12rpx rgba(77, 124, 254, 0.08);
  border: 2rpx solid rgba(77, 124, 254, 0.15);

  &.gcb-side-active {
    background: rgba(77, 124, 254, 0.1);
    border-color: rgba(77, 124, 254, 0.3);
  }
}

.gcb-side-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #6b7280;
  letter-spacing: 1rpx;
}

.gcb-side-arrow {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(-90deg);
}

.gcb-side-arrow-icon {
  font-size: 48rpx;
  font-weight: 300;
  color: #4d7cfe;
  line-height: 1;
}

/* 搜索/对话输入框 */
.gcb-chat-input {
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

.gcb-chat-placeholder {
  flex: 1;
  font-size: 24rpx;
  color: #9ca3af;
}

.gcb-chat-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.gcb-unread-badge {
  font-size: 22rpx;
  color: #4d7cfe;
  background: rgba(77, 124, 254, 0.12);
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
}

.gcb-voice-icon {
  font-size: 36rpx;
}

/* 免责声明：固定高度，文字纵向居中 */
.gcb-disclaimer {
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gcb-disclaimer-text {
  font-size: 20rpx;
  color: #c0c4cc;
}
</style>
