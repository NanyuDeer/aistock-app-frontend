<template>
  <view class="page-wrapper" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- 透明导航区域：小熊头像在右侧，作为"我的"页面入口 -->
    <view class="nav-area">
      <view class="nav-avatar" @tap="goProfile">
        <SvgIcon name="bear-smile-line" size="30rpx" color="#ffffff" />
      </view>
    </view>

    <!-- 白色圆角卡片：标题固定 + 内容可滚动 -->
    <view class="page-card" :style="{ marginBottom: cardMarginBottom }">
      <view class="card-header">
        <text class="card-title">{{ title }}</text>
        <slot name="header-right" />
      </view>
      <scroll-view scroll-y class="card-content" :enhanced="true" :bounces="false">
        <slot />
      </scroll-view>
      <!-- 可选底部操作栏插槽 -->
      <slot name="footer" />
    </view>

    <!-- 全局AI对话栏：所有主页面都有 -->
    <GlobalChatBar :active-panel="activePanel" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import GlobalChatBar from '@/shared/components/GlobalChatBar.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

const props = withDefaults(defineProps<{
  title?: string
  cardMarginBottom?: string
  /** 当前激活的面板页：'favorites' | 'trade' | '' */
  activePanel?: string
}>(), {
  title: '',
  cardMarginBottom: '207rpx', /* 底部留白：Tab栏 + 间距 + GlobalChatBar */
  activePanel: '',
})

// 获取真实状态栏高度（px），真机/H5 均可用
// App 端 zoom:1.2 会放大 padding，需除以 1.2 补偿
const statusBarHeight = ref(0)
try {
  const raw = uni.getSystemInfoSync().statusBarHeight || 0
  // #ifdef APP-PLUS
  statusBarHeight.value = raw / 1.2
  // #endif
  // #ifndef APP-PLUS
  statusBarHeight.value = raw
  // #endif
} catch (e) {
  statusBarHeight.value = 0
}

function goProfile() {
  uni.navigateTo({ url: '/modules/user/pages/profile' })
}
</script>

<style lang="scss" scoped>
/* 用 fixed 撑满屏幕，避免 100vh 在拖动时重算导致拉伸 */
.page-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f7fb;
  overscroll-behavior: none;
  touch-action: none; /* 禁止整体页面的橡皮筋效果 */
}

/* 透明导航区域 */
.nav-area {
  flex-shrink: 0;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 24rpx;
  background: transparent;
}

.nav-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #4d7cfe, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(77, 124, 254, 0.3);
}

.avatar-emoji {
  font-size: 30rpx;
}

/* 白色圆角卡片 */
.page-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 0 24rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  min-height: 0;
}

/* 卡片标题（固定位置） */
.card-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-bottom: 1rpx solid #f0f2f5;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1d24;
}

/* 可滚动内容区域：白色背景，恢复触摸滚动 */
.card-content {
  flex: 1;
  background: #ffffff;
  min-height: 0;
  touch-action: auto;
  overscroll-behavior: contain;
}
</style>
