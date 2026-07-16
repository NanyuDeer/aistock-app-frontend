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

    <!-- 内容用 scroll-view 包裹，JS 动态算出精确像素高度 -->
    <scroll-view
      scroll-y
      class="sub-page-2-content"
      :enhanced="true"
      :bounces="false"
      :style="{ height: scrollHeight + 'px' }"
    >
      <slot />
    </scroll-view>
    <!-- 可选底部操作栏插槽 -->
    <slot name="footer" />

    <!-- 全局AI对话栏（可通过 noChatBar 隐藏） -->
    <GlobalChatBar v-if="!noChatBar" :active-panel="activePanel" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import GlobalChatBar from '@/shared/components/GlobalChatBar.vue'
import { rpx2px, getChatBarHeightPx } from '@/shared/utils/layout'

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
} catch {
  statusBarHeight.value = 0
  windowHeight.value = 667
}

/**
 * 动态计算 scroll-view 像素高度
 * 有副标题时导航栏更高（120rpx），无副标题时 88rpx
 *
 * 必须使用 shared/utils/layout 的 rpx2px（基于 uni.upx2px），
 * 不能用 getSystemInfoSync().windowWidth 自行换算：
 * H5 dev 模式下 windowWidth 返回浏览器全宽（如 1463px）而非模拟移动端宽度（375px），
 * 会导致 navH/chatBarH 严重偏大、scrollHeight 过小甚至被钳到 100，
 * scroll-view 下方出现灰色空隙，内容 div 无法占满。
 */
const scrollHeight = computed(() => {
  const navH = rpx2px(props.subtitle ? 120 : 88)
  const chatBarH = props.noChatBar ? 0 : getChatBarHeightPx()
  const total = windowHeight.value - statusBarHeight.value - navH - chatBarH
  return Math.max(total, 100)
})

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.redirectTo({ url: props.backUrl })
  }
}
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

/* 内容区域：浅灰背景，恢复触摸滚动 */
.sub-page-2-content {
  touch-action: auto;
  overscroll-behavior: contain;
  background: #f5f7fb;
}
</style>
