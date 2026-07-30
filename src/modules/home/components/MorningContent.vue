<template>
  <view class="morning-content">
    <view class="content-wrap">
      <!-- 今日专属晨报卡片 -->
      <view class="briefing-card" @tap="goBriefingDetail">
        <view class="briefing-left">
          <view class="briefing-top">
            <text class="briefing-title">今日专属 · {{ briefingTypeLabel }}</text>
            <text v-if="report?.degraded" class="briefing-degraded">证据不完整</text>
            <text v-if="report?.degraded && report.missing_sources.length" class="briefing-missing">
              缺失来源：{{ report?.missing_sources.join('、') }}
            </text>
          </view>
          <!-- 有数据时：显示线索数量和简洁摘要 -->
          <template v-if="briefingStatus === 'ready'">
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
          <!-- 空状态/错误/加载时：显示提示 -->
          <view v-else class="briefing-clue">
            <text class="clue-text">{{ getBriefingDesc() }}</text>
          </view>
          <view class="briefing-btn" @tap.stop="goBriefing">
            <text class="btn-icon">◉</text>
            <text class="btn-text">专属播报</text>
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
        <Card class="feature-card" clickable @click="goSectors">
          <view class="feature-header">
            <text class="feature-title">长线风口</text>
            <text class="feature-more">›</text>
          </view>
          <text class="feature-sub">排行前三板块</text>
          <view class="feature-list">
            <template v-if="leaderSectors.length">
              <view v-for="(item, idx) in leaderSectors.slice(0, 3)" :key="idx" class="feature-item">
                <text class="item-name">No.{{ idx + 1 }} {{ item.name }}</text>
                <Tag :type="itemTagType(item.tagType)" size="sm">{{ item.tag }}</Tag>
              </view>
            </template>
            <view v-else class="feature-item">
              <text class="item-name placeholder">加载中...</text>
            </view>
          </view>
        </Card>

        <Card class="feature-card" clickable @click="goEventChain">
          <view class="feature-header">
            <text class="feature-title">事件传导</text>
            <text class="feature-more">›</text>
          </view>
          <text class="feature-sub">产业链追踪</text>
          <view class="feature-list">
            <view v-for="(item, idx) in chainEvents.slice(0, 3)" :key="idx" class="feature-item">
              <text class="item-name">{{ item.name }}</text>
              <Tag :type="itemTagType(item.tagType)" size="sm">{{ item.tag }}</Tag>
            </view>
          </view>
        </Card>

        <Card class="feature-card" clickable @click="goTraceability">
          <view class="feature-header">
            <text class="feature-title">大盘溯源</text>
            <text class="feature-more">›</text>
          </view>
          <text class="feature-sub">市场异动溯源分析</text>
          <view class="feature-list">
            <view v-for="(item, idx) in traceReports.slice(0, 3)" :key="idx" class="feature-item">
              <text class="item-name">{{ item.name }}</text>
              <Tag :type="itemTagType(item.tagType)" size="sm">{{ item.tag }}</Tag>
            </view>
          </view>
        </Card>

        <Card class="feature-card" clickable @click="goAgentReport">
          <view class="feature-header">
            <text class="feature-title">今日分析概览</text>
            <text class="feature-more">›</text>
          </view>
          <text class="feature-sub">Agent报告更新状态</text>
          <view class="feature-list">
            <view v-for="(item, idx) in aiReports.slice(0, 3)" :key="idx" class="feature-item">
              <text class="item-name">{{ item.name }}</text>
              <Tag :type="itemTagType(item.tagType)" size="sm">{{ item.tag }}</Tag>
            </view>
          </view>
        </Card>
      </view>

      <!-- 重磅事件跟踪 -->
      <Card class="track-card" clickable @click="goTrackDetail">
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
import type { WindLeaderSector } from '@/shared/api/modules/stock'

const {
  type: briefingType,
  date: briefingDate,
  typeLabel: briefingTypeLabel,
  summary: briefingSummary,
  report,
  status: briefingStatus,
  loading: briefingLoading,
  refresh: briefingRefresh,
} = useBriefingCard()

/** 摘要拆分为标签：按标点切割，过滤过长片段（整句），最多3个，每个限12字 */
const summaryTags = computed(() => {
  const text = briefingSummary.value || ''
  return text
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
      return briefingTypeLabel.value === '晨报'
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

// 卡片点击：进入早点听页面（音频播报 + 条目列表）
function goBriefingDetail() {
  const type = briefingTypeLabel.value === '晨报' ? 'morning' : 'review'
  uni.navigateTo({ url: `/pages-sub-app/briefing/index?type=${type}` })
}

// 长线风口：从后端 API 获取风口板块数据，提取排行前3的板块在首页预览
interface LeaderStockPreview {
  name: string
  tag: string
  tagType: 'buy' | 'sell' | 'wash' | 'up' | 'down' | 'date'
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
      // 标签：优先用 publishTime 的日期，否则标"新"
      const tag = e.publishTime ? e.publishTime.slice(5, 10) : '新'
      return { name: e.title, tag, tagType: 'date' as const }
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

const aiReports = ref<LeaderStockPreview[]>([])

/** Agent 报告状态预览：检查 4 个 agent（晨报/风口龙头/机构调研/趋势股评分），最多显示3个已更新，不足则补"待更新" */
const AGENT_REPORT_LABELS: Array<{ intent: string; name: string }> = [
  { intent: 'morning', name: '晨报' },
  { intent: 'wind_leader', name: '风口龙头' },
  { intent: 'hot_burst', name: '机构调研' },
  { intent: 'trend_score', name: '趋势股评分' },
]

async function loadAiReports() {
  const today = new Date().toISOString().split('T')[0]
  const results = await Promise.allSettled(
    AGENT_REPORT_LABELS.map(item => agentApi.getReport(item.intent, today))
  )

  const updated: LeaderStockPreview[] = []
  AGENT_REPORT_LABELS.forEach((item, idx) => {
    const r = results[idx]
    const hasReport = r.status === 'fulfilled' && r.value &&
      !!(r.value as { content?: unknown })?.content
    if (hasReport) {
      updated.push({ name: item.name, tag: '已更新', tagType: 'buy' })
    }
  })

  // 最多显示3个：已更新优先，不足补"待更新"
  const display: LeaderStockPreview[] = updated.slice(0, 3)
  for (const item of AGENT_REPORT_LABELS) {
    if (display.length >= 3) break
    if (!updated.some(u => u.name === item.name)) {
      display.push({ name: item.name, tag: '待更新', tagType: 'wash' })
    }
  }

  aiReports.value = display
}

const traceReports = ref<LeaderStockPreview[]>([
  { name: '北向资金异动', tag: '流入', tagType: 'buy' },
  { name: '板块轮动分析', tag: '关注', tagType: 'wash' },
  { name: '主力资金动向', tag: '流出', tagType: 'sell' },
])

/**
 * 业务 tagType → 组件库 Tag type 映射
 * up→up(红)，down/date/sell→down(绿)，wash→warning(橙)，buy→neutral(蓝)
 */
function itemTagType(tagType: LeaderStockPreview['tagType']): 'up' | 'down' | 'neutral' | 'warning' {
  switch (tagType) {
    case 'up': return 'up'
    case 'down': return 'down'
    case 'date': return 'down'
    case 'sell': return 'down'
    case 'wash': return 'warning'
    case 'buy': return 'neutral'
  }
}

onShow(() => {
  briefingRefresh()
  loadLeaderSectors()
  loadAiReports()
  loadChainEvents()
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

function goTraceability() {
  uni.navigateTo({ url: '/modules/analytics/pages/traceability' })
}

function goAgentReport() {
  uni.navigateTo({ url: '/modules/chat/pages/agent-report' })
}

function goTrackDetail() {
  // 跳转到资讯详情页；携带 eventId 供 AI 深度解析入口使用
  const eventId = topEvent.value.eventId
  const url = eventId
    ? `/modules/news/pages/detail?eventId=${eventId}`
    : '/modules/news/pages/detail'
  uni.navigateTo({ url })
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
  padding: $s-3;
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

.briefing-missing {
  font-size: 20rpx;
  color: $warning;
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
