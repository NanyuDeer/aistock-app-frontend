<template>
  <view class="main-tabs" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- 透明导航区域（共享，不闪烁） -->
    <view class="nav-area">
      <view class="nav-avatar" @tap="goProfile">
        <SvgIcon name="bear-smile-line" size="30rpx" color="#ffffff" />
      </view>
    </view>

    <!-- 白色圆角卡片 -->
    <view class="page-card" :style="{ marginBottom: dynamicMarginBottom }">
      <!-- 卡片标题（随Tab切换） -->
      <view class="card-header">
        <text class="card-title">{{ tabTitles[activeTab] }}</text>
        <!-- 业绩 Tab 的预测/报告切换按钮 -->
        <view v-if="activeTab === 'forecast'" class="toggle-group">
          <text
            :class="['toggle-btn', forecastSubTab === 'forecast' ? 'active' : '']"
            @tap="forecastSubTab = 'forecast'"
          >预测</text>
          <text
            :class="['toggle-btn', forecastSubTab === 'reports' ? 'active' : '']"
            @tap="forecastSubTab = 'reports'"
          >报告</text>
        </view>
      </view>

      <!-- 可滚动内容区域 -->
      <scroll-view
        scroll-y
        class="card-content"
        :enhanced="true"
        :bounces="false"
        :style="cardContentStyle"
      >
        <!-- Tab 内容（v-show 保持组件状态，切换不销毁） -->
        <MorningContent v-show="activeTab === 'morning'" />
        <InsightContent v-show="activeTab === 'insight'" />
        <ForecastContent v-show="activeTab === 'forecast' && forecastSubTab === 'forecast'" />
        <ReportsContent v-show="activeTab === 'forecast' && forecastSubTab === 'reports'" />
        <AlertContent v-show="activeTab === 'alert'" ref="alertContentRef" />
      </scroll-view>

      <!-- 特别提醒 Tab 的底部操作栏（固定在 scroll-view 外部） -->
      <view v-if="activeTab === 'alert'" class="card-footer-bar">
        <view class="footer-progress">
          <text class="progress-text">{{ alertIdx + 1 }}/{{ alertTotal }}</text>
        </view>
        <view class="footer-actions">
          <view class="action-tag buy">
            <text class="action-tag-text">买</text>
          </view>
          <view class="action-btn" @tap="onAlertAnalyze">
            <text class="action-btn-text">帮我分析</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Tab 栏（共享，不闪烁） -->
    <AppBottomBar :current-tab="activeTab" @change="onTabChange" />
    <!-- 全局 AI 对话栏（共享，不闪烁） -->
    <GlobalChatBar />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import AppBottomBar from '@/shared/components/AppBottomBar.vue'
import GlobalChatBar from '@/shared/components/GlobalChatBar.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { rpx2px, px2rpx, getBottomFixedHeightPx } from '@/shared/utils/layout'
import MorningContent from '@/modules/home/components/MorningContent.vue'
import InsightContent from '@/modules/analytics/components/InsightContent.vue'
import ForecastContent from '@/modules/analytics/components/ForecastContent.vue'
import ReportsContent from '@/modules/analytics/components/ReportsContent.vue'
import AlertContent from '@/modules/favorites/components/AlertContent.vue'

const tabTitles: Record<string, string> = {
  morning: '早点听',
  insight: '洞察',
  forecast: '业绩',
  alert: '特别提醒',
}

const validTabs = ['morning', 'insight', 'forecast', 'alert']
const activeTab = ref('morning')

/** 特别提醒组件 ref，用于读取当前卡片索引/总数 */
const alertContentRef = ref<InstanceType<typeof AlertContent> | null>(null)
const alertIdx = ref(0)
const alertTotal = ref(0)

/** 监听 alert tab 切换，从 AlertContent 读取状态 */
function syncAlertState() {
  const inst = alertContentRef.value
  if (!inst) return
  alertIdx.value = inst.currentStockIdx ?? 0
  alertTotal.value = inst.totalCount ?? 0
}

function onAlertAnalyze() {
  alertContentRef.value?.goAnalyze?.()
}

/** 业绩 Tab 内部的预测/报告子切换 */
const forecastSubTab = ref<'forecast' | 'reports'>('forecast')

/** 从外部设置激活的 Tab（如从 URL 参数或页面 props） */
function setActiveTab(tab: string) {
  if (validTabs.includes(tab)) {
    activeTab.value = tab
  }
}

defineExpose({ setActiveTab })

// 获取真实状态栏高度及窗口高度
const windowHeight = ref(0)
const statusBarHeight = ref(0)
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
 * 动态计算卡片底部 marginBottom（rpx）
 * 与 PageCard 保持一致：使用 getBottomFixedHeightPx() 计算底部固定栏总高度
 * （Tab栏 + 间距 + GlobalChatBar + safeAreaInsetBottom），解决刘海屏底部遮挡问题。
 * 不能硬编码 207rpx——非刘海屏会留过多空白、刘海屏会遮挡内容。
 */
const dynamicMarginBottom = computed(() => {
  return px2rpx(getBottomFixedHeightPx()) + 'rpx'
})

/**
 * scroll-view 高度：H5 端用 CSS flex:1 撑满（无需 JS 计算）；
 * App 端用 JS 计算精确像素高度（uni-app scroll-view 在 App 下需显式高度才滚动）。
 * rpx2px 来自 shared/utils/layout（基于 uni.upx2px），不能用 getSystemInfoSync().windowWidth
 * 自行换算——H5 dev 模式下 windowWidth 返回浏览器全宽导致换算严重偏大。
 */
const scrollHeight = computed(() => {
  const navH = rpx2px(88)          // nav-area
  const headerH = rpx2px(88)       // card-header
  const marginH = getBottomFixedHeightPx()
  // 特别提醒 tab 显示 footer-bar（约 68rpx + padding），需扣除其高度避免挤下
  const footerH = activeTab.value === 'alert' ? rpx2px(68) : 0
  const total = windowHeight.value - statusBarHeight.value - navH - headerH - marginH - footerH
  return Math.max(total, 100)
})

const cardContentStyle = computed(() => {
  // #ifdef H5
  return {}
  // #endif
  // #ifndef H5
  return { height: `${scrollHeight.value}px` }
  // #endif
})

function onTabChange(tab: string) {
  activeTab.value = tab
  if (tab === 'alert') {
    nextTick(() => syncAlertState())
  }
}

function goProfile() {
  uni.navigateTo({ url: '/modules/user/pages/profile' })
}
</script>

<style lang="scss" scoped>
/* 用 fixed 撑满屏幕，避免 100vh 在拖动时重算导致拉伸 */
.main-tabs {
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
  touch-action: none;
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
  position: relative;
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

/* 业绩 Tab 预测/报告切换按钮（绝对定位，不影响 header 高度，与无 toggle 的 tab 一致） */
.toggle-group {
  position: absolute;
  right: 24rpx;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  background: #f0f2f5;
  border-radius: 12rpx;
  padding: 4rpx;
}

.toggle-btn {
  font-size: 24rpx;
  white-space: nowrap;
  color: #6b7280;
  padding: 8rpx 24rpx;
  border-radius: 10rpx;
  font-weight: 500;

  &.active {
    color: #ffffff;
    background: #4d7cfe;
  }
}

/* 可滚动内容区域 */
.card-content {
  /* #ifdef H5 */
  flex: 1;
  min-height: 0;
  overflow: hidden;
  /* #endif */
  background: #ffffff;
  touch-action: auto;
  overscroll-behavior: contain;
}

/* 特别提醒底部操作栏（固定在 scroll-view 外部） */
.card-footer-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  background: #ffffff;
  border-top: 1rpx solid #f0f2f5;
}

.footer-progress {
  flex-shrink: 0;
}

.progress-text {
  font-size: 26rpx;
  color: #6b7280;
  font-weight: 500;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.action-tag {
  padding: 8rpx 20rpx;
  border-radius: 8rpx;

  &.buy {
    background: rgba(244, 63, 94, 0.12);
  }

  .action-tag-text {
    font-size: 24rpx;
    font-weight: 600;
    color: #f43f5e;
  }
}

.action-btn {
  padding: 12rpx 32rpx;
  background: linear-gradient(135deg, #4d7cfe, #6366f1);
  border-radius: 32rpx;
}

.action-btn-text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 500;
}
</style>
