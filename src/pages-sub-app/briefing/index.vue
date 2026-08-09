<template>
  <SubPageCard2 :title="'早点听'" :subtitle="subtitleText">
    <view class="briefing-content">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <text class="loading-text">报告加载中...</text>
      </view>

      <template v-else>
        <!-- 非交易日回退提示：当日无报告时展示最近可用报告 -->
        <view v-if="isFallback" class="fallback-notice">
          <text class="fallback-notice-text">
            当日（{{ requestedDate }}）播报尚未生成，当前显示最近可用报告（{{ currentDate }}）
          </text>
        </view>

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
            <text class="audio-meta">{{ audioLabelText }} · 播报详情 ›</text>
          </view>
          <text class="audio-arrow">›</text>
        </view>

        <!-- 大盘洞见卡片（原市场异象）：参考早报「今日头条」卡片设计，紧跟音频播报下方（仅晚报展示，有异象时显示） -->
        <template v-if="broadcastType === 'evening' && eveningViewModel">
          <EveningAnomalyCard
            v-if="eveningViewModel.anomaly.hasAnomaly && eveningViewModel.attributionConclusion"
            :conclusion="eveningViewModel.attributionConclusion"
          />
        </template>

        <!-- 头条卡片：今日最重要研判（仅晨报展示） -->
        <view v-if="headlineItem && broadcastType !== 'evening'" class="headline-card">
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

        <!-- Agent 洞见列表（晚报场景下即使无数据也保留分区标题，保持与早报一致的页面结构） -->
        <view v-if="insightItems.length || broadcastType === 'evening'" class="section-label">
          <text class="section-label-text">Agent 洞见</text>
          <view class="section-line" />
        </view>

        <template v-for="entry in insightDisplayItems" :key="entry.id">
        <view v-if="entry.kind === 'item'" class="insight-row">
          <view class="insight-icon" :class="entry.item.source">
            <text class="insight-icon-text">{{ sourceIcon(entry.item.source) }}</text>
          </view>
          <view class="insight-body">
            <view class="insight-top">
              <text class="insight-source">{{ sourceLabel(entry.item.source) }}</text>
              <text class="sentiment-badge" :class="sentimentClass(entry.item.sentiment)">
                {{ sentimentLabel(entry.item.sentiment) }}
              </text>
            </view>
            <text class="insight-conclusion">{{ entry.item.conclusion }}</text>
            <view v-if="entry.item.relatedTags.length" class="insight-tags">
              <text
                v-for="tag in entry.item.relatedTags"
                :key="tag.text"
                class="mini-tag"
                :class="tag.type === 'sector' ? 'sector' : ''"
              >{{ tag.text }}</text>
            </view>
          </view>
        </view>

        <view v-else class="insight-row event-insight-row">
          <view class="insight-icon event">
            <text class="insight-icon-text">{{ sourceIcon('event') }}</text>
          </view>
          <view class="insight-body">
            <view class="insight-top">
              <text class="insight-source">事件传导</text>
              <text class="sentiment-badge sentiment-mixed">{{ entry.items.length }}条重点事件</text>
            </view>
            <view class="event-insight-list">
              <view v-for="event in entry.items" :key="event.id" class="event-insight-item" @tap="goEventAnalysis(event)">
                <text class="event-insight-title">{{ event.title }}</text>
                <text class="event-insight-conclusion">{{ event.conclusion }}</text>
              </view>
            </view>
          </view>
        </view>
        </template>

        <!-- 晚报专属卡片：大盘行情 + 板块行情（仅晚报展示，排布在 Agent 洞见之后；大盘洞见卡片已移至音频下方） -->
        <template v-if="broadcastType === 'evening' && eveningViewModel">
          <!-- 大盘行情卡片（指数 + 涨跌家数） -->
          <EveningMarketIndexCard
            v-if="eveningViewModel.presentation && (eveningViewModel.presentation.phenomenon.indexPerformance.length || eveningViewModel.breadth)"
            :indexes="eveningViewModel.presentation.phenomenon.indexPerformance"
            :breadth="eveningViewModel.breadth"
          />

          <!-- 板块行情卡片（早报风格） -->
          <EveningSectorsCard
            v-if="eveningViewModel.presentation && (eveningViewModel.presentation.sectorRanking.topGainers.length || eveningViewModel.presentation.sectorRanking.topLosers.length)"
            :presentation="eveningViewModel.presentation"
          />
        </template>

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
        <view class="briefing-toolbar">
          <view class="type-switch">
            <view
              :class="['type-btn', broadcastType === 'morning' ? 'active' : '']"
              @tap="switchType('morning')"
            >
              <text class="type-btn-text">晨报</text>
            </view>
            <view
              :class="['type-btn', broadcastType === 'evening' ? 'active' : '']"
              @tap="switchType('evening')"
            >
              <text class="type-btn-text">晚报</text>
            </view>
          </view>
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
        </view>
      </template>
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { agentApi, type BriefType, type BriefV1, type BroadcastV1, type MarketTraceReviewRecord } from '@/shared/api/modules/agent'
import { API_BASE_URL } from '@/shared/utils/constants'
import {
  SOURCE_LABELS,
  SOURCE_ICONS,
  SENTIMENT_LABELS,
  type BriefingItem,
  type BriefingSource,
  type Sentiment,
} from '@/shared/api/modules/briefing'
import { parseBriefingItemsFromBrief } from '@/shared/utils/briefingAdapter'
import { parseBriefingReport } from '@/shared/utils/briefingReport'
import { parseBroadcastReport } from '@/shared/utils/broadcastReport'
import { buildBriefingDetailUrl, normalizeBriefingType } from '@/shared/utils/briefingDetail'
import { shanghaiDateString, addCalendarDays } from '@/shared/utils/tradingTime'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { getEventList } from '@/modules/chat/event/api/eventApi'
import { usePodcastStore } from '@/shared/store/modules/podcast'
import EveningAnomalyCard from './components/EveningAnomalyCard.vue'
import EveningMarketIndexCard from './components/EveningMarketIndexCard.vue'
import EveningSectorsCard from './components/EveningSectorsCard.vue'
import {
  buildEveningCardViewModel,
  type EveningCardViewModel,
} from '@/shared/utils/eveningBriefCards'

const currentDate = ref('')
const broadcastType = ref<BriefType>('morning')
const loading = ref(true)
const report = ref<BroadcastV1 | null>(null)
const items = ref<BriefingItem[]>([])
const isPlaying = ref(false)
const audioContext = ref<UniApp.InnerAudioContext | null>(null)
/** 悬浮播报 store：退出页面时把播放移交悬浮窗续播 */
const podcastStore = usePodcastStore()

/** 无当日报告时最多向前回退的自然日数（覆盖周末与长假缺口）。 */
const MAX_FALLBACK_DAYS = 7
/** 是否正在展示回退得到的最近可用报告（非交易日场景）。 */
const isFallback = ref(false)
/** 用户请求的原始日期，当日无报告时用于回退提示。 */
const requestedDate = ref('')
/** 晚报卡片 ViewModel（仅晚报分支使用） */
const eveningViewModel = ref<EveningCardViewModel | null>(null)

const subtitleText = computed(() => {
  const typeLabel = broadcastType.value === 'morning' ? '晨报' : '晚报'
  if (currentDate.value) {
    return `${currentDate.value} · ${typeLabel} · AI 生成内容，仅供参考`
  }
  return 'AI 生成内容，仅供参考'
})

const audioPath = computed(() => {
  return report.value?.audio_path || null
})

/** 音频入口文案：根据播报类型动态展示"AI 早报音频"或"AI 晚报音频" */
const audioLabelText = computed(() => {
  return broadcastType.value === 'morning' ? 'AI 早报音频' : 'AI 晚报音频'
})

const audioStatusText = computed(() => {
  if (!audioPath.value) return '语音生成中...'
  return isPlaying.value ? '播放中' : '点击播放'
})

/** 头条条目（isHeadline=true） */
const headlineItem = computed(() => {
  return items.value.find((item) => item.isHeadline) || null
})

/** 洞见列表（非头条非异动）
 *  晚报场景下头条卡片不展示，且为避免与下方「大盘洞见/大盘行情/板块行情」
 *  专属卡片内容重复，洞见列表仅保留「收盘复盘」摘要；归因结论与市场快照
 *  分别由 EveningAnomalyCard / EveningMarketIndexCard + EveningSectorsCard 展示。 */
const REVIEW_SUMMARY_TITLE = '收盘复盘'
const insightItems = computed(() => {
  if (broadcastType.value === 'evening') {
    return items.value.filter((item) => !item.isAlert && item.title === REVIEW_SUMMARY_TITLE)
  }
  return items.value.filter((item) => !item.isHeadline && !item.isAlert)
})

/** 异动公告（isAlert=true） */
const alertItem = computed(() => {
  return items.value.find((item) => item.isAlert) || null
})

type InsightDisplayItem =
  | { kind: 'item'; id: string; item: BriefingItem }
  | { kind: 'event-group'; id: string; items: BriefingItem[] }

/** 同一份 Brief 中的事件传导条目合并为一个容器，最多保留三条重点摘要。 */
const insightDisplayItems = computed<InsightDisplayItem[]>(() => {
  const sourceItems = insightItems.value
  const eventItems = sourceItems.filter((item) => item.source === 'event').slice(0, 3)
  const result: InsightDisplayItem[] = []
  let eventGroupAdded = false

  for (const item of sourceItems) {
    if (item.source === 'event') {
      if (!eventGroupAdded && eventItems.length) {
        result.push({ kind: 'event-group', id: 'event-group', items: eventItems })
        eventGroupAdded = true
      }
      continue
    }
    result.push({ kind: 'item', id: item.id, item })
  }
  return result
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

/** 将早点听摘要与事件库标题做最小匹配，命中后直达对应 AI 事件分析。 */
function eventMatchScore(target: string, candidate: string): number {
  const normalizedTarget = target.replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, '')
  const normalizedCandidate = candidate.replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, '')
  const chunks = new Set<string>()
  for (let index = 0; index < normalizedTarget.length - 1; index++) {
    chunks.add(normalizedTarget.slice(index, index + 2))
  }
  let score = 0
  for (const chunk of chunks) {
    if (normalizedCandidate.includes(chunk)) score++
  }
  return score
}

async function goEventAnalysis(event: BriefingItem) {
  try {
    const response = await getEventList({ page: 1, pageSize: 100 })
    const target = `${event.title}${event.conclusion}`
    const matched = response.events
      .map((candidate) => ({ candidate, score: eventMatchScore(target, candidate.title) }))
      .sort((left, right) => right.score - left.score)[0]

    if (matched && matched.score >= 2) {
      uni.navigateTo({ url: `/modules/chat/pages/event/detail?id=${matched.candidate.eventId}` })
      return
    }
  } catch {
    // 找不到精确事件时回退到事件列表，避免点击无反馈。
  }
  uni.navigateTo({ url: '/pages-sub-app/event-chain/index' })
}

/** 点击音频卡片进入双人播报详情页，查看主持人/分析师对话。 */
function goDetail() {
  uni.navigateTo({
    url: buildBriefingDetailUrl(currentDate.value, broadcastType.value),
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

/** 切换晨报/晚报，重新加载当日对应类型的报告 */
function switchType(type: BriefType) {
  if (broadcastType.value === type) return
  broadcastType.value = type
  loadReport()
}

/**
 * 拉取指定日期的广播与简报并写入展示状态，返回是否找到可用内容。
 * 仅消费通过严格校验的 Broadcast v1 / Brief v1（解析器强制绑定同日同类型，
 * 不会把跨日期或旧结构数据混入）。
 */
async function fetchReportFor(date: string): Promise<boolean> {
  try {
    // 晚报分支：并行加载 broadcast + brief + review
    // 晨报分支：保持原逻辑（broadcast + brief），不加载 review
    const requests: Promise<unknown>[] = [
      agentApi.getBroadcast(broadcastType.value, date),
      agentApi.getBrief(broadcastType.value, date),
    ]
    if (broadcastType.value === 'evening') {
      requests.push(agentApi.getMarketTraceReview(date))
    }

    const [broadcastRes, briefRes, reviewRes] = await Promise.allSettled(requests)

    // 仅消费通过严格校验的 Broadcast v1，避免跨日期或旧结构数据混入。
    if (broadcastRes.status === 'fulfilled') {
      report.value = parseBroadcastReport(broadcastRes.value as BroadcastV1, broadcastType.value, date)
    } else {
      report.value = null
    }

    // Brief v1 已是前端展示报告的事实层，校验后转换为现有卡片展示格式。
    if (briefRes.status === 'fulfilled' && briefRes.value) {
      const brief = parseBriefingReport(briefRes.value as BriefV1, broadcastType.value)
      items.value = parseBriefingItemsFromBrief(brief)

      // 晚报分支：组装 eveningViewModel（异象判定 + 行情数据）
      if (broadcastType.value === 'evening') {
        const review = reviewRes && reviewRes.status === 'fulfilled'
          ? (reviewRes.value as MarketTraceReviewRecord)
          : null
        eveningViewModel.value = buildEveningCardViewModel(brief, review, date)
      } else {
        eveningViewModel.value = null
      }
    } else {
      items.value = []
      // brief 加载失败时，晚报分支仍尝试用 review 组装 ViewModel，
      // 让行情卡片在 brief 不可用时能独立展示（buildEveningCardViewModel 支持 brief=null）。
      if (broadcastType.value === 'evening') {
        const review = reviewRes && reviewRes.status === 'fulfilled'
          ? (reviewRes.value as MarketTraceReviewRecord)
          : null
        eveningViewModel.value = buildEveningCardViewModel(null, review, date)
      } else {
        eveningViewModel.value = null
      }
    }

    return report.value !== null || items.value.length > 0
  } catch {
    report.value = null
    items.value = []
    eveningViewModel.value = null
    return false
  }
}

async function loadReport() {
  if (!currentDate.value) return
  loading.value = true
  // 停止当前播放
  if (audioContext.value && isPlaying.value) {
    audioContext.value.stop()
    isPlaying.value = false
  }

  const requested = currentDate.value
  isFallback.value = false
  requestedDate.value = ''

  try {
    // 非交易日/当日未生成时，向前回退到最近一个存在报告的日期并明确标注。
    let found = false
    for (let offset = 0; offset <= MAX_FALLBACK_DAYS; offset++) {
      const date = offset === 0 ? requested : addCalendarDays(requested, -offset)
      if (await fetchReportFor(date)) {
        if (offset > 0) {
          currentDate.value = date
          isFallback.value = true
          requestedDate.value = requested
        }
        found = true
        break
      }
    }
    if (!found) {
      // 回退窗口内无任何报告：保持请求日期，展示空状态。
      currentDate.value = requested
    }
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  const opts = options as Record<string, string> || {}
  broadcastType.value = normalizeBriefingType(opts.type)
  // 未传日期时用上海交易日：toISOString 返回 UTC 日期，凌晨 0:00-8:00
  // （上海时间）期间 UTC 仍是前一天，会取到错误的播报。
  currentDate.value = opts.date || shanghaiDateString()
  loadReport()
})

onUnmounted(() => {
  // 播放中退出页面：把音频移交悬浮播报继续播放（从当前进度续播），避免退出即暂停
  if (audioContext.value && isPlaying.value) {
    const filename = audioPath.value?.split('/').pop() || ''
    const url = `${API_BASE_URL}/agent/audio/${filename}`
    const label = broadcastType.value === 'morning' ? 'AI 早报' : 'AI 晚报'
    podcastStore.playDirect(
      url,
      `briefing-${broadcastType.value}-${currentDate.value}`,
      label,
      audioContext.value.currentTime || 0,
    )
  }
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
  background: #ffffff;
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
  &.review { background: #e04545; }
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
  /* 统一为单标题：来源标签升级为标题样式（替代原条目标题） */
  font-size: 28rpx;
  font-weight: 600;
  color: $ink;
  line-height: 1.4;
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

.event-insight-list {
  display: flex;
  flex-direction: column;
}

.event-insight-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid $line-soft;
  cursor: pointer;

  &:first-child { padding-top: 4rpx; }
  &:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }
}

.event-insight-title {
  display: block;
  margin-bottom: 6rpx;
  color: $ink;
  font-size: 25rpx;
  font-weight: 600;
  line-height: 1.45;
}

.event-insight-conclusion {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: #4b5563;
  font-size: 23rpx;
  line-height: 1.55;
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

/* 非交易日回退提示 */
.fallback-notice {
  background: rgba(217, 119, 6, 0.08);
  border: 1rpx solid rgba(217, 119, 6, 0.20);
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
  margin-bottom: 24rpx;
}

.fallback-notice-text {
  font-size: 22rpx;
  color: #92400e;
  line-height: 1.5;
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

/* 晨报/晚报切换 + 日期切换组合工具栏 */
.briefing-toolbar {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-top: 36rpx;
}

.type-switch {
  display: flex;
  gap: 16rpx;
}

.type-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 0;
  border-radius: 12rpx;
  background: #ffffff;
  border: 2rpx solid $line;
}

.type-btn.active {
  background: $primary;
  border-color: $primary;
}

.type-btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: $ink-soft;
}

.type-btn.active .type-btn-text {
  color: #ffffff;
}

/* 日期切换 */
.date-nav {
  display: flex;
  justify-content: space-between;
}

.date-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 14rpx 22rpx;
  background: #ffffff;
  border-radius: 999rpx;
  box-shadow: 0 2rpx 8rpx rgba(11, 95, 255, 0.08);
}

.date-btn-text {
  font-size: 24rpx;
  color: $primary;
}
</style>
