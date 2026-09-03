<template>
  <view class="morning-content">
    <view class="content-wrap">
      <!-- 今日专属播报卡片（晨报/午间报/晚报按时间自动切换） -->
      <view class="briefing-card" @tap="goBriefingDetail">
        <view class="briefing-left">
          <view class="briefing-top">
            <text class="briefing-title">今日专属 · {{ briefingTypeLabel }}</text>
            <text v-if="report?.degraded" class="briefing-degraded">证据不完整</text>
          </view>
          <!-- 有数据时：午间报摘要+关键词，晨/晚报线索数量和简洁摘要；关键词样式统一为短标签 -->
          <template v-if="briefingStatus === 'ready'">
            <!-- 午间报：摘要一行 + 短关键词标签（与晨/晚报一致的紧凑样式） -->
            <template v-if="briefingType === 'midday' && middayReport">
              <view class="briefing-clue">
                <text class="clue-text">{{ middayReport.content.display_report.summary }}</text>
              </view>
              <view v-if="summaryTags.length" class="briefing-tags">
                <view v-for="(tag, idx) in summaryTags" :key="idx" class="summary-tag">
                  <text class="tag-text">{{ tag }}</text>
                </view>
                <text class="tags-arrow">›</text>
              </view>
            </template>
            <!-- 晨/晚报：保留原有"线索数量 + 短标签"展示 -->
            <template v-else>
              <view v-if="briefingClueCount > 0" class="briefing-clue">
                <text class="clue-text">{{ briefingClueCount }}条关键线索需关注</text>
              </view>
              <view v-if="briefingClueCount > 0" class="briefing-tags">
                <view v-for="(tag, idx) in summaryTags" :key="idx" class="summary-tag">
                  <text class="tag-text">{{ tag }}</text>
                </view>
                <text class="tags-arrow">›</text>
              </view>
              <view v-else class="briefing-clue">
                <text class="clue-text">暂无关键线索</text>
              </view>
            </template>
          </template>
          <!-- 空状态/错误/加载时：显示提示 -->
          <view v-else class="briefing-clue">
            <text class="clue-text">{{ getBriefingDesc() }}</text>
          </view>
          <view class="briefing-btn-row">
            <view class="briefing-btn" @tap.stop="goBriefing">
              <text class="btn-icon">◉</text>
              <text class="btn-text">专属播报</text>
            </view>
            <text v-if="report?.degraded && report.missing_sources.length" class="briefing-missing">
              缺失来源：{{ report?.missing_sources.join('、') }}
            </text>
          </view>
        </view>
        <view class="briefing-right">
          <view class="ai-avatar-wrap" :class="{ 'ai-avatar-loading': briefingLoading }">
            <SvgIcon name="headphone-line" size="40rpx" color="#ffffff" />
          </view>
          <view class="ai-avatar-ring ring-1"></view>
          <view class="ai-avatar-ring ring-2"></view>
        </view>
      </view>

      <!-- 功能入口 2x2 网格 -->
      <view class="feature-grid">
        <Card class="feature-card" clickable @tap="goSectors">
          <view class="feature-header">
            <text class="feature-title">风口龙头</text>
            <text class="feature-more">›</text>
          </view>
          <text class="feature-sub">排行前三板块</text>
          <view class="feature-list">
            <template v-if="leaderSectors.length">
              <view
                v-for="(item, idx) in leaderSectors.slice(0, 3)"
                :key="idx"
                class="feature-item"
                @tap.stop="goSectorDetail(item.name)"
              >
                <text class="item-name">No.{{ idx + 1 }} {{ item.name }}</text>
                <Tag :type="itemTagType(item.tagType)" size="sm">{{ item.tag }}</Tag>
              </view>
            </template>
            <view v-else class="feature-item">
              <text class="item-name placeholder">加载中...</text>
            </view>
          </view>
        </Card>

        <Card class="feature-card" clickable @tap="goEventChain">
          <view class="feature-header">
            <text class="feature-title">事件传导</text>
            <text class="feature-more">›</text>
          </view>
          <text class="feature-sub">产业链追踪</text>
          <view class="feature-list">
            <view
              v-for="(item, idx) in chainEvents.slice(0, 3)"
              :key="idx"
              class="feature-item"
              @tap.stop="goEventDetail(item.eventId)"
            >
              <text class="item-name">{{ item.name }}</text>
              <Tag :type="itemTagType(item.tagType)" size="sm">{{ item.tag }}</Tag>
            </view>
          </view>
        </Card>

        <Card class="feature-card" clickable @tap="goTraceability">
          <view class="feature-header">
            <text class="feature-title">市场洞见</text>
            <text class="feature-more">›</text>
          </view>
          <text class="feature-sub">市场异动溯源分析</text>
          <view class="feature-list">
            <view v-for="(item, idx) in traceReports" :key="idx" class="feature-item">
              <text class="item-name">{{ item.name }}</text>
              <Tag :type="itemTagType(item.tagType)" size="sm">{{ item.tag }}</Tag>
            </view>
          </view>
        </Card>

        <Card class="feature-card" clickable @tap="goRhythm">
          <view class="feature-header">
            <text class="feature-title">节奏大师</text>
            <text class="feature-more">›</text>
          </view>
          <text class="feature-sub">近 {{ HOME_RHYTHM_DAYS }} 个交易日 · 收盘基准</text>
          <!-- 近几日结论：每行 = 日期 + 档位 chip + 建议仓位；点行进该日详情（stop 防触整卡跳转） -->
          <view class="feature-list" v-if="rhythmRows.length">
            <view
              v-for="r in rhythmRows"
              :key="r.date"
              class="feature-item rhythm-row"
              @tap.stop="goRhythmDate(r.date)"
            >
              <text class="feature-label rhythm-date">{{ r.date.slice(5) }}</text>
              <view class="rhythm-chip" :style="{ background: rhythmChipColor(r) }">
                <text class="rhythm-chip-text">{{ rhythmLevelShort(r) }}</text>
              </view>
              <text class="feature-value rhythm-band">{{ r.band || (r.basis_date ? '沿用前值' : '无报告') }}</text>
            </view>
          </view>
        </Card>
      </view>

      <!-- 重磅事件跟踪 -->
      <Card class="track-card" clickable @tap="goTrackDetail">
        <view class="track-header">
          <text class="track-title">重磅事件跟踪</text>
          <text class="track-more">›</text>
        </view>
        <view class="track-item">
          <text class="track-label">事件</text>
          <text class="track-content">{{ topEvent.title }}</text>
        </view>
        <view class="track-footer">
          <text class="track-arrow">∧</text>
          <text class="track-tip">点击查看资讯详情</text>
        </view>
      </Card>

    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import Card from '@/shared/components/Card.vue'
import Tag from '@/shared/components/Tag.vue'
import { useBriefingCard } from '@/shared/utils/useBriefingCard'
import { buildBriefingUrl } from '@/shared/utils/briefingNavigation'
import { stockApi } from '@/shared/api/modules/stock'
import { agentApi } from '@/shared/api/modules/agent'
import { getEventList } from '@/modules/chat/event/api/eventApi'
import { shanghaiDateString, addCalendarDays } from '@/shared/utils/tradingTime'
import { toMarketTraceViewModel } from '@/modules/analytics/utils/marketTraceReview'
import type { WindLeaderSector } from '@/shared/api/modules/stock'

const {
  type: briefingType,
  date: briefingDate,
  typeLabel: briefingTypeLabel,
  summary: briefingSummary,
  report,
  status: briefingStatus,
  loading: briefingLoading,
  middayReport,
  refresh: briefingRefresh,
} = useBriefingCard()

/** 大盘归因降级文案判定：后端在归因结论无归因时返回"今日证据不足，未确认主因" */
function isDowngradedAttribution(text: string): boolean {
  return /证据不足|未确认主因|暂无明确主因/.test(text)
}

/**
 * 大盘（归因结论）无归因时，改取市场异象条目结论作为标签来源。
 * 晚报 items：[归因结论 / 市场快照(板块) / 收盘复盘(现象摘要)]，
 * 优先"收盘复盘"（现象摘要，如"今日概念板块集中异动…"）的市场异象关键词，
 * 其次"市场快照"（板块行情），均无则回退首个非归因条目。
 */
function marketAnomalyText(items: readonly { title?: string; conclusion?: string }[]): string {
  for (const title of ['收盘复盘', '市场快照']) {
    const hit = items.find(it => it?.title === title)
    if (hit?.conclusion) return hit.conclusion
  }
  const fallback = items.find(it => it?.title !== '归因结论')
  return fallback?.conclusion ?? ''
}

/** 摘要拆分为标签：按标点切割，过滤过长片段（整句），最多3个，每个限12字 */
const summaryTags = computed(() => {
  const items = report.value?.items ?? []
  const head = items[0]
  const headText = head?.conclusion ?? ''
  // 大盘无归因（头条为归因结论且降级）时，改用市场异象关键词，不展示降级文案
  const sourceText =
    head?.title === '归因结论' && isDowngradedAttribution(headText)
      ? marketAnomalyText(items)
      : briefingSummary.value
  return sourceText
    .split(/[，,、+。！!？?]/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length <= 15)
    .slice(0, 3)
    .map(s => s.length > 12 ? s.slice(0, 12) + '…' : s)
})

/** 线索数量：晨报按 stocks，晚报按 sectors */
const briefingClueCount = computed(() => {
  return report.value?.items.length ?? 0
})

// 卡片描述文案（根据状态）
function getBriefingDesc(): string {
  switch (briefingStatus.value) {
    case 'empty':
      if (briefingType.value === 'midday') return '午间报生成中，12:05后查看'
      return briefingType.value === 'morning'
        ? '晨报生成中，9:00后查看'
        : '晚报生成中，收盘后查看'
    case 'error':
      return '暂不可用，点击查看'
    case 'loading':
      return '加载中...'
    default:
      return ''
  }
}

// 卡片点击：进入早点听页面（音频播报 + 条目列表），保留当前报告类型
function goBriefingDetail() {
  uni.navigateTo({ url: `/pages-sub-app/briefing/index?type=${briefingType.value}` })
}

// 长线风口：从后端 API 获取风口板块数据，提取排行前3的板块在首页预览
interface LeaderStockPreview {
  name: string
  tag: string
  tagType: 'buy' | 'sell' | 'wash' | 'up' | 'down' | 'date'
  /** 预览行额外携带的跳转标识：事件传导行 → 事件 ID，跳转 AI 事件分析页用 */
  eventId?: string
}

const leaderSectors = ref<LeaderStockPreview[]>([])

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

// 从风口板块中提取排行前 N 的板块预览（按 score 降序）
function extractSectorPreview(sectors: WindLeaderSector[], maxCount: number): LeaderStockPreview[] {
  return sectors
    .filter(s => s && s.name)
    .slice()
    .sort((a, b) => (toFiniteNumber(b.score) ?? 0) - (toFiniteNumber(a.score) ?? 0))
    .slice(0, maxCount)
    .map(sector => {
      const changePct = toFiniteNumber(sector.today_change)
      const tag = changePct !== null
        ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`
        : '--'
      const tagType: LeaderStockPreview['tagType'] = changePct === null
        ? 'wash'
        : changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'wash'
      return { name: sector.name, tag, tagType }
    })
}

async function loadLeaderSectors() {
  try {
    const res: any = await stockApi.getWindLeaders(8)
    const data = res?.data ?? res
    const sectors: WindLeaderSector[] = data?.hot_sectors ?? []
    leaderSectors.value = extractSectorPreview(sectors, 3)
  } catch (error) {
    console.error('首页长线风口数据加载失败:', error)
    leaderSectors.value = []
  }
}

const topEvent = ref({
  eventId: '',
  sector: '',
  title: '暂无重磅事件',
})

const chainEvents = ref<LeaderStockPreview[]>([])

/** 事件传导卡片：从事件列表 API 获取最新3条事件作为预览 */
async function loadChainEvents() {
  try {
    const res = await getEventList({ page: 1, pageSize: 5 })
    const events = res?.events ?? []

    // 事件传导卡片：取最新3条事件
    chainEvents.value = events.slice(0, 3).map(e => {
      // 标签：优先用 publishTime 的时间(HH:MM)，无时间则回退日期，否则标"新"
      const tag = e.publishTime
        ? (e.publishTime.length >= 16 ? e.publishTime.slice(11, 16) : e.publishTime.slice(5, 10))
        : '新'
      return { name: e.title, tag, tagType: 'date' as const, eventId: e.eventId }
    })

    // 重磅事件跟踪：取第1条事件
    if (events.length > 0) {
      topEvent.value = {
        eventId: events[0].eventId || '',
        sector: events[0].source || '',
        title: events[0].title,
      }
    }
  } catch (error) {
    console.error('首页事件传导数据加载失败:', error)
    // 失败时保持空状态，不显示假数据
  }
}

const traceReports = ref<LeaderStockPreview[]>([])

/**
 * 大盘溯源卡片：查询最近 3 个交易日的复盘报告状态。
 * 标签统一用日期（MM-DD），和事件传导卡片一致。
 * 名称：当日已生成 → 现象快照摘要；待更新 → 规则提示文字。
 */
async function loadTraceReports() {
  const today = shanghaiDateString()
  // 用最近 3 个交易日作为日期标签，避免展示周末/法定节假日；接口异常时退回自然日
  let dates: string[]
  try {
    dates = await agentApi.getRecentTradingDays(today, 3)
  } catch (err) {
    console.error('获取最近交易日失败，退回自然日:', err)
    dates = [today, addCalendarDays(today, -1), addCalendarDays(today, -2)]
  }
  const results = await Promise.allSettled(
    dates.map(d => agentApi.getMarketTraceReview(d))
  )
  traceReports.value = dates.map((d, idx) => {
    const r = results[idx]
    const record = r.status === 'fulfilled' ? r.value : null
    const vm = record ? toMarketTraceViewModel(record, d) : null
    const isToday = !!record && record.report_date === d
    const summary = vm?.summary || ''
    const name = isToday
      ? (summary || '市场异动溯源分析')
      : '每日收盘后生成异动溯源'
    return {
      name,
      tag: d.slice(5), // MM-DD
      tagType: 'date' as const,
    }
  })
}

/** 首页节奏大师卡：近几日摘要（收盘基准档位 + 建议仓位），每行点入该日详情 */
const HOME_RHYTHM_DAYS = 5
interface RhythmHistoryRow {
  date: string
  level: string | null
  score: number | null
  basis_date: string | null
  band: string
}
const rhythmRows = ref<RhythmHistoryRow[]>([])

// 档位短码/色板（与节奏模块日历同源：ice 紫灰 / low 青 / normal 主蓝 / active 橙 / euphoria 红）
const RHYTHM_LEVEL_SHORT: Record<string, string> = { ice: '冰', low: '低', normal: '常', active: '活', euphoria: '亢' }
const RHYTHM_LEVEL_COLOR: Record<string, string> = {
  ice: '#8a6fae',
  low: '#2f9e9e',
  normal: '#4d7cfe',
  active: '#f59e0b',
  euphoria: '#ef4444',
}
const RHYTHM_GREY = '#eceef1' // 无档位（行缺失/沿用前值）

async function loadRhythmHistory() {
  try {
    // 一次日历接口取数即可获得多日 level/score/position_band（契约 #7），避免逐日 getRhythmMaster 放大首页刷新成本
    const res = await agentApi.getRhythmMasterCalendar(HOME_RHYTHM_DAYS)
    const days = res?.days ?? []
    // 接口"最近在前"（降序），卡片按时间正序展示（旧→新，最底=最新）
    rhythmRows.value = [...days].reverse().map((d) => ({
      date: d.date,
      level: d.level,
      score: d.score,
      basis_date: d.basis_date,
      band: d.position_band?.text ?? '',
    }))
  } catch {
    rhythmRows.value = []
  }
}

function rhythmChipColor(r: RhythmHistoryRow): string {
  return (r.level && RHYTHM_LEVEL_COLOR[r.level]) || RHYTHM_GREY
}
function rhythmLevelShort(r: RhythmHistoryRow): string {
  if (r.level) return RHYTHM_LEVEL_SHORT[r.level] ?? r.level.slice(0, 1)
  return '沿'
}

function goRhythm() {
  uni.navigateTo({ url: '/modules/rhythm/pages/index' })
}
/** 点节奏卡某日摘要行：直达该交易日详情（无报告日由详情页回退链兜底） */
function goRhythmDate(date: string) {
  uni.navigateTo({ url: `/modules/rhythm/pages/index?date=${date}` })
}

/**
 * 业务 tagType → 组件库 Tag type 映射
 * up→up(红)，down/sell→down(绿)，date→neutral(静尘蓝)，
 * buy/已更新→warning(暖杏橙)，wash/待更新→gray(中性灰)
 */
function itemTagType(tagType: LeaderStockPreview['tagType']): 'up' | 'down' | 'neutral' | 'warning' | 'gray' {
  switch (tagType) {
    case 'up': return 'up'
    case 'down': return 'down'
    case 'date': return 'neutral'
    case 'sell': return 'down'
    case 'wash': return 'gray'
    case 'buy': return 'warning'
  }
}

onShow(() => {
  briefingRefresh()
  loadLeaderSectors()
  loadRhythmHistory()
  loadChainEvents()
  loadTraceReports()
})

function goChat() {
  uni.navigateTo({ url: '/pages-sub-app/chat/index' })
}

function goBriefing() {
  uni.navigateTo({ url: buildBriefingUrl(briefingType.value, briefingDate.value) })
}

function goSectors() {
  uni.navigateTo({ url: '/modules/market/pages/leaders' })
}

function goEventChain() {
  uni.navigateTo({ url: '/modules/chat/pages/event/list' })
}

/** 风口龙头卡片的预览板块行 → 板块/风口详情页（按板块名定位） */
function goSectorDetail(name: string) {
  if (!name) return
  uni.navigateTo({ url: `/modules/market/pages/sector-detail?name=${encodeURIComponent(name)}` })
}

/** 事件传导卡片的预览事件行 → AI 事件分析页（按事件 ID）；无 ID 回退事件列表 */
function goEventDetail(eventId?: string) {
  if (!eventId) {
    goEventChain()
    return
  }
  uni.navigateTo({ url: `/modules/chat/pages/event/detail?id=${eventId}` })
}

function goTraceability() {
  uni.navigateTo({ url: '/modules/analytics/pages/traceability' })
}

function goTrackDetail() {
  // 跳转到 AI 事件分析页（事件传导解析），携带 eventId
  const eventId = topEvent.value.eventId
  if (!eventId) {
    uni.navigateTo({ url: '/modules/chat/pages/event/list' })
    return
  }
  uni.navigateTo({ url: `/modules/chat/pages/event/detail?id=${eventId}` })
}

function goSearch() {
  uni.navigateTo({ url: '/modules/favorites/pages/search' })
}

function goStockDetail(symbol: string) {
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` })
}

function goLogin() {
  uni.navigateTo({ url: '/modules/user/pages/login' })
}
</script>

<style lang="scss" scoped>
.morning-content {
  background: $bg-card;
}

.content-wrap {
  padding: $s-2;
}

/* ===== 晨报卡片 ===== */
.briefing-card {
  display: flex;
  align-items: stretch;
  padding: $s-3;
  background: $bg-soft;
  border: 2rpx solid $line;
  border-radius: $r-md;
  margin-bottom: $s-2;
  position: relative;
  overflow: hidden;
  box-shadow: $shadow-card;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:active {
    transform: scale(0.98);
    box-shadow: $shadow-sm;
  }
}

.briefing-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4rpx;
  background: $brand-gradient;
}

.briefing-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $s-1;
}

.briefing-top {
  display: flex;
  align-items: center;
}

.briefing-btn-row {
  display: flex;
  align-items: center;
  gap: $s-2;
  margin-top: 6rpx;
}

.briefing-missing {
  font-size: 20rpx;
  color: $warning;
}

.briefing-title {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $ink;
}

.briefing-degraded {
  margin-left: $s-1;
  padding: 2rpx $s-1;
  color: $warning;
  background: $warning-soft;
  border: 1rpx solid rgba($warning, 0.25);
  border-radius: $r-xs;
  font-size: $font-size-xs;
  line-height: 1.4;
}

.briefing-clue {
  margin-top: 4rpx;
}

.clue-text {
  font-size: $font-size-sm;
  color: $ink-soft;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  word-break: break-all;
}

.briefing-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx;
  margin-top: 8rpx;
}

.summary-tag {
  padding: 6rpx 14rpx;
  background: rgba($primary, 0.08);
  border: 1rpx solid rgba($primary, 0.15);
  border-radius: $r-xs;
}

.tag-text {
  font-size: $font-size-xs;
  color: $primary;
  font-weight: 500;
  line-height: 1.4;
}

.tags-arrow {
  font-size: $font-size-lg;
  color: $ink-mute;
  margin-left: 2rpx;
  line-height: 1.4;
}

.briefing-btn {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 18rpx;
  background: $brand-gradient;
  border-radius: $r-full;
  align-self: flex-start;
  margin-top: 6rpx;
  transition: opacity 0.2s ease;

  &:active {
    opacity: 0.85;
  }
}

.btn-icon {
  font-size: 18rpx;
  color: $white;
}

.btn-text {
  font-size: $font-size-sm;
  color: $white;
  font-weight: 500;
}

/* AI 头像右侧 */
.briefing-right {
  width: 130rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.ai-avatar-wrap {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  /* 极光蓝紫渐变：蓝紫 → 天蓝，135° 对角 */
  background: linear-gradient(135deg, #4f46e5, #0ea5e9);
  /* 白色细边框：增强头像在彩色背景上的边界感 */
  border: 2rpx solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  box-shadow: 0 4rpx 12rpx rgba(79, 70, 229, 0.3);
}

.ai-avatar-ring {
  position: absolute;
  border-radius: 50%;
  border: 2rpx solid rgba(79, 70, 229, 0.15);
  pointer-events: none;
}

.ai-avatar-ring.ring-1 {
  width: 120rpx;
  height: 120rpx;
  animation: ring-pulse 2s ease-out infinite;
}

.ai-avatar-ring.ring-2 {
  width: 140rpx;
  height: 140rpx;
  opacity: 0.5;
  animation: ring-pulse 2s ease-out infinite 0.5s;
}

.ai-avatar-loading {
  animation: avatar-pulse 1.2s ease-in-out infinite;

  .ai-avatar-ring.ring-1 {
    animation: ring-pulse-fast 1.2s ease-out infinite;
  }

  .ai-avatar-ring.ring-2 {
    animation: ring-pulse-fast 1.2s ease-out infinite 0.3s;
  }
}

@keyframes avatar-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.95); }
}

@keyframes ring-pulse {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.15); opacity: 0; }
}

@keyframes ring-pulse-fast {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.15); opacity: 0; }
}

/* ===== 功能入口 2x2 网格 ===== */
.feature-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

/* Card 作为 feature-card 容器；覆写内边距使 2x2 网格更紧凑（复合选择器提升优先级） */
.feature-card.as-card {
  padding: $s-2;
}

/* 首页白色卡片：与今日专属卡片一致的按压动效（覆盖 Card 默认 scale(0.995)，加阴影变化） */
.feature-card.as-card,
.track-card.as-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:active {
    transform: scale(0.98);
    box-shadow: $shadow-sm;
  }
}

.feature-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.feature-title {
  font-size: $font-size-md;
  font-weight: 600;
  color: $ink;
}

.feature-more {
  font-size: $font-size-md;
  color: $ink-mute;
  font-weight: 300;
}

.feature-sub {
  font-size: $font-size-xs;
  color: $ink-soft;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 6rpx;
  min-width: 0;
}

.feature-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
  min-width: 0;
  width: 100%;
}

.item-name {
  font-size: $font-size-sm;
  color: $ink-soft;
  flex: 1;
  min-width: 0;
  max-width: 100%;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  word-break: break-all;
}

.item-name.placeholder {
  color: $ink-mute;
}

/* 节奏大师卡片：近几日结论摘要行（日期 + 档位 chip + 建议仓位） */
.rhythm-row {
  justify-content: flex-start;
}
.rhythm-date {
  flex: none;
  width: 84rpx;
  font-size: $font-size-xs;
  color: $ink;
  font-weight: 500;
}
.rhythm-chip {
  flex: none;
  width: 40rpx;
  height: 34rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rhythm-chip-text {
  color: #fff;
  font-size: 18rpx;
  line-height: 1;
}
.rhythm-band {
  flex: 1;
  min-width: 0;
  margin-left: 8rpx;
  text-align: right;
  font-size: $font-size-xs;
  color: $primary;
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* ===== 重磅事件跟踪 ===== */
.track-card.as-card {
  padding: $s-2;
}

.track-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.track-title {
  font-size: 26rpx;
  font-weight: 600;
  color: $ink;
}

.track-more {
  font-size: $font-size-md;
  color: $ink-mute;
  font-weight: 300;
}

.track-item {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.track-label {
  flex-shrink: 0;
  font-size: 20rpx;
  color: $up;
  background: $up-soft;
  padding: 2rpx 8rpx;
  border-radius: $r-xs;
  font-weight: 500;
  margin-top: 2rpx;
}

.track-content {
  flex: 1;
  font-size: $font-size-sm;
  color: $ink-soft;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.track-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  margin-top: 14rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid $line-soft;
}

.track-arrow {
  font-size: 20rpx;
  color: $ink-mute;
}

.track-tip {
  font-size: 20rpx;
  color: $ink-soft;
}
</style>
