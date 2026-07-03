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
    const [quoteData, flowData] = await Promise.allSettled([
      stockApi.getQuote(symbol.value),
      stockApi.getCapitalFlow(symbol.value),
    ])
    if (quoteData.status === 'fulfilled') {
      quote.value = quoteData.value
    }
    if (flowData.status === 'fulfilled') {
      // 适配资金流向数据格式
      const flow = flowData.value as any
      capitalFlow.value = flow?.data || flow
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
</style>
