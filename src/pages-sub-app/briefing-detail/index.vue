<template>
  <SubPageCard :title="pageTitle">
    <view class="briefing-detail-content">
      <view v-if="loading" class="loading-state">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>

      <template v-else>
        <!-- 摘要卡：AI 核心观点 -->
        <view v-if="report?.summary" class="summary-card">
          <view class="summary-header">
            <text class="ai-badge">AI</text>
            <text class="summary-label">核心观点</text>
          </view>
          <text class="summary-text">{{ report.summary }}</text>
        </view>

        <!-- 播报入口 -->
        <view
          v-if="report?.podcast_brief"
          class="podcast-btn"
          @tap="goBriefing"
        >
          <SvgIcon name="headphone-line" size="28rpx" color="#ffffff" />
          <text class="podcast-text">收听播报</text>
          <text class="podcast-arrow">›</text>
        </view>

        <!-- ① 今日速览 -->
        <view v-if="blocks?.speedLook" class="detail-card">
          <view class="card-header">
            <text class="card-type-tag">今日速览</text>
          </view>
          <view class="markdown-content">
            <mp-html :content="blocks.speedLook" />
          </view>
        </view>

        <!-- ② 核心结论 -->
        <view v-if="blocks?.coreConclusion" class="detail-card highlight-card">
          <view class="card-header">
            <text class="card-type-tag conclusion-tag">核心结论</text>
          </view>
          <view class="markdown-content">
            <mp-html :content="blocks.coreConclusion" />
          </view>
        </view>

        <!-- ③ 详细分析 -->
        <view v-if="blocks?.detailAnalysis" class="detail-card">
          <view class="card-header">
            <text class="card-type-tag">详细分析</text>
          </view>
          <view class="markdown-content">
            <mp-html :content="blocks.detailAnalysis" />
          </view>
          <view v-if="blocks.exclusionNote" class="exclusion-note">
            <mp-html :content="blocks.exclusionNote" />
          </view>
        </view>

        <!-- ④ 异常信号 -->
        <view v-if="blocks?.anomalySignal" class="detail-card highlight-card">
          <view class="card-header">
            <text class="card-type-tag anomaly-tag">异常信号</text>
          </view>
          <view class="markdown-content">
            <mp-html :content="blocks.anomalySignal" />
          </view>
        </view>

        <!-- ⑤ 事件持续性追踪 -->
        <view v-if="blocks?.eventTracking" class="detail-card">
          <view class="card-header">
            <text class="card-type-tag">事件追踪</text>
          </view>
          <view class="markdown-content">
            <mp-html :content="blocks.eventTracking" />
          </view>
        </view>

        <!-- 关联板块：横向滚动标签 -->
        <view v-if="report?.stocks?.length" class="detail-card">
          <view class="card-footer">
            <text class="industries-label">关联板块</text>
            <view class="industries-row">
              <scroll-view class="industries-scroll" scroll-x="true" :show-scrollbar="false">
                <view class="industries-tags">
                  <text
                    v-for="stock in report.stocks"
                    :key="stock"
                    class="industry-item item-neutral"
                    @tap="goSectorSearch(stock)"
                  >
                    {{ stock }}
                    <text class="industry-arrow">›</text>
                  </text>
                </view>
              </scroll-view>
            </view>
          </view>
        </view>

        <!-- 风险提示 -->
        <view v-if="report?.risks?.length" class="detail-card">
          <view class="card-header">
            <text class="card-type-tag risk-tag">风险提示</text>
          </view>
          <view class="risks-list">
            <view v-for="(risk, idx) in report.risks" :key="idx" class="risk-item">
              <SvgIcon name="alert-line" size="22rpx" :color="errorColor" />
              <text class="risk-text">{{ risk }}</text>
            </view>
          </view>
        </view>

        <view v-if="status === 'empty'" class="empty-state">
          <SvgIcon name="file-line" size="80rpx" color="#9ca3af" />
          <text class="empty-text">{{ typeLabel }}尚未生成</text>
          <text class="empty-hint">
            {{ typeLabel === '晨报' ? '请在 9:00 后查看' : '请在 15:30 后查看' }}
          </text>
        </view>

        <view v-if="status === 'error'" class="empty-state">
          <SvgIcon name="file-line" size="80rpx" color="#9ca3af" />
          <text class="empty-text">加载失败</text>
          <view class="retry-btn" @tap="refresh">
            <text class="retry-text">重试</text>
          </view>
        </view>
      </template>

      <view class="date-nav">
        <view class="date-btn" @tap="changeDate(-1)">
          <SvgIcon name="arrow-left-line" size="28rpx" :color="brandColor" />
          <text class="date-btn-text">前一天</text>
        </view>
        <view class="date-btn" @tap="changeDate(1)">
          <text class="date-btn-text">后一天</text>
          <SvgIcon name="arrow-right-line" size="28rpx" :color="brandColor" />
        </view>
      </view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'
import { useBriefingCard, type BriefingType } from '@/shared/utils/useBriefingCard'
import { splitReviewReport } from '@/shared/utils/reportSplitter'

const pageType = ref<BriefingType>('review')
const currentDate = ref('')

const brandColor = '#4d7cfe'
const errorColor = '#f43f5e'

const pageTitle = computed(() => pageType.value === 'morning' ? '晨报详情' : '晚报详情')

const {
  type: briefingType,
  date: briefingDate,
  typeLabel,
  report,
  status,
  loading,
  refresh,
} = useBriefingCard()

const blocks = computed(() => {
  if (!report.value?.details) return null
  return splitReviewReport(report.value.details)
})

function goBriefing() {
  uni.navigateTo({ url: '/pages-sub-app/briefing/index' })
}

function goSectorSearch(keyword: string) {
  uni.navigateTo({ url: `/modules/favorites/pages/search?keyword=${encodeURIComponent(keyword)}` })
}

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function changeDate(delta: number) {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() + delta)
  currentDate.value = formatDate(d)
  briefingDate.value = currentDate.value
  refresh()
}

onLoad((options) => {
  const opts = options as Record<string, string> || {}
  const type = (opts.type === 'morning' || opts.type === 'review') ? opts.type : 'review'
  pageType.value = type
  currentDate.value = formatDate(new Date())
  briefingType.value = type
  briefingDate.value = currentDate.value
  refresh()
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.briefing-detail-content {
  padding: 0 32rpx 40rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid var(--ev-border);
  border-top-color: var(--ev-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: $font-size-sm;
  color: var(--ev-text-muted);
  margin-top: $spacing-base;
}

/* ===== 摘要卡：AI 核心观点 ===== */
.summary-card {
  background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(59,130,246,0.05));
  border-radius: 20rpx;
  padding: 22rpx;
  border-left: 6rpx solid var(--ev-accent);
  border-top: 1rpx solid var(--ev-border-light);
  border-right: 1rpx solid var(--ev-border-light);
  border-bottom: 1rpx solid var(--ev-border-light);
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 12rpx;
}

.ai-badge {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: var(--ev-accent);
  color: #ffffff;
  font-size: 18rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.summary-label {
  font-size: 22rpx;
  color: var(--ev-text-muted);
  font-weight: 500;
}

.summary-text {
  font-size: 28rpx;
  color: var(--ev-text-primary);
  line-height: 1.6;
  font-weight: 500;
}

/* ===== 播报按钮 ===== */
.podcast-btn {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 14rpx 24rpx;
  border-radius: 9999rpx;
  background: var(--ev-blue-gradient);
  box-shadow: 0 4rpx 16rpx var(--ev-blue-shadow);
  align-self: flex-start;
  transition: all 0.2s ease;

  &:active {
    opacity: 0.85;
    transform: scale(0.97);
  }
}

.podcast-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
}

.podcast-arrow {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 600;
}

/* ===== 通用卡片 ===== */
.detail-card {
  background: var(--ev-bg-card);
  border-radius: 20rpx;
  padding: 22rpx;
  border: 1rpx solid var(--ev-border);
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 14rpx;
}

.card-type-tag {
  font-size: 22rpx;
  font-weight: 600;
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
  letter-spacing: 0.5rpx;
  background: var(--ev-accent-soft);
  color: var(--ev-accent);
}

.card-type-tag.risk-tag {
  background: var(--ev-negative-soft);
  color: var(--ev-negative);
}

.highlight-card {
  border-left: 6rpx solid var(--ev-accent);
}

.card-type-tag.conclusion-tag {
  background: linear-gradient(135deg, rgba(77,124,254,0.12), rgba(99,102,241,0.08));
  color: var(--ev-accent);
  font-size: 24rpx;
}

.card-type-tag.anomaly-tag {
  background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(249,115,22,0.08));
  color: var(--ev-warning);
  font-size: 24rpx;
}

.exclusion-note {
  margin-top: 14rpx;
  padding: 12rpx 16rpx;
  background: rgba(148, 163, 184, 0.06);
  border-radius: 8rpx;
  font-size: 22rpx;
  color: var(--ev-text-muted);
}

/* ===== Markdown 内容 ===== */
.markdown-content {
  font-size: 26rpx;
  color: var(--ev-text-secondary);
  line-height: 1.8;

  :deep(.md-h2) {
    font-size: 32rpx;
    font-weight: 700;
    color: var(--ev-text-primary);
    margin: 24rpx 0 12rpx;
    padding-bottom: 8rpx;
    border-bottom: 2rpx solid var(--ev-border);
  }

  :deep(.md-h3) {
    font-size: 28rpx;
    font-weight: 600;
    color: var(--ev-text-primary);
    margin: 18rpx 0 10rpx;
  }

  :deep(.md-hr) {
    border: 0;
    height: 1rpx;
    background: var(--ev-border);
    margin: 18rpx 0;
  }

  :deep(strong) {
    font-weight: 600;
    color: var(--ev-text-primary);
  }

  :deep(blockquote) {
    margin: 10rpx 0 14rpx;
    padding: 10rpx 20rpx;
    border-left: 4rpx solid var(--ev-accent);
    background: rgba(77, 124, 254, 0.04);
    color: var(--ev-text-tertiary);
    font-size: 24rpx;
    line-height: 1.5;
  }

  :deep(.md-ol), :deep(.md-ul) {
    padding-left: 36rpx;
    margin-bottom: 14rpx;
  }

  :deep(.md-ol-li), :deep(.md-ul-li) {
    margin-bottom: 6rpx;
    display: list-item;
  }

  :deep(.md-table) {
    width: 100%;
    border-collapse: collapse;
    margin: 14rpx 0;
    font-size: 24rpx;
  }

  :deep(.md-table th) {
    background: rgba(77, 124, 254, 0.06);
    font-weight: 600;
    color: var(--ev-text-primary);
    border: 1rpx solid var(--ev-border);
    padding: 10rpx 12rpx;
    text-align: left;
  }

  :deep(.md-table td) {
    border: 1rpx solid var(--ev-border);
    padding: 8rpx 12rpx;
    color: var(--ev-text-secondary);
  }

  :deep(br) {
    display: block;
    content: '';
    margin-bottom: 8rpx;
  }
}

/* ===== 卡片底部：标签行（借鉴事件列表） ===== */
.card-footer {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.industries-label {
  font-size: 22rpx;
  color: var(--ev-text-muted);
  line-height: 1;
}

.industries-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.industries-scroll {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
}

.industries-tags {
  display: inline-flex;
  gap: 8rpx;
  white-space: nowrap;
}

.industry-item {
  font-size: 22rpx;
  padding: 8rpx 16rpx;
  border-radius: 6rpx;
  white-space: nowrap;
  transition: opacity 0.2s ease;

  &:active {
    opacity: 0.7;
  }
}

.industry-arrow {
  margin-left: 4rpx;
  font-weight: 700;
  font-size: 20rpx;
}

.item-neutral {
  background: var(--ev-accent-soft);
  border: 1rpx solid rgba(77, 124, 254, 0.15);
  color: var(--ev-accent);
}

.item-neutral .industry-arrow {
  color: var(--ev-accent);
}

/* ===== 风险列表 ===== */
.risks-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.risk-item {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  padding: 12rpx 14rpx;
  background: var(--ev-negative-bg);
  border-radius: 10rpx;
}

.risk-text {
  font-size: 24rpx;
  color: var(--ev-text-secondary);
  line-height: 1.5;
  flex: 1;
}

/* ===== 空状态 / 错误 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: var(--ev-text-secondary);
  margin-top: $spacing-base;
  margin-bottom: $spacing-xs;
}

.empty-hint {
  font-size: 24rpx;
  color: var(--ev-text-muted);
}

.retry-btn {
  margin-top: $spacing-base;
  padding: 14rpx 48rpx;
  border-radius: 9999rpx;
  background: var(--ev-accent-soft);
  border: 1rpx solid var(--ev-accent);
  transition: all 0.2s ease;

  &:active {
    background: var(--ev-accent-bg);
  }
}

.retry-text {
  font-size: 26rpx;
  color: var(--ev-accent);
  font-weight: 500;
}

/* ===== 日期导航 ===== */
.date-nav {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
  margin-top: 8rpx;
}

.date-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 18rpx 0;
  background: var(--ev-bg-card);
  border-radius: 9999rpx;
  border: 1rpx solid var(--ev-border);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.97);
    background: var(--ev-accent-bg);
  }
}

.date-btn-text {
  font-size: 26rpx;
  color: var(--ev-accent);
  font-weight: 500;
}
</style>
