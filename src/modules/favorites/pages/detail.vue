<template>
  <view class="page-detail">
    <view v-if="loading" class="loading">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else-if="quote">
      <!-- 股票头部 -->
      <view class="stock-header">
        <view class="stock-name-row">
          <text class="stock-name">{{ quote.name }}</text>
          <text class="stock-code">{{ quote.symbol }}</text>
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
      </view>

      <!-- 行情明细 -->
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

      <!-- 涨跌停 -->
      <view class="limit-row">
        <view class="limit-item">
          <text class="limit-label">涨停价</text>
          <text class="limit-value up">{{ quote.limitUp.toFixed(2) }}</text>
        </view>
        <view class="limit-item">
          <text class="limit-label">跌停价</text>
          <text class="limit-value down">{{ quote.limitDown.toFixed(2) }}</text>
        </view>
        <view class="limit-item">
          <text class="limit-label">均价</text>
          <text class="limit-value">{{ quote.avgPrice.toFixed(2) }}</text>
        </view>
      </view>

      <!-- 资金流向 -->
      <view v-if="capitalFlow" class="section-card">
        <text class="section-title">资金流向</text>
        <view class="flow-grid">
          <view class="flow-item">
            <text class="flow-label">主力净流入</text>
            <text :class="['flow-value', capitalFlow.netAmount >= 0 ? 'up' : 'down']">
              {{ formatAmount(capitalFlow.netAmount) }}
            </text>
          </view>
          <view class="flow-item">
            <text class="flow-label">超大单</text>
            <text :class="['flow-value', (capitalFlow.r0In - capitalFlow.r0Out) >= 0 ? 'up' : 'down']">
              {{ formatAmount(capitalFlow.r0In - capitalFlow.r0Out) }}
            </text>
          </view>
          <view class="flow-item">
            <text class="flow-label">大单</text>
            <text :class="['flow-value', (capitalFlow.r1In - capitalFlow.r1Out) >= 0 ? 'up' : 'down']">
              {{ formatAmount(capitalFlow.r1In - capitalFlow.r1Out) }}
            </text>
          </view>
          <view class="flow-item">
            <text class="flow-label">中单</text>
            <text :class="['flow-value', (capitalFlow.r2In - capitalFlow.r2Out) >= 0 ? 'up' : 'down']">
              {{ formatAmount(capitalFlow.r2In - capitalFlow.r2Out) }}
            </text>
          </view>
        </view>
      </view>

      <!-- 半年报信息 -->
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

      <!-- AI 投顾入口 -->
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
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { stockApi } from '@/shared/api/modules/stock'
import SvgIcon from '@/shared/components/SvgIcon.vue'

const loading = ref(true)
const quote = ref<any>(null)
const capitalFlow = ref<any>(null)
const semiAnnualReport = ref<any>(null)
const disclosureUrl = ref('')
const symbol = ref('')

onLoad((options: any) => {
  symbol.value = options?.symbol || ''
  if (symbol.value) {
    loadData()
  }
})

async function loadData() {
  loading.value = true
  try {
    const [quoteData, flowData, semiData] = await Promise.allSettled([
      stockApi.getQuote(symbol.value),
      stockApi.getCapitalFlow(symbol.value),
      stockApi.getSemiAnnualReport(symbol.value),
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
  } catch (err) {
    console.error('[StockDetail] load error:', err)
  } finally {
    loading.value = false
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
  // #ifdef APP-PLUS
  uni.navigateTo({ url: `/pages-sub-app/chat/index?message=${quote.value?.name}怎么样` })
  // #endif
  // #ifndef APP-PLUS
  uni.showToast({ title: '请在 App 中体验 AI 对话', icon: 'none' })
  // #endif
}
</script>

<style lang="scss" scoped>
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

.stock-price-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.stock-price {
  font-size: 56rpx;
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

/* 涨跌停 */
.limit-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.limit-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.limit-label {
  font-size: 24rpx;
  color: #6b7280;
  margin-bottom: 8rpx;
}

.limit-value {
  font-size: 30rpx;
  font-weight: 600;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
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
</style>
