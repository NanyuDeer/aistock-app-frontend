<template>
  <view class="page-reports">
    <SubPageCard title="业绩报告">
      <!-- 标题右侧切换按钮 -->
      <template #header-right>
        <view class="toggle-group">
          <text
            :class="['toggle-btn', activeTab === 'forecast' ? 'active' : '']"
            @tap="switchTo('forecast')"
          >预测</text>
          <text
            :class="['toggle-btn', activeTab === 'reports' ? 'active' : '']"
            @tap="switchTo('reports')"
          >报告</text>
        </view>
      </template>

      <!-- 搜索栏 -->
      <view class="reports-fixed">
        <view class="search-bar">
          <view class="search-input-wrap">
            <SvgIcon name="search-line" size="28rpx" color="#9ca3af" />
            <input
              v-model="keyword"
              class="search-input"
              placeholder="搜索股票代码/简称"
              confirm-type="search"
              @input="handleSearchInput"
              @confirm="handleSearch"
            />
            <text v-if="keyword" class="search-clear" @tap="handleReset">✕</text>
          </view>
        </view>

        <!-- 筛选 + 排序 单行 -->
        <view class="filter-sort-bar">
          <!-- 报告类型筛选：正式报告 / 快报 点击切换 -->
          <view class="report-type-group">
            <text
              :class="['report-type-btn', reportType === 'formal' ? 'active' : '']"
              @tap="setReportType('formal')"
            >正式报告</text>
            <text
              :class="['report-type-btn', reportType === 'express' ? 'active' : '']"
              @tap="setReportType('express')"
            >快报</text>
          </view>

          <!-- 排序字段：更新时间 / 四维评分 / 业绩，选中项放大（其他项滑动缩小），选中项显示上下双三角 -->
          <view class="sort-field-group">
            <view
              v-for="f in sortFields"
              :key="f.key"
              :class="['sort-field-item', sortField === f.key ? 'active' : '']"
              @tap="setSortField(f.key)"
            >
              <text class="sort-field-text">{{ f.label }}</text>
              <!-- 选中项显示上下三角：上=从低到高，下=从高到低 -->
              <view v-if="sortField === f.key" class="sort-arrows">
                <view
                  class="sort-arrow-up"
                  :class="{ active: sortAsc }"
                  @tap.stop="setSortField(f.key, true)"
                />
                <view
                  class="sort-arrow-down"
                  :class="{ active: !sortAsc }"
                  @tap.stop="setSortField(f.key, false)"
                />
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <LoadingState />
      </view>

      <!-- API 请求失败 -->
      <view v-else-if="error" class="error-state">
        <SvgIcon name="cloud-off-line" size="80rpx" color="#d1d5db" />
        <text class="error-text">数据获取失败</text>
        <text class="error-desc">网络异常或服务暂时不可用，请稍后重试</text>
        <view class="retry-btn" @tap="retry">重试</view>
      </view>

      <!-- 搜索无结果 -->
      <view v-else-if="!filteredList.length" class="empty-state">
        <EmptyState :text="emptyTip" />
      </view>

      <!-- 列表 -->
      <view v-if="filteredList.length" class="report-list">
        <view
          v-for="item in filteredList"
          :key="item.code"
          class="report-card"
          @tap="goStockDetail(item)"
        >
          <!-- 顶部：股票名称 + 代码｜报告期｜评分 -->
          <view class="report-top">
            <view class="report-top-left">
              <text class="stock-name">{{ item.name }}</text>
              <text class="stock-code">{{ item.code }}</text>
            </view>
            <view class="report-period">{{ item.period }}</view>
            <text v-if="displayScore(item) != null" :class="['report-score', scoreClass(displayScore(item)!)]">{{ displayScore(item) }}分</text>
          </view>
          <!-- 底部：核心财务 + 更新时间（正式报告与快报卡片展示相同字段） -->
          <view class="report-bottom">
            <view class="report-data-row">
              <view class="data-left">
                <text class="data-label">营业总收入</text>
                <text class="data-value">{{ item.revenue }} 亿元</text>
              </view>
              <view class="data-right">
                <text v-if="item.revenueYoy != null" class="data-yoy-label">同比 </text><text :class="['data-yoy', yoyClass(item.revenueYoy)]">{{ formatYoy(item.revenueYoy) }}</text>
              </view>
            </view>
            <view class="report-data-row">
              <view class="data-left">
                <text class="data-label">归母净利润</text>
                <text class="data-value">{{ item.netProfit }} 亿元</text>
              </view>
              <view class="data-right">
                <text v-if="item.profitYoy != null" class="data-yoy-label">同比 </text><text :class="['data-yoy', yoyClass(item.profitYoy)]">{{ formatYoy(item.profitYoy) }}</text>
              </view>
            </view>
            <view class="report-time-row">
              <text class="update-time">更新时间：{{ item.updateTime }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="hasMore" class="load-more" @tap="loadMore">
        <text class="load-more-text">{{ loadingMore ? '加载中...' : '加载更多' }}</text>
      </view>
    </SubPageCard>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { stockApi } from '@/shared/api/modules/stock'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import LoadingState from '@/shared/components/LoadingState.vue'
import EmptyState from '@/shared/components/EmptyState.vue'

interface ReportItem {
  code: string
  name: string
  period: string
  tag: string
  aiScore: number | null
  perfScore: number | null   // 业绩评分（多因子）
  isFormal: boolean
  revenue: string
  revenueYoy: number | null
  netProfit: string
  profitYoy: number | null
  industry: string
  grossMargin: string
  cashFlow: string
  updateTime: string
  goodTags: string[]
  riskTags: string[]
}

const STORAGE_KEY = 'report_filter_sort'

// ===== 状态 =====
const activeTab = ref('reports')
const keyword = ref('')
const loading = ref(false)
const loadingMore = ref(false)
const rawList = ref<ReportItem[]>([])
const page = ref(1)
const pageSize = 20
const total = ref(0)
const error = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

// 报告类型筛选（formal=正式报告 / express=快报）
const reportType = ref<'formal' | 'express'>('formal')

// 排序字段（updateTime=更新时间 / score=四维评分 / performance=业绩）
const sortField = ref<'updateTime' | 'score' | 'performance'>('updateTime')
const sortAsc = ref(false)           // true=从低到高（上箭头）, false=从高到低（下箭头）

// 排序字段按钮配置（均匀分布展示）
const sortFields = [
  { key: 'updateTime', label: '更新时间' },
  { key: 'score', label: '四维评分' },
  { key: 'performance', label: '业绩' },
] as const

// ===== 持久化 =====
function loadPersistedState() {
  try {
    const saved = uni.getStorageSync(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.sortField === 'updateTime' || parsed.sortField === 'score' || parsed.sortField === 'performance') sortField.value = parsed.sortField
      if (typeof parsed.sortAsc === 'boolean') sortAsc.value = parsed.sortAsc
      if (parsed.reportType === 'formal' || parsed.reportType === 'express') reportType.value = parsed.reportType
    }
  } catch (_) { /* ignore */ }
}

function savePersistedState() {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify({
      sortField: sortField.value,
      sortAsc: sortAsc.value,
      reportType: reportType.value,
    }))
  } catch (_) { /* ignore */ }
}

// ===== 计算属性 =====
const hasMore = computed(() => {
  const shown = filteredList.value.length
  return shown > 0 && shown < total.value
})

// 排序字段 → 后端 sortBy / sortOrder 参数（业绩模式单独走排行榜接口）
function sortParams(): { sortBy: string; sortOrder: string } {
  // 更新时间→ann_date，四维评分→ai_score（升降序由箭头控制）
  return {
    sortBy: sortField.value === 'updateTime' ? 'ann_date' : 'ai_score',
    sortOrder: sortAsc.value ? 'asc' : 'desc',
  }
}

// 前端排序：按当前排序字段（更新时间 / AI 评分 / 业绩评分）升降序排序
const filteredList = computed(() => {
  const asc = sortAsc.value
  return [...rawList.value].sort((a, b) => {
    if (sortField.value === 'updateTime') {
      return asc ? a.updateTime.localeCompare(b.updateTime) : b.updateTime.localeCompare(a.updateTime)
    }
    const valA = sortField.value === 'score' ? (a.aiScore ?? -1) : (a.perfScore ?? -1)
    const valB = sortField.value === 'score' ? (b.aiScore ?? -1) : (b.perfScore ?? -1)
    return asc ? valA - valB : valB - valA
  })
})

// 空数据提示
const emptyTip = computed(() => {
  if (keyword.value) return '未搜索到相关股票'
  return reportType.value === 'formal' ? '暂无正式报告数据' : '暂无快报数据'
})

// ===== API 请求 =====
async function fetchData(append = false) {
  error.value = false

  if (!append) {
    loading.value = true
    rawList.value = []
    total.value = 0
    page.value = 1
  } else {
    loadingMore.value = true
  }

  try {
    const kw = keyword.value.trim()

    if (sortField.value === 'performance') {
      // 业绩模式：调用排行榜接口（多因子评分排序）
      const rankParams: any = { sortBy: 'score', sortOrder: sortAsc.value ? 'asc' : 'desc', reportType: reportType.value, page: page.value, pageSize }
      if (kw) rankParams.keyword = kw
      const res: any = await stockApi.getPerformanceRanking(rankParams)

      if (!res) throw new Error('API 返回为空')
      const rankingList: any[] = res['排行榜'] || []
      total.value = res['总数量'] || 0
      const mapped = rankingList.map(item => mapRankingItem(item))
      if (append) {
        rawList.value = [...rawList.value, ...mapped]
      } else {
        rawList.value = mapped
      }
      if (mapped.length && page.value * pageSize < total.value) page.value++
      return
    }

    const params: any = {
      page: page.value,
      pageSize,
      sortBy: sortParams().sortBy,
      sortOrder: sortParams().sortOrder,
      reportType: reportType.value,
    }

    const res: any = kw
      ? await stockApi.searchPerformanceReport({ ...params, keyword: kw })
      : await stockApi.getPerformanceReportList(params)

    if (!res) throw new Error('API 返回为空')

    // 响应拦截器已提取 data，res 即为数据对象
    const reportList: any[] = (res['报告列表'] || []).filter((item: any) => {
      const type = item['报告类型'] || '';
      return type === '正式报告' || type === '快报/预告';
    })
    total.value = res['总数量'] || 0

    const mapped = reportList.map(item => mapApiItem(item))
    if (append) {
      rawList.value = [...rawList.value, ...mapped]
    } else {
      rawList.value = mapped
    }
    if (mapped.length && page.value * pageSize < total.value) page.value++
  } catch (err: any) {
    console.error('[Reports] fetchData error:', err)
    if (!append) {
      error.value = true
      rawList.value = []
      total.value = 0
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

/** 将 API 返回项映射为前端 ReportItem */
function mapApiItem(item: any): ReportItem {
  const code = item['股票代码'] || ''
  const name = item['股票名称'] || ''
  const annDate = item['报告发出时间'] || ''
  const endDate = item['报告期'] || ''
  const rawRevenue = item['营业总收入']
  const rawProfit = item['归母净利润']
  const reportType = item['报告类型'] || ''
  const eps = item['预测EPS']
  const rating = item['评级'] || ''
  const orgName = item['机构名称'] || ''

  // 从 API 获取 AI 研判标签
  const aiTag = item['AI研判'] || ''

  // 从 API 获取四维评分
  const aiScore = item['AI评分']

  // 格式化日期: YYYYMMDD → YYYY-MM-DD
  const formatDate = (d: string) => {
    if (!d || d.length < 8) return d
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
  }

  // 报告期显示
  let period = endDate
  if (period && !period.includes('年')) {
    // 格式如 "2026Q4"（研报评级 - 预测数据）
    const qMatch = period.match(/^(\d{4})Q([1-4])$/)
    if (qMatch) {
      const isRating = reportType === '研报评级'
      const qMap: Record<string, string> = {
        '1': isRating ? '一季度预测' : '一季报',
        '2': isRating ? '半年预测' : '半年报',
        '3': isRating ? '三季预测' : '三季报',
        '4': isRating ? '全年预测' : '年报',
      }
      period = `${qMatch[1]}${qMap[qMatch[2]] || 'Q'+qMatch[2]+'季报'}`
    } else {
      const y = period.slice(0, 4)
      const m = period.slice(4, 6)
      if (m === '03') period = `${y}一季报`
      else if (m === '06') period = `${y}半年报`
      else if (m === '09') period = `${y}三季报`
      else if (m === '12') period = `${y}年报`
      else period = `${y}年${m}月报`
    }
  }

  // 快报/预告 -> 追加（快报）标识
  if (reportType === '快报/预告') {
    period += '（快报）'
  }

  // 金额转换（元→亿）
  const toYi = (val: number | null) => {
    if (val == null) return ''
    const yi = val / 1e8
    return yi.toFixed(2)
  }

  // 同比增速（后端已计算：相对上一期报告的变动，单位 %）
  const revenueYoy = item['营收同比(%)'] != null ? Number(item['营收同比(%)']) : null
  const profitYoy = item['净利同比(%)'] != null ? Number(item['净利同比(%)']) : null

  // 根据 AI 研判标签生成经营亮点 / 风险词条
  const goodTagSet = new Set(['向好', '高增', '修复', '扭盈'])
  const tagDescriptions: Record<string, { good: string[]; risk: string[] }> = {
    '向好': { good: ['业绩稳步增长'], risk: [] },
    '高增': { good: ['营收高速增长', '净利大幅提升'], risk: [] },
    '修复': { good: ['业绩回暖修复'], risk: [] },
    '扭盈': { good: ['成功扭亏为盈'], risk: [] },
    '承压': { good: [], risk: ['成本承压'] },
    '走弱': { good: [], risk: ['业绩增速放缓'] },
    '疲弱': { good: [], risk: ['业绩持续疲弱'] },
    '转亏': { good: [], risk: ['业绩由盈转亏'] },
  }
  const desc = tagDescriptions[aiTag] || { good: [], risk: [] }

  return {
    code,
    name,
    period,
    tag: aiTag || rating || (reportType === '快报/预告' ? '预告' : ''),
    aiScore: aiScore != null ? Number(aiScore) : null,
    perfScore: null,
    isFormal: reportType === '正式报告',
    revenue: toYi(rawRevenue),
    revenueYoy,
    netProfit: toYi(rawProfit),
    profitYoy,
    industry: '',
    grossMargin: '',
    cashFlow: '',
    updateTime: formatDate(annDate),
    goodTags: desc.good,
    riskTags: desc.risk,
  }
}

/** 将排行榜 API 返回项映射为前端 ReportItem（业绩模式） */
function mapRankingItem(item: any): ReportItem {
  const code = item.symbol || ''
  const name = item.stockName || ''
  const annDate = item.ann_date || ''
  const endDate = item.end_date || ''
  const aiTag = item.ai_tag || ''

  // 格式化日期: YYYYMMDD → YYYY-MM-DD
  const formatDate = (d: string) => {
    if (!d || d.length < 8) return d
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
  }

  // 报告期显示
  let period = endDate
  if (period && period.length === 8) {
    const y = period.slice(0, 4)
    const m = period.slice(4, 6)
    if (m === '03') period = `${y}一季报`
    else if (m === '06') period = `${y}半年报`
    else if (m === '09') period = `${y}三季报`
    else if (m === '12') period = `${y}年报`
  }
  if (item.reportType === 'express') period += '（快报）'

  // 金额（后端已转亿元）
  const toYi = (val: number | null) => {
    if (val == null) return ''
    return val.toFixed(2)
  }

  return {
    code,
    name,
    period,
    tag: aiTag || (item.reportType === 'express' ? '预告' : ''),
    aiScore: null,
    perfScore: item.score != null ? Number(item.score) : null,
    isFormal: item.reportType === 'formal',
    revenue: toYi(item.revenue ?? null),
    revenueYoy: item.revenueYoY != null ? Number(item.revenueYoY) : null,
    netProfit: toYi(item.netProfit ?? null),
    profitYoy: item.netProfitYoY != null ? Number(item.netProfitYoY) : null,
    industry: '',
    grossMargin: '',
    cashFlow: '',
    updateTime: formatDate(annDate),
    goodTags: [],
    riskTags: [],
  }
}

// ===== 搜索 =====
function handleSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { fetchData(false) }, 300)
}

function handleSearch() {
  fetchData(false)
}

function handleReset() {
  keyword.value = ''
  fetchData(false)
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  fetchData(true)
}

function retry() {
  error.value = false
  fetchData(false)
}

// ===== 报告类型筛选 =====
function setReportType(type: 'formal' | 'express') {
  if (reportType.value === type) return
  reportType.value = type
  savePersistedState()
  fetchData(false)
}

// ===== 排序字段切换 =====
/** 设置排序字段；asc 参数存在表示点击箭头（同时设置升降序方向） */
function setSortField(field: 'updateTime' | 'score' | 'performance', asc?: boolean) {
  if (asc !== undefined) {
    sortField.value = field
    sortAsc.value = asc
  } else {
    // 点击文字：仅切换字段，保持当前方向
    if (sortField.value === field) return
    sortField.value = field
  }
  savePersistedState()
  fetchData(false)
}

function switchTo(tab: string) {
  if (tab === 'forecast') {
    uni.redirectTo({ url: '/modules/analytics/pages/forecast' })
  }
}

// ===== 通用 =====
/** 卡片右上角展示的分数：四维评分/更新时间模式显示 AI 评分，业绩模式显示业绩评分 */
function displayScore(item: ReportItem): number | null {
  return sortField.value === 'performance' ? item.perfScore : item.aiScore
}

function scoreClass(score: number): string {
  if (score >= 70) return 'score-high' // 红
  if (score >= 36) return 'score-mid'  // 蓝
  return 'score-low'                   // 绿
}

function yoyClass(val: number | null): string {
  if (val == null) return 'none'
  if (val === 0) return ''
  return val > 0 ? 'up' : 'down'
}

function formatYoy(val: number | null): string {
  if (val == null) return '暂无数据'
  const prefix = val > 0 ? '+' : ''
  return `${prefix}${val.toFixed(2)}%`
}

function goStockDetail(item: ReportItem) {
  if (!item?.code) return
  const info = encodeURIComponent(JSON.stringify({
    code: item.code,
    name: item.name,
    period: item.period,
    tag: item.tag,
    industry: item.industry,
    updateTime: item.updateTime,
  }))
  uni.navigateTo({ url: `/modules/analytics/pages/report-detail?symbol=${item.code}&stockInfo=${info}` })
}

// ===== 初始化 =====
loadPersistedState()
fetchData(false)
</script>

<style lang="scss" scoped>
.page-reports {
  height: 100%;
  background: #f5f7fb;
}

/* 切换按钮组 */
.toggle-group {
  display: flex;
  background: #f0f2f5;
  border-radius: 12rpx;
  padding: 4rpx;
}

.toggle-btn {
  font-size: 24rpx;
  color: $ink-soft;
  padding: 8rpx 24rpx;
  border-radius: 10rpx;
  font-weight: 500;

  &.active {
    color: #ffffff;
    background: $primary;
  }
}

/* 搜索栏 */
.reports-fixed {
  padding: 16rpx 24rpx 0;
}

.search-bar {
  margin-bottom: 16rpx;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.search-input {
  flex: 1;
  font-size: 26rpx;
  color: $ink;
  height: 40rpx;
}

.search-clear {
  font-size: 28rpx;
  color: #9ca3af;
  padding: 8rpx;
}

/* ===== 筛选+排序单行 ===== */
.filter-sort-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
  padding: 12rpx 16rpx;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.report-type-group {
  display: flex;
  gap: 0;
  flex-shrink: 0;
  border-radius: 10rpx;
  overflow: hidden;
  border: 1rpx solid #e0e3e8;
}

.report-type-btn {
  font-size: 22rpx;
  color: $ink-soft;
  padding: 8rpx 16rpx;
  background: #f9fafb;
  font-weight: 500;

  &.active {
    color: #fff;
    background: $primary;
  }

  &:first-child {
    border-right: 1rpx solid #e0e3e8;
  }
}

/* 排序字段组：占满剩余空间，三项分布（无方框） */
.sort-field-group {
  flex: 1;
  display: flex;
  align-items: center;
  margin-left: 12rpx;
  min-width: 0;
}

/* 未选中：flex:1 均匀分布；选中：flex-grow 放大，带动其他项滑动缩小 */
.sort-field-item {
  flex: 1 1 0%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding: 8rpx 0;
  min-width: 0;
  transition: flex-grow 0.3s ease;

  &.active {
    flex-grow: 1.6;
  }
}

/* 未选中：小号灰色文字 */
.sort-field-text {
  font-size: 20rpx;
  color: #9ca3af;
  font-weight: 400;
  white-space: nowrap;
  transition: font-size 0.3s ease, color 0.3s ease;
}

/* 选中：放大、主色 */
.sort-field-item.active .sort-field-text {
  font-size: 26rpx;
  color: $primary;
  font-weight: 600;
}

/* 选中项上下双三角：上=从低到高，下=从高到低 */
.sort-arrows {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3rpx;
  flex-shrink: 0;
}

.sort-arrow-up,
.sort-arrow-down {
  width: 0;
  height: 0;
  border-left: 5rpx solid transparent;
  border-right: 5rpx solid transparent;
}

.sort-arrow-up {
  border-bottom: 6rpx solid #9ca3af;

  &.active {
    border-bottom-color: $primary;
  }
}

.sort-arrow-down {
  border-top: 6rpx solid #9ca3af;

  &.active {
    border-top-color: $primary;
  }
}

/* 加载/空/失败状态 */
.loading-state,
.empty-state,
.error-state {
  padding: 200rpx 0;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.error-text {
  font-size: 28rpx;
  color: #374151;
  margin-top: 24rpx;
  font-weight: 500;
}

.error-desc {
  font-size: 24rpx;
  color: #9ca3af;
  margin-top: 12rpx;
}

.retry-btn {
  margin-top: 40rpx;
  padding: 16rpx 56rpx;
  font-size: 26rpx;
  color: #ffffff;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-radius: 40rpx;
  text-align: center;
}

/* ===== 报告卡片 ===== */
.report-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 0 24rpx 24rpx;
}

.report-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  border: 1rpx solid $line;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

/* 顶部：股票 + 报告期 + 标签 */
.report-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.report-top-left {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.stock-name {
  font-size: 26rpx;
  font-weight: 600;
  color: $ink;
}

.stock-code {
  font-size: 22rpx;
  color: $ink-soft;
  background: #f0f2f5;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

.report-period {
  font-size: 22rpx;
  color: #9ca3af;
  flex-shrink: 0;
}

.report-score {
  font-size: 22rpx;
  font-weight: 600;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  margin-left: auto;
  flex-shrink: 0;

  &.score-high {
    color: $up;
    background: $up-soft;
  }
  &.score-mid {
    color: $primary;
    background: $primary-50;
  }
  &.score-low {
    color: $down;
    background: $down-soft;
  }
}

/* 中部：AI 研判标签 */
.report-mid {
  background: #f9fafb;
  border-radius: 14rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 20rpx;
}

.report-tags-wrap {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.report-tags-group {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
}

.report-tags-label {
  font-size: 20rpx;
  color: $ink-soft;
  flex-shrink: 0;
  margin-top: 4rpx;
  min-width: 64rpx;
}

.report-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6rpx;
}

.report-tag-pill {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 14rpx;
  font-weight: 400;

  &.good {
    color: #059669;
    background: rgba(5, 150, 105, 0.1);
  }
  &.risk {
    color: #dc2626;
    background: rgba(220, 38, 38, 0.1);
  }
}

.report-data-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6rpx 0;

  &:first-child { padding-top: 0; }
  &:last-child { padding-bottom: 0; }
}

.data-left {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.data-right {
  display: flex;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
}

.data-label {
  font-size: 22rpx;
  color: #9ca3af;
  flex-shrink: 0;
}

.data-value {
  font-size: 22rpx;
  font-weight: 600;
  color: #374151;
  flex-shrink: 0;
  min-width: 100rpx;
}

.data-yoy-label {
  font-size: 20rpx;
  font-weight: 500;
  color: #9ca3af;
}

.data-yoy {
  font-size: 20rpx;
  font-weight: 500;
  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
  &.none { color: #9ca3af; }
}

/* 底部：辅助信息 */
.report-bottom {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.report-meta-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
}

.meta-label {
  font-size: 22rpx;
  color: #9ca3af;
}

.meta-value {
  font-size: 22rpx;
  color: #374151;
  font-weight: 500;
}

.meta-divider {
  font-size: 22rpx;
  color: #e0e3e8;
  margin: 0 4rpx;
}

.report-time-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.update-time {
  font-size: 22rpx;
  color: #9ca3af;
}

/* 加载更多 */
.load-more {
  text-align: center;
  padding: 32rpx 0;
}

.load-more-text {
  font-size: 26rpx;
  color: $primary;
}
</style>
