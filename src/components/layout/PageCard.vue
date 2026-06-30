<template>
  <view class="page-wrapper">
    <!-- 透明导航区域：小熊头像在右侧，作为"我的"页面入口 -->
    <view class="nav-area" :style="navStyle">
      <view class="nav-avatar" @tap="goProfile">
        <text class="avatar-emoji">🐻</text>
      </view>
    </view>

    <!-- 白色圆角卡片：标题固定 + 内容可滚动 -->
    <view class="page-card">
      <view class="card-header">
        <text class="card-title">{{ title }}</text>
        <slot name="header-right" />
      </view>
      <scroll-view scroll-y class="card-content">
        <slot />
      </scroll-view>
      <!-- 可选底部操作栏插槽（固定在卡片底部，不随内容滚动） -->
      <slot name="footer" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  title?: string
  cardMarginBottom?: string
}>(), {
  title: '',
  cardMarginBottom: '220rpx',
})

// App端需要留出状态栏高度，H5端不需要
const navStyle = computed(() => {
  // #ifdef APP-PLUS
  return { paddingTop: 'var(--status-bar-height, 0px)' }
  // #endif
  // #ifndef APP-PLUS
  return {}
  // #endif
})

function goProfile() {
  uni.navigateTo({ url: '/pages/user/profile' })
}
</script>

<style lang="scss" scoped>
/* 固定页面长度，禁止页面滚动，仅卡片内容可滑 */
.page-wrapper {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f7fb;
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
  margin-bottom: v-bind(cardMarginBottom);
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

/* 可滚动内容区域：白色背景（内部组件用偏蓝商务白区分） */
.card-content {
  flex: 1;
  background: #ffffff;
  min-height: 0;
}
</style>
