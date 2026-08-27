/**
 * SubPageCard2 白色导航栏子页面容器
 * 视觉层同步自 aistock-component-lib/src/components/SubPageCard2.vue（同步时间：2026-07-28）
 * 保留 app 前端业务逻辑：GlobalChatBar + statusBarHeight + goBack(backUrl) + noChatBar
 */
<template>
  <view
    class="as-sub2"
    :class="{ 'is-wide': isWide }"
    :style="{ paddingTop: statusBarHeight + 'px' }"
  >
    <!-- 白色导航栏：返回按钮 + 标题/副标题 + 右侧按钮 -->
    <view class="as-sub2__nav" :class="{ 'as-sub2__nav--subtitle': subtitle }">
      <view class="as-sub2__nav-left">
        <view class="as-sub2__back" @tap="goBack">
          <view class="as-sub2__back-icon"></view>
        </view>
        <view class="as-sub2__title-wrap">
          <text v-if="title" class="as-sub2__title">{{ title }}</text>
          <text v-if="subtitle" class="as-sub2__subtitle">{{ subtitle }}</text>
        </view>
      </view>
      <view v-if="$slots['header-right']" class="as-sub2__nav-right">
        <slot name="header-right" />
      </view>
    </view>

    <!-- 中间内容区域 -->
    <view class="as-sub2__body" :style="bodyStyle">
      <!-- 原生滚动：enhanced 在 H5 端 passive touchmove preventDefault 触发浏览器 Warning，
           回归 scroll-y 原生滚动（与首页 MainTabs 一致） -->
      <scroll-view
        scroll-y
        class="as-sub2__scroll"
        :scroll-into-view="scrollIntoView"
        :scroll-top="scrollTop"
      >
        <slot />
      </scroll-view>
      <!-- 可选底部操作栏插槽 -->
      <view v-if="$slots.footer" class="as-sub2__footer">
        <slot name="footer" />
      </view>
    </view>

    <!-- 全局AI对话栏（可通过 noChatBar 隐藏） -->
    <GlobalChatBar v-if="!noChatBar" :active-panel="activePanel" />

    <!-- 播报悬浮窗（报告页调用 podcastStore.open 后显示；仅本页面前台时渲染） -->
    <FloatingPodcast :page-key="pageKey" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated, onDeactivated } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import GlobalChatBar from '@/shared/components/GlobalChatBar.vue'
import FloatingPodcast from '@/shared/components/FloatingPodcast.vue'
import { usePodcastStore } from '@/shared/store/modules/podcast'
import { useAdaptiveScreen } from '@/shared/utils/useAdaptiveScreen'

/** 模块级自增：每个容器实例唯一页面标识（FloatingPodcast 据此判定本页是否前台） */
let subPageSeq = 0
const pageKey = `sub2-${++subPageSeq}`

/** 多端适配：宽屏（平板/折叠屏展开/横屏）时子页面限宽居中 */
const { isWide } = useAdaptiveScreen()

// 页面可见性 → store.activePage：uni-h5 页面被 KeepAlive 缓存不卸载，
// 悬浮球渲染权必须跟随前台页面（否则渲染在隐藏页面/多实例双播放）。
// 关键：uni-app onShow/onHide 是页面实例级钩子，子组件注册的永不触发，
// 必须用 Vue onActivated/onDeactivated（KeepAlive 缓存树内子组件可触发）维护。
const podcastStore = usePodcastStore()
onShow(() => { podcastStore.setActivePage(pageKey) })
onHide(() => { podcastStore.clearActivePage(pageKey) })
onActivated(() => { podcastStore.setActivePage(pageKey) })
onDeactivated(() => { podcastStore.clearActivePage(pageKey) })
onMounted(() => { podcastStore.setActivePage(pageKey) })

const props = withDefaults(defineProps<{
  /** 主标题 */
  title?: string
  /** 副标题或备注，显示在标题下方 */
  subtitle?: string
  /** 内容区域底部 padding（用于给 GlobalChatBar 留空间），noChatBar 时自动为 0 */
  contentPaddingBottom?: string
  /** 当前激活的面板页：'favorites' | 'trade' | '' */
  activePanel?: string
  /** 无历史记录时的回退页面 URL */
  backUrl?: string
  /** 隐藏底部全局 AI 对话栏（对话页等自带输入栏时使用） */
  noChatBar?: boolean
  /** 需要滚动到的子元素 id */
  scrollIntoView?: string
  /** 指定内容区域的纵向滚动位置 */
  scrollTop?: number
}>(), {
  title: '',
  subtitle: '',
  contentPaddingBottom: 'calc(148rpx + env(safe-area-inset-bottom))',
  activePanel: '',
  backUrl: '/modules/home/pages/index',
  noChatBar: false,
  scrollIntoView: '',
  scrollTop: 0,
})

/** noChatBar 时 padding 为 0，否则使用传入的 contentPaddingBottom */
const bodyStyle = computed(() =>
  props.noChatBar ? {} : { paddingBottom: props.contentPaddingBottom }
)

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
    uni.redirectTo({ url: props.backUrl })
  }
}

defineExpose({ goBack })
</script>

<style lang="scss" scoped>
.as-sub2 {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: $bg-card;
  overscroll-behavior: none;
  touch-action: none;
}

/* 多端适配：宽屏（平板/折叠屏展开/横屏）时子页面限宽居中，避免文字行过长 */
.as-sub2.is-wide {
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

/* ===== 白色导航栏 ===== */
.as-sub2__nav {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 $s-3;
  background: $bg-card;
  border-bottom: 2rpx solid $line-soft;
}

.as-sub2__nav--subtitle {
  height: 120rpx;
}

.as-sub2__nav-left {
  display: flex;
  align-items: center;
  gap: $s-1;
  flex: 1;
  min-width: 0;
}

.as-sub2__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: $r-full;
  flex-shrink: 0;
}

.as-sub2__back:active {
  background: $bg-soft;
}

/* CSS 绘制返回箭头 */
.as-sub2__back-icon {
  position: relative;
  width: 20rpx;
  height: 20rpx;
}

.as-sub2__back-icon::before {
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

.as-sub2__title-wrap {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.as-sub2__title {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $ink;
  line-height: $lh-tight;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.as-sub2__subtitle {
  font-size: $font-size-xs;
  color: $ink-soft;
  margin-top: 4rpx;
  line-height: $lh-tight;
}

.as-sub2__nav-right {
  flex-shrink: 0;
}

/* ===== 内容区 ===== */
.as-sub2__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.as-sub2__scroll {
  flex: 1;
  min-height: 0;
  background: $bg-page;
  touch-action: auto;
  overscroll-behavior: contain;
}

.as-sub2__footer {
  flex-shrink: 0;
}
</style>
