<template>
  <view class="sub-page-wrapper" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- 透明导航栏：返回按钮 + 标题 + 右侧按钮 -->
    <view class="sub-nav">
      <view class="nav-back" @tap="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="sub-nav-title">{{ title }}</text>
      <slot name="header-right" />
    </view>

    <!-- 内容直接放在页面背景上，无卡片包裹 -->
    <scroll-view scroll-y class="sub-page-content" :enhanced="true" :bounces="false">
      <slot />
    </scroll-view>
    <!-- 可选底部操作栏插槽 -->
    <slot name="footer" />

    <!-- 全局AI对话栏：所有子页面也有 -->
    <GlobalChatBar :active-panel="activePanel" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import GlobalChatBar from '@/shared/components/GlobalChatBar.vue'

const props = withDefaults(defineProps<{
  title?: string
  cardMarginBottom?: string
  /** 当前激活的面板页：'favorites' | 'trade' | '' */
  activePanel?: string
}>(), {
  title: '',
  cardMarginBottom: '40rpx',
  activePanel: '',
})

// 获取真实状态栏高度
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

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    // 页面栈为空时返回首页
    uni.redirectTo({ url: '/modules/home/pages/index' })
  }
}
</script>

<style lang="scss" scoped>
/* 用 fixed 撑满屏幕，避免 100vh 拉伸 */
.sub-page-wrapper {
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

/* 标题在返回按钮右侧，右侧 slot 在最右边 */
.sub-nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1d24;
  margin-left: 8rpx;
  flex: 1;
}

/* 内容区域：底部留白避免被 GlobalChatBar 遮挡 */
.sub-page-content {
  flex: 1;
  min-height: 0;
  padding-bottom: 147rpx; /* GlobalChatBar高度 */
  touch-action: auto;
  overscroll-behavior: contain;
}
</style>
