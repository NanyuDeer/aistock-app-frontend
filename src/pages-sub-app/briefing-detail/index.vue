<template>
  <view class="briefing-detail-page" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- Top bar -->
    <view class="detail-header">
      <view class="header-back" @tap="goBack">
        <SvgIcon name="arrow-left-line" size="32rpx" color="#ffffff" />
      </view>
      <text class="header-title">{{ typeLabel }}</text>
      <text class="header-date">{{ currentDate }}</text>
    </view>

    <scroll-view scroll-y class="detail-content">
      <!-- Podcast entry (top, fixed position concept) -->
      <view
        v-if="report?.podcast_brief"
        class="podcast-entry"
        @tap="goBriefing"
      >
        <SvgIcon name="headphone-line" size="32rpx" color="#4d7cfe" />
        <text class="podcast-text">收听播报</text>
        <text class="podcast-arrow">&rsaquo;</text>
      </view>

      <!-- Summary card -->
      <view v-if="report?.summary" class="summary-card">
        <text class="summary-text">{{ report.summary }}</text>
      </view>

      <!-- Full analysis (Markdown via mp-html) -->
      <view v-if="report?.details" class="details-section">
        <text class="section-title">完整分析</text>
        <mp-html :content="report.details" />
      </view>

      <!-- Related stocks -->
      <view v-if="report?.stocks?.length" class="stocks-section">
        <text class="section-title">关联股票</text>
        <view class="stocks-list">
          <view
            v-for="stock in report.stocks"
            :key="stock"
            class="stock-item"
            @tap="goStockDetail(stock)"
          >
            <text class="stock-code">{{ stock }}</text>
            <text class="stock-arrow">&rsaquo;</text>
          </view>
        </view>
      </view>

      <!-- Risk warnings -->
      <view v-if="report?.risks?.length" class="risks-section">
        <text class="section-title">风险提示</text>
        <view class="risks-list">
          <view v-for="(risk, idx) in report.risks" :key="idx" class="risk-item">
            <text class="risk-dot">&middot;</text>
            <text class="risk-text">{{ risk }}</text>
          </view>
        </view>
      </view>

      <!-- Empty state -->
      <view v-if="status === 'empty'" class="empty-state">
        <SvgIcon name="file-line" size="80rpx" color="#9ca3af" />
        <text class="empty-text">{{ typeLabel }}尚未生成</text>
        <text class="empty-hint">
          {{ typeLabel === '晨报' ? '请在 9:00 后查看' : '请在 15:30 后查看' }}
        </text>
      </view>

      <!-- Error state -->
      <view v-if="status === 'error'" class="empty-state">
        <SvgIcon name="file-line" size="80rpx" color="#9ca3af" />
        <text class="empty-text">加载失败</text>
        <view class="retry-btn" @tap="refresh">
          <text class="retry-text">重试</text>
        </view>
      </view>

      <!-- Date navigation -->
      <view class="date-nav">
        <view class="date-btn" @tap="changeDate(-1)">
          <SvgIcon name="arrow-left-line" size="32rpx" color="#4d7cfe" />
          <text class="date-btn-text">前一天</text>
        </view>
        <view class="date-btn" @tap="changeDate(1)">
          <text class="date-btn-text">后一天</text>
          <SvgIcon name="arrow-right-line" size="32rpx" color="#4d7cfe" />
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { useBriefingCard, type BriefingType } from '@/shared/utils/useBriefingCard'

const statusBarHeight = ref(0)
try {
  const raw = uni.getSystemInfoSync().statusBarHeight || 0
  // #ifdef APP-PLUS
  statusBarHeight.value = raw / 1.2
  // #endif
  // #ifndef APP-PLUS
  statusBarHeight.value = raw
  // #endif
} catch {
  statusBarHeight.value = 0
}

const pageType = ref<BriefingType>('morning')

const {
  type: briefingType,
  date: briefingDate,
  typeLabel,
  report,
  status,
  refresh,
} = useBriefingCard()

const currentDate = ref('')

function goBack() {
  uni.navigateBack()
}

function goBriefing() {
  uni.navigateTo({ url: '/pages-sub-app/briefing/index' })
}

function goStockDetail(symbol: string) {
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` })
}

function changeDate(delta: number) {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() + delta)
  currentDate.value = d.toISOString().split('T')[0]
  briefingDate.value = currentDate.value
  refresh()
}

onLoad((options) => {
  const type = (options as Record<string, string> | undefined)?.type
  if (type === 'morning' || type === 'review') {
    pageType.value = type
    briefingType.value = type
  }
  currentDate.value = new Date().toISOString().split('T')[0]
  briefingDate.value = currentDate.value
  refresh()
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.briefing-detail-page {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: $bg-color;
  overscroll-behavior: none;
  touch-action: none;
}

.detail-header {
  padding: $spacing-lg;
  background: $brand-gradient;
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.header-back {
  display: flex;
  align-items: center;
}

.header-title {
  font-size: $font-size-xl;
  font-weight: 600;
  color: #ffffff;
}

.header-date {
  font-size: $font-size-sm;
  color: rgba(255, 255, 255, 0.8);
  margin-left: auto;
}

.detail-content {
  flex: 1;
  padding: $spacing-base;
}

.podcast-entry {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-base;
  background: $bg-color-grey;
  border-radius: $radius-sm;
  margin-bottom: $spacing-sm;
  box-shadow: $shadow-base;
}

.podcast-text {
  flex: 1;
  font-size: $font-size-base;
  color: $brand-color;
  font-weight: 500;
}

.podcast-arrow {
  font-size: $font-size-lg;
  color: $text-color-tertiary;
}

.summary-card {
  background: $bg-color-grey;
  border-radius: $radius-base;
  padding: $spacing-base;
  margin-bottom: $spacing-sm;
  box-shadow: $shadow-base;
}

.summary-text {
  font-size: $font-size-base;
  color: $text-color-title;
  line-height: 1.6;
  font-weight: 500;
}

.details-section {
  background: $bg-color-grey;
  border-radius: $radius-base;
  padding: $spacing-base;
  margin-bottom: $spacing-sm;
  box-shadow: $shadow-base;
}

.section-title {
  font-size: $font-size-base;
  font-weight: 600;
  color: $text-color-title;
  display: block;
  margin-bottom: $spacing-xs;
}

.stocks-section,
.risks-section {
  background: $bg-color-grey;
  border-radius: $radius-base;
  padding: $spacing-base;
  margin-bottom: $spacing-sm;
  box-shadow: $shadow-base;
}

.stocks-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.stock-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-xs 0;
}

.stock-code {
  font-size: $font-size-sm;
  color: $brand-color;
}

.stock-arrow {
  font-size: $font-size-lg;
  color: $text-color-tertiary;
}

.risks-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.risk-item {
  display: flex;
  align-items: flex-start;
  gap: $spacing-xs;
}

.risk-dot {
  font-size: $font-size-base;
  color: $error-color;
  flex-shrink: 0;
}

.risk-text {
  font-size: $font-size-sm;
  color: $text-color-secondary;
  line-height: 1.5;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: $font-size-base;
  color: $text-color-secondary;
  margin-top: $spacing-base;
  margin-bottom: $spacing-xs;
}

.empty-hint {
  font-size: $font-size-sm;
  color: $text-color-tertiary;
}

.retry-btn {
  margin-top: $spacing-base;
  padding: $spacing-xs $spacing-lg;
  background: $brand-color;
  border-radius: $radius-pill;
}

.retry-text {
  font-size: $font-size-sm;
  color: #ffffff;
}

.date-nav {
  display: flex;
  justify-content: space-between;
  padding: $spacing-lg $spacing-base;
  gap: $spacing-base;
}

.date-btn {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-lg;
  background: $bg-color-grey;
  border-radius: $radius-sm;
  box-shadow: $shadow-base;
}

.date-btn-text {
  font-size: $font-size-base;
  color: $brand-color;
  font-weight: 500;
}
</style>
