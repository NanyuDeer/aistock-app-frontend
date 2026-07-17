<template>
  <SubPageCard2 :title="quote?.name || '个股详情'" :subtitle="symbol">
    <view class="page-detail">
    <view v-if="loading" class="loading">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else-if="quote">
      <!-- 1. 股票头部 -->
      <view class="stock-header">
        <view class="stock-name-row">
          <text class="stock-name">{{ quote.name }}</text>
          <text class="stock-code">{{ quote.symbol }}</text>
          <view
            class="favorite-toggle"
            :class="{ active: isFavorite, disabled: favoritesStore.isPending(quote.symbol) }"
            @tap="toggleFavorite"
          >
            <text>{{ isFavorite ? '已自选' : '加自选' }}</text>
          </view>
        </view>
        <view class="stock-price-row">
          <text :class="['stock-price', quote.changePercent >= 0 ? 'up' : 'down']">
            {{ quote.price.toFixed(2) }}
          </text>
          <view :class="['stock-change-box', quote.changePercent >= 0 ? 'up-bg' : 'down-bg']">
            <text :class="['stock-change-text', quote.changePercent >= 0 ? 'up' : 'down']">
              {{ quote.changePercent >= 0 ? '+' : '' }}{{ quote.change.toFixed(2) }}
              ({{ quote.changePercent >= 0 ? '+' : '' }}{{ quote.changePercent.toFixed(2) }}%)
            </text>
          </view>
        </view>
        <!-- 涨跌停（紧贴价格行下方） -->
        <view class="limit-inline">
          <text class="limit-inline-label">涨停 <text class="up">{{ quote.limitUp.toFixed(2) }}</text></text>
          <text class="limit-inline-sep">|</text>
          <text class="limit-inline-label">跌停 <text class="down">{{ quote.limitDown.toFixed(2) }}</text></text>
          <text class="limit-inline-sep">|</text>
          <text class="limit-inline-label">均价 <text>{{ quote.avgPrice.toFixed(2) }}</text></text>
        </view>
      </view>

      <!-- 行情明细（直接放在页面上，无卡片包装） -->
      <view class="detail-grid">
        <view class="detail-item">
          <text class="detail-label">今开</text>
          <text :class="['detail-value', quote.open >= quote.prevClose ? 'up' : 'down']">{{ quote.open.toFixed(2) }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">最高</text>
          <text class="detail-value up">{{ quote.high.toFixed(2) }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">最低</text>
          <text class="detail-value down">{{ quote.low.toFixed(2) }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">昨收</text>
          <text class="detail-value">{{ quote.prevClose.toFixed(2) }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">成交量</text>
          <text class="detail-value">{{ formatVolume(quote.volume) }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">成交额</text>
          <text class="detail-value">{{ formatAmount(quote.amount) }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">换手率</text>
          <text class="detail-value">{{ quote.turnoverRate.toFixed(2) }}%</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">振幅</text>
          <text class="detail-value">{{ quote.amplitude.toFixed(2) }}%</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">市盈率</text>
          <text class="detail-value">{{ quote.peRatio.toFixed(2) }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">市净率</text>
          <text class="detail-value">{{ quote.pbRatio.toFixed(2) }}</text>
        </view>
      </view>

      <!-- 2. AI 资讯分析（第2个组件，含关键词标签+刷新按钮） -->
      <view class="section-card">
        <view class="section-header-row">
          <text class="section-title">AI 资讯分析</text>
          <view v-if="!aiLoading" class="ai-refresh-btn" @tap="refreshAiAnalysis">
            <text class="refresh-icon">↻</text>
          </view>
        </view>
        <view v-if="aiLoading" class="ai-loading">
          <text class="ai-loading-text">正在生成AI分析...</text>
        </view>
        <template v-else-if="aiAnalysis">
          <view v-if="aiAnalysis.conclusion" class="ai-conclusion-box">
            <text :class="['ai-conclusion-badge', aiConclusionClass]">{{ aiAnalysis.conclusion }}</text>
            <text v-if="aiAnalysis.analysisDate" class="ai-date">{{ formatAiDate(aiAnalysis.analysisDate) }}</text>
          </view>
          <!-- 核心逻辑关键词标签 -->
          <view v-if="logicTags.length" class="ai-tags-section">
            <text class="ai-section-label">核心逻辑</text>
            <view class="ai-tag-list">
              <view
                v-for="(tag, i) in logicTags"
                :key="'lg'+i"
                class="ai-tag-item"
                @tap="toggleTagExpand('logic', i)"
              >
                <text class="ai-tag-label">{{ tag.tag }}</text>
              </view>
            </view>
            <view v-if="expandedTag === 'logic'" class="ai-tag-detail">
              <text class="ai-tag-detail-text">{{ logicTags[expandedTagIdx]?.full }}</text>
            </view>
          </view>
          <!-- 风险提示关键词标签 -->
          <view v-if="riskTags.length" class="ai-tags-section">
            <text class="ai-section-label risk">风险提示</text>
            <view class="ai-tag-list">
              <view
                v-for="(tag, i) in riskTags"
                :key="'rk'+i"
                class="ai-tag-item risk"
                @tap="toggleTagExpand('risk', i)"
              >
                <text class="ai-tag-label">{{ tag.tag }}</text>
              </view>
            </view>
            <view v-if="expandedTag === 'risk'" class="ai-tag-detail">
              <text class="ai-tag-detail-text risk">{{ riskTags[expandedTagIdx]?.full }}</text>
            </view>
          </view>
        </template>
      </view>

      <!-- 3. 资金流向 -->
      <view v-if="capitalFlow" class="section-card">
        <text class="section-title">资金流向</text>
        <view class="flow-grid">
          <view class="flow-item">
            <text class="flow-label">主力净流入</text>
            <text :class="['flow-value', (capitalFlow.mainInflow ?? 0) >= 0 ? 'up' : 'down']">
              {{ formatFlowAmount(capitalFlow.mainInflow) }}
            </text>
          </view>
          <view class="flow-item">
            <text class="flow-label">散户净流入</text>
            <text :class="['flow-value', (capitalFlow.retailInflow ?? 0) >= 0 ? 'up' : 'down']">
              {{ formatFlowAmount(capitalFlow.retailInflow) }}
            </text>
          </view>
          <template v-if="capitalFlow.orders && capitalFlow.orders.length">
            <view v-for="order in capitalFlow.orders" :key="order.label" class="flow-item">
              <text class="flow-label">{{ order.label }}</text>
              <text :class="['flow-value', (order.value ?? 0) >= 0 ? 'up' : 'down']">
                {{ formatFlowAmount(order.value) }}
              </text>
            </view>
          </template>
        </view>
        <view v-if="capitalFlow.narrative" class="flow-narrative">
          <text class="flow-narrative-text">{{ capitalFlow.narrative }}</text>
        </view>
      </view>

      <!-- 4. 半年报信息 -->
      <view v-if="semiAnnualReport" class="section-card">
        <view class="section-header">
          <text class="section-title">半年报财务数据</text>
          <text v-if="semiAnnualReport.reports?.length" class="section-sub">
            {{ semiAnnualReport.reports[0]?.end_date?.slice(0, 4) }}年半年报
          </text>
        </view>
        <view class="semi-grid">
          <view v-if="semiAnnualReport.reports?.length" class="semi-table">
            <view class="semi-row semi-header">
              <text class="semi-cell semi-cell-label">财务指标</text>
              <text class="semi-cell semi-cell-value">本期</text>
              <text class="semi-cell semi-cell-value">同比</text>
            </view>
            <view class="semi-row">
              <text class="semi-cell semi-cell-label">营业总收入</text>
              <text class="semi-cell semi-cell-value">{{ formatSemiAmount(semiAnnualReport.reports[0]?.total_revenue) }}</text>
              <text :class="['semi-cell', 'semi-cell-value', growthClass(semiAnnualReport.total_revenue_yoy)]">
                {{ formatGrowth(semiAnnualReport.total_revenue_yoy) }}
              </text>
            </view>
            <view class="semi-row">
              <text class="semi-cell semi-cell-label">净利润</text>
              <text class="semi-cell semi-cell-value">{{ formatSemiAmount(semiAnnualReport.reports[0]?.n_income) }}</text>
              <text :class="['semi-cell', 'semi-cell-value', growthClass(semiAnnualReport.n_income_yoy)]">
                {{ formatGrowth(semiAnnualReport.n_income_yoy) }}
              </text>
            </view>
            <view class="semi-row">
              <text class="semi-cell semi-cell-label">归母净利润</text>
              <text class="semi-cell semi-cell-value">{{ formatSemiAmount(semiAnnualReport.reports[0]?.n_income_attr_p) }}</text>
              <text :class="['semi-cell', 'semi-cell-value', growthClass(semiAnnualReport.n_income_attr_p_yoy)]">
                {{ formatGrowth(semiAnnualReport.n_income_attr_p_yoy) }}
              </text>
            </view>
            <view class="semi-row">
              <text class="semi-cell semi-cell-label">基本每股收益</text>
              <text class="semi-cell semi-cell-value">{{ semiAnnualReport.reports[0]?.basic_eps ?? '--' }}元</text>
              <text class="semi-cell semi-cell-value">--</text>
            </view>
            <view class="semi-row">
              <text class="semi-cell semi-cell-label">研发费用</text>
              <text class="semi-cell semi-cell-value">{{ formatSemiAmount(semiAnnualReport.reports[0]?.rd_exp) }}</text>
              <text class="semi-cell semi-cell-value">--</text>
            </view>
          </view>
          <view v-else class="semi-empty">
            <text class="semi-empty-text">暂无半年报数据</text>
          </view>
        </view>
        <view class="semi-footer">
          <text class="semi-link" @tap="openDisclosureUrl">查看完整公告 ›</text>
        </view>
      </view>

      <!-- 5. 个股新闻 -->
      <view v-if="newsList.length" class="section-card">
        <text class="section-title">相关资讯</text>
        <view class="news-list">
          <view
            v-for="(news, idx) in newsList"
            :key="idx"
            class="news-item"
            @tap="openNews(news)"
          >
            <text class="news-title">{{ news.title }}</text>
            <view class="news-meta">
              <text v-if="news.source" class="news-source">{{ news.source }}</text>
              <text v-if="news.publish_time" class="news-time">{{ news.publish_time }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 6. AI 投顾入口（页面最底部） -->
      <view class="ai-card" @tap="goChat">
        <view class="ai-icon-wrap">
          <SvgIcon name="robot-line" size="36rpx" color="#4d7cfe" />
        </view>
        <view class="ai-content">
          <text class="ai-title">AI 智能投顾</text>
          <text class="ai-desc">询问 "{{ quote.name }}" 相关问题</text>
        </view>
        <text class="ai-arrow">›</text>
      </view>
    </template>

    <view v-else class="empty">
      <text class="empty-text">未找到股票数据</text>
    </view>
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { stockApi } from '@/shared/api/modules/stock'
import { useFavoritesStore } from '@/shared/store/modules/favorites'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'

const loading = ref(true)
const quote = ref<any>(null)
const capitalFlow = ref<any>(null)
const semiAnnualReport = ref<any>(null)
const disclosureUrl = ref('')
const symbol = ref('')
const aiAnalysis = ref<any>(null)
const aiLoading = ref(false)
const newsList = ref<any[]>([])
const expandedTag = ref<'logic' | 'risk' | null>(null)
const expandedTagIdx = ref(0)
const favoritesStore = useFavoritesStore()
const isFavorite = computed(() => favoritesStore.isFavorite(symbol.value))

onShow(() => {
  void favoritesStore.fetchFavorites({ silent: true })
})

onLoad((options: any) => {
  symbol.value = options?.symbol || ''
  if (symbol.value) {
    loadData()
  }
})

async function loadData() {
  loading.value = true
  try {
    const [quoteData, flowData, semiData, newsData] = await Promise.allSettled([
      stockApi.getQuote(symbol.value),
      stockApi.getCapitalFlow(symbol.value),
      stockApi.getSemiAnnualReport(symbol.value),
      stockApi.getStockNews(symbol.value, { size: 10 }),
    ])
    if (quoteData.status === 'fulfilled') {
      quote.value = quoteData.value
    }
    if (flowData.status === 'fulfilled') {
      // 适配资金流向数据格式
      const flow = flowData.value as any
      capitalFlow.value = flow?.data || flow
    }
    if (semiData.status === 'fulfilled') {
      const semi = semiData.value as any
      semiAnnualReport.value = semi?.data || semi
      disclosureUrl.value = semiAnnualReport.value?.disclosure_url || ''
    }
    if (newsData.status === 'fulfilled') {
      const news = newsData.value as any
      newsList.value = Array.isArray(news) ? news : (news?.data || news?.news || [])
    }
    // 加载 AI 分析（非阻塞，失败不影响主流程）
    loadAiAnalysis()
  } catch (err) {
    console.error('[StockDetail] load error:', err)
  } finally {
    loading.value = false
  }
}

async function loadAiAnalysis() {
  aiLoading.value = true
  aiAnalysis.value = {} // 先设为空对象让卡片显示
  try {
    const res: any = await stockApi.getStockAnalysis(symbol.value)
    // API 返回中文键名，映射为前端使用的英文键名
    const data = res?.data || res
    aiAnalysis.value = {
      conclusion: data?.['结论'] || data?.conclusion || '',
      coreLogic: data?.['核心逻辑'] || data?.core_logic || '',
      riskWarning: data?.['风险提示'] || data?.risk_warning || '',
      analysisDate: data?.['分析时间'] || data?.analysis_time || '',
    }
  } catch {
    // 404 = 无分析记录，自动触发 POST 创建
    try {
      const createRes: any = await stockApi.createStockAnalysis(symbol.value)
      const data = createRes?.data || createRes
      aiAnalysis.value = {
        conclusion: data?.['结论'] || data?.conclusion || '',
        coreLogic: data?.['核心逻辑'] || data?.core_logic || '',
        riskWarning: data?.['风险提示'] || data?.risk_warning || '',
        analysisDate: data?.['分析时间'] || data?.analysis_time || '',
      }
    } catch {
      // 创建也失败，隐藏 AI 分析卡片
      aiAnalysis.value = null
    }
  } finally {
    aiLoading.value = false
  }
}

const aiConclusionClass = computed(() => {
  const c = aiAnalysis.value?.conclusion || ''
  if (c.includes('买入') || c.includes('增持') || c.includes('推荐')) return 'badge-buy'
  if (c.includes('卖出') || c.includes('减持')) return 'badge-sell'
  return 'badge-hold'
})

// 从文本中提取关键词标签（对齐 Web 前端 extractTagsFromText 逻辑）
function extractTagsFromText(text: string): { tag: string, full: string }[] {
  if (!text) return []
  const str = String(text)
  const lines = str.split(/\n+/).map(s => s.trim()).filter(s => s)
  if (lines.length > 1) {
    return lines.map(line => extractTagFromText(line)).filter(t => t.tag)
  }
  const sentences = str.split(/[。\n]/).map(s => s.trim()).filter(s => s)
  return sentences.map(s => extractTagFromText(s)).filter(t => t.tag)
}

function extractTagFromText(text: string): { tag: string, full: string } {
  if (!text) return { tag: '', full: '' }
  const full = String(text).trim()
  const tagMatch = full.match(/^([^:]{1,30})::([\s\S]+)$/)
  if (tagMatch) {
    let tag = tagMatch[1].trim()
    if (tag.length > 30) tag = tag.substring(0, 30) + '…'
    return { tag, full: tagMatch[2].trim() || full }
  }
  const firstClause = full.split(/[，。；！？\n]/)[0]?.trim() || full
  const tag = firstClause.length > 30 ? firstClause.substring(0, 30) + '…' : firstClause
  return { tag, full }
}

const logicTags = computed(() => extractTagsFromText(aiAnalysis.value?.coreLogic || ''))
const riskTags = computed(() => extractTagsFromText(aiAnalysis.value?.riskWarning || ''))

function toggleTagExpand(type: 'logic' | 'risk', idx: number) {
  if (expandedTag.value === type && expandedTagIdx.value === idx) {
    expandedTag.value = null
  } else {
    expandedTag.value = type
    expandedTagIdx.value = idx
  }
}

function formatAiDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

async function refreshAiAnalysis() {
  if (!symbol.value) return
  aiLoading.value = true
  aiAnalysis.value = {}
  try {
    const res: any = await stockApi.createStockAnalysis(symbol.value)
    const data = res?.data || res
    aiAnalysis.value = {
      conclusion: data?.['结论'] || data?.conclusion || '',
      coreLogic: data?.['核心逻辑'] || data?.core_logic || '',
      riskWarning: data?.['风险提示'] || data?.risk_warning || '',
      analysisDate: data?.['分析时间'] || data?.analysis_time || '',
    }
    uni.showToast({ title: '已刷新', icon: 'none' })
  } catch {
    uni.showToast({ title: '刷新失败', icon: 'none' })
  } finally {
    aiLoading.value = false
  }
}

function formatFlowAmount(val: number): string {
  if (val == null || isNaN(val)) return '--'
  // API 返回的单位是亿
  const absVal = Math.abs(val)
  if (absVal >= 10000) return (val / 10000).toFixed(2) + '万亿'
  if (absVal >= 1) return val.toFixed(2) + '亿'
  return (val * 100).toFixed(0) + '万'
}

function openNews(news: any) {
  const url = news.url || news.link || news.source_url
  if (url) {
    // #ifdef H5
    window.open(url, '_blank')
    // #endif
    // #ifndef H5
    uni.navigateTo({ url: `/modules/chat/pages/webview?url=${encodeURIComponent(url)}` })
    // #endif
  } else {
    uni.showToast({ title: '暂无详情', icon: 'none' })
  }
}

async function toggleFavorite() {
  if (!quote.value || favoritesStore.isPending(symbol.value)) return
  const changed = isFavorite.value
    ? await favoritesStore.remove(symbol.value)
    : await favoritesStore.add(symbol.value, quote.value.name || '')
  if (changed) {
    uni.showToast({ title: isFavorite.value ? '已加入自选' : '已移除自选', icon: 'none' })
  }
}

function formatVolume(vol: number): string {
  if (!vol) return '--'
  if (vol >= 100000000) return (vol / 100000000).toFixed(2) + '亿股'
  if (vol >= 10000) return (vol / 10000).toFixed(2) + '万股'
  return vol + '股'
}

function formatAmount(amt: number): string {
  if (!amt) return '--'
  if (Math.abs(amt) >= 100000000) return (amt / 100000000).toFixed(2) + '亿'
  if (Math.abs(amt) >= 10000) return (amt / 10000).toFixed(2) + '万'
  return amt.toFixed(2) + '元'
}

function formatSemiAmount(amt: number): string {
  if (!amt) return '--'
  const yi = Math.abs(amt) / 100000000
  if (yi >= 1) return yi.toFixed(2) + '亿'
  const wan = Math.abs(amt) / 10000
  if (wan >= 1) return wan.toFixed(2) + '万'
  return amt.toFixed(2) + '元'
}

function formatGrowth(val: number | null): string {
  if (val === null || val === undefined) return '--'
  const prefix = val > 0 ? '+' : ''
  return `${prefix}${val.toFixed(2)}%`
}

function growthClass(val: number | null): string {
  if (val === null || val === undefined) return ''
  return val >= 0 ? 'up' : 'down'
}

function openDisclosureUrl() {
  if (disclosureUrl.value) {
    // #ifdef H5
    window.open(disclosureUrl.value, '_blank')
    // #endif
    // #ifndef H5
    uni.setClipboardData({
      data: disclosureUrl.value,
      success: () => {
        uni.showToast({ title: '链接已复制', icon: 'none' })
      },
    })
    // #endif
  }
}

function goChat() {
  const name = quote.value?.name || symbol.value
  const msg = `分析一下${name}(${symbol.value})的行情`
  uni.navigateTo({ url: `/modules/chat/pages/index?message=${encodeURIComponent(msg)}` })
}
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

.page-detail {
  padding: 24rpx;
  min-height: 100vh;
  background: #f5f7fa;
}

.loading, .empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 200rpx 0;
}

.loading-text, .empty-text {
  font-size: 28rpx;
  color: #6b7280;
}

/* 股票头部 */
.stock-header {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.stock-name-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.stock-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1d24;
}

.stock-code {
  font-size: 24rpx;
  color: #6b7280;
  padding: 4rpx 16rpx;
  background: #f0f2f5;
  border-radius: 8rpx;
}

.favorite-toggle {
  margin-left: auto;
  min-width: 104rpx;
  padding: 10rpx 18rpx;
  color: $brand-color;
  font-size: $font-size-sm;
  text-align: center;
  border: 1rpx solid $brand-color;
  border-radius: $radius-pill;

  &.active {
    color: $text-color-secondary;
    background: $bg-color-hover;
    border-color: $border-color;
  }

  &.disabled {
    opacity: 0.5;
  }
}

.stock-price-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.stock-price {
  font-size: 44rpx;
  font-weight: 700;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

.stock-change-box {
  padding: 8rpx 20rpx;
  border-radius: 8rpx;

  &.up-bg { background: rgba(244, 63, 94, 0.1); }
  &.down-bg { background: rgba(34, 197, 94, 0.1); }
}

.stock-change-text {
  font-size: 26rpx;
  font-weight: 500;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

/* 行情明细网格 */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rpx;
  background: #e5e7eb;
  border-radius: 20rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 28rpx;
  background: #ffffff;
}

.detail-label {
  font-size: 26rpx;
  color: #6b7280;
}

.detail-value {
  font-size: 28rpx;
  color: #1a1d24;
  font-weight: 500;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

/* 涨跌停（一行内联） */
.limit-inline {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  background: #ffffff;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.limit-inline-label {
  font-size: 26rpx;
  color: #6b7280;

  .up { color: #f43f5e; font-weight: 600; }
  .down { color: #22c55e; font-weight: 600; }
}

.limit-inline-sep {
  color: #e5e7eb;
  font-size: 24rpx;
}

/* 资金流向 */
.section-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1d24;
  margin-bottom: 20rpx;
  display: block;
}

.flow-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.flow-item {
  display: flex;
  flex-direction: column;
  padding: 20rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
}

.flow-label {
  font-size: 24rpx;
  color: #6b7280;
  margin-bottom: 8rpx;
}

.flow-value {
  font-size: 30rpx;
  font-weight: 600;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

/* AI 投顾入口 */
.ai-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx;
  background: linear-gradient(135deg, rgba(77, 124, 254, 0.1), rgba(99, 102, 241, 0.05));
  border: 1rpx solid rgba(77, 124, 254, 0.2);
  border-radius: 20rpx;
}

.ai-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #4d7cfe;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-icon {
  font-size: 32rpx;
}

.ai-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.ai-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1a1d24;
}

.ai-desc {
  font-size: 24rpx;
  color: #6b7280;
  margin-top: 4rpx;
}

.ai-arrow {
  font-size: 36rpx;
  color: #4d7cfe;
}

/* 半年报 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section-sub {
  font-size: 24rpx;
  color: #4d7cfe;
  font-weight: 500;
}

.semi-grid {
  margin-bottom: 16rpx;
}

.semi-table {
  border-radius: 12rpx;
  overflow: hidden;
  border: 1rpx solid #e5e7eb;
}

.semi-row {
  display: flex;
  align-items: center;
  border-bottom: 1rpx solid #f0f2f5;

  &:last-child {
    border-bottom: none;
  }

  &.semi-header {
    background: #f5f7fa;
    font-weight: 600;
  }
}

.semi-cell {
  flex: 1;
  padding: 16rpx 12rpx;
  font-size: 24rpx;
  color: #374151;
  text-align: center;

  &.semi-cell-label {
    flex: 1.2;
    text-align: left;
    padding-left: 16rpx;
    color: #6b7280;
  }

  &.semi-cell-value {
    font-weight: 500;

    &.up { color: #f43f5e; }
    &.down { color: #22c55e; }
  }
}

.semi-empty {
  padding: 40rpx;
  text-align: center;
}

.semi-empty-text {
  font-size: 26rpx;
  color: #9ca3af;
}

.semi-footer {
  border-top: 1rpx solid #f0f2f5;
  padding-top: 16rpx;
  text-align: center;
}

.semi-link {
  font-size: 26rpx;
  color: #4d7cfe;
  font-weight: 500;
}

/* AI 资讯分析 */
.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.ai-refresh-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f5f7fa;

  &:active { background: #e8ecf1; }
}

.refresh-icon {
  font-size: 28rpx;
  color: #4d7cfe;
}

.ai-loading {
  padding: 24rpx 0;
  text-align: center;
}

.ai-loading-text {
  font-size: 26rpx;
  color: #9ca3af;
}

.ai-conclusion-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.ai-conclusion-badge {
  font-size: 24rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-weight: 600;

  &.badge-buy { color: #dc2626; background: #fef2f2; }
  &.badge-sell { color: #16a34a; background: #f0fdf4; }
  &.badge-hold { color: #d97706; background: #fffbeb; }
}

.ai-date {
  font-size: 22rpx;
  color: #9ca3af;
}

/* AI 关键词标签 */
.ai-tags-section {
  margin-bottom: 16rpx;
}

.ai-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 8rpx;
}

.ai-tag-item {
  background: #eff6ff;
  border-radius: 8rpx;
  padding: 6rpx 14rpx;

  &.risk { background: #fef2f2; }

  &:active { opacity: 0.7; }
}

.ai-tag-label {
  font-size: 22rpx;
  color: #2563eb;

  .risk & { color: #dc2626; }
}

.ai-tag-detail {
  margin-top: 8rpx;
  padding: 12rpx 16rpx;
  background: #f8fafc;
  border-radius: 8rpx;
  border-left: 4rpx solid #2563eb;
}

.ai-tag-detail-text {
  font-size: 24rpx;
  color: #4b5563;
  line-height: 1.5;

  &.risk { color: #991b1b; }
}

.ai-tag-detail:has(.ai-tag-detail-text.risk) {
  border-left-color: #dc2626;
}

/* 资金流向叙述 */
.flow-narrative {
  margin-top: 12rpx;
  padding: 12rpx 16rpx;
  background: #f8fafc;
  border-radius: 8rpx;
}

.flow-narrative-text {
  font-size: 24rpx;
  color: #6b7280;
  line-height: 1.5;
}

/* 个股新闻 */
.news-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.news-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f2f5;

  &:last-child { border-bottom: none; }
  &:active { opacity: 0.7; }
}

.news-title {
  font-size: 28rpx;
  color: #1a1d24;
  line-height: 1.4;
  margin-bottom: 6rpx;
}

.news-meta {
  display: flex;
  gap: 12rpx;
}

.news-source {
  font-size: 22rpx;
  color: #6b7280;
}

.news-time {
  font-size: 22rpx;
  color: #9ca3af;
}
</style>
