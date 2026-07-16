<template>
  <view class="page-wrapper" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- 透明导航区域：小熊头像在右侧，作为"我的"页面入口 -->
    <view class="nav-area">
      <view class="nav-avatar" @tap="goProfile">
        <SvgIcon name="bear-smile-line" size="30rpx" color="#ffffff" />
      </view>
    </view>

    <!-- 白色圆角卡片：标题固定 + 内容可滚动 -->
    <view class="page-card" :style="{ marginBottom: dynamicMarginBottom }">
      <view class="card-header">
        <text class="card-title">{{ title }}</text>
        <slot name="header-right" />
      </view>
      <!-- 用 flex:1 撑满剩余空间，footer 自然固定在底部 -->
      <scroll-view
        scroll-y
        class="card-content"
        :enhanced="true"
        :bounces="false"
      >
        <slot />
      </scroll-view>
      <!-- 可选底部操作栏插槽（flex-shrink:0 固定在卡片底部） -->
      <slot name="footer" />
    </view>

    <!-- 全局AI对话栏：所有主页面都有 -->
    <GlobalChatBar :active-panel="activePanel" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import GlobalChatBar from '@/shared/components/GlobalChatBar.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { rpx2px, getBottomFixedHeightPx, px2rpx } from '@/shared/utils/layout'

const props = withDefaults(defineProps<{
  title?: string
  cardMarginBottom?: string
  /** 当前激活的面板页：'favorites' | 'trade' | '' */
  activePanel?: string
  /** 底部 footer 插槽高度（rpx），用于从 scroll-view 高度中扣除，保证 footer 固定可见 */
  footerHeight?: number
}>(), {
  title: '',
  cardMarginBottom: '207rpx', /* 底部留白：Tab栏 + 间距 + GlobalChatBar */
  activePanel: '',
  footerHeight: 0,
})

// 获取真实状态栏高度（px），真机/H5 均可用
// App 端 zoom:1.2 会放大 padding，需除以 1.2 补偿
const statusBarHeight = ref(0)
const windowHeight = ref(0)
try {
  const sysInfo = uni.getSystemInfoSync()
  const raw = sysInfo.statusBarHeight || 0
  windowHeight.value = sysInfo.windowHeight || 667
  // #ifdef APP-PLUS
  statusBarHeight.value = raw / 1.2
  // #endif
  // #ifndef APP-PLUS
  statusBarHeight.value = raw
  // #endif
} catch (e) {
  statusBarHeight.value = 0
  windowHeight.value = 667
}

/**
 * 动态计算 scroll-view 像素高度
 * windowHeight - statusBar - navArea(88rpx) - cardHeader(88rpx) - 底部固定栏(动态高度含安全区)
 *
 * 使用共享布局工具计算底部高度，解决刘海屏设备底部内容被遮挡的问题。
 * 如果外部传入了自定义 cardMarginBottom，则使用传入值（向后兼容）。
 */
const dynamicMarginBottom = computed(() => {
  // 外部传入了非默认值时，沿用传入值
  if (props.cardMarginBottom && props.cardMarginBottom !== '207rpx') {
    return props.cardMarginBottom
  }
  // 默认：动态计算底部固定栏总高度并转为 rpx
  return px2rpx(getBottomFixedHeightPx()) + 'rpx'
})

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

/* 可滚动内容区域：flex:1 撑满剩余空间，footer 固定在底部 */
.card-content {
  flex: 1;
  min-height: 0;
  background: #ffffff;
  touch-action: auto;
  overscroll-behavior: contain;
}
</style>
