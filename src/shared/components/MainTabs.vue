/**
 * MainTabs 主页面 Tab 容器
 * 视觉层对齐 PageCard 设计系统样式（同步时间：2026-07-28）
 * 保留 app 前端业务逻辑：Tab 切换 + 三内容组件 v-show + AppBottomBar + GlobalChatBar
 */
<template>
  <view class="as-main-tabs" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- 透明导航区域（共享，不闪烁） -->
    <view class="as-main-tabs__nav">
      <view class="as-main-tabs__avatar" @tap="goProfile">
        <SvgIcon name="bear-smile-line" size="30rpx" color="#ffffff" />
      </view>
    </view>

    <!-- 白色圆角卡片 -->
    <view class="as-main-tabs__card" :style="{ marginBottom: dynamicMarginBottom }">
      <!-- 卡片标题（随Tab切换） -->
      <view class="as-main-tabs__header">
        <text class="as-main-tabs__title">{{ tabTitles[activeTab] }}</text>
      </view>

      <!-- 可滚动内容区域 -->
      <scroll-view
        scroll-y
        class="as-main-tabs__body"
        :enhanced="true"
        :bounces="false"
      >
        <!-- Tab 内容（v-show 保持组件状态，切换不销毁） -->
        <MorningContent v-show="activeTab === 'morning'" />
        <StockContent v-show="activeTab === 'stock'" />
        <AlertContent v-show="activeTab === 'alert'" ref="alertContentRef" />
      </scroll-view>
    </view>

    <!-- Tab 栏（共享，不闪烁） -->
    <AppBottomBar :current-tab="activeTab" @change="onTabChange" />
    <!-- 全局 AI 对话栏（共享，不闪烁） -->
    <GlobalChatBar />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppBottomBar from '@/shared/components/AppBottomBar.vue'
import GlobalChatBar from '@/shared/components/GlobalChatBar.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { px2rpx, getBottomFixedHeightPx } from '@/shared/utils/layout'
import MorningContent from '@/modules/home/components/MorningContent.vue'
import StockContent from '@/modules/home/components/StockContent.vue'
import AlertContent from '@/modules/favorites/components/AlertContent.vue'

const tabTitles: Record<string, string> = {
  morning: '早点听',
  stock: '选股',
  alert: '提醒',
}

const validTabs = ['morning', 'stock', 'alert']
const activeTab = ref('morning')

/** 特别提醒组件 ref，用于读取当前卡片索引/总数 */
const alertContentRef = ref<InstanceType<typeof AlertContent> | null>(null)

/** 从外部设置激活的 Tab（如从 URL 参数或页面 props） */
function setActiveTab(tab: string) {
  if (validTabs.includes(tab)) {
    activeTab.value = tab
  }
}

defineExpose({ setActiveTab })

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
} catch (e) {
  statusBarHeight.value = 0
}

/**
 * 动态计算卡片底部 marginBottom（rpx）
 * 与 PageCard 保持一致：使用 getBottomFixedHeightPx() 计算底部固定栏总高度
 * （Tab栏 + 间距 + GlobalChatBar + safeAreaInsetBottom），解决刘海屏底部遮挡问题。
 * 不能硬编码 207rpx——非刘海屏会留过多空白、刘海屏会遮挡内容。
 */
const dynamicMarginBottom = computed(() => {
  // gap=0：卡片下边缘紧挨 Tab 栏上边缘，露出圆角
  return px2rpx(getBottomFixedHeightPx(0)) + 'rpx'
})

function onTabChange(tab: string) {
  activeTab.value = tab
}

function goProfile() {
  uni.navigateTo({ url: '/modules/user/pages/profile' })
}
</script>

<style lang="scss" scoped>
/* 用 fixed 撑满屏幕，避免 100vh 在拖动时重算导致拉伸 */
.as-main-tabs {
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
.as-main-tabs__nav {
  flex-shrink: 0;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 $s-3;
  background: transparent;
}

.as-main-tabs__avatar {
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
.as-main-tabs__card {
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
.as-main-tabs__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $s-3;
  border-bottom: 2rpx solid $line-soft;
}

.as-main-tabs__title {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $ink;
  line-height: $lh-tight;
}

/* 可滚动内容区域：全平台 flex:1 撑满 */
.as-main-tabs__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: $bg-card;
  touch-action: auto;
  overscroll-behavior: contain;
}
</style>
