<template>
  <view class="sub-page-2-wrapper" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- 白色导航栏：返回按钮 + 标题/副标题 + 右侧按钮 -->
    <view class="sub-nav-2" :class="{ 'with-subtitle': subtitle }">
      <view class="nav-back-2" @tap="goBack">
        <text class="back-icon-2">‹</text>
      </view>
      <view class="nav-title-area-2">
        <text class="sub-nav-2-title">{{ title }}</text>
        <text v-if="subtitle" class="sub-nav-2-subtitle">{{ subtitle }}</text>
      </view>
      <slot name="header-right" />
    </view>

    <!-- 中间内容区域：flex 容器包裹 scroll-view 和 footer，参照 SubPageCard -->
    <view class="sub-page-2-body" :class="{ 'no-chat-bar': noChatBar }">
      <scroll-view
        scroll-y
        class="sub-page-2-content"
        :enhanced="true"
        :bounces="false"
      >
        <slot />
      </scroll-view>
      <!-- 可选底部操作栏插槽（flex-shrink:0 固定在内容区底部） -->
      <view v-if="$slots.footer" class="sub-page-2-footer">
        <slot name="footer" />
      </view>
    </view>

    <!-- 全局AI对话栏（可通过 noChatBar 隐藏） -->
    <GlobalChatBar v-if="!noChatBar" :active-panel="activePanel" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import GlobalChatBar from '@/shared/components/GlobalChatBar.vue'

const props = withDefaults(defineProps<{
  title?: string
  /** 副标题或备注，显示在标题下方 */
  subtitle?: string
  cardMarginBottom?: string
  /** 当前激活的面板页：'favorites' | 'trade' | '' */
  activePanel?: string
  /** 无历史记录时的回退页面 URL */
  backUrl?: string
  /** 隐藏底部全局 AI 对话栏（对话页等自带输入栏时使用） */
  noChatBar?: boolean
}>(), {
  title: '',
  subtitle: '',
  cardMarginBottom: '40rpx',
  activePanel: '',
  backUrl: '/modules/home/pages/index',
  noChatBar: false,
})

// 获取真实状态栏高度
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

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.redirectTo({ url: props.backUrl })
  }
}

// 暴露 goBack 供父组件调用，复用 SubPageCard2 的回退语义
// （navigateBack 优先，无历史页时 redirectTo backUrl）
defineExpose({ goBack })
</script>

<style lang="scss" scoped>
/* 白色顶栏子页面：状态栏区域 + 导航栏均为白色背景 */
.sub-page-2-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #ffffff; /* 状态栏区域为白色 */
  overscroll-behavior: none;
  touch-action: none;
}

/* 白色导航栏 */
.sub-nav-2 {
  flex-shrink: 0;
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #e5e7eb;
}

/* 有副标题时导航栏更高 */
.sub-nav-2.with-subtitle {
  height: 120rpx;
}

.nav-back-2 {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.back-icon-2 {
  font-size: 48rpx;
  color: #1a1d24;
  font-weight: 300;
  line-height: 1;
}

/* 标题 + 副标题区域 */
.nav-title-area-2 {
  display: flex;
  flex-direction: column;
  margin-left: 8rpx;
  flex: 1;
}

.sub-nav-2-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1d24;
  line-height: 1.3;
}

.sub-nav-2-subtitle {
  font-size: 24rpx;
  color: #6b7280;
  line-height: 1.3;
  margin-top: 4rpx;
}

/* 中间内容区域：flex:1 撑满剩余空间，参照 SubPageCard 的 .sub-page-body */
.sub-page-2-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 底部留白：GlobalChatBar 高度（148rpx + 安全区），noChatBar 时无需留白 */
  padding-bottom: var(--sub2-pad-b, calc(148rpx + env(safe-area-inset-bottom)));
}

.sub-page-2-body.no-chat-bar {
  padding-bottom: 0;
}

/* scroll-view 在 body 容器内 flex:1 撑满，footer 固定在底部 */
.sub-page-2-content {
  flex: 1;
  min-height: 0;
  touch-action: auto;
  overscroll-behavior: contain;
  background: #f5f7fb;
}

/* footer 插槽容器：不压缩，固定在内容区底部 */
.sub-page-2-footer {
  flex-shrink: 0;
}
</style>
