<template>
  <view v-if="visible" class="ni-modal">
    <view class="ni-backdrop" @tap="emit('close')" />
    <view class="ni-panel">
      <view class="ni-close" @tap.stop="emit('close')">
        <SvgIcon name="close-line" size="22rpx" color="#8e97a8" />
      </view>
      <scroll-view class="ni-body" scroll-y :show-scrollbar="false">
        <view v-if="loading" class="ni-state">
          <LoadingState text="" />
        </view>
        <view v-else-if="error" class="ni-state">
          <text class="ni-state-text">{{ error }}</text>
        </view>
        <template v-else-if="notification">
          <InsightCard
            v-if="notification.category === 'stock_info'"
            type="event"
            tag-text="事件洞见"
            :title="notification.title"
            :trace="stockInfoMessage"
            trace-label="消息"
            :time="formatTime(notification.occurredAt || notification.createdAt)"
            theme="light"
            class="ni-card"
          />

          <InsightCard
            v-else-if="notification.category === 'forecast'"
            type="fund"
            tag-text="业绩预测"
            :title="notification.title"
            :trace="notification.summary"
            trace-label="消息"
            :lines="forecastSummaryLines"
            line-placement="after-trace"
            :time="formatTime(notification.occurredAt || notification.createdAt)"
            theme="light"
            class="ni-card ni-card--forecast"
          />

          <template v-if="notification.category === 'forecast'">
            <view v-if="forecastData" class="ni-section ni-forecast-section">
              <ForecastProfitChart v-if="forecastChartItems.length" :items="forecastChartItems" :visible="visible" />
              <view v-if="forecastYearRows.length" class="ni-forecast-year-panel">
                <view class="ni-forecast-year-head">
                  <text class="ni-forecast-year-title">年度预测</text>
                  <text class="ni-forecast-year-unit">净利润 / 增长率</text>
                </view>
                <view class="ni-forecast-year-list">
                  <view v-for="row in forecastYearRows" :key="row.year" class="ni-forecast-year-item">
                    <view class="ni-forecast-year-main">
                      <view>
                        <text class="ni-forecast-year-label">{{ row.year }}</text>
                        <text :class="['ni-forecast-year-kind', row.kindClass]">{{ row.kindText }}</text>
                      </view>
                      <view class="ni-forecast-year-right">
                        <text class="ni-forecast-year-value">{{ row.netProfit }}</text>
                        <text :class="['ni-forecast-year-growth', row.growthClass]">{{ row.growthText }}</text>
                      </view>
                    </view>
                    <view class="ni-forecast-progress-track">
                      <view :class="['ni-forecast-progress-fill', row.kindClass]" :style="{ width: `${row.progress}%` }" />
                    </view>
                  </view>
                </view>
              </view>
              <view v-if="forecastData.detailIndicators?.length" class="ni-forecast-toggle" @tap="forecastDetailExpanded = !forecastDetailExpanded">
                <text>{{ forecastDetailExpanded ? '收起详细指标' : '查看详细指标' }}</text>
                <text class="ni-forecast-toggle__icon">{{ forecastDetailExpanded ? '−' : '+' }}</text>
              </view>
              <scroll-view v-if="forecastDetailExpanded && forecastDetailYearKeys.length" class="ni-table-scroll" scroll-x>
                <view class="ni-forecast-table">
                  <view class="ni-forecast-row is-head">
                    <text class="ni-forecast-cell is-name">指标</text>
                    <view v-for="key in forecastDetailYearKeys" :key="key" class="ni-forecast-cell is-year-head">
                      <text>{{ forecastHeader(key).year }}</text>
                      <text>{{ forecastHeader(key).kind }}</text>
                    </view>
                  </view>
                  <view v-for="(row, idx) in forecastData.detailIndicators.slice(0, 6)" :key="idx" class="ni-forecast-row">
                    <text class="ni-forecast-cell is-name">{{ row['预测指标'] || row.indicator || '' }}</text>
                    <text v-for="key in forecastDetailYearKeys" :key="key" class="ni-forecast-cell">{{ row[key] || '--' }}</text>
                  </view>
                </view>
              </scroll-view>
            </view>
          </template>

          <template v-else-if="notification.category === 'stock_info'">
            <view :class="['major-event-alert', `major-event-alert--${majorEventDirection}`, { 'is-muted': !majorEvent }]">
              <template v-if="majorEvent">
                <view class="me-top"><text class="me-title">{{ majorEventTitle }}</text></view>
                <view class="me-body">
                  <text class="major-event-title">{{ majorEvent.summary || majorEvent.title || majorEvent.change_type_name }}</text>
                  <view class="major-event-meta">
                    <text>{{ majorEvent.ai_horizon || majorEvent.cycle || '周期待判' }}</text>
                    <text>{{ majorEvent.change_type_name || majorEvent.info_type || '资讯研判' }}</text>
                    <text>{{ formatMaybeTime(majorEvent.event_time_display || majorEvent.event_time) }}</text>
                  </view>
                </view>
              </template>
              <text v-else class="major-event-title major-event-empty">暂无数据</text>
            </view>

            <view v-if="displayedStockEvents.length" class="section-card">
              <text class="section-title">个股异动</text>
              <view class="event-list">
                <view v-for="(evt, idx) in displayedStockEventsVisible" :key="idx" class="event-item">
                  <view :class="['event-dot', evt.change_type || evt.cycle || 'default']" />
                  <view class="event-content">
                    <text class="event-title">{{ evt.summary || evt.title || evt.change_type_name || '异动' }}</text>
                    <text v-if="evt.event_time || evt.event_time_display" class="event-time">{{ formatMaybeTime(evt.event_time_display || evt.event_time) }}</text>
                  </view>
                </view>
              </view>
              <view v-if="hasMoreStockEvents" class="event-toggle" @tap="eventListExpanded = !eventListExpanded">
                <text class="event-toggle-text">{{ eventListExpanded ? '收起' : '展开查看全部' }}</text>
              </view>
            </view>
          </template>

          <template v-else-if="notification.category === 'price_movement'">
            <view v-if="movementDetail" class="ni-detail-page">
              <view class="quote">
                <view class="o3-top">
                  <view class="o3-info">
                    <view class="q-name-row">
                      <text class="q-name">{{ movementDetail.stock_name }}</text>
                      <text :class="['q-tag', movementDetail.direction === 'up' ? 'tag-up' : 'tag-down']">
                        {{ movementDetail.direction === 'up' ? '上涨异动' : '下跌异动' }}
                      </text>
                    </view>
                    <text class="q-code">{{ movementDetail.symbol }} · {{ formatTime(movementDetail.triggered_at) }}</text>
                  </view>
                  <view class="o3-price">
                    <text :class="['o3-p', movementDetail.direction === 'up' ? 'is-up' : 'is-down']">{{ fmtPrice(movementDetail.latest_price) }}</text>
                    <text :class="['o3-c', movementDetail.direction === 'up' ? 'is-up' : 'is-down']">{{ fmtPercent(movementDetail.change_pct) }}</text>
                  </view>
                </view>
                <view class="o3-metrics">
                  <view class="o3-m"><text class="o3-v o3-mid">{{ fmtPrice(movementDetail.previous_close) }}</text><text class="o3-l">开盘</text></view>
                  <view class="o3-m"><text :class="['o3-v', movementDetail.direction === 'up' ? 'is-up' : 'is-down']">≥{{ movementDetail.threshold_pct }}%</text><text class="o3-l">涨跌幅阈值</text></view>
                  <view v-if="movementDetail.severity" class="o3-m"><text class="o3-v o3-warn">{{ severityText(movementDetail.severity) }}</text><text class="o3-l">严重度</text></view>
                  <view class="o3-m"><text :class="['o3-v', movementDetail.direction === 'up' ? 'is-up' : 'is-down']">{{ fmtAmount(movementDetail.latest_price, movementDetail.change_pct) }}</text><text class="o3-l">触发</text></view>
                </view>
              </view>
              <InsightCard v-if="movementInsightCard.content" type="event" :title="movementInsightCard.content" :trace="movementInsightCard.trace" :forecast="movementInsightCard.forecast" :time="movementInsightCard.time" theme="light" class="insight-in-page" />
              <PriceMovementAnalysisContent :detail="movementDetail" :analysis="movementAnalysis" />
            </view>
          </template>

          <template v-else-if="notification.category === 'insight'">
            <view v-if="insightDetail" class="ni-detail-page">
              <view class="quote">
                <view class="o3-top">
                  <view class="avatar">{{ (insightDetail.stock_name || '').charAt(0) }}</view>
                  <view class="o3-info">
                    <view class="q-name-row"><text class="q-name">{{ insightDetail.stock_name }}</text><text class="q-tag tag-up">涨停雷达</text></view>
                    <text class="q-code">{{ insightDetail.symbol }} · {{ fmtShortDate(insightDetail.trade_date) }}</text>
                  </view>
                  <view class="o3-price">
                    <text :class="['o3-p', insightDetail.direction === 'up' ? 'is-up' : 'is-down']">{{ fmtPrice(insightDetail.latest_price) }}</text>
                    <text :class="['o3-c', insightDetail.direction === 'up' ? 'is-up' : 'is-down']">{{ fmtPercent(insightDetail.change_pct) }}</text>
                  </view>
                </view>
                <view class="o3-metrics">
                  <view class="o3-m"><text class="o3-v o3-mid">{{ fmtPrice(insightDetail.open_price) }}</text><text class="o3-l">开盘</text></view>
                  <view class="o3-m"><text :class="['o3-v', insightDetail.direction === 'up' ? 'is-up' : 'is-down']">{{ fmtAmount(insightDetail.latest_price, insightDetail.change_pct) }}</text><text class="o3-l">涨跌额</text></view>
                  <view v-if="insightDetail.confidence" class="o3-m"><text class="o3-v o3-warn">{{ confidenceText(insightDetail.confidence) }}</text><text class="o3-l">置信度</text></view>
                  <view v-if="insightDetail.attribution_status === 'confirmed'" class="o3-m"><text class="o3-v is-down">已确认</text><text class="o3-l">归因</text></view>
                </view>
              </view>
              <InsightCard v-if="insightCard.title" :type="insightCard.type" :tag-text="insightCard.tagText" :title="insightCard.title" :trace="insightCard.trace" :forecast="''" :time="fmtShortDate(insightDetail.trade_date).slice(5)" theme="light" class="insight-in-page" />
              <view v-if="insightDetail.primary_driver" class="hero-card">
                <view class="hero-head"><text class="hero-tag">支撑性主因</text><view class="hero-chips"><text class="cat-badge">{{ categoryText(insightDetail.primary_driver.category) }}</text><text v-if="insightDetail.primary_driver.confidence" :class="['badge', confidenceClass(insightDetail.primary_driver.confidence)]">{{ confidenceText(insightDetail.primary_driver.confidence) }}</text><text v-if="insightDetail.attribution_status === 'confirmed'" class="badge is-confirmed">已确认</text></view></view>
                <view class="hero-banner"><text class="banner-label">归因结论</text><text class="banner-text">{{ insightDetail.primary_driver.label }}</text></view>
                <view v-if="insightDriverQuotes.length" class="hero-quote"><view v-for="quote in insightDriverQuotes" :key="`${quote.kind}-${quote.label}`" class="hq-item"><text :class="['hq-label', { 'is-pri': quote.kind === '主因' }]">{{ quote.kind }} · {{ quote.label }}</text><text class="hq-text">{{ quote.text }}</text></view></view>
              </view>
              <view v-if="insightDetail.secondary_drivers?.length" class="detail-section">
                <text class="detail-section-title">候选归因</text>
                <view class="cand-list"><view v-for="driver in insightDetail.secondary_drivers" :key="driver.label" class="cand-card"><view class="cand-header"><text class="cand-label">{{ driver.label }}</text><text class="cand-tag is-weak">{{ categoryText(driver.category) }}</text><text v-if="driver.confidence" :class="['badge', confidenceClass(driver.confidence)]">{{ confidenceText(driver.confidence) }}</text></view><text v-if="driver.evidence_quote" class="cand-text">{{ driver.evidence_quote }}</text></view></view>
              </view>
              <view v-if="insightDetail.attribution_status === 'unconfirmed'" class="unconfirmed">主因待验证</view>
              <template v-if="insightDetail.evidence_package?.length"><text class="detail-section-title">归因证据</text><view class="timeline"><view v-for="evi in insightDetail.evidence_package" :key="evi.source_id || evi.title" class="tl-item"><view class="tl-dot" /><text class="tl-title">{{ evi.title }}</text><text class="tl-meta">{{ providerText(evi) }} · {{ fmtShortDate(evi.published_at) }}</text></view></view></template>
              <template v-if="insightDetail.display_report?.details"><text class="detail-section-title">详细分析</text><text class="detail-text">{{ insightDetail.display_report.details }}</text></template>
              <template v-if="insightDetail.source_id"><text class="detail-section-title">原始来源</text><view class="source"><text class="src" @tap="openInsightSource">{{ insightDetail.title }}</text><view v-if="insightDetail.keywords?.length" class="kw"><text v-for="keyword in insightDetail.keywords" :key="keyword" class="kw-item">{{ keyword }}</text></view><text v-if="insightDetail.published_at" class="meta">发布于 {{ insightDetail.published_at }}</text></view></template>
            </view>
          </template>

          <template v-else-if="notification.category === 'performance_report'">
            <view v-if="reportData" class="ni-section ni-report-section">
              <view class="ni-report-header">
                <view class="ni-report-header__top">
                  <view class="ni-report-header__main">
                    <text class="ni-report-name">{{ reportStock.name }}</text>
                    <text class="ni-report-code">{{ reportStock.code }}</text>
                    <text class="ni-report-period">{{ reportStock.period }}</text>
                  </view>
                </view>
                <view class="ni-report-meta">
                  <text v-if="reportStock.industry" class="ni-report-meta__item">{{ reportStock.industry }}</text>
                  <text v-if="reportStock.updateTime" class="ni-report-meta__item">更新：{{ reportStock.updateTime }}</text>
                </view>
              </view>

              <InsightCard
                v-if="hasReportInsight"
                type="fund"
                tag-text="资金"
                :title="reportInsight.title"
                :lines="reportInsight.lines"
                :time="reportStock.updateTime"
                theme="light"
                line-style="plain"
                class="ni-card"
              />
              <view v-if="aiScoreData?.dataStatus === 'complete'" class="ni-report-score">
                <AiAnalysis :loading="scoreLoading" :data="aiScoreData" />
              </view>
              <view v-else-if="scoreSnapshotUnavailable" class="ni-report-score-unavailable">
                该历史报告暂无 AI 评分存档
              </view>
              <view v-if="reportTableColumns.length" class="ni-report-table-section">
                <view class="ni-report-table-head">
                  <view class="ni-report-table-title">
                    <SvgIcon name="file-list-line" size="28rpx" color="#0b5fff" />
                    <text>核心财务指标</text>
                  </view>
                  <view class="ni-report-year-toggle">
                    <text
                      :class="['ni-year-toggle-btn', reportTableYearRange === 2 ? 'active' : '']"
                      @tap="reportTableYearRange = 2"
                    >近2年</text>
                    <text
                      :class="['ni-year-toggle-btn', reportTableYearRange === 3 ? 'active' : '']"
                      @tap="reportTableYearRange = 3"
                    >近3年</text>
                  </view>
                </view>
                <scroll-view class="ni-table-scroll" scroll-x>
                  <view class="ni-finance-table">
                    <view class="ni-finance-row is-head">
                      <text class="ni-finance-cell is-category">指标分类</text>
                      <text class="ni-finance-cell is-name">指标名称</text>
                      <text v-for="col in reportTableColumns" :key="col.key" class="ni-finance-cell">{{ col.label }}</text>
                    </view>
                    <view v-for="row in reportTableRows" :key="row.name" class="ni-finance-row">
                      <text class="ni-finance-cell is-category">{{ row.category }}</text>
                      <text class="ni-finance-cell is-name">{{ row.name }}</text>
                      <text v-for="col in reportTableColumns" :key="col.key" :class="['ni-finance-cell', valueClass(row, col.key)]">
                        {{ getCellValue(row, col.key) }}
                      </text>
                    </view>
                  </view>
                </scroll-view>
              </view>
            </view>
          </template>

          <!-- 暂不提供跳转入口：通知内容直接在当前洞察弹窗中查看。 -->
          <!-- <view v-if="notification.targetPath" class="ni-detail-btn" @tap="openFullDetail">查看完整详情</view> -->
        </template>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import InsightCard from '@/shared/components/InsightCard.vue'
import LoadingState from '@/shared/components/LoadingState.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import ForecastProfitChart from '@/modules/favorites/components/ForecastProfitChart.vue'
import PriceMovementAnalysisContent from '@/modules/favorites/components/PriceMovementAnalysisContent.vue'
import { parseForecastSlot } from '@/modules/favorites/components/insightCards'
import AiAnalysis from '@/modules/analytics/components/ai-analysis.vue'
import { stockApi, type ForecastData } from '@/shared/api/modules/stock'
import { stockTraceApi, type StockTraceAnalysisResponse, type StockTraceEvent } from '@/shared/api/modules/stockTrace'
import { watchlistInsightApi, type InsightEvidenceItem, type WatchlistInsight } from '@/shared/api/modules/insight'
import type { UserNotification } from '@/shared/api/modules/notifications'
import { formatShanghaiDateTime } from '@/shared/utils/datetime'

const props = defineProps<{
  visible: boolean
  notification: UserNotification | null
}>()

const emit = defineEmits<{
  close: []
}>()

const loading = ref(false)
const error = ref('')
const forecastData = ref<ForecastData | null>(null)
const forecastDetailExpanded = ref(false)
const stockEvents = ref<any[]>([])
const movementDetail = ref<StockTraceEvent | null>(null)
const movementAnalysis = ref<StockTraceAnalysisResponse | null>(null)
const insightDetail = ref<WatchlistInsight | null>(null)
const reportData = ref<any>(null)
const aiScoreData = ref<any>(null)
const scoreLoading = ref(false)
const scoreSnapshotUnavailable = ref(false)
const reportTableYearRange = ref<2 | 3>(2)
const eventListExpanded = ref(false)

const majorEvent = computed(() => stockEvents.value[0] || null)
const stockInfoMessage = computed(() => {
  if (props.notification?.category !== 'stock_info') return ''
  const stored = String(props.notification.summary || '').trim()
  const matched = stockEvents.value.find((evt: any) => {
    const title = String(evt?.title || '').trim()
    return title && (title === stored || stored.includes(title) || title.includes(stored))
  })
  return String(matched?.summary || '').trim() || stored
})
const displayedStockEvents = computed(() => stockEvents.value.slice(1))
const EVENT_PREVIEW_COUNT = 3
const displayedStockEventsVisible = computed(() => eventListExpanded.value
  ? displayedStockEvents.value
  : displayedStockEvents.value.slice(0, EVENT_PREVIEW_COUNT))
const hasMoreStockEvents = computed(() => displayedStockEvents.value.length > EVENT_PREVIEW_COUNT)
const majorEventDirection = computed(() => {
  const impact = String(majorEvent.value?.ai_impact || majorEvent.value?.level || majorEvent.value?.change_type_name || '')
  if (/利好|上涨|增长/.test(impact)) return 'positive'
  if (/利空|风险|下降|下跌/.test(impact)) return 'negative'
  return 'mixed'
})
const majorEventTitle = computed(() => ({ positive: '重大机会', negative: '重大风险', mixed: '重大异动' }[majorEventDirection.value]))

function formatTime(value?: string) {
  return value ? formatShanghaiDateTime(value) : ''
}

function formatMaybeTime(value?: string | Date) {
  if (!value) return ''
  const text = String(value)
  return /^\d{4}-\d{2}-\d{2}T/.test(text) ? formatShanghaiDateTime(text) : text
}

function fmtShortDate(value?: string | Date) {
  return value ? String(value).slice(0, 10) : ''
}

function payloadString(key: string): string {
  const value = props.notification?.payload?.[key]
  return value == null ? '' : String(value)
}

function queryParam(url: string | undefined, key: string): string {
  if (!url) return ''
  const query = url.split('?')[1] || ''
  const params = new URLSearchParams(query)
  const value = params.get(key) || ''
  try { return decodeURIComponent(value) } catch { return value }
}

function currentSymbol(): string {
  return props.notification?.symbol || payloadString('symbol') || queryParam(props.notification?.targetPath, 'symbol')
}

function currentEventId(): string {
  return payloadString('event_id') || payloadString('eventId') || queryParam(props.notification?.targetPath, 'event_id')
}

function currentEndDate(): string {
  return payloadString('endDate') || payloadString('end_date') || queryParam(props.notification?.targetPath, 'endDate')
}

function currentForecastVersionDate(): string {
  return payloadString('versionDate') || queryParam(props.notification?.targetPath, 'version')
}

function resetData() {
  forecastData.value = null
  forecastDetailExpanded.value = false
  stockEvents.value = []
  eventListExpanded.value = false
  movementDetail.value = null
  movementAnalysis.value = null
  insightDetail.value = null
  reportData.value = null
  aiScoreData.value = null
  scoreLoading.value = false
  scoreSnapshotUnavailable.value = false
  reportTableYearRange.value = 2
  error.value = ''
}

async function load() {
  resetData()
  const item = props.notification
  if (!props.visible || !item) return
  loading.value = true
  try {
    const symbol = currentSymbol()
    if (item.category === 'forecast' && symbol) {
      const versionDate = currentForecastVersionDate()
      forecastData.value = await stockApi.getForecast(symbol, versionDate ? { version: versionDate } : undefined)
    } else if (item.category === 'stock_info' && symbol) {
      stockEvents.value = await stockApi.getStockEvents(symbol, { limit: 8 })
    } else if (item.category === 'price_movement') {
      const eventId = currentEventId()
      if (!eventId) throw new Error('缺少异动事件 ID')
      const [detailRes, analysisRes] = await Promise.allSettled([
        stockTraceApi.get(eventId),
        stockTraceApi.getAnalysis(eventId),
      ])
      if (detailRes.status === 'fulfilled') movementDetail.value = detailRes.value
      if (analysisRes.status === 'fulfilled') movementAnalysis.value = analysisRes.value
    } else if (item.category === 'insight') {
      const eventId = currentEventId()
      if (!eventId) throw new Error('缺少洞察事件 ID')
      insightDetail.value = await watchlistInsightApi.getInsightDetail(eventId)
    } else if (item.category === 'performance_report' && symbol) {
      const [analysisRes, scoreRes] = await Promise.allSettled([
        stockApi.getReportAnalysis({ symbol, endDate: currentEndDate() || undefined }),
        stockApi.getAiScore({
          symbol,
          endDate: currentEndDate() || undefined,
          reportType: payloadString('reportType') || undefined,
        }),
      ])
      if (analysisRes.status === 'fulfilled') reportData.value = (analysisRes.value as any)?.data || analysisRes.value
      if (scoreRes.status === 'fulfilled') aiScoreData.value = (scoreRes.value as any)?.data || scoreRes.value
      else scoreSnapshotUnavailable.value = true
    }
  } catch (err: any) {
    error.value = err?.message || '消息详情加载失败'
  } finally {
    loading.value = false
  }
}

watch(() => [props.visible, props.notification?.id] as const, () => { void load() }, { immediate: true })

function openFullDetail() {
  const url = props.notification?.targetPath
  if (!url) return
  emit('close')
  uni.navigateTo({ url })
}

function parseForecastProfit(value: any): number | null {
  if (value == null || value === '--') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const raw = String(value).replace(/,/g, '').trim()
  const num = Number(raw.replace(/[^\d.-]/g, ''))
  if (!Number.isFinite(num)) return null
  if (raw.includes('万')) return num / 10000
  return num
}

function buildForecastChartSource(): Array<{ year: string; netProfit: any; kind?: 'actual' | 'forecast' }> {
  if (!forecastData.value) return []
  const details = forecastData.value.detailIndicators
  const profitRow = Array.isArray(details)
    ? details.find((row: any) => {
      const name = String(row['预测指标'] || row.indicator || '')
      return name.includes('净利润') && !/增长率|同比/.test(name)
    })
    : null
  const actuals = profitRow
    ? Object.keys(profitRow).map(key => {
      const actual = key.match(/^(\d{4}).*实际/)
      if (actual) return { year: actual[1], netProfit: profitRow[key], kind: 'actual' as const }
      return null
    }).filter(Boolean) as Array<{ year: string; netProfit: any; kind?: 'actual' | 'forecast' }>
    : []
  const forecastsFromDetail = profitRow
    ? Object.keys(profitRow).map(key => {
      const forecast = key.match(/^预测(\d{4})/)
      return forecast ? { year: forecast[1], netProfit: profitRow[key], kind: 'forecast' as const } : null
    }).filter(Boolean) as Array<{ year: string; netProfit: any; kind?: 'actual' | 'forecast' }>
    : []
  const forecastsFromList = (forecastData.value.predictions || []).map(item => ({
    year: String(item.year || ''),
    netProfit: item.netProfit,
    kind: 'forecast' as const,
  }))
  const seen = new Set<string>()
  return [...actuals, ...forecastsFromDetail, ...forecastsFromList]
    .filter(item => item.year && parseForecastProfit(item.netProfit) != null)
    .filter(item => {
      const key = `${item.kind}:${item.year}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => Number(a.year) - Number(b.year) || (a.kind === 'actual' ? -1 : 1))
}

const forecastChartItems = computed(() => buildForecastChartSource()
  .map(item => {
    const value = parseForecastProfit(item.netProfit)
    return value == null ? null : { year: item.year, value, label: String(item.netProfit), kind: item.kind }
  })
  .filter(Boolean) as Array<{ year: string; value: number; label: string; kind?: 'actual' | 'forecast' }>)

const forecastSummaryLines = computed(() => {
  const value = forecastData.value?.netProfitYoy
  if (value == null || !Number.isFinite(Number(value))) return []
  const numeric = Number(value)
  return [{
    key: '净利润同比',
    text: `${numeric >= 0 ? '+' : ''}${numeric}%`,
    tone: numeric >= 0 ? 'positive' as const : 'risk' as const,
  }]
})

const forecastYearRows = computed(() => {
  const rows = Array.isArray(forecastData.value?.predictions) ? forecastData.value.predictions : []
  const parsed = rows.slice(0, 3).map(item => {
    const value = parseForecastProfit(item.netProfit)
    const growth = item.growth
    const growthNumber = typeof growth === 'number' ? growth : Number(String(growth).replace('%', ''))
    const hasGrowth = Number.isFinite(growthNumber)
    return {
      year: String(item.year || ''),
      netProfit: item.netProfit || '--',
      value: value ?? 0,
      kindClass: !hasGrowth ? 'is-forecast' : growthNumber >= 0 ? 'is-actual' : 'is-forecast',
      kindText: !hasGrowth ? '预测' : growthNumber >= 0 ? '改善' : '承压',
      growthText: !hasGrowth ? '--' : `${growthNumber >= 0 ? '+' : ''}${growthNumber}%`,
      growthClass: !hasGrowth ? '' : growthNumber >= 0 ? 'is-up' : 'is-down',
    }
  })
  const max = Math.max(...parsed.map(item => Math.abs(item.value)), 0.01)
  return parsed.map(item => ({ ...item, progress: Math.max(18, Math.round((Math.abs(item.value) / max) * 100)) }))
})

const forecastDetailYearKeys = computed<string[]>(() => {
  const details = forecastData.value?.detailIndicators
  if (!Array.isArray(details) || !details.length) return []
  return Object.keys(details[0])
    .filter(key => key.includes('实际值') || key.includes('平均'))
    .sort()
})

function forecastHeader(key: string): { year: string; kind: string } {
  const actual = key.match(/^(\d{4}).*实际/)
  if (actual) return { year: actual[1], kind: '实际值' }
  const forecast = key.match(/^预测(\d{4})/)
  if (forecast) return { year: forecast[1], kind: '预测值' }
  return { year: key, kind: '' }
}

function fmtPrice(price?: number) {
  return price == null || Number.isNaN(price) ? '--' : Number(price).toFixed(2)
}

function fmtPercent(pct?: number) {
  if (pct == null || Number.isNaN(Number(pct))) return '--'
  return `${Number(pct) > 0 ? '+' : ''}${Number(pct).toFixed(2)}%`
}

function fmtAmount(price?: number, pct?: number): string {
  if (!price || price <= 0 || pct == null) return '--'
  const previousClose = price / (1 + pct / 100)
  const amount = price - previousClose
  return `${amount > 0 ? '+' : ''}${amount.toFixed(2)}`
}

function severityText(value?: string) {
  return ({ medium: '中等', high: '高', critical: '严重' } as Record<string, string>)[value || ''] || value || '--'
}

function movementStatusText(value?: string) {
  return ({ pending: '待分析', processing: '分析中', completed: '已完成', unavailable: '暂不可用' } as Record<string, string>)[value || ''] || value || '--'
}

function layerText(value?: string) {
  return ({ company: '公司事件', sector: '板块题材', market: '市场环境', capital: '资金流向', technical: '技术面' } as Record<string, string>)[value || ''] || value || ''
}

function statusText(value?: string) {
  return ({ supported: '支撑', weak: '偏弱', rejected: '排除', insufficient: '不足' } as Record<string, string>)[value || ''] || value || ''
}

const insightCard = computed(() => {
  const detail = insightDetail.value
  const primary = detail?.primary_driver
  const status = detail?.attribution_status === 'confirmed' ? '已确认' : '待验证'
  const lines = primary
    ? [
        { key: '归因类型', text: categoryText(primary.category) || '综合研判', tone: 'default' as const },
        {
          key: '判断状态',
          text: [confidenceText(primary.confidence), status].filter(Boolean).join(' · '),
          tone: detail?.attribution_status === 'confirmed' ? 'positive' as const : 'default' as const,
        },
      ]
    : []
  return {
    type: 'trend' as const,
    tagText: detail?.event_type === 'limit_up_radar' ? '涨停雷达' : '异动洞见',
    title: primary?.label || detail?.title || '',
    trace: primary?.evidence_quote || detail?.display_report?.summary || '',
    traceDetail: primary?.evidence_quote ? detail?.display_report?.details || '' : '',
    lines,
  }
})

const movementInsightCard = computed(() => {
  const detail = movementDetail.value
  const artifact = movementAnalysis.value?.artifact?.artifactJson
  const primaryChainId = artifact?.primary_chain_id
  const primaryCandidateId = artifact?.chains?.find(chain => chain.chainId === primaryChainId)?.candidateId
  const cause = artifact?.candidates?.find(candidate => candidate.candidateId === primaryCandidateId)
  const trace = artifact?.chains?.find(chain => chain.role === 'primary')?.nodes
    .map(node => node.claim)
    .filter(Boolean)
    .join(' → ') || ''
  return {
    content: cause?.verdict || '',
    trace,
    forecast: parseForecastSlot(detail?.forecast)?.summary || '',
    time: detail?.triggered_at ? formatTime(detail.triggered_at).slice(5) : '',
  }
})

const insightDriverQuotes = computed(() => {
  const quotes: Array<{ kind: '主因' | '次因'; label: string; text: string }> = []
  const primary = insightDetail.value?.primary_driver
  if (primary?.evidence_quote) quotes.push({ kind: '主因', label: primary.label, text: primary.evidence_quote })
  for (const driver of insightDetail.value?.secondary_drivers ?? []) {
    if (driver.evidence_quote) quotes.push({ kind: '次因', label: driver.label, text: driver.evidence_quote })
  }
  return quotes
})

function categoryText(value?: string) {
  return ({ industry_theme: '行业题材', company_event: '公司事件', earnings: '业绩', market: '市场', trading_sentiment: '交易情绪' } as Record<string, string>)[value || ''] || value || ''
}

function confidenceText(value?: string) {
  return ({ high: '高置信', medium: '中置信', low: '低置信', unconfirmed: '待确认' } as Record<string, string>)[value || ''] || value || ''
}

function confidenceClass(value?: string) {
  return value === 'high' ? 'is-high' : 'is-neutral'
}

function providerText(ev: InsightEvidenceItem) {
  if (ev.provider) return ev.provider
  return ({ announcement: '公告', news: '资讯', earnings: '业绩', rating: '研报', radar_article: '雷达文章', quant: '量化' } as Record<string, string>)[ev.source_type] || ev.source_type || ''
}

function openInsightSource() {
  const url = insightDetail.value?.source_url
  if (!url) return
  // #ifdef H5
  window.open(url, '_blank', 'noopener')
  // #endif
  // #ifndef H5
  void uni.setClipboardData({ data: url })
  // #endif
}

const reportStock = computed(() => {
  const data = reportData.value || {}
  return {
    code: currentSymbol(),
    name: String(data['股票名称'] || props.notification?.stockName || ''),
    period: `${String(data['报告期'] || '')}${data['最新报告类型'] === 'express' ? '（快报）' : ''}`,
    industry: String(data['行业'] || ''),
    disclosureDate: String(data['披露日期'] || payloadString('annDate') || ''),
    updateTime: formatMaybeTime((data['更新时间'] || props.notification?.payload?.updateTime || '') as string),
  }
})

const reportPeriods = computed(() => {
  const finData = reportData.value?.['财务数据'] || {}
  const periods = finData.periods || []
  return Array.isArray(periods) ? periods.map((p: any) => ({
    key: String(p.key || ''),
    label: String(p.label || ''),
    revenue: p.revenue != null ? Number(p.revenue) : null,
    revenueYoy: p.revenueYoy != null ? Number(p.revenueYoy) : null,
    netProfit: p.netProfit != null ? Number(p.netProfit) : null,
    netProfitYoy: p.netProfitYoy != null ? Number(p.netProfitYoy) : null,
    deductProfit: p.deductProfit != null ? Number(p.deductProfit) : null,
    grossMargin: p.grossMargin != null ? Number(p.grossMargin) : null,
    netMargin: p.netMargin != null ? Number(p.netMargin) : null,
    roe: p.roe != null ? Number(p.roe) : null,
    cashFlow: p.cashFlow != null ? Number(p.cashFlow) : null,
    debtRatio: p.debtRatio != null ? Number(p.debtRatio) : null,
  })) : []
})

function isAnnualReportPeriod(period: any): boolean {
  return String(period?.key || '').endsWith('fy') || String(period?.label || '').includes('年报')
}

const reportDisplayPeriods = computed(() => {
  const periods = reportPeriods.value
  if (!periods.length) return []
  const latestYearMatch = String(periods[0].key || '').match(/^(\d{4})/)
  if (!latestYearMatch) return periods
  const latestYear = Number(latestYearMatch[1])
  const currentYearPeriods = periods.filter((period: any) => {
    const match = String(period.key || '').match(/^(\d{4})/)
    return match && Number(match[1]) === latestYear
  })
  const pastAnnuals = []
  for (let i = 1; i <= reportTableYearRange.value; i += 1) {
    const targetYear = latestYear - i
    const annual = periods.find((period: any) => {
      const match = String(period.key || '').match(/^(\d{4})/)
      return match && Number(match[1]) === targetYear && isAnnualReportPeriod(period)
    })
    if (annual) pastAnnuals.push(annual)
  }
  return [...currentYearPeriods, ...pastAnnuals]
})

const reportInsight = computed(() => {
  const ai = aiScoreData.value
  if (!ai?.conclusion) return { title: reportStock.value.name ? `${reportStock.value.name} 财报分析` : '', lines: [] as Array<{ key: string; text: string; tone?: 'default' | 'positive' | 'risk' }> }
  const lines: Array<{ key: string; text: string; tone?: 'default' | 'positive' | 'risk' }> = []
  if (Array.isArray(ai.strengths) && ai.strengths.length) lines.push({ key: '优势', text: ai.strengths.join('；'), tone: 'positive' })
  if (Array.isArray(ai.risks) && ai.risks.length) lines.push({ key: '风险', text: ai.risks.join('；'), tone: 'risk' })
  if (ai.advice) lines.push({ key: '建议', text: ai.advice, tone: 'default' })
  return { title: `${ai.conclusion}${reportStock.value.period ? `（${reportStock.value.period}）` : ''}`, lines }
})

/** 历史报告未保存 AI 评分时不渲染空的“资金洞见”容器。 */
const hasReportInsight = computed(() => Boolean(aiScoreData.value?.conclusion))

const reportTableColumns = computed(() => reportDisplayPeriods.value.map((p: any) => ({ key: p.key, label: p.label })))
type FinanceField = 'revenue' | 'revenueYoy' | 'netProfit' | 'netProfitYoy' | 'deductProfit' | 'grossMargin' | 'netMargin' | 'roe' | 'cashFlow' | 'debtRatio'

interface FinanceTableRow {
  category: string
  name: string
  field: FinanceField
  isYoy?: boolean
}

const reportTableRows: FinanceTableRow[] = [
  { category: '营收规模', name: '营业总收入', field: 'revenue' },
  { category: '营收规模', name: '营收同比增速', field: 'revenueYoy', isYoy: true },
  { category: '盈利利润', name: '归母净利润', field: 'netProfit' },
  { category: '盈利利润', name: '归母净利同比', field: 'netProfitYoy', isYoy: true },
  { category: '盈利利润', name: '扣非净利润', field: 'deductProfit' },
  { category: '盈利效率', name: '毛利率', field: 'grossMargin' },
  { category: '盈利效率', name: '净利率', field: 'netMargin' },
  { category: '盈利效率', name: 'ROE(加权)', field: 'roe' },
  { category: '现金流', name: '经营现金流净额', field: 'cashFlow' },
  { category: '偿债', name: '资产负债率', field: 'debtRatio' },
]

function getPeriodValue(periodKey: string, field: FinanceField): number | null | undefined {
  const period = reportPeriods.value.find((p) => p.key === periodKey)
  return period?.[field]
}

function getCellValue(row: FinanceTableRow, periodKey: string): string {
  const value = getPeriodValue(periodKey, row.field)
  if (value == null || Number.isNaN(Number(value))) return '--'
  if (row.isYoy) return `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)}%`
  if (['grossMargin', 'netMargin', 'roe', 'debtRatio'].includes(row.field)) return `${Number(value).toFixed(2)}%`
  return `${Number(value).toFixed(2)}亿`
}

function valueClass(row: FinanceTableRow, periodKey: string) {
  if (!row.isYoy) return ''
  const value = getPeriodValue(periodKey, row.field)
  if (value == null) return ''
  return Number(value) >= 0 ? 'is-up' : 'is-down'
}

</script>

<style lang="scss" scoped>
.ni-modal { position: fixed; inset: 0; z-index: $z-modal + 10; }
.ni-backdrop { position: absolute; inset: 0; background: rgba(10, 23, 51, 0.48); }
.ni-panel { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 640rpx; max-width: 92vw; height: 78vh; max-height: 980rpx; display: flex; flex-direction: column; overflow: hidden; border: 2rpx solid $line; border-radius: $r-lg; background: $bg-card; box-shadow: $shadow-card; }
.ni-close { position: absolute; z-index: 3; top: 16rpx; right: 16rpx; width: 44rpx; height: 44rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #eef1f6; }
.ni-close:active { opacity: 0.7; }
.ni-body { flex: 1; height: 0; min-height: 0; box-sizing: border-box; padding: 64rpx 28rpx 28rpx; scrollbar-width: none; -ms-overflow-style: none; }
.ni-body::-webkit-scrollbar,
.ni-body ::-webkit-scrollbar { display: none; width: 0; height: 0; }
.ni-body {
  :deep(.uni-scroll-view),
  :deep(.uni-scroll-view-content) {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  :deep(.uni-scroll-view::-webkit-scrollbar),
  :deep(.uni-scroll-view-content::-webkit-scrollbar) {
    display: none;
    width: 0;
    height: 0;
  }
}
.ni-card--forecast {
  :deep(.as-insight-card__line--point),
  :deep(.as-insight-card__line--point.is-positive),
  :deep(.as-insight-card__line--point.is-risk) {
    background: var(--ins-trace-bg);
    border: 1rpx solid var(--ins-trace-bd);
  }
}
.ni-state { min-height: 360rpx; display: flex; align-items: center; justify-content: center; }
.ni-state-text, .ni-empty { font-size: $font-size-sm; color: $ink-mute; }
.ni-card { margin-bottom: $s-3; }
.ni-section { margin-bottom: $s-3; padding: $s-3; border: 2rpx solid $line-soft; border-radius: $r-md; background: $bg-card; }
.ni-report-section { padding: 0.2rem; border: 0; }
.ni-section-head { display: flex; align-items: center; justify-content: space-between; gap: $s-2; margin-bottom: $s-2; }
.ni-section-title { font-size: $font-size-base; font-weight: 700; color: $ink; }
.ni-section-sub, .ni-meta, .ni-event-time, .ni-quote-code, .ni-list-sub { font-size: $font-size-xs; color: $ink-mute; }
.ni-text, .ni-title-text { font-size: $font-size-sm; line-height: 1.6; color: $ink-soft; }
.ni-title-text { font-weight: 700; color: $ink; }
.ni-meta { display: flex; flex-wrap: wrap; gap: $s-2; }
.ni-metric-row, .ni-quote, .ni-list-item, .ni-event-item { display: flex; align-items: center; justify-content: space-between; gap: $s-2; }
.ni-metric-row { margin: $s-3 0; padding: $s-3; border-radius: $r-md; background: $primary-50; }
.ni-metric-label { font-size: $font-size-sm; color: $ink-soft; }
.ni-metric-value { font-size: $font-size-xl; font-weight: 700; }
.is-up { color: $up; }
.is-down { color: $down; }
.ni-forecast-year-panel { margin-bottom: $s-3; padding: 20rpx; border-radius: 12rpx; background: $bg-soft; }
.ni-forecast-year-head, .ni-forecast-year-main { display: flex; align-items: center; justify-content: space-between; gap: $s-2; }
.ni-forecast-year-head { margin-bottom: 18rpx; }
.ni-forecast-year-title { font-size: 26rpx; font-weight: 600; color: $ink-soft; }
.ni-forecast-year-unit { font-size: 22rpx; color: $ink-mute; }
.ni-forecast-year-list { display: flex; flex-direction: column; gap: 14rpx; }
.ni-forecast-year-item { padding: 16rpx; border: 1rpx solid $line-soft; border-radius: 12rpx; background: $bg-card; }
.ni-forecast-year-main { margin-bottom: 12rpx; }
.ni-forecast-year-label { display: block; font-size: 26rpx; font-weight: 600; color: $ink-soft; }
.ni-forecast-year-kind { display: block; margin-top: 2rpx; font-size: 21rpx; color: $ink-mute; }
.ni-forecast-year-kind.is-actual { color: $primary; }
.ni-forecast-year-kind.is-forecast { color: $warning; }
.ni-forecast-year-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4rpx; }
.ni-forecast-year-value { font-size: 28rpx; font-weight: 800; color: $ink; }
.ni-forecast-year-growth { font-size: 22rpx; font-weight: 700; }
.ni-forecast-progress-track { height: 16rpx; overflow: hidden; border-radius: $r-full; background: $line; }
.ni-forecast-progress-fill { height: 100%; min-width: 18rpx; border-radius: $r-full; }
.ni-forecast-progress-fill.is-actual { background: linear-gradient(90deg, $primary, $primary-light); }
.ni-forecast-progress-fill.is-forecast { background: linear-gradient(90deg, $warning, $warning-light); }
.ni-forecast-toggle { display: flex; align-items: center; justify-content: space-between; gap: $s-2; padding: 16rpx 18rpx; margin-top: 14rpx; border: 1rpx solid $line-soft; border-radius: 12rpx; background: $bg-soft; color: $ink-soft; font-size: 24rpx; font-weight: 600; }
.ni-forecast-toggle__icon { flex-shrink: 0; width: 32rpx; height: 32rpx; border-radius: $r-full; background: $primary-50; color: $primary; font-size: 24rpx; line-height: 32rpx; text-align: center; font-weight: 700; }
.ni-list { display: flex; flex-direction: column; gap: $s-2; margin-top: $s-2; }
.ni-list-item { align-items: flex-start; padding: $s-2 0; border-bottom: 2rpx solid $line-soft; }
.ni-list-title { min-width: 120rpx; font-size: $font-size-sm; font-weight: 700; color: $ink; }
.ni-list-main { flex: 1; min-width: 0; font-size: $font-size-sm; color: $ink-soft; line-height: 1.6; }
.ni-toggle, .ni-detail-btn { margin-top: $s-3; padding: $s-2; text-align: center; border-radius: $r-full; color: $primary; background: $primary-50; font-size: $font-size-sm; font-weight: 600; }
.ni-table-scroll { width: 100%; margin-top: $s-3; }
.ni-forecast-section .ni-table-scroll { box-sizing: border-box; border: 2rpx solid $line-soft; border-radius: $r-sm; background: $bg-card; }
.ni-forecast-table { width: max-content; min-width: 100%; background: $bg-card; }
.ni-finance-table { width: max-content; min-width: 100%; }
.ni-forecast-row, .ni-finance-row { display: flex; border-bottom: 2rpx solid $line-soft; }
.ni-forecast-row.is-head, .ni-finance-row.is-head { background: $bg-soft; font-weight: 700; }
.ni-forecast-row.is-head .ni-forecast-cell { background: $bg-soft; }
.ni-forecast-row:last-child { border-bottom: 0; }
.ni-forecast-cell, .ni-finance-cell { width: 5.2rem; flex-shrink: 0; padding: $s-2; font-size: $font-size-xs; color: $ink-soft; text-align: center; box-sizing: border-box; }
.ni-forecast-cell { width: 4.5rem; min-height: 72rpx; display: flex; align-items: center; justify-content: center; }
.ni-forecast-cell.is-name { width: 6rem; justify-content: flex-start; }
.ni-forecast-cell.is-year-head { flex-direction: column; gap: 2rpx; line-height: 1.25; }
.ni-finance-row:not(.is-head) .ni-finance-cell:not(.is-category):not(.is-name) { color: #0a1733; }
.ni-finance-cell.is-up, .ni-finance-cell.is-down { color: #0a1733; }
.ni-finance-cell.is-category { width: 3.9rem; color: $ink-mute; }
.ni-forecast-cell.is-name, .ni-finance-cell.is-name { width: 6rem; color: $ink; font-weight: 600; }
.ni-forecast-cell.is-name { width: 6rem; position: sticky; left: 0; z-index: 4; border-right: 2rpx solid $line-soft; border-bottom: 2rpx solid $line-soft; background: $bg-card; box-shadow: 10rpx 0 14rpx rgba(10, 23, 51, 0.08); }
.ni-forecast-row.is-head .ni-forecast-cell.is-name { z-index: 5; background: $bg-soft; }
.ni-forecast-row:last-child .ni-forecast-cell.is-name { border-bottom: 0; }
.ni-finance-cell.is-name { position: sticky; left: 0; z-index: 2; background: $bg-card; }
.ni-finance-row.is-head .ni-finance-cell.is-name { z-index: 3; background: $bg-soft; }
.ni-report-score { margin-top: $s-6; }
.ni-report-score-unavailable {
  margin-top: $s-6;
  padding: $s-4;
  color: $ink-soft;
  font-size: $font-size-sm;
  text-align: center;
  background: $bg-soft;
}
.ni-impact, .ni-tag { padding: 4rpx 12rpx; border-radius: $r-full; background: $primary-50; color: $primary; font-size: $font-size-xs; font-weight: 700; }
.ni-impact { border: 1rpx solid $line-strong; border-radius: 8rpx; background: $bg-soft; color: $ink-mute; }
.ni-impact.is-up { border-color: #fecaca; background: $up-soft; color: $up; }
.ni-impact.is-down { border-color: #bbf7d0; background: $down-soft; color: $down; }
.major-event-alert { background: $bg-card; border: none; border-left: 6rpx solid $ink-soft; border-radius: $r-md; padding: 0; margin: 24rpx 0 16rpx; overflow: hidden; box-shadow: $shadow-card; }
.major-event-alert--positive { border-left-color: #d81f1f; }
.major-event-alert--negative { border-left-color: #0d9e43; }
.major-event-alert.is-muted { background: $bg-soft; border-left-color: $line-strong; box-shadow: none; }
.me-top { display: flex; align-items: center; height: 52rpx; padding: 0 16rpx; box-shadow: inset 0 -2rpx 0 rgba(0, 0, 0, 0.06); }
.major-event-alert--positive .me-top { background: linear-gradient(180deg, #e22c2c, #d81f1f); }
.major-event-alert--negative .me-top { background: linear-gradient(180deg, #0faa4a, #0d9e43); }
.major-event-alert--mixed .me-top { background: linear-gradient(180deg, $ink-soft, $ink); }
.major-event-alert.is-muted .me-top { display: none; }
.me-title { font-size: $font-size-md; font-weight: bold; color: #f8f8f8; letter-spacing: 1rpx; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.me-body { display: flex; flex-direction: column; gap: 6rpx; padding: 14rpx 22rpx 16rpx; }
.major-event-title { display: block; font-size: $font-size-md; line-height: 1.4; font-weight: 600; color: $ink; }
.major-event-empty { padding: 14rpx 22rpx 16rpx; }
.major-event-meta { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 2rpx; }
.major-event-meta text { padding: 4rpx 12rpx; border-radius: 8rpx; background: $bg-deep; color: $ink-mute; font-size: 22rpx; line-height: 1.4; font-weight: 700; }
.section-card { background: $bg-card; border: 2rpx solid $line; border-radius: $r-md; padding: 28rpx; margin-bottom: 16rpx; }
.section-title { display: block; margin-bottom: 20rpx; color: $ink; font-size: 30rpx; font-weight: 600; }
.event-list { display: flex; flex-direction: column; gap: 16rpx; }
.event-toggle { margin-top: 20rpx; padding: 16rpx 0; text-align: center; border-top: 2rpx solid $line; }
.event-toggle-text { color: $primary; font-size: 24rpx; font-weight: 600; }
.event-item { display: flex; align-items: flex-start; gap: 12rpx; }
.event-dot { width: 16rpx; height: 16rpx; margin-top: 8rpx; flex-shrink: 0; border-radius: 50%; background: $primary; }
.event-dot.default { background: $ink-mute; }
.event-content { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.event-title { color: $ink; font-size: 28rpx; line-height: 1.4; }
.event-time { color: $ink-faint; font-size: 22rpx; }
.ni-quote { align-items: flex-start; margin-bottom: $s-3; padding: $s-3; border-radius: $r-md; background: $bg-soft; }
.ni-quote-name { display: block; font-size: $font-size-lg; font-weight: 700; color: $ink; }
.ni-quote-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4rpx; }
.ni-insight-price { font-family: $font-mono; font-size: $font-size-xl; font-weight: 800; line-height: $lh-tight; }
.is-up { color: $up; }
.is-down { color: $down; }
.ni-insight-unconfirmed { margin-top: $s-3; padding: $s-2 $s-3; border-radius: $r-sm; background: $warning-bg; color: $warning; font-size: $font-size-sm; }
.ni-candidate-list { display: flex; flex-direction: column; gap: $s-2; }
.ni-candidate-card { padding: $s-3; border-radius: $r-md; background: $bg-soft; }
.ni-candidate-header { display: flex; align-items: center; gap: $s-2; margin-bottom: $s-1; }
.ni-candidate-label { flex: 1; min-width: 0; color: $ink; font-size: $font-size-sm; font-weight: 600; }
.ni-candidate-tag { flex: 0 0 auto; padding: 2rpx 12rpx; border-radius: $r-sm; background: $warning-bg; color: $warning; font-size: $font-size-xs; }
.ni-candidate-confidence { flex: 0 0 auto; padding: 2rpx 12rpx; border-radius: $r-sm; font-size: $font-size-xs; }
.ni-candidate-confidence.is-high { background: $warning-bg; color: $warning; }
.ni-candidate-confidence.is-neutral { background: $primary-50; color: $primary; }
.ni-candidate-text { display: block; color: $ink-soft; font-size: $font-size-xs; line-height: 1.5; }
.ni-insight-detail, .ni-insight-source { display: flex; flex-direction: column; gap: $s-2; margin-top: $s-3; padding: $s-3; border-radius: $r-md; background: $bg-soft; }
.ni-insight-detail__text { color: $ink-soft; font-size: $font-size-sm; line-height: $lh-loose; white-space: pre-wrap; overflow-wrap: anywhere; }
.ni-insight-source { background: $bg-card; box-shadow: $shadow-sm; }
.ni-insight-source__title { color: $primary; font-size: $font-size-sm; font-weight: 500; line-height: $lh-base; }
.ni-insight-source__keywords { display: flex; flex-wrap: wrap; gap: $s-2; }
.ni-insight-source__keyword { padding: 4rpx 12rpx; border-radius: $r-sm; background: $bg-soft; color: $ink-soft; font-size: $font-size-xs; }
.ni-insight-source__meta { color: $ink-mute; font-size: $font-size-xs; }
.ni-price { font-size: $font-size-xl; font-weight: 700; }
.ni-pct { font-size: $font-size-base; font-weight: 700; }
.ni-metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: $s-2; margin-bottom: $s-3; }
.ni-mini { min-width: 0; display: flex; flex-direction: column; gap: 4rpx; padding: $s-2; border-radius: $r-sm; background: $bg-soft; text-align: center; font-size: $font-size-xs; color: $ink-soft; }
.ni-movement-section { margin-bottom: $s-3; }
.ni-movement-quote { padding: $s-4; border-radius: $r-md; background: $bg-card; box-shadow: $shadow-card; }
.ni-movement-top { display: flex; align-items: center; gap: $s-3; }
.ni-movement-info { flex: 1; min-width: 0; }
.ni-movement-name-row { display: flex; align-items: center; gap: $s-2; }
.ni-movement-name { overflow: hidden; font-size: $font-size-lg; font-weight: 700; color: $ink; text-overflow: ellipsis; white-space: nowrap; }
.ni-movement-tag { flex: 0 0 auto; padding: 4rpx 16rpx; border-radius: $r-full; font-size: $font-size-xs; font-weight: 600; }
.ni-movement-tag.is-up { background: $up-soft; color: $up; }
.ni-movement-tag.is-down { background: $down-soft; color: $down; }
.ni-movement-code { display: block; margin-top: 2rpx; font-size: $font-size-xs; color: $ink-mute; }
.ni-movement-price { flex: 0 0 auto; text-align: right; }
.ni-movement-price__value { display: block; font-family: $font-mono; font-size: $font-size-3xl; font-weight: 800; line-height: $lh-tight; }
.ni-movement-price__change { display: block; font-family: $font-mono; font-size: $font-size-md; font-weight: 600; }
.ni-movement-metrics { display: flex; justify-content: space-between; gap: $s-2; margin-top: $s-3; padding-top: $s-3; border-top: 2rpx solid $line; }
.ni-movement-metric { flex: 1; min-width: 0; text-align: center; }
.ni-movement-metric__value { display: block; font-family: $font-mono; font-size: $font-size-sm; font-weight: 700; color: $ink; }
.ni-movement-metric__value.is-warning { color: $warning; }
.ni-movement-metric__label { display: block; margin-top: 4rpx; font-size: $font-size-xs; color: $ink-soft; }
.ni-movement-status { display: flex; align-items: center; gap: $s-2; margin-top: $s-3; padding: $s-3; border-radius: $r-md; background: $bg-card; box-shadow: $shadow-card; font-size: $font-size-sm; }
.ni-movement-status.is-processing { color: $primary; }
.ni-movement-status.is-unavailable { color: $ink-mute; }
.ni-detail-page { margin-bottom: $s-3; }
.quote { margin-bottom: $s-3; padding: $s-4; border-radius: $r-md; background: $bg-card; box-shadow: $shadow-card; }
.o3-top { display: flex; align-items: flex-start; gap: $s-3; }
.avatar { display: flex; flex: 0 0 auto; align-items: center; justify-content: center; width: 80rpx; height: 80rpx; border-radius: 50%; background: $brand-gradient; color: $white; font-size: $font-size-lg; font-weight: 700; }
.o3-info { flex: 1; min-width: 0; }
.q-name-row { display: flex; align-items: center; gap: $s-2; }
.q-name { font-size: $font-size-lg; font-weight: 700; color: $ink; }
.q-code { display: block; margin-top: 2rpx; color: $ink-mute; font-size: $font-size-xs; }
.q-tag { flex: 0 0 auto; padding: 4rpx 16rpx; border-radius: $r-full; font-size: $font-size-xs; font-weight: 600; }
.q-tag.tag-up { color: $up; background: $up-soft; }.q-tag.tag-down { color: $down; background: $down-soft; }
.o3-price { flex: 0 0 auto; text-align: right; }.o3-p { display: block; font-family: $font-mono; font-size: $font-size-3xl; font-weight: 800; line-height: $lh-tight; }.o3-c { display: block; font-family: $font-mono; font-size: $font-size-md; font-weight: 600; }.o3-p.is-up, .o3-c.is-up, .o3-v.is-up { color: $up; }.o3-p.is-down, .o3-c.is-down, .o3-v.is-down { color: $down; }
.o3-metrics { display: flex; justify-content: space-between; gap: $s-2; margin-top: $s-3; padding-top: $s-3; border-top: 2rpx solid $line; }.o3-m { flex: 1; min-width: 0; text-align: center; }.o3-v { display: block; font-family: $font-mono; font-size: $font-size-sm; font-weight: 700; color: $ink; }.o3-v.o3-warn { color: $warning; }.o3-l { display: block; margin-top: 4rpx; color: $ink-soft; font-size: $font-size-xs; }
.insight-in-page { margin-bottom: $s-3; }
.hero-card { margin-bottom: $s-3; padding: $s-3; border-radius: $r-md; background: $bg-card; box-shadow: $shadow-card; }.hero-head, .cand-header { display: flex; align-items: center; gap: $s-2; }.hero-head { justify-content: space-between; }.hero-tag { flex: 0 0 auto; color: $primary; font-size: $font-size-xs; font-weight: 600; }.hero-chips { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: $s-2; }.cat-badge, .badge, .cand-tag { flex: 0 0 auto; padding: 2rpx 12rpx; border-radius: $r-sm; background: $primary-50; color: $primary; font-size: $font-size-xs; }.badge.is-gold, .cand-tag.is-weak { background: $warning-bg; color: $warning; }.badge.is-confirmed { background: $down-bg; color: $down; }
.hero-banner { margin-top: $s-3; padding: $s-3 $s-4; border-radius: $r-lg; background: $primary; box-shadow: 0 4rpx 12rpx rgba(11, 95, 255, .2); }.banner-label { display: block; margin-bottom: 4rpx; color: rgba(255,255,255,.8); font-size: $font-size-xs; letter-spacing: 2rpx; }.banner-text { display: block; color: $white; font-size: $font-size-base; font-weight: 600; line-height: 1.5; }
.hero-quote { margin-top: $s-2; padding: $s-2 $s-3; border-left: 6rpx solid $primary; border-radius: $r-sm; background: $primary-50; }.hq-item + .hq-item { margin-top: $s-2; padding-top: $s-2; border-top: 2rpx solid $primary-100; }.hq-label { display: block; margin-bottom: 4rpx; color: $ink-soft; font-size: $font-size-xs; font-weight: 600; }.hq-label.is-pri { color: $primary; }.hq-text { display: block; color: $ink-soft; font-size: $font-size-xs; line-height: $lh-base; white-space: pre-wrap; overflow-wrap: anywhere; }
.detail-section { margin-bottom: $s-3; padding: $s-3; border: 2rpx solid $line; border-radius: $r-md; background: $bg-card; }.detail-section-title { display: flex; align-items: center; margin-bottom: $s-2; color: $ink; font-size: $font-size-base; font-weight: 600; }.cand-list { display: flex; flex-direction: column; gap: $s-2; }.cand-card { padding: $s-3; border-radius: $r-md; background: $bg-soft; }.cand-label { flex: 1; color: $ink; font-size: $font-size-sm; font-weight: 600; }.cand-text { display: block; margin-top: $s-1; color: $ink-soft; font-size: $font-size-xs; line-height: 1.5; }
.unconfirmed { margin-bottom: $s-3; padding: $s-2 $s-3; border-radius: $r-sm; background: $warning-bg; color: $warning; font-size: $font-size-sm; }.timeline, .source { margin-bottom: $s-3; padding: $s-3; border-radius: $r-md; background: $bg-card; box-shadow: $shadow-sm; }.tl-item { position: relative; display: flex; flex-direction: column; padding-bottom: $s-3; padding-left: $s-4; border-left: 2rpx solid $line; }.tl-item:last-child { padding-bottom: 0; border-color: transparent; }.tl-dot { position: absolute; top: 6rpx; left: -7rpx; width: 12rpx; height: 12rpx; border-radius: 50%; background: $primary; }.tl-title { color: $ink; font-size: $font-size-sm; font-weight: 500; line-height: $lh-base; }.tl-meta, .meta { margin-top: 4rpx; color: $ink-mute; font-size: $font-size-xs; }.detail-text { display: block; box-sizing: border-box; width: 100%; margin-bottom: $s-3; padding: $s-3; border-radius: $r-md; background: $bg-card; box-shadow: $shadow-sm; color: $ink-soft; font-size: $font-size-sm; line-height: $lh-loose; white-space: pre-wrap; overflow-wrap: anywhere; }.src { display: block; color: $primary; font-size: $font-size-sm; font-weight: 500; line-height: $lh-base; }.kw { display: flex; flex-wrap: wrap; gap: $s-2; margin-top: $s-2; }.kw-item { padding: 4rpx 12rpx; border-radius: $r-sm; background: $bg-soft; color: $ink-soft; font-size: $font-size-xs; }
.ni-report-header { margin-bottom: $s-3; padding: $s-3; border-radius: $r-md; background: $bg-card; border: 2rpx solid $line-soft; }
.ni-report-header__top { display: flex; align-items: center; justify-content: space-between; gap: $s-2; }
.ni-report-header__main { display: flex; align-items: center; gap: $s-2; min-width: 0; flex-wrap: wrap; }
.ni-report-name { font-size: $font-size-lg; font-weight: 700; color: $ink; }
.ni-report-code { padding: 4rpx 12rpx; border-radius: $r-sm; background: $bg-soft; color: $ink-soft; font-size: $font-size-sm; }
.ni-report-period { color: $primary; font-size: $font-size-sm; font-weight: 700; }
.ni-report-tag { flex-shrink: 0; padding: 6rpx 18rpx; border-radius: $r-sm; background: $primary-50; color: $primary; font-size: $font-size-sm; font-weight: 700; }
.ni-report-meta { display: flex; flex-wrap: wrap; gap: $s-2; margin-top: $s-2; color: $ink-mute; }
.ni-report-meta__item { font-size: $font-size-xs; }
.ni-report-table-section { margin-top: $s-3; border: 2rpx solid $line-soft; border-radius: $r-md; overflow: hidden; background: $bg-card; }
.ni-report-table-head { display: flex; align-items: center; justify-content: space-between; gap: $s-2; padding: $s-3 $s-3 $s-2; }
.ni-report-table-title { display: flex; align-items: center; gap: $s-2; font-size: $font-size-base; font-weight: 700; color: $ink; }
.ni-report-year-toggle { display: flex; flex-shrink: 0; padding: 3rpx; border-radius: $r-sm; background: $bg-soft; }
.ni-year-toggle-btn { padding: 4rpx 14rpx; border-radius: $r-xs; color: $ink-soft; font-size: $font-size-xs; font-weight: 600; }
.ni-year-toggle-btn.active { color: #fff; background: $primary; }
.ni-report-table-section .ni-table-scroll { margin-top: 0; }

@media (max-width: 420px) {
  .ni-panel { width: 600rpx; max-width: 88vw; height: 72vh; }
  .ni-metric-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
