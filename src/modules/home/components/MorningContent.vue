<template>
  <view class="morning-content">
    <view class="content-wrap">
      <!-- 今日专属晨报卡片 -->
      <view class="briefing-card" @tap="goBriefingDetail">
        <view class="briefing-left">
          <view class="briefing-top">
            <text class="briefing-title">今日专属 · {{ briefingTypeLabel }}</text>
          </view>
          <!-- 有数据时：显示线索数量和简洁摘要 -->
          <template v-if="briefingStatus === 'ready'">
            <view class="briefing-clue">
              <text class="clue-text">{{ briefingClueCount }}条关键线索需关注</text>
            </view>
            <view class="briefing-tags">
              <view v-for="(tag, idx) in summaryTags" :key="idx" class="summary-tag">
                <text class="tag-text">{{ tag }}</text>
              </view>
              <text class="tags-arrow">›</text>
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
            <SvgIcon name="headphone-line" size="40rpx" color="#4d7cfe" />
          </view>
          <view class="ai-avatar-ring ring-1"></view>
          <view class="ai-avatar-ring ring-2"></view>
        </view>
      </view>

      <!-- 功能入口 2x2 网格 -->
      <view class="feature-grid">
        <view class="feature-card leader-card" @tap="goSectors">
          <view class="feature-header">
            <text class="feature-title">长线风口</text>
            <text class="feature-more">›</text>
          </view>
          <text class="feature-sub">主力最新动向</text>
          <view class="feature-list">
            <template v-if="leaderStocks.length">
              <view v-for="(item, idx) in leaderStocks.slice(0, 3)" :key="idx" class="feature-item">
                <text class="item-name">{{ item.name }}</text>
                <text :class="['item-tag', item.tagType]">{{ item.tag }}</text>
              </view>
            </template>
            <view v-else class="feature-item">
              <text class="item-name placeholder">加载中...</text>
            </view>
          </view>
        </view>

        <view class="feature-card event-card" @tap="goEventChain">
          <view class="feature-header">
            <text class="feature-title">事件传导</text>
            <text class="feature-more">›</text>
          </view>
          <text class="feature-sub">产业链追踪</text>
          <view class="feature-list">
            <view v-for="(item, idx) in chainEvents.slice(0, 3)" :key="idx" class="feature-item">
              <text class="item-name">{{ item.name }}</text>
              <text :class="['item-tag', item.tagType]">{{ item.tag }}</text>
            </view>
          </view>
        </view>

        <view class="feature-card ai-card" @tap="goTraceability">
          <view class="feature-header">
            <text class="feature-title">大盘溯源</text>
            <text class="feature-more">›</text>
          </view>
          <text class="feature-sub">市场异动溯源分析</text>
          <view class="feature-list">
            <view v-for="(item, idx) in traceReports.slice(0, 3)" :key="idx" class="feature-item">
              <text class="item-name">{{ item.name }}</text>
              <text :class="['item-tag', item.tagType]">{{ item.tag }}</text>
            </view>
          </view>
        </view>

        <view class="feature-card overview-card" @tap="goAgentReport">
          <view class="feature-header">
            <text class="feature-title">今日分析概览</text>
            <text class="feature-more">›</text>
          </view>
          <text class="feature-sub">Agent报告更新状态</text>
          <view class="feature-list">
            <view v-for="(item, idx) in aiReports.slice(0, 3)" :key="idx" class="feature-item">
              <text class="item-name">{{ item.name }}</text>
              <text :class="['item-tag', item.tagType]">{{ item.tag }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 重磅事件跟踪 -->
      <view class="event-track-card" @tap="goTrackDetail">
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
      </view>

    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { useBriefingCard } from '@/shared/utils/useBriefingCard'
import { stockApi } from '@/shared/api/modules/stock'
import type { WindLeaderSector, WindLeaderStock } from '@/shared/api/modules/stock'

const {
  typeLabel: briefingTypeLabel,
  summary: briefingSummary,
  report,
  status: briefingStatus,
  loading: briefingLoading,
  refresh: briefingRefresh,
} = useBriefingCard()

/** 摘要拆分为标签：按标点切割，去掉标点，最多4个 */
const summaryTags = computed(() => {
  const text = briefingSummary.value || ''
  return text
    .split(/[，,、+]/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .slice(0, 4)
})

/** 线索数量：晨报按 stocks，晚报按 sectors */
const briefingClueCount = computed(() => {
  if (!report.value) return 0
  return briefingTypeLabel.value === '晨报'
    ? report.value.stocks.length
    : report.value.sectors.length
})

// 卡片描述文案（根据状态）
function getBriefingDesc(): string {
  switch (briefingStatus.value) {
    case 'empty':
      return briefingTypeLabel.value === '晨报'
        ? '晨报生成中，9:00后查看'
        : '晚报生成中，15:30后查看'
    case 'error':
      return '暂不可用，点击重试'
    case 'loading':
      return '加载中...'
    default:
      return ''
  }
}

// 卡片点击
function goBriefingDetail() {
  if (briefingStatus.value === 'ready') {
    const type = briefingTypeLabel.value === '晨报' ? 'morning' : 'review'
    uni.navigateTo({ url: `/pages-sub-app/briefing-detail/index?type=${type}` })
  } else if (briefingStatus.value === 'error') {
    // 触发重试
    briefingRefresh()
  } else {
    uni.showToast({
      title: getBriefingDesc(),
      icon: 'none',
    })
  }
}

// 长线风口：从后端 API 获取风口龙头数据，提取前3只龙头股在首页预览
interface LeaderStockPreview {
  name: string
  tag: string
  tagType: 'buy' | 'sell' | 'wash'
}

const leaderStocks = ref<LeaderStockPreview[]>([])

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

// 从风口板块中提取龙头股预览列表，参考 Web 前端 extractTopStocksFromSectors 逻辑
function extractLeaderPreview(sectors: WindLeaderSector[], maxCount: number): LeaderStockPreview[] {
  const seen = new Set<string>()
  const result: LeaderStockPreview[] = []
  // 按板块 score 降序遍历，优先取高分板块的龙头
  const sorted = sectors
    .filter(s => s && s.name)
    .slice()
    .sort((a, b) => (toFiniteNumber(b.score) ?? 0) - (toFiniteNumber(a.score) ?? 0))
  for (const sector of sorted) {
    if (result.length >= maxCount) break
    // 优先取 leading_stock_info，其次取 main_stocks[0]
    const stock: WindLeaderStock | null = sector.leading_stock_info ?? sector.main_stocks?.[0] ?? null
    if (!stock || !stock.name) continue
    const code = stock.code || stock.name
    if (seen.has(code)) continue
    seen.add(code)
    const changePct = toFiniteNumber(stock.change_pct)
    const tag = changePct !== null
      ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`
      : '--'
    const tagType: LeaderStockPreview['tagType'] = changePct === null
      ? 'wash'
      : changePct > 0 ? 'buy' : changePct < 0 ? 'sell' : 'wash'
    result.push({ name: stock.name, tag, tagType })
  }
  return result
}

async function loadLeaderStocks() {
  try {
    const res: any = await stockApi.getWindLeaders(8)
    const data = res?.data ?? res
    const sectors: WindLeaderSector[] = data?.hot_sectors ?? []
    leaderStocks.value = extractLeaderPreview(sectors, 3)
  } catch (error) {
    console.error('首页长线风口数据加载失败:', error)
    leaderStocks.value = []
  }
}

const topEvent = ref({
  sector: '创新药',
  title: '美国标普生物科技指数上周大涨'
})

const chainEvents = ref([
  { name: '创新药', tag: '利好', tagType: 'buy' },
  { name: '半导体', tag: '关注', tagType: 'wash' },
  { name: '新能源', tag: '利空', tagType: 'sell' },
])

const aiReports = ref([
  { name: '晨报', tag: '已更新', tagType: 'buy' },
  { name: '风口龙头', tag: '已更新', tagType: 'buy' },
  { name: '大盘溯源', tag: '待更新', tagType: 'wash' },
])

const traceReports = ref([
  { name: '北向资金异动', tag: '流入', tagType: 'buy' },
  { name: '板块轮动分析', tag: '关注', tagType: 'wash' },
  { name: '主力资金动向', tag: '流出', tagType: 'sell' },
])

onShow(() => {
  briefingRefresh()
  loadLeaderStocks()
})

function goChat() {
  uni.navigateTo({ url: '/pages-sub-app/chat/index' })
}

function goBriefing() {
  uni.navigateTo({ url: '/pages-sub-app/briefing/index' })
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
  uni.navigateTo({ url: '/modules/news/pages/detail' })
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
@use '@/shared/styles/variables.scss' as *;

.morning-content {
  background: $bg-color-grey;
}

.content-wrap {
  padding: $spacing-base;
}

/* ===== 晨报卡片 ===== */
.briefing-card {
  display: flex;
  align-items: stretch;
  padding: $spacing-base;
  background: #f5f7fb;
  border-radius: $radius-base;
  margin-bottom: $spacing-sm;
  position: relative;
  overflow: hidden;
  box-shadow: $shadow-card;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:active {
    transform: scale(0.98);
    box-shadow: $shadow-base;
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
  gap: $spacing-xs;
}

.briefing-top {
  display: flex;
  align-items: center;
}

.briefing-title {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $text-color-title;
}

.briefing-clue {
  margin-top: 4rpx;
}

.clue-text {
  font-size: $font-size-sm;
  color: $text-color-secondary;
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
  background: rgba($brand-color, 0.08);
  border: 1rpx solid rgba($brand-color, 0.15);
  border-radius: 6rpx;
}

.tag-text {
  font-size: $font-size-xs;
  color: $brand-color;
  font-weight: 500;
  line-height: 1.4;
}

.tags-arrow {
  font-size: $font-size-lg;
  color: $text-color-tertiary;
  margin-left: 2rpx;
  line-height: 1.4;
}

.briefing-btn {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 18rpx;
  background: $brand-gradient;
  border-radius: $radius-pill;
  align-self: flex-start;
  margin-top: 6rpx;
  transition: opacity 0.2s ease;

  &:active {
    opacity: 0.85;
  }
}

.btn-icon {
  font-size: 18rpx;
  color: #ffffff;
}

.btn-text {
  font-size: $font-size-sm;
  color: #ffffff;
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
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  box-shadow: 0 4rpx 12rpx rgba(251, 191, 36, 0.3);
}

.ai-avatar-emoji {
  font-size: 44rpx;
}

.ai-avatar-ring {
  position: absolute;
  border-radius: 50%;
  border: 2rpx solid rgba($brand-color, 0.15);
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

.feature-card {
  background: #f5f7fb;
  border-radius: 14rpx;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.feature-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.feature-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1d24;
}

.feature-more {
  font-size: 28rpx;
  color: #9ca3af;
  font-weight: 300;
}

.feature-sub {
  font-size: 22rpx;
  color: #6b7280;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 6rpx;
}

.feature-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
}

.item-name {
  font-size: 24rpx;
  color: #374151;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-name.placeholder {
  color: #9ca3af;
}

.item-tag {
  font-size: 18rpx;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  flex-shrink: 0;

  &.wash {
    background: rgba(251, 146, 60, 0.1);
    color: #fb923c;
  }
  &.sell {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }
  &.buy {
    background: rgba(77, 124, 254, 0.1);
    color: #4d7cfe;
  }
}

/* 异动捕手卡片特有 */
.event-top-badge {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 2rpx;
}

.badge-hot {
  font-size: 18rpx;
  background: rgba(244, 63, 94, 0.1);
  color: #f43f5e;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  font-weight: 600;
}

.badge-sector {
  font-size: 22rpx;
  color: #1a1d24;
  font-weight: 500;
}

.event-top-title {
  font-size: 22rpx;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-item {
  .item-badge {
    font-size: 18rpx;
    background: rgba(244, 63, 94, 0.1);
    color: #f43f5e;
    padding: 1rpx 6rpx;
    border-radius: 4rpx;
    flex-shrink: 0;
    margin-right: 4rpx;
  }
  .item-name {
    flex: 1;
  }
}

.item-change {
  font-size: 22rpx;
  flex-shrink: 0;
  font-weight: 500;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

/* ===== 重磅事件跟踪 ===== */
.event-track-card {
  background: #f5f7fb;
  border-radius: 14rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
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
  color: #1a1d24;
}

.track-more {
  font-size: 28rpx;
  color: #9ca3af;
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
  color: #f43f5e;
  background: rgba(244, 63, 94, 0.1);
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  font-weight: 500;
  margin-top: 2rpx;
}

.track-content {
  flex: 1;
  font-size: 24rpx;
  color: #374151;
  line-height: 1.5;
}

.track-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  margin-top: 14rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #f3f4f6;
}

.track-arrow {
  font-size: 20rpx;
  color: #9ca3af;
}

.track-tip {
  font-size: 20rpx;
  color: #6b7280;
}
</style>
