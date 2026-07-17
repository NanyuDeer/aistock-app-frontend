<template>
  <SubPageCard :title="pageTitle">
    <!-- 导航栏右侧加入监控按钮 -->
    <template #header-right>
      <view
        v-if="detail"
        :class="['nav-monitor-button', { active: isMonitored, disabled: favoritesStore.isPending(symbol) }]"
        @tap.stop="addToMonitor"
      >
        <text>{{ isMonitored ? '已监控' : '加入监控' }}</text>
      </view>
    </template>

    <!-- 详情内容（SubPageCard 内部已有 scroll-view，无需自行包裹） -->
    <LoadingState v-if="loading" text="正在加载评分详情" />
    <view v-else-if="errorMessage" class="state-panel">
      <SvgIcon name="error-warning-line" size="64rpx" color="#f59e0b" />
      <text class="state-title">评分详情暂时无法加载</text>
      <text class="state-desc">{{ errorMessage }}</text>
      <button class="retry-button" @tap="loadDetail">重新加载</button>
    </view>
    <view v-else-if="vetoReasons.length" class="state-panel">
      <SvgIcon name="shield-cross-line" size="64rpx" color="#f59e0b" />
      <text class="state-title">该股票暂未进入趋势评分</text>
      <text v-for="reason in vetoReasons" :key="reason" class="veto-reason">{{ reason }}</text>
    </view>
    <view v-else-if="detail" class="detail-content">
      <view class="score-overview">
        <view class="score-heading">
          <view class="score-main">
            <text class="score-label">综合评分</text>
            <view class="score-value-row">
              <text class="score-value">{{ detail.score }}</text>
              <text class="score-denominator">/100</text>
            </view>
            <view class="stock-context">
              <view class="stock-context-info">
                <text class="stock-context-symbol">{{ detail.symbol }}</text>
                <text v-if="detail.expectedMultiple" class="stock-context-multiple">预期 {{ detail.expectedMultiple }} 趋势</text>
              </view>
            </view>
          </view>
          <view class="grade-block">
            <text class="score-label">评级</text>
            <text :class="['score-grade', `grade-${detail.label.toLowerCase()}`]">{{ detail.label }}</text>
            <text v-if="ratingMeaning" class="rating-pill">{{ ratingMeaning }}</text>
          </view>
        </view>
      </view>

      <view class="dimension-list">
        <view v-for="(dimension, index) in detail.dimensions" :key="dimension.name" class="dimension-card">
          <view class="dimension-header" @tap="toggleDimension(index)">
            <view class="dimension-name-wrap">
              <view class="dimension-icon">
                <SvgIcon :name="dimensionIcon(index)" size="30rpx" color="#4d7cfe" />
              </view>
              <view class="dimension-copy">
                <view class="dimension-title-row">
                  <text class="dimension-name">{{ dimension.name }}</text>
                  <text class="dimension-weight">{{ dimension.weight }}%</text>
                </view>
                <text class="dimension-description">{{ dimensionDescription(index) }}</text>
              </view>
            </view>
            <view class="dimension-result">
              <text :class="['dimension-score', `tone-text-${index}`]">{{ dimension.score }}</text>
              <SvgIcon
                :name="activeDimension === index ? 'arrow-up-s-line' : 'arrow-down-s-line'"
                size="32rpx"
                color="#4d7cfe"
              />
            </view>
          </view>
          <view class="dimension-score-progress">
            <view
              :class="['dimension-score-progress-fill', `tone-fill-${index}`]"
              :style="{ width: `${clampScore(dimension.score)}%` }"
            />
          </view>

          <view v-if="activeDimension === index" class="dimension-body">
            <template v-if="index === 0 && technicalDetail">
              <TrendKLineChart :title="`${stockName} · 近期K线`" :data="technicalDetail.kline" />
              <TrendKLineChart
                :title="`${technicalDetail.conceptKline.name || '概念指数'} · 近期K线`"
                :data="technicalDetail.conceptKline"
              />
              <view class="technical-grid">
                <view v-for="item in technicalIndicators" :key="item.label" class="technical-item">
                  <text class="technical-label">{{ item.label }}</text>
                  <text :class="['technical-value', item.tone]">{{ item.value }}</text>
                </view>
              </view>
              <view class="conclusion technical-conclusion">
                <view class="conclusion-title">
                  <view class="conclusion-icon">
                    <SvgIcon name="information-line" size="26rpx" color="#ffffff" />
                  </view>
                  <text>趋势判读</text>
                </view>
                <text class="conclusion-text">{{ trendAnalysis }}</text>
              </view>
            </template>

            <template v-else-if="index === 1 && trackDetail">
              <view class="track-hero">
                <text class="sector-name">{{ trackDetail.sectorName || '所属概念' }}</text>
                <text class="track-caption">近60日上榜</text>
                <view class="count-row">
                  <text class="track-count">{{ trackDetail.sectorListCount60d }}</text>
                  <text class="track-unit">次</text>
                </view>
              </view>
              <view v-if="weeklyTrend.length" class="weekly-chart">
                <view v-for="(count, idx) in weeklyTrend" :key="idx" class="week-column">
                  <text class="week-count">{{ count }}</text>
                  <view class="bar-track">
                    <view class="week-bar" :style="{ height: barHeight(count) }" />
                  </view>
                  <text class="week-label">{{ weekLabels[idx] }}</text>
                </view>
              </view>
              <view class="track-stats">
                <view class="track-stat">
                  <text class="stat-label">板块月涨幅</text>
                  <text :class="['stat-value', isPositive(trackDetail.sectorStrength) ? 'up' : 'down']">
                    {{ trackDetail.sectorStrength || '--' }}
                  </text>
                </view>
                <view class="track-stat">
                  <text class="stat-label">市场认可度</text>
                  <text class="stat-value brand">{{ trackDetail.marketRecognition ?? '--' }}</text>
                </view>
              </view>
              <view class="policy-section">
                <text class="section-title">板块信息与政策趋势</text>
                <view class="policy-list">
                  <view class="policy-item">
                    <view class="policy-dot policy-dot-up" />
                    <view class="policy-content">
                      <text class="policy-name">所属板块</text>
                      <text class="policy-desc">{{ trackDetail.sectorName || '暂无板块信息' }}</text>
                    </view>
                  </view>
                  <view
                    v-for="(item, policyIndex) in trackDetail.policyItems || []"
                    :key="`${item.name}-${policyIndex}`"
                    class="policy-item"
                  >
                    <view :class="['policy-dot', item.color === 'gold' ? 'policy-dot-gold' : 'policy-dot-up']" />
                    <view class="policy-content">
                      <text class="policy-name">{{ item.name }}</text>
                      <text class="policy-desc">{{ item.desc }}</text>
                    </view>
                  </view>
                  <view v-if="!trackDetail.policyItems?.length" class="policy-item">
                    <view class="policy-dot policy-dot-gold" />
                    <view class="policy-content">
                      <text class="policy-name">暂无明显政策催化</text>
                      <text class="policy-desc">近期无重大政策或产业趋势变化</text>
                    </view>
                  </view>
                </view>
              </view>
            </template>

            <template v-else-if="index === 2 && newsDetail">
              <view class="news-heading">
                <text class="section-title">近期重大资讯</text>
                <view class="news-stats">
                  <text class="news-stat">
                    机构调研：<text class="news-stat-strong">{{ newsDetail.researchCount || 0 }}</text> 家
                  </text>
                  <text class="news-stat">硬催化：{{ newsDetail.hardCatalyst || '--' }}</text>
                </view>
              </view>
              <view v-if="newsDetail.news.length" class="news-list">
                <view
                  v-for="(news, newsIndex) in newsDetail.news.slice(0, 5)"
                  :key="`${news.title}-${newsIndex}`"
                  class="news-item"
                  @tap="toggleNews(newsIndex)"
                >
                  <view class="news-topline">
                    <text class="news-tag">资讯</text>
                    <text class="news-title">{{ news.title }}</text>
                    <SvgIcon
                      :name="expandedNews === newsIndex ? 'arrow-up-s-line' : 'arrow-down-s-line'"
                      size="28rpx"
                      color="#9ca3af"
                    />
                  </view>
                  <view class="news-meta">
                    <text>{{ news.source || '财联社' }}</text>
                    <text>{{ formatTime(news.publishTime) }}</text>
                  </view>
                  <text v-if="expandedNews === newsIndex" class="news-summary">
                    {{ news.summary || '暂无摘要' }}
                  </text>
                </view>
              </view>
              <EmptyState v-else icon="newspaper-line" text="近期暂无重大资讯" />
            </template>

            <template v-else-if="index === 3 && fundamentalDetail">
              <view class="fundamental-list">
                <view v-for="sub in fundamentalDetail.subDimensions" :key="sub.name" class="factor-group">
                  <view class="factor-heading">
                    <view class="factor-title-row">
                      <text class="factor-title">{{ sub.name }}</text>
                      <text class="factor-weight">{{ sub.weight }}%</text>
                    </view>
                    <text class="factor-score">{{ sub.score }}</text>
                  </view>
                  <view class="score-track">
                    <view class="score-fill" :style="{ width: `${clampScore(sub.score)}%` }" />
                  </view>
                  <view class="indicator-list">
                    <view v-for="indicator in sub.indicators" :key="indicator.key" class="indicator-row">
                      <text class="indicator-name">{{ indicator.name }}</text>
                      <text class="indicator-value">{{ indicator.value }}</text>
                      <text class="indicator-score">{{ indicator.score }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </template>
          </view>
        </view>
      </view>

      <view class="detail-footnote">
        <text>更新时间：{{ formatTime(detail.updatedAt || detail.scoreDate) }}</text>
        <text>评分基于公开数据与模型测算，仅供参考，不构成投资建议。</text>
      </view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import {
  isTrendScoreVetoed,
  trendScoreApi,
  type TrendFundamentalDetail,
  type TrendNewsDetail,
  type TrendScoreDetail,
  type TrendTechnicalDetail,
  type TrendTrackDetail,
} from '@/shared/api/modules/trend-score'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import LoadingState from '@/shared/components/LoadingState.vue'
import EmptyState from '@/shared/components/EmptyState.vue'
import TrendKLineChart from '@/modules/analytics/components/TrendKLineChart.vue'
import { useFavoritesStore } from '@/shared/store/modules/favorites'

const symbol = ref('')
const stockName = ref('')
const detail = ref<TrendScoreDetail | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const vetoReasons = ref<string[]>([])
const activeDimension = ref<number | null>(null)
const expandedNews = ref<number | null>(null)
const weekLabels = ['5周前', '4周前', '3周前', '2周前', '上周', '本周']
const favoritesStore = useFavoritesStore()
const isMonitored = computed(() => favoritesStore.isFavorite(symbol.value))
const trendAnalysis = computed(() => (
  detail.value?.aiConclusion
  || detail.value?.description
  || '综合多维评分，当前趋势状态仍需结合后续数据持续观察。'
))
const ratingMeaning = computed(() => {
  const grade = String(detail.value?.label || '').toUpperCase()
  const labels: Record<string, string> = {
    S: '强趋势',
    A: '趋势形成',
    B: '趋势酝酿',
    C: '弱趋势',
    D: '观望',
  }
  return labels[grade] || ''
})

const pageTitle = computed(() => `${stockName.value || symbol.value} · 趋势评分`)
const technicalDetail = computed<TrendTechnicalDetail | null>(() => {
  const value = detail.value?.dimensions?.[0]?.detail
  return value && 'kline' in value ? value as TrendTechnicalDetail : null
})

const trackDetail = computed<TrendTrackDetail | null>(() => {
  const value = detail.value?.dimensions?.[1]?.detail
  return value && 'sectorListCount60d' in value ? value as TrendTrackDetail : null
})

const newsDetail = computed<TrendNewsDetail | null>(() => {
  const value = detail.value?.dimensions?.[2]?.detail
  return value && 'news' in value ? value as TrendNewsDetail : null
})

const fundamentalDetail = computed<TrendFundamentalDetail | null>(() => {
  const value = detail.value?.dimensions?.[3]?.detail
  return value && 'subDimensions' in value ? value as TrendFundamentalDetail : null
})

const weeklyTrend = computed(() => (trackDetail.value?.weeklyListingTrend || []).slice(-6))
const maxWeeklyCount = computed(() => Math.max(1, ...weeklyTrend.value))

const technicalIndicators = computed(() => {
  const value = technicalDetail.value?.indicators
  if (!value) return []
  return [
    { label: '近120日低点涨幅', value: formatPercent(value.lowPointGain), tone: value.lowPointGain >= 0 ? 'up' : 'down' },
    { label: 'MA60位置', value: value.ma60Position === 'above' ? '线上' : '线下', tone: value.ma60Position === 'above' ? 'up' : 'down' },
    { label: 'MA60趋势', value: trendLabel(value.ma60Trend), tone: value.ma60Trend === 'up' ? 'up' : value.ma60Trend === 'down' ? 'down' : '' },
    { label: '250日新高', value: value.isNewHigh250 ? '是' : '否', tone: value.isNewHigh250 ? 'up' : '' },
    { label: '120日新高', value: value.isNewHigh120 ? '是' : '否', tone: value.isNewHigh120 ? 'up' : '' },
    { label: '最大回撤', value: formatPercent(value.maxDrawdown), tone: value.maxDrawdown <= -20 ? 'down' : '' },
  ]
})

function trendLabel(value: 'up' | 'flat' | 'down'): string {
  return value === 'up' ? '向上' : value === 'down' ? '向下' : '走平'
}

function formatPercent(value: number): string {
  if (!Number.isFinite(Number(value))) return '--'
  const number = Number(value)
  return `${number > 0 ? '+' : ''}${number.toFixed(1)}%`
}

function formatTime(value?: string): string {
  if (!value) return '--'
  return String(value).replace('T', ' ').slice(0, 16)
}

function dimensionIcon(index: number): string {
  return ['line-chart-line', 'focus-3-line', 'newspaper-line', 'file-list-3-line'][index] || 'bar-chart-line'
}

function dimensionDescription(index: number): string {
  return [
    'K线形态是否走出趋势',
    '所在赛道是否处于景气周期',
    '是否有持续性消息催化',
    '业绩 · 估值 · 盈利 · 壁垒',
  ][index] || ''
}

function toggleDimension(index: number) {
  activeDimension.value = activeDimension.value === index ? null : index
  expandedNews.value = null
}

function toggleNews(index: number) {
  expandedNews.value = expandedNews.value === index ? null : index
}

function barHeight(count: number): string {
  return `${Math.max(8, Math.round((count / maxWeeklyCount.value) * 104))}rpx`
}

function isPositive(value?: string): boolean {
  return Boolean(value && !value.trim().startsWith('-'))
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Number(value) || 0))
}

async function loadDetail() {
  if (!symbol.value) {
    errorMessage.value = '缺少股票代码'
    return
  }
  loading.value = true
  errorMessage.value = ''
  vetoReasons.value = []
  try {
    const result = await trendScoreApi.getDetail(symbol.value)
    if (isTrendScoreVetoed(result)) {
      vetoReasons.value = result.reasons || ['未通过趋势股预筛选']
      detail.value = null
    } else {
      detail.value = result
    }
  } catch (error: unknown) {
    const message = (error as { errMsg?: string; message?: string })?.errMsg
      || (error as { message?: string })?.message
    errorMessage.value = message || '请稍后重试'
  } finally {
    loading.value = false
  }
}

// 保留：直接 URL 访问（页面栈为空）时的返回兜底，redirectTo 路径不变。
// 常规返回由 SubPageCard 自带返回按钮处理；此处保留 fallback 不丢失。
function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.redirectTo({ url: '/modules/analytics/pages/trend-score' })
}

async function addToMonitor() {
  if (!symbol.value || favoritesStore.isPending(symbol.value)) return
  if (isMonitored.value) {
    uni.showToast({ title: '该股票已在监控中', icon: 'none' })
    return
  }

  const added = await favoritesStore.add(symbol.value, stockName.value || symbol.value)
  if (added) uni.showToast({ title: '已加入监控', icon: 'none' })
}

onLoad((options) => {
  symbol.value = String(options?.symbol || '')
  try {
    stockName.value = decodeURIComponent(String(options?.name || symbol.value))
  } catch {
    stockName.value = String(options?.name || symbol.value)
  }
  loadDetail()
})

onShow(() => {
  void favoritesStore.fetchFavorites({ silent: true })
})
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

.nav-monitor-button {
  min-height: 44rpx;
  padding: 0 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  border: 1rpx solid $brand-color;
  border-radius: $radius-pill;
  color: $brand-color;
  font-size: 20rpx;
  font-weight: 600;
  white-space: nowrap;
}
.nav-monitor-button.active { color: $bg-color-grey; background: $brand-color; }
.nav-monitor-button.disabled { opacity: 0.55; }
.nav-monitor-button text { white-space: nowrap; }

// H5 的 scroll-view 会再生成一层真正的滚动容器；关闭滚动锚定，
// 避免展开维度详情时浏览器为保持底部锚点而自动改变 scrollTop。
// 详情页内容现在由 SubPageCard 的 scroll-view（.sub-page-content）承载，故定向其内部容器。
:deep(.sub-page-content .uni-scroll-view),
:deep(.sub-page-content .uni-scroll-view-content) {
  overflow-anchor: none;
}
.detail-content { padding: 0 $spacing-base $spacing-lg; }

.score-overview {
  padding: $spacing-base;
  border: 1rpx solid $border-color-light;
  border-radius: $radius-lg;
  background: $bg-color-grey;
  box-shadow: $shadow-card;
}

.score-heading { display: grid; grid-template-columns: minmax(0, 1fr) 150rpx; column-gap: $spacing-base; }
.score-main,
.grade-block { min-width: 0; display: grid; grid-template-rows: 32rpx 80rpx 40rpx; align-items: center; }
.score-label { align-self: start; color: $text-color-secondary; font-size: $font-size-sm; line-height: 1.3; }
.score-value-row { align-self: center; display: flex; align-items: baseline; }
.score-value { color: $brand-color; font-size: 72rpx; font-weight: 700; line-height: 1; }
.score-denominator { color: $text-color-tertiary; font-size: $font-size-sm; }
.grade-block { justify-items: center; }
.score-grade { align-self: center; font-size: 68rpx; font-weight: 700; line-height: 1; text-align: center; }
.rating-pill {
  align-self: center;
  padding: 4rpx 10rpx;
  border: 1rpx solid rgba(212, 168, 67, 0.34);
  border-radius: $radius-pill;
  color: #a67c1f;
  background: rgba(212, 168, 67, 0.09);
  font-size: 18rpx;
  font-weight: 650;
  line-height: 1.2;
  white-space: nowrap;
}
.grade-s { color: $stock-up-color; }
.grade-a { color: $warning-color; }
.grade-b, .grade-c, .grade-d { color: $brand-color; }

.stock-context { min-width: 0; align-self: center; }
.stock-context-info { min-width: 0; display: flex; align-items: center; gap: $spacing-xs; }
.stock-context-symbol { color: $text-color-tertiary; font-size: $font-size-xs; }
.stock-context-multiple { padding: 4rpx 12rpx; border-radius: 6rpx; color: #b7791f; background: #fff7e6; font-size: $font-size-xs; }
.conclusion {
  margin: $spacing-base 0;
  padding: $spacing-sm $spacing-base;
  border: 1rpx solid rgba(77, 124, 254, 0.3);
  border-radius: $radius-base;
  background: rgba(77, 124, 254, 0.04);
}
.conclusion-title { display: flex; align-items: center; gap: $spacing-sm; color: $brand-color; font-size: $font-size-base; font-weight: 650; }
.conclusion-icon { width: 46rpx; height: 46rpx; display: flex; align-items: center; justify-content: center; border-radius: $radius-sm; background: $brand-color; }
.conclusion-text { display: block; margin-top: $spacing-xs; color: $text-color-secondary; font-size: $font-size-sm; line-height: 1.7; }
.technical-conclusion { margin: $spacing-base; }

.tone-fill-0 { background: $brand-color; }
.tone-fill-1 { background: $stock-up-color; }
.tone-fill-2 { background: $warning-color; }
.tone-fill-3 { background: $text-color-title; }
.tone-text-0 { color: $brand-color; }
.tone-text-1 { color: $stock-up-color; }
.tone-text-2 { color: $warning-color; }
.tone-text-3 { color: $text-color-title; }

.dimension-list { margin-top: $spacing-base; display: flex; flex-direction: column; gap: $spacing-sm; }
.dimension-card { overflow: hidden; border: 1rpx solid $border-color; border-radius: $radius-base; background: $bg-color-grey; box-shadow: $shadow-base; }
.dimension-header { min-height: 106rpx; padding: $spacing-sm $spacing-base; display: flex; align-items: center; justify-content: space-between; gap: $spacing-sm; }
.dimension-header:active { background: $bg-color-muted; }
.dimension-name-wrap { min-width: 0; flex: 1; display: flex; align-items: center; gap: $spacing-sm; }
.dimension-result { flex-shrink: 0; display: flex; align-items: center; gap: $spacing-sm; }
.dimension-icon { width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; border-radius: $radius-sm; background: rgba(77, 124, 254, 0.08); }
.dimension-copy { min-width: 0; flex: 1; }
.dimension-title-row { display: flex; align-items: baseline; gap: $spacing-xs; }
.dimension-name { color: $text-color-title; font-size: $font-size-base; font-weight: 650; }
.dimension-weight { color: $text-color-tertiary; font-size: $font-size-sm; }
.dimension-description { display: block; margin-top: 5rpx; overflow: hidden; color: $text-color-tertiary; font-size: $font-size-xs; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.dimension-score { font-size: $font-size-lg; font-weight: 650; }
.dimension-score-progress {
  height: 8rpx;
  margin: -8rpx 76rpx 16rpx 88rpx;
  overflow: hidden;
  border-radius: $radius-pill;
  background: $bg-color-hover;
}
.dimension-score-progress-fill { height: 100%; border-radius: $radius-pill; }
.dimension-body { border-top: 1rpx solid $border-color-light; }

.technical-grid { display: grid; grid-template-columns: repeat(2, 1fr); }
.technical-item { min-height: 80rpx; padding: $spacing-sm $spacing-base; display: flex; align-items: center; justify-content: space-between; gap: $spacing-xs; border-right: 1rpx solid $border-color-light; border-bottom: 1rpx solid $border-color-light; }
.technical-label { color: $text-color-secondary; font-size: $font-size-sm; }
.technical-value { color: $text-color-title; font-size: $font-size-sm; font-weight: 600; }
.technical-value.up { color: $stock-up-color; }
.technical-value.down { color: $stock-down-color; }

.track-hero { padding: $spacing-base; display: flex; flex-direction: column; align-items: center; }
.sector-name { color: $text-color-title; font-size: $font-size-lg; font-weight: 650; }
.track-caption { margin-top: $spacing-base; color: $text-color-secondary; font-size: $font-size-sm; }
.count-row { display: flex; align-items: baseline; gap: $spacing-xs; }
.track-count { color: $stock-up-color; font-size: 72rpx; font-weight: 700; }
.track-unit { color: $text-color-secondary; font-size: $font-size-base; }
.weekly-chart { height: 180rpx; padding: 0 $spacing-base $spacing-base; display: flex; align-items: flex-end; justify-content: space-between; gap: $spacing-xs; }
.week-column { flex: 1; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
.week-count { color: $text-color-secondary; font-size: 18rpx; }
.bar-track { height: 104rpx; display: flex; align-items: flex-end; }
.week-bar { width: 28rpx; min-height: 8rpx; border-radius: $radius-xs $radius-xs 0 0; background: $stock-up-color; }
.week-label { margin-top: $spacing-xs; color: $text-color-tertiary; font-size: 18rpx; white-space: nowrap; }
.track-stats { display: grid; grid-template-columns: repeat(2, 1fr); border-top: 1rpx solid $border-color-light; }
.track-stat { padding: $spacing-base; display: flex; flex-direction: column; align-items: center; gap: $spacing-xs; }
.track-stat + .track-stat { border-left: 1rpx solid $border-color-light; }
.stat-label { color: $text-color-secondary; font-size: $font-size-sm; }
.stat-value { font-size: $font-size-xl; font-weight: 700; }
.stat-value.up { color: $stock-up-color; }
.stat-value.down { color: $stock-down-color; }
.stat-value.brand { color: $brand-color; }

.section-title { color: $text-color-title; font-size: $font-size-base; font-weight: 650; }
.policy-section { padding: $spacing-base; border-top: 1rpx solid $border-color-light; background: $bg-color-muted; }
.policy-list { margin-top: $spacing-sm; display: flex; flex-direction: column; gap: $spacing-base; }
.policy-item { display: flex; align-items: flex-start; gap: $spacing-sm; }
.policy-dot { width: 14rpx; height: 14rpx; flex-shrink: 0; margin-top: 12rpx; border-radius: 50%; }
.policy-dot-up { background: $stock-up-color; }
.policy-dot-gold { background: $warning-color; }
.policy-content { min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.policy-name {
  display: -webkit-box;
  overflow: hidden;
  color: $text-color-title;
  font-size: $font-size-base;
  font-weight: 650;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}
.policy-desc {
  display: -webkit-box;
  overflow: hidden;
  color: $text-color-secondary;
  font-size: $font-size-sm;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.news-heading { padding: $spacing-base; border-bottom: 1rpx solid $border-color-light; }
.news-stats { margin-top: $spacing-xs; display: flex; align-items: center; flex-wrap: wrap; gap: $spacing-base; }
.news-stat { color: $text-color-secondary; font-size: $font-size-sm; }
.news-stat-strong { color: $text-color-title; font-weight: 700; }

.news-item { padding: $spacing-base; border-bottom: 1rpx solid $border-color-light; }
.news-item:last-child { border-bottom: 0; }
.news-topline { display: flex; align-items: flex-start; gap: $spacing-xs; }
.news-tag { flex-shrink: 0; padding: 2rpx 8rpx; border-radius: $radius-xs; color: $stock-up-color; background: rgba(244, 63, 94, 0.08); font-size: $font-size-xs; }
.news-title { flex: 1; color: $text-color-title; font-size: $font-size-base; font-weight: 600; line-height: 1.5; }
.news-meta { margin: $spacing-xs 36rpx 0 60rpx; display: flex; gap: $spacing-sm; color: $text-color-tertiary; font-size: $font-size-xs; }
.news-summary { display: block; margin: $spacing-sm 36rpx 0 60rpx; padding: $spacing-sm; border-radius: $radius-sm; background: $bg-color-muted; color: $text-color-secondary; font-size: $font-size-sm; line-height: 1.75; }

.factor-group { padding: $spacing-base; border-bottom: 1rpx solid $border-color-light; }
.factor-group:last-child { border-bottom: 0; }
.factor-heading { display: flex; align-items: center; justify-content: space-between; }
.factor-title-row { display: flex; align-items: baseline; gap: $spacing-xs; }
.factor-title { color: $text-color-title; font-size: $font-size-base; font-weight: 650; }
.factor-weight { color: $text-color-tertiary; font-size: $font-size-xs; }
.factor-score { color: $brand-color; font-size: $font-size-lg; font-weight: 650; }
.score-track { height: 8rpx; margin: $spacing-sm 0; overflow: hidden; border-radius: $radius-pill; background: $bg-color-hover; }
.score-fill { height: 100%; border-radius: $radius-pill; background: $brand-color; }
.indicator-row { min-height: 46rpx; display: grid; grid-template-columns: minmax(0, 1fr) 116rpx 54rpx; align-items: center; gap: $spacing-xs; }
.indicator-name { overflow: hidden; color: $text-color-secondary; font-size: $font-size-sm; text-overflow: ellipsis; white-space: nowrap; }
.indicator-value { color: $text-color; font-size: $font-size-sm; text-align: right; }
.indicator-score { color: $brand-color; font-size: $font-size-sm; font-weight: 600; text-align: right; }

.detail-footnote { padding: $spacing-lg $spacing-base; display: flex; flex-direction: column; align-items: center; gap: $spacing-xs; color: $text-color-tertiary; font-size: $font-size-xs; line-height: 1.6; text-align: center; }

.state-panel { margin: $spacing-base; padding: 80rpx $spacing-lg; display: flex; flex-direction: column; align-items: center; border-radius: $radius-lg; background: $bg-color-grey; }
.state-title { margin-top: $spacing-sm; color: $text-color-title; font-size: $font-size-lg; font-weight: 600; }
.state-desc, .veto-reason { margin-top: $spacing-xs; color: $text-color-secondary; font-size: $font-size-sm; text-align: center; }
.retry-button { margin-top: $spacing-base; padding: 0 $spacing-lg; border: 0; border-radius: $radius-pill; background: $brand-color; color: $bg-color-grey; font-size: $font-size-sm; line-height: 64rpx; }
.retry-button::after { border: 0; }
</style>
