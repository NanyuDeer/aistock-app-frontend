/**
 * SubPageCard 透明导航栏子页面容器（v1）
 * 视觉层参考 aistock-component-lib/src/components/SubPageCard2.vue（同步时间：2026-07-28）
 * 保留 app 前端业务逻辑：GlobalChatBar + statusBarHeight + goBack
 * 注意：新页面推荐使用 SubPageCard2（白色导航栏版本）
 */
<template>
  <view class="as-sub1" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- 透明导航栏：返回按钮 + 标题 + 右侧按钮 -->
    <view class="as-sub1__nav">
      <view class="as-sub1__back" @tap="goBack">
        <view class="as-sub1__back-icon"></view>
      </view>
      <text v-if="title" class="as-sub1__title">{{ title }}</text>
      <slot name="header-right" />
    </view>

    <!-- 中间内容区域 -->
    <view class="as-sub1__body" :class="{ 'as-sub1__body--no-chat': noChatBar }">
      <scroll-view
        scroll-y
        class="as-sub1__scroll"
        :enhanced="true"
        :bounces="false"
      >
        <slot />
      </scroll-view>
      <!-- 可选底部操作栏插槽 -->
      <view class="as-sub1__footer">
        <slot name="footer" />
      </view>
    </view>

    <!-- 全局AI对话栏（可通过 noChatBar 隐藏） -->
    <GlobalChatBar v-if="!noChatBar" :active-panel="activePanel" />

    <!-- 播报悬浮窗（报告页调用 podcastStore.open 后显示） -->
    <FloatingPodcast />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import GlobalChatBar from '@/shared/components/GlobalChatBar.vue'
import FloatingPodcast from '@/shared/components/FloatingPodcast.vue'

const props = withDefaults(defineProps<{
  /** 主标题 */
  title?: string
  /** 当前激活的面板页：'favorites' | 'trade' | '' */
  activePanel?: string
  /** 隐藏底部全局 AI 对话栏（搜索页等模态页面使用） */
  noChatBar?: boolean
}>(), {
  title: '',
  activePanel: '',
  noChatBar: false,
})

// 获取真实状态栏高度
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
    uni.redirectTo({ url: '/modules/home/pages/index' })
  }
}
</script>

<style lang="scss" scoped>
.as-sub1 {
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

/* 透明导航栏 */
.as-sub1__nav {
  flex-shrink: 0;
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 $s-3;
  background: transparent;
}

.as-sub1__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: $r-full;
  flex-shrink: 0;
}

.as-sub1__back:active {
  background: $bg-soft;
}

/* CSS 绘制返回箭头 */
.as-sub1__back-icon {
  position: relative;
  width: 20rpx;
  height: 20rpx;
}

.as-sub1__back-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 20rpx;
  height: 20rpx;
  border-left: 4rpx solid $ink;
  border-bottom: 4rpx solid $ink;
  transform: rotate(45deg);
}

.as-sub1__title {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $ink;
  margin-left: $s-1;
  flex: 1;
}

/* 中间内容区域 */
.as-sub1__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: calc(148rpx + env(safe-area-inset-bottom));
}

/* noChatBar 时去掉底部 ChatBar 占位 */
.as-sub1__body--no-chat {
  padding-bottom: 0;
}

.as-sub1__scroll {
  flex: 1;
  min-height: 0;
  touch-action: auto;
  overscroll-behavior: contain;
}

.as-sub1__footer {
  flex-shrink: 0;
}
</style>
