/**
 * PageCard 主页面卡片容器
 * 视觉层同步自 aistock-component-lib/src/components/PageCard.vue（同步时间：2026-07-28）
 * 保留 app 前端业务逻辑：小熊头像入口 + GlobalChatBar + 动态底部高度 + statusBarHeight
 */
<template>
  <view class="as-page-wrapper" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- 透明导航区域：小熊头像在右侧，作为"我的"页面入口 -->
    <view class="as-page-wrapper__nav">
      <view class="as-page-wrapper__avatar" @tap="goProfile">
        <SvgIcon name="bear-smile-line" size="30rpx" color="#ffffff" />
      </view>
    </view>

    <!-- 白色圆角卡片：标题固定 + 内容可滚动 -->
    <view class="as-page-wrapper__card" :style="{ marginBottom: dynamicMarginBottom }">
      <view class="as-page-wrapper__header">
        <view class="as-page-wrapper__title-wrap">
          <text v-if="title" class="as-page-wrapper__title">{{ title }}</text>
          <text v-if="subtitle" class="as-page-wrapper__subtitle">{{ subtitle }}</text>
        </view>
        <slot name="header-right" />
      </view>
      <!-- 用 flex:1 撑满剩余空间，footer 自然固定在底部 -->
      <!-- 原生滚动：enhanced 在 H5 端注册 passive touchmove 监听并 preventDefault，
           触发浏览器 Warning（Unable to preventDefault inside passive event listener），
           回归 scroll-y 原生滚动（与首页 MainTabs 一致） -->
      <scroll-view
        scroll-y
        class="as-page-wrapper__body"
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
import { getBottomFixedHeightPx, px2rpx } from '@/shared/utils/layout'

const props = withDefaults(defineProps<{
  /** 主标题 */
  title?: string
  /** 副标题 */
  subtitle?: string
  /** 卡片底部留白 */
  cardMarginBottom?: string
  /** 当前激活的面板页：'favorites' | 'trade' | '' */
  activePanel?: string
  /** 底部 footer 插槽高度（rpx），用于从 scroll-view 高度中扣除，保证 footer 固定可见 */
  footerHeight?: number
}>(), {
  title: '',
  subtitle: '',
  cardMarginBottom: '207rpx',
  activePanel: '',
  footerHeight: 0,
})

// 获取真实状态栏高度（px），真机/H5 均可用
// App 端 zoom:1.2 会放大 padding，需除以 1.2 补偿
const statusBarHeight = ref(0)
try {
  const sysInfo = uni.getSystemInfoSync()
  const raw = sysInfo.statusBarHeight || 0
  // #ifdef APP-PLUS
  statusBarHeight.value = raw / 1.2
  // #endif
  // #ifndef APP-PLUS
  statusBarHeight.value = raw
  // #endif
} catch {
  statusBarHeight.value = 0
}

/**
 * 动态计算底部留白高度
 * 如果外部传入了自定义 cardMarginBottom，则使用传入值（向后兼容）
 */
const dynamicMarginBottom = computed(() => {
  if (props.cardMarginBottom && props.cardMarginBottom !== '207rpx') {
    return props.cardMarginBottom
  }
  return px2rpx(getBottomFixedHeightPx()) + 'rpx'
})

function goProfile() {
  uni.navigateTo({ url: '/modules/user/pages/profile' })
}
</script>

<style lang="scss" scoped>
/* 用 fixed 撑满屏幕，避免 100vh 在拖动时重算导致拉伸 */
.as-page-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: $bg-page;
  overscroll-behavior: none;
  touch-action: none;
}

/* 透明导航区域 */
.as-page-wrapper__nav {
  flex-shrink: 0;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 $s-3;
  background: transparent;
}

.as-page-wrapper__avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: $r-full;
  background: linear-gradient(135deg, $primary, $accent);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $shadow-primary;
}

/* 白色圆角卡片 */
.as-page-wrapper__card {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 0 $s-3;
  background: $bg-card;
  border-radius: $r-lg;
  overflow: hidden;
  box-shadow: $shadow-sm;
  min-height: 0;
}

/* 卡片标题（固定位置） */
.as-page-wrapper__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $s-3;
  border-bottom: 2rpx solid $line-soft;
}

.as-page-wrapper__title-wrap {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.as-page-wrapper__title {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $ink;
  line-height: $lh-tight;
}

.as-page-wrapper__subtitle {
  font-size: $font-size-xs;
  color: $ink-mute;
  margin-top: 2rpx;
}

/* 可滚动内容区域 */
.as-page-wrapper__body {
  flex: 1;
  min-height: 0;
  background: $bg-card;
  touch-action: auto;
  overscroll-behavior: contain;
}
</style>
