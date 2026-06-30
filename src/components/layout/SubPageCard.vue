<template>
  <view class="sub-page-wrapper">
    <!-- 透明导航栏：返回按钮 + 标题在按钮右侧 -->
    <view class="sub-nav" :style="navStyle">
      <view class="nav-back" @tap="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="sub-nav-title">{{ title }}</text>
    </view>

    <!-- 内容直接放在页面背景上，无卡片包裹 -->
    <scroll-view scroll-y class="sub-page-content">
      <slot />
    </scroll-view>
    <!-- 可选底部操作栏插槽 -->
    <slot name="footer" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  title?: string
  cardMarginBottom?: string
}>(), {
  title: '',
  cardMarginBottom: '40rpx',
})

const navStyle = computed(() => {
  // #ifdef APP-PLUS
  return { paddingTop: 'var(--status-bar-height, 0px)' }
  // #endif
  // #ifndef APP-PLUS
  return {}
  // #endif
})

function goBack() {
  uni.navigateBack({ delta: 1 })
}
</script>

<style lang="scss" scoped>
/* 固定页面长度，禁止页面滚动 */
.sub-page-wrapper {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f7fb;
}

/* 透明导航栏 */
.sub-nav {
  flex-shrink: 0;
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  background: transparent;
}

.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.back-icon {
  font-size: 48rpx;
  color: #1a1d24;
  font-weight: 300;
  line-height: 1;
}

/* 标题在返回按钮右侧 */
.sub-nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1d24;
  margin-left: 8rpx;
}

/* 内容区域直接放在页面背景上，无卡片包裹 */
.sub-page-content {
  flex: 1;
  min-height: 0;
}
</style>
