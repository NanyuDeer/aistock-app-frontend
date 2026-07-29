<template>
  <SubPageCard2 :title="'早点听'" :subtitle="subtitleText">
    <view class="briefing-content">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <text class="loading-text">报告加载中...</text>
      </view>

      <template v-else>
        <!-- 音频入口条（点击进入播报详情页） -->
        <view
          v-if="audioPath || items.length"
          class="audio-bar"
          @tap="goDetail"
        >
          <view class="play-btn" @tap.stop="togglePlay">
            <SvgIcon :name="isPlaying ? 'pause-fill' : 'play-fill'" size="40rpx" color="#ffffff" />
          </view>
          <view class="audio-info">
            <text class="audio-status">{{ audioStatusText }}</text>
            <text class="audio-meta">AI 早报音频 · 播报详情 ›</text>
          </view>
          <text class="audio-arrow">›</text>
        </view>

        <!-- 头条卡片：今日最重要研判 -->
        <view v-if="headlineItem" class="headline-card">
          <view class="headline-label">
            <text class="headline-star">★</text>
            <text class="headline-label-text">今日头条</text>
          </view>
          <text class="headline-title">{{ headlineItem.title }}</text>
          <text class="headline-conclusion">{{ headlineItem.conclusion }}</text>
          <view v-if="headlineItem.relatedTags.length" class="headline-tags">
            <text
              v-for="tag in headlineItem.relatedTags"
              :key="tag.text"
              class="headline-tag"
            >{{ tag.text }}</text>
          </view>
        </view>

        <!-- Agent 洞见列表 -->
        <view v-if="insightItems.length" class="section-label">
          <text class="section-label-text">Agent 洞见</text>
          <view class="section-line" />
        </view>

        <view
          v-for="item in insightItems"
          :key="item.id"
          class="insight-row"
        >
          <view class="insight-icon" :class="item.source">
            <text class="insight-icon-text">{{ sourceIcon(item.source) }}</text>
          </view>
          <view class="insight-body">
            <view class="insight-top">
              <text class="insight-source">{{ sourceLabel(item.source) }}</text>
              <text class="sentiment-badge" :class="sentimentClass(item.sentiment)">
                {{ sentimentLabel(item.sentiment) }}
              </text>
            </view>
            <text class="insight-title">{{ item.title }}</text>
            <text class="insight-conclusion">{{ item.conclusion }}</text>
            <view v-if="item.relatedTags.length" class="insight-tags">
              <text
                v-for="tag in item.relatedTags"
                :key="tag.text"
                class="mini-tag"
                :class="tag.type === 'sector' ? 'sector' : ''"
              >{{ tag.text }}</text>
            </view>
          </view>
        </view>

        <!-- 异动公告强调 -->
        <view v-if="alertItem" class="alert-card">
          <view class="alert-label">
            <text class="alert-dot">●</text>
            <text class="alert-label-text">自选股异动</text>
          </view>
          <text class="alert-title">{{ alertItem.title }}</text>
          <text class="alert-conclusion">{{ alertItem.conclusion }}</text>
          <view v-if="alertItem.relatedTags.length" class="alert-tags">
            <text
              v-for="tag in alertItem.relatedTags"
              :key="tag.text"
              class="alert-tag"
            >{{ tag.text }}</text>
          </view>
        </view>

        <!-- 无报告 -->
        <view v-if="!audioPath && !items.length" class="empty-state">
          <SvgIcon name="file-line" size="80rpx" color="#9ca3af" />
          <text class="empty-text">今日播报尚未生成</text>
          <text class="empty-hint">请在 9:10 后查看</text>
        </view>

        <!-- 日期切换 -->
        <view class="date-nav">
          <view class="date-btn" @tap="changeDate(-1)">
            <SvgIcon name="arrow-left-line" size="32rpx" color="#0b5fff" />
            <text class="date-btn-text">前一天</text>
          </view>
          <view class="date-btn" @tap="changeDate(1)">
            <text class="date-btn-text">后一天</text>
            <SvgIcon name="arrow-right-line" size="32rpx" color="#0b5fff" />
          </view>
        </view>
      </template>
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { agentApi, type BriefType } from '@/shared/api/modules/agent'
import { API_BASE_URL } from '@/shared/utils/constants'
import {
  SOURCE_LABELS,
  SOURCE_ICONS,
  SENTIMENT_LABELS,
  type BriefingItem,
  type BriefingSource,
  type Sentiment,
} from '@/shared/api/modules/briefing'
import { parseBriefingItemsFromContent, type ReportType } from '@/shared/utils/briefingAdapter'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

interface BroadcastReport {
  content: {
    text?: string
    audio_path?: string | null
  }
}

interface BriefReportData {
  content?: unknown
}

const currentDate = ref('')
const broadcastType = ref<BriefType>('morning')
const loading = ref(true)
const report = ref<BroadcastReport | null>(null)
const items = ref<BriefingItem[]>([])
const isPlaying = ref(false)
const audioContext = ref<UniApp.InnerAudioContext | null>(null)

const subtitleText = computed(() => {
  const typeLabel = broadcastType.value === 'morning' ? '晨报' : '晚报'
  if (currentDate.value) {
    return `${currentDate.value} · ${typeLabel} · AI 生成内容，仅供参考`
  }
  return 'AI 生成内容，仅供参考'
})

const audioPath = computed(() => {
  return report.value?.content?.audio_path || null
})

const audioStatusText = computed(() => {
  if (!audioPath.value) return '语音生成中...'
  return isPlaying.value ? '播放中' : '点击播放'
})

/** 头条条目（isHeadline=true） */
const headlineItem = computed(() => {
  return items.value.find((item) => item.isHeadline) || null
})

/** 洞见列表（非头条非异动） */
const insightItems = computed(() => {
  return items.value.filter((item) => !item.isHeadline && !item.isAlert)
})

/** 异动公告（isAlert=true） */
const alertItem = computed(() => {
  return items.value.find((item) => item.isAlert) || null
})

function sourceLabel(source: BriefingSource): string {
  return SOURCE_LABELS[source] || source
}

function sourceIcon(source: BriefingSource): string {
  return SOURCE_ICONS[source] || '•'
}

function sentimentLabel(sentiment: Sentiment): string {
  return SENTIMENT_LABELS[sentiment] || sentiment
}

function sentimentClass(sentiment: Sentiment): string {
  return `sentiment-${sentiment}`
}

/** 点击音频卡片跳转播报详情页 */
function goDetail() {
  uni.navigateTo({
    url: `/pages-sub-app/briefing-detail/index?date=${currentDate.value}`,
  })
}

function togglePlay() {
  if (!audioPath.value) {
    uni.showToast({ title: '语音生成中', icon: 'none' })
    return
  }

  if (!audioContext.value) {
    // 从 audio_path 提取文件名
    const filename = audioPath.value.split('/').pop() || ''
    const audioUrl = `${API_BASE_URL}/agent/audio/${filename}`
    audioContext.value = uni.createInnerAudioContext()
    audioContext.value.src = audioUrl
    audioContext.value.onEnded(() => {
      isPlaying.value = false
    })
    audioContext.value.onError(() => {
      isPlaying.value = false
      uni.showToast({ title: '音频播放失败', icon: 'none' })
    })
  }

  if (isPlaying.value) {
    audioContext.value.pause()
    isPlaying.value = false
  } else {
    audioContext.value.play()
    isPlaying.value = true
  }
}

function changeDate(delta: number) {
  currentDate.value = addCalendarDays(currentDate.value, delta)
  loadReport()
}

/** 根据当前时间判断报告类型：15:30 前=晨报，之后=复盘 */
function detectReportType(): ReportType {
  const now = new Date()
  const hour = now.getHours()
  const minute = now.getMinutes()
  // 15:30 后用 review（复盘），之前用 morning（晨报）
  if (hour > 15 || (hour === 15 && minute >= 30)) {
    return 'review'
  }
  return 'morning'
}

async function loadReport() {
  if (!currentDate.value) return
  loading.value = true
  // 停止当前播放
  if (audioContext.value && isPlaying.value) {
    audioContext.value.stop()
    isPlaying.value = false
  }

  // 并行获取广播音频和结构化报告
  const reportType = detectReportType()

  try {
    const [broadcastRes, briefRes] = await Promise.allSettled([
      agentApi.getReport('broadcast', currentDate.value),
      agentApi.getReport(reportType, currentDate.value),
    ])

    // 广播报告（音频来源）
    if (broadcastRes.status === 'fulfilled') {
      report.value = (broadcastRes.value as BroadcastReport) || null
    } else {
      report.value = null
    }

    // 结构化条目（降级解析：从 morning/review 报告解析为 BriefingItem[]）
    if (briefRes.status === 'fulfilled' && briefRes.value) {
      const briefData = briefRes.value as BriefReportData
      items.value = parseBriefingItemsFromContent(briefData.content, reportType)
    } else {
      items.value = []
    }
  } catch {
    report.value = null
    items.value = []
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  const opts = options as Record<string, string> || {}
  broadcastType.value = opts.type === 'evening' ? 'evening' : 'morning'
  // 未传日期时用上海交易日：toISOString 返回 UTC 日期，凌晨 0:00-8:00
  // （上海时间）期间 UTC 仍是前一天，会取到错误的播报。
  currentDate.value = opts.date || shanghaiDateString()
  loadReport()
})

onUnmounted(() => {
  if (audioContext.value) {
    audioContext.value.destroy()
    audioContext.value = null
  }
})
</script>

<style lang="scss" scoped>
.briefing-content {
  padding: 32rpx;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: $ink-soft;
}

/* 音频入口条 */
.audio-bar {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx 32rpx;
  background: #ffffff;
  margin-bottom: 24rpx;
  border-radius: 20rpx;
  border: 1rpx solid $line;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.play-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: $primary;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.audio-info {
  flex: 1;
  min-width: 0;
}

.audio-status {
  font-size: 28rpx;
  color: $ink;
  font-weight: 600;
  display: block;
}

.audio-meta {
  font-size: 22rpx;
  color: #9ca3af;
  margin-top: 4rpx;
  display: block;
}

.audio-arrow {
  font-size: 36rpx;
  color: #9ca3af;
  flex-shrink: 0;
}

/* 头条卡片 */
.headline-card {
  background: linear-gradient(135deg, rgba(77, 124, 254, 0.04), rgba(99, 102, 241, 0.06));
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid rgba(77, 124, 254, 0.20);
  border-left: 8rpx solid $primary;
}

.headline-label {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.headline-star {
  font-size: 24rpx;
  color: $primary;
}

.headline-label-text {
  font-size: 22rpx;
  font-weight: 700;
  color: $primary;
  letter-spacing: 2rpx;
}

.headline-title {
  font-size: 34rpx;
  font-weight: 700;
  color: $ink;
  line-height: 1.4;
  display: block;
  margin-bottom: 16rpx;
}

.headline-conclusion {
  font-size: 26rpx;
  color: #4b5563;
  line-height: 1.6;
  display: block;
  margin-bottom: 20rpx;
}

.headline-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.headline-tag {
  font-size: 22rpx;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: #ffffff;
  color: $primary;
  border: 1rpx solid rgba(77, 124, 254, 0.20);
  font-weight: 500;
}

/* 分区标签 */
.section-label {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
  margin-top: 8rpx;
}

.section-label-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #9ca3af;
  flex-shrink: 0;
}

.section-line {
  flex: 1;
  height: 1rpx;
  background: $line;
}

/* 洞见列表 */
.insight-row {
  display: flex;
  gap: 24rpx;
  align-items: flex-start;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid $line;
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.03);
}

.insight-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: $primary;

  &.event { background: #d97706; }
  &.trend { background: #7c3aed; }
  &.alert { background: #e04545; }
  &.review { background: #64748b; }
  &.hot_burst { background: #0891b2; }
  &.wind_leader { background: $primary; }
}

.insight-icon-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #ffffff;
}

.insight-body {
  flex: 1;
  min-width: 0;
}

.insight-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.insight-source {
  font-size: 24rpx;
  font-weight: 600;
  color: $ink-soft;
}

.sentiment-badge {
  font-size: 22rpx;
  font-weight: 600;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;

  &.sentiment-bull {
    background: rgba(224, 69, 69, 0.08);
    color: #e04545;
  }

  &.sentiment-bear {
    background: rgba(43, 168, 74, 0.08);
    color: #2ba84a;
  }

  &.sentiment-mixed {
    background: rgba(148, 163, 184, 0.10);
    color: #64748b;
  }
}

.insight-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $ink;
  line-height: 1.4;
  display: block;
  margin-bottom: 8rpx;
}

.insight-conclusion {
  font-size: 24rpx;
  color: #4b5563;
  line-height: 1.5;
  display: block;
  margin-bottom: 12rpx;
}

.insight-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.mini-tag {
  font-size: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(77, 124, 254, 0.04);
  color: $primary;

  &.sector {
    background: rgba(148, 163, 184, 0.10);
    color: #64748b;
  }
}

/* 异动公告强调 */
.alert-card {
  background: rgba(224, 69, 69, 0.08);
  border-radius: 20rpx;
  padding: 28rpx 32rpx;
  margin-top: 8rpx;
  border: 1rpx solid rgba(224, 69, 69, 0.20);
  border-left: 8rpx solid #e04545;
}

.alert-label {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.alert-dot {
  font-size: 20rpx;
  color: #e04545;
}

.alert-label-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #e04545;
  letter-spacing: 2rpx;
}

.alert-title {
  font-size: 32rpx;
  font-weight: 700;
  color: $ink;
  line-height: 1.4;
  display: block;
  margin-bottom: 12rpx;
}

.alert-conclusion {
  font-size: 26rpx;
  color: #4b5563;
  line-height: 1.6;
  display: block;
  margin-bottom: 16rpx;
}

.alert-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.alert-tag {
  font-size: 22rpx;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: #ffffff;
  color: #e04545;
  border: 1rpx solid rgba(224, 69, 69, 0.20);
  font-weight: 500;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: $ink-soft;
  margin-top: 24rpx;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 22rpx;
  color: #9ca3af;
}

/* 日期切换 */
.date-nav {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  margin-top: 32rpx;
}

.date-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  flex: 1;
  padding: 24rpx 0;
  background: #ffffff;
  border-radius: 999rpx;
  border: 1rpx solid $line;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.04);
}

.date-btn-text {
  font-size: 26rpx;
  color: $primary;
  font-weight: 500;
}
</style>
