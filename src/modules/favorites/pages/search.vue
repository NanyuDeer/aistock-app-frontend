<template>
  <view class="page-search">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <SvgIcon name="search-line" size="32rpx" color="#9ca3af" />
        <input
          v-model="keyword"
          class="search-input"
          type="text"
          placeholder="输入股票代码或名称"
          confirm-type="search"
          @confirm="onSearch"
        />
        <SvgIcon v-if="keyword" name="close-line" size="32rpx" color="#9ca3af" @tap="clearKeyword" />
      </view>
      <text class="search-btn" @tap="onSearch">搜索</text>
    </view>

    <!-- 热门搜索 -->
    <view v-if="!results.length && !loading" class="hot-section">
      <text class="hot-title">热门搜索</text>
      <view class="hot-tags">
        <view
          v-for="stock in hotStocks"
          :key="stock.symbol"
          class="hot-tag"
          @tap="goDetail(stock.symbol)"
        >
          <text class="hot-tag-name">{{ stock.name }}</text>
          <text class="hot-tag-code">{{ stock.symbol }}</text>
        </view>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view v-if="loading" class="loading">
      <text class="loading-text">搜索中...</text>
    </view>

    <view v-else-if="results.length" class="result-list">
      <view
        v-for="item in results"
        :key="item.symbol"
        class="result-item"
        @tap="goDetail(item.symbol)"
      >
        <view class="result-info">
          <text class="result-name">{{ item.name }}</text>
          <text class="result-code">{{ item.symbol }}</text>
        </view>
        <text class="result-arrow">›</text>
      </view>
    </view>

    <view v-else-if="searched" class="empty">
      <text class="empty-text">未找到相关股票</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { stockApi } from '@/shared/api/modules/stock'
import SvgIcon from '@/shared/components/SvgIcon.vue'

const keyword = ref('')
const results = ref<any[]>([])
const loading = ref(false)
const searched = ref(false)

const hotStocks = [
  { symbol: '600519', name: '贵州茅台' },
  { symbol: '300750', name: '宁德时代' },
  { symbol: '000001', name: '平安银行' },
  { symbol: '601318', name: '中国平安' },
  { symbol: '000858', name: '五粮液' },
  { symbol: '002594', name: '比亚迪' },
  { symbol: '600036', name: '招商银行' },
  { symbol: '601899', name: '紫金矿业' },
]

async function onSearch() {
  const kw = keyword.value.trim()
  if (!kw) {
    results.value = []
    searched.value = false
    return
  }

  loading.value = true
  searched.value = true
  try {
    const res: any = await stockApi.getStockList({ keyword: kw, page: 1, size: 20 })
    const list = res?.list || res?.data?.list || res?.data || []
    results.value = list.map((item: any) => ({
      symbol: item.symbol || item.代码 || '',
      name: item.name || item.名称 || item.stock_name || '',
    })).filter((item: any) => item.symbol)
  } catch (err) {
    console.error('[Search] error:', err)
    results.value = []
  } finally {
    loading.value = false
  }
}

function clearKeyword() {
  keyword.value = ''
  results.value = []
  searched.value = false
}

function goDetail(symbol: string) {
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` })
}
</script>

<style lang="scss" scoped>
.page-search {
  padding: 24rpx;
  min-height: 100vh;
  background: #f5f7fa;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.search-icon {
  font-size: 28rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #1a1d24;
}

.clear-btn {
  font-size: 28rpx;
  color: #9ca3af;
  padding: 4rpx 8rpx;
}

.search-btn {
  font-size: 28rpx;
  color: #4d7cfe;
  font-weight: 500;
  padding: 8rpx 16rpx;
}

/* 热门搜索 */
.hot-section {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.hot-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1d24;
  margin-bottom: 20rpx;
  display: block;
}

.hot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.hot-tag {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 24rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
}

.hot-tag-name {
  font-size: 26rpx;
  color: #1a1d24;
  font-weight: 500;
}

.hot-tag-code {
  font-size: 22rpx;
  color: #6b7280;
  margin-top: 4rpx;
}

/* 搜索结果 */
.result-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 28rpx;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.result-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.result-name {
  font-size: 30rpx;
  color: #1a1d24;
  font-weight: 500;
}

.result-code {
  font-size: 24rpx;
  color: #6b7280;
  padding: 2rpx 12rpx;
  background: #f0f2f5;
  border-radius: 8rpx;
}

.result-arrow {
  font-size: 36rpx;
  color: #9ca3af;
}

/* 加载/空状态 */
.loading, .empty {
  display: flex;
  justify-content: center;
  padding: 100rpx 0;
}

.loading-text, .empty-text {
  font-size: 28rpx;
  color: #6b7280;
}
</style>
