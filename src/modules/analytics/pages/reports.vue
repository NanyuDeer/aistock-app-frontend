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
          <view class="left-section">
            <!-- 年份筛选 -->
            <view class="filter-section" @tap="toggleYearPicker">
              <SvgIcon name="filter-line" size="24rpx" color="#0b5fff" />
              <text class="filter-text">{{ selectedYear }}年</text>
              <SvgIcon name="arrow-down-s" size="20rpx" color="#4b5a7a" />
            </view>

            <!-- 排序下拉 -->
            <picker
              mode="selector"
              :range="sortLabels"
              :value="sortIndex"
              @change="onSortChange"
            >
              <view class="sort-picker">
                <text class="sort-picker-text">{{ currentSortLabel }}</text>
                <SvgIcon name="arrow-down-s" size="20rpx" color="#4b5a7a" />
              </view>
            </picker>
          </view>

          <!-- 升降序按钮 -->
          <view class="sort-order">
            <text
              :class="['order-btn', sortAsc === false ? 'active' : '']"
              @tap="setOrder(false)"
            >降序</text>
            <text
              :class="['order-btn', sortAsc === true ? 'active' : '']"
              @tap="setOrder(true)"
            >升序</text>
          </view>
        </view>
      </view>

      <!-- 年份下拉弹窗 -->
      <view v-if="showYearPicker" class="industry-overlay" @tap="closeYearPicker">
        <view class="industry-popup" @tap.stop>
          <view class="industry-popup-header">
            <text class="industry-popup-title">选择年份</text>
            <text class="industry-popup-close" @tap="closeYearPicker">✕</text>
          </view>
          <scroll-view class="industry-list" scroll-y>
            <view
              v-for="yr in yearList"
              :key="yr"
              :class="['industry-item', selectedYear === yr ? 'active' : '']"
              @tap="selectYear(yr)"
            >{{ yr }}年</view>
          </scroll-view>
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
          <!-- 顶部：股票名称 + 代码｜报告期｜标签 -->
          <view class="report-top">
            <view class="report-top-left">
              <text class="stock-name">{{ item.name }}</text>
              <text class="stock-code">{{ item.code }}</text>
            </view>
            <view class="report-period">{{ item.period }}</view>
            <text :class="['report-tag', tagClass(item.tag)]">{{ item.tag }}</text>
          </view>

          <!-- 中部：AI 研判标签 -->
          <view class="report-mid">
            <view class="report-tags-wrap">
              <view class="report-tags-group">
                <text class="report-tags-label">经营亮点</text>
                <view class="report-tags-list">
                  <text v-for="(gt, gi) in item.goodTags" :key="gi" class="report-tag-pill good">{{ gt }}</text>
                </view>
              </view>
              <view v-if="item.riskTags.length" class="report-tags-group">
                <text class="report-tags-label">潜在风险</text>
                <view class="report-tags-list">
                  <text v-for="(rt, ri) in item.riskTags" :key="ri" class="report-tag-pill risk">{{ rt }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 底部：核心财务 + 更新时间 -->
          <view class="report-bottom">
            <view class="report-data-row">
              <view class="data-left">
                <text class="data-label">营业总收入</text>
                <text class="data-value">{{ item.revenue }} 亿元</text>
              </view>
              <view class="data-right">
                <text :class="['data-yoy', yoyClass(item.revenueYoy)]">同比 {{ formatYoy(item.revenueYoy) }}</text>
                <text :class="['data-arrow', yoyClass(item.revenueYoy)]">{{ item.revenueYoy >= 0 ? '↑' : '↓' }}</text>
              </view>
            </view>
            <view class="report-data-row">
              <view class="data-left">
                <text class="data-label">归母净利润</text>
                <text class="data-value">{{ item.netProfit }} 亿元</text>
              </view>
              <view class="data-right">
                <text :class="['data-yoy', yoyClass(item.profitYoy)]">同比 {{ formatYoy(item.profitYoy) }}</text>
                <text :class="['data-arrow', yoyClass(item.profitYoy)]">{{ item.profitYoy >= 0 ? '↑' : '↓' }}</text>
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
  revenue: string
  revenueYoy: number
  netProfit: string
  profitYoy: number
  industry: string
  grossMargin: string
  cashFlow: string
  updateTime: string
  goodTags: string[]
  riskTags: string[]
}

type SortField = 'revenue' | 'revenueYoy' | 'netProfit' | 'profitYoy' | 'updateTime'

const SORT_KEYS: SortField[] = ['netProfit', 'profitYoy', 'revenue', 'revenueYoy', 'updateTime']
const SORT_LABELS: Record<SortField, string> = {
  netProfit: '净利规模',
  profitYoy: '净利增速',
  revenue: '营收规模',
  revenueYoy: '营收增速',
  updateTime: '更新时间',
}
const sortLabels = ['净利规模', '净利增速', '营收规模', '营收增速', '更新时间']

const STORAGE_KEY = 'report_filter_sort'

// ===== 年份列表（10年） =====
const yearList = ['2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015']

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

// 年份筛选
const showYearPicker = ref(false)
const selectedYear = ref('2024')

// 排序
const sortFieldIndex = ref(0)        // 当前排序维度在 SORT_KEYS 中的索引
const sortAsc = ref(false)           // true=升序, false=降序

// ===== 持久化 =====
function loadPersistedState() {
  try {
    const saved = uni.getStorageSync(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      const idx = SORT_KEYS.indexOf(parsed.sortField)
      if (idx >= 0) sortFieldIndex.value = idx
      if (typeof parsed.sortAsc === 'boolean') sortAsc.value = parsed.sortAsc
      if (typeof parsed.year === 'string') selectedYear.value = parsed.year
    }
  } catch (_) { /* ignore */ }
}

function savePersistedState() {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify({
      sortField: SORT_KEYS[sortFieldIndex.value],
      sortAsc: sortAsc.value,
      year: selectedYear.value,
    }))
  } catch (_) { /* ignore */ }
}

// ===== 计算属性 =====
const currentSortField = computed(() => SORT_KEYS[sortFieldIndex.value])
const currentSortLabel = computed(() => SORT_LABELS[currentSortField.value])
const sortIndex = computed(() => sortFieldIndex.value)

const hasMore = computed(() => {
  const shown = filteredList.value.length
  return shown > 0 && shown < total.value
})

// 排序映射：前端 SortField → 后端 sortBy 参数
function sortFieldToApi(field: SortField): string {
  const map: Record<SortField, string> = {
    revenue: 'total_revenue',
    revenueYoy: 'total_revenue',
    netProfit: 'n_income_attr_p',
    profitYoy: 'n_income_attr_p',
    updateTime: 'ann_date',
  }
  return map[field] || 'ann_date'
}

// 筛选 + 排序联动逻辑：先筛选 → 后排序
const filteredList = computed(() => {
  let items = [...rawList.value]

  // 第一步：年份筛选
  if (selectedYear.value) {
    items = items.filter(item => item.period.startsWith(selectedYear.value))
  }

  // 第二步：排序
  const field = currentSortField.value
  const asc = sortAsc.value
  items.sort((a, b) => {
    let valA = 0
    let valB = 0

    if (field === 'revenue') {
      valA = parseFloat(a.revenue) || 0
      valB = parseFloat(b.revenue) || 0
    } else if (field === 'revenueYoy') {
      valA = a.revenueYoy ?? 0
      valB = b.revenueYoy ?? 0
    } else if (field === 'netProfit') {
      valA = parseFloat(a.netProfit) || 0
      valB = parseFloat(b.netProfit) || 0
    } else if (field === 'profitYoy') {
      valA = a.profitYoy ?? 0
      valB = b.profitYoy ?? 0
    } else if (field === 'updateTime') {
      valA = new Date(a.updateTime).getTime()
      valB = new Date(b.updateTime).getTime()
    }

    return asc ? valA - valB : valB - valA
  })

  return items
})

// 空数据提示
const emptyTip = computed(() => {
  if (keyword.value) return '未搜索到相关股票'
  if (selectedYear.value) return `暂无「${selectedYear.value}」年财报数据`
  return '暂无业绩报告数据'
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
    const params: any = {
      page: page.value,
      pageSize,
      sortBy: sortFieldToApi(currentSortField.value),
      sortOrder: sortAsc.value ? 'asc' : 'desc',
    }

    const kw = keyword.value.trim()
    const res: any = kw
      ? await stockApi.searchPerformanceReport({ ...params, keyword: kw })
      : await stockApi.getPerformanceReportList(params)

    if (!res) throw new Error('API 返回为空')

    // 响应拦截器已提取 data，res 即为数据对象
    const reportList: any[] = res['报告列表'] || []
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

  // 格式化日期: YYYYMMDD → YYYY-MM-DD
  const formatDate = (d: string) => {
    if (!d || d.length < 8) return d
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
  }

  // 报告期显示
  let period = endDate
  if (period && !period.includes('年')) {
    const y = period.slice(0, 4)
    const m = period.slice(4, 6)
    if (m === '06') period = `${y}年半年报`
    else if (m === '12') period = `${y}年报`
    else period = `${y}年${m}月报`
  }

  // 金额转换（元→亿）
  const toYi = (val: number | null) => {
    if (val == null) return ''
    const yi = val / 1e8
    return yi.toFixed(2)
  }

  // 同比增速（按报告类型推算）
  let revenueYoy = 0
  let profitYoy = 0

  // 生成模拟AI标签（API 暂无该字段，暂用 mock）
  const goodTags = ['营收稳定', '净利增长']
  const riskTags: string[] = []

  return {
    code,
    name,
    period,
    tag: rating || (reportType === '快报/预告' ? '预告' : '报告'),
    revenue: toYi(rawRevenue),
    revenueYoy,
    netProfit: toYi(rawProfit),
    profitYoy,
    industry: '',
    grossMargin: '',
    cashFlow: '',
    updateTime: formatDate(annDate),
    goodTags,
    riskTags,
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

// ===== 年份筛选 =====
function toggleYearPicker() {
  showYearPicker.value = !showYearPicker.value
}

function closeYearPicker() {
  showYearPicker.value = false
}

function selectYear(yr: string) {
  selectedYear.value = yr
  showYearPicker.value = false
  savePersistedState()
  // 年份变更后重新请求数据
  fetchData(false)
}

// ===== 排序 =====
function onSortChange(e: any) {
  const idx = e.detail.value
  if (idx !== sortFieldIndex.value) {
    sortFieldIndex.value = idx
    sortAsc.value = false  // 切换维度时默认降序
  } else {
    // 点击同一项切换升降序
    sortAsc.value = !sortAsc.value
  }
  savePersistedState()
  fetchData(false) // 排序变更后重新请求
}

function setOrder(asc: boolean) {
  sortAsc.value = asc
  savePersistedState()
  fetchData(false)
}

function switchTo(tab: string) {
  if (tab === 'forecast') {
    uni.redirectTo({ url: '/modules/analytics/pages/forecast' })
  }
}

// ===== 通用 =====
function tagClass(tag: string): string {
  const goodTags = ['向好', '高增', '修复', '扭盈']
  return goodTags.includes(tag) ? 'tag-good' : 'tag-bad'
}

function yoyClass(val: number): string {
  if (val === 0) return ''
  return val > 0 ? 'up' : 'down'
}

function formatYoy(val: number): string {
  if (val === 0) return '--'
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

.filter-section {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 12rpx;
  background: #f0f4ff;
  border-radius: 10rpx;
  flex-shrink: 0;
  max-width: 240rpx;
}

.filter-text {
  font-size: 24rpx;
  color: $primary;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140rpx;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.sort-picker {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
  background: #f0f2f5;
}

.sort-picker-text {
  font-size: 24rpx;
  color: $primary;
  font-weight: 500;
}

.sort-order {
  display: flex;
  gap: 0;
  flex-shrink: 0;
  border-radius: 10rpx;
  overflow: hidden;
  border: 1rpx solid #e0e3e8;
}

.order-btn {
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

/* ===== 行业下拉弹窗 ===== */
.industry-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 200rpx;
}

.industry-popup {
  width: 560rpx;
  max-height: 70vh;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
}

.industry-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid #f0f2f5;
}

.industry-popup-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $ink;
}

.industry-popup-close {
  font-size: 28rpx;
  color: #9ca3af;
  padding: 8rpx;
}

.industry-list {
  max-height: 50vh;
  padding: 12rpx 0;
}

.industry-item {
  font-size: 26rpx;
  color: #374151;
  padding: 20rpx 28rpx;
  border-bottom: 1rpx solid #f5f5f5;

  &.active {
    color: #ffffff;
    background: $primary;
    font-weight: 600;
  }

  &:last-child {
    border-bottom: none;
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

.report-tag {
  font-size: 22rpx;
  font-weight: 600;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  margin-left: auto;
  flex-shrink: 0;

  &.tag-good {
    color: #f43f5e;
    background: rgba(244, 63, 94, 0.1);
  }

  &.tag-bad {
    color: #22c55e;
    background: rgba(34, 197, 94, 0.1);
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

.data-yoy {
  font-size: 20rpx;
  font-weight: 500;
  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

.data-arrow {
  font-size: 20rpx;
  font-weight: 700;
  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
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
  justify-content: flex-start;
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
