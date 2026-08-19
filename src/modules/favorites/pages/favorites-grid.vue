<!--
 * favorites-grid 多股同列
 * 自选页点击网格图标进入：2 列宫格卡片，每张卡显示 名称+代码 / 最新价 / 涨跌幅 / 涨跌额，
 * 下方迷你 K 线图（分时/五日/日K/周K/月K，顶部切换条全局同步）+ 成交量。
 * 数据：行情复用 favoritesStore（含实时价格/涨跌幅），K 线按周期全部加载 + 前端 Map 缓存（切回不重新请求）。
 * 点击卡片 → 个股详情。
 -->
<template>
  <SubPageCard2 title="多股同列" active-panel="favorites">
    <!-- 顶部周期切换条：切换后全部卡片同步刷新 -->
    <view class="period-bar">
      <view
        v-for="tab in periodTabs"
        :key="tab.key"
        class="period-tab"
        :class="{ 'period-tab--active': period === tab.key }"
        @tap="switchPeriod(tab.key)"
      >
        <text class="period-tab-text">{{ tab.label }}</text>
      </view>
    </view>

    <!-- 宫格卡片区 -->
    <view v-if="stocks.length" class="grid">
      <view
        v-for="stock in stocks"
        :key="stock.symbol"
        class="grid-card"
        @tap="goDetail(stock.symbol)"
      >
        <view class="card-head">
          <text class="card-name">{{ stock.name }}</text>
          <text class="card-code">{{ stock.symbol }}</text>
        </view>
        <view class="card-quote">
          <text class="card-price" :class="trendCls(stock)">{{ formatPrice(stock.price) }}</text>
          <view class="card-change-wrap">
            <text class="card-change" :class="trendCls(stock)">{{ formatChange(stock.changePercent) }}</text>
            <text class="card-amount" :class="trendCls(stock)">{{ formatAmount(stock.changeAmount) }}</text>
          </view>
        </view>
        <MiniKLine
          :data="klineMap.get(stock.symbol) || []"
          :period="period"
          :trend-up="(stock.changePercent ?? 0) >= 0"
          height="220rpx"
        />
      </view>
      <view v-if="loading" class="grid-loading">
        <LoadingState text="加载K线中..." />
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty-state">
      <SvgIcon class="empty-icon" name="grid-line" size="80rpx" color="#d1d5db" />
      <text class="empty-text">暂无自选股</text>
      <text class="empty-tip">回自选页添加股票后再来查看多股同列</text>
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useFavoritesStore } from '@/shared/store/modules/favorites'
import { stockApi, type KLineItem } from '@/shared/api/modules/stock'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import LoadingState from '@/shared/components/LoadingState.vue'
import MiniKLine, { type MiniPeriod } from '@/modules/favorites/components/MiniKLine.vue'

/* ===== 周期 ===== */
const periodTabs: Array<{ key: MiniPeriod; label: string }> = [
  { key: 'minute', label: '分时' },
  { key: 'five', label: '五日' },
  { key: 'daily', label: '日K' },
  { key: 'weekly', label: '周K' },
  { key: 'monthly', label: '月K' },
]
const period = ref<MiniPeriod>('daily')

/** 各周期默认拉取条数（分时≈1个交易日分钟序列，五日≈5个交易日，日/周/月取 120 根） */
function klineCount(p: MiniPeriod): number {
  return p === 'minute' ? 300 : p === 'five' ? 1500 : 120
}

/* ===== 自选股数据（复用 favoritesStore，含实时行情） ===== */
interface GridStock {
  symbol: string
  name: string
  price?: number
  changePercent?: number
  changeAmount: number
}

const favoritesStore = useFavoritesStore()

const stocks = computed<GridStock[]>(() =>
  favoritesStore.stocks
    .filter((s) => s.symbol && s.name)
    .map((s) => ({
      symbol: s.symbol,
      name: s.name,
      price: s.price,
      changePercent: s.changePercent,
      changeAmount: calculateChangeAmount(s.price, s.changePercent),
    })),
)

/** 由 最新价 + 涨跌幅 反推涨跌额（与自选页一致：prevClose = price / (1 + pct/100)） */
function calculateChangeAmount(price?: number, changePercent?: number): number {
  if (!Number.isFinite(price) || !Number.isFinite(changePercent) || !price || price <= 0 || changePercent! <= -100) return 0
  const prevClose = price / (1 + changePercent! / 100)
  return price - prevClose
}

/* ===== K 线：全部加载 + 前端缓存（切周期/切回不重新请求已拉过的数据） ===== */
// shallowRef 包裹：批量拉取完成后整体替换触发 klineMap 重算（普通 Map.set 不触发响应式，K 线会不显示）
const klineCache = shallowRef(new Map<string, KLineItem[]>())
const loading = ref(false)

function cacheKey(symbol: string, p: MiniPeriod): string {
  return `${p}:${symbol}`
}

async function loadKLine() {
  const symbols = stocks.value.map((s) => s.symbol)
  if (!symbols.length) return
  loading.value = true
  try {
    const toFetch = symbols.filter((s) => !klineCache.value.has(cacheKey(s, period.value)))
    if (!toFetch.length) return
    const results = await Promise.allSettled(
      toFetch.map((s) => stockApi.getKLine(s, { period: period.value, count: klineCount(period.value) })),
    )
    const next = new Map(klineCache.value)
    results.forEach((result, i) => {
      const symbol = toFetch[i]
      next.set(
        cacheKey(symbol, period.value),
        result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [],
      )
    })
    klineCache.value = next
  } finally {
    loading.value = false
  }
}

function switchPeriod(p: MiniPeriod) {
  if (period.value === p) return
  period.value = p
  void loadKLine()
}

const klineMap = computed(() => {
  const map = new Map<string, KLineItem[]>()
  stocks.value.forEach((s) => map.set(s.symbol, klineCache.value.get(cacheKey(s.symbol, period.value)) || []))
  return map
})

/* ===== 展示格式化 ===== */
function trendCls(stock: GridStock) {
  return (stock.changePercent ?? 0) >= 0 ? 'up' : 'down'
}

function formatPrice(price?: number) {
  return price != null && Number.isFinite(price) ? price.toFixed(2) : '--'
}

function formatChange(changePercent?: number) {
  return changePercent != null && Number.isFinite(changePercent)
    ? `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`
    : '--'
}

function formatAmount(changeAmount: number) {
  return changeAmount >= 0 ? `+${changeAmount.toFixed(2)}` : changeAmount.toFixed(2)
}

/* ===== 交互 ===== */
function goDetail(symbol: string) {
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` })
}

/* 进入页面：同步自选（含行情刷新，登录/未登录 mock 均覆盖）+ 加载当前周期 K 线 */
onShow(() => {
  void favoritesStore.fetchFavorites({ silent: true }).then(() => loadKLine())
})
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

/* ===== 周期切换条 ===== */
.period-bar {
  display: flex;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  background: #ffffff;
  border-bottom: 2rpx solid $line-soft;
  position: sticky;
  top: 0;
  z-index: 2;
}

.period-tab {
  flex: 1;
  text-align: center;
  padding: 12rpx 0;
  border-radius: 32rpx;
  background: $bg-soft;

  &--active {
    background: linear-gradient(135deg, $primary, $primary-600);
  }
}

.period-tab-text {
  font-size: 26rpx;
  color: #9ca3af;

  .period-tab--active & {
    color: #ffffff;
    font-weight: 600;
  }
}

/* ===== 宫格：2 列均分（flex-wrap + 50% 宽度，跨端兼容） ===== */
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  padding: 20rpx 24rpx;
}

.grid-card {
  width: calc(50% - 10rpx);
  box-sizing: border-box;
  background: #ffffff;
  border: 2rpx solid #f3f4f6;
  border-radius: 16rpx;
  padding: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  &:active {
    background: #f8fafc;
  }
}

.card-head {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  margin-bottom: 12rpx;
}

.card-name {
  font-size: 28rpx;
  color: $ink;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-code {
  font-size: 20rpx;
  color: #9ca3af;
  flex-shrink: 0;
}

.card-quote {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.card-price {
  font-size: 34rpx;
  font-weight: 600;
}

.card-change-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2rpx;
}

.card-change {
  font-size: 24rpx;
  font-weight: 500;
}

.card-amount {
  font-size: 20rpx;
}

.up { color: #f43f5e; }
.down { color: #22c55e; }

.grid-loading {
  width: 100%;
  padding: 40rpx 0;
}

/* ===== 空状态 ===== */
.empty-state {
  text-align: center;
  padding: 160rpx 0;

  .empty-icon {
    display: block;
    font-size: 80rpx;
    margin-bottom: 20rpx;
  }
  .empty-text {
    display: block;
    font-size: 28rpx;
    color: $ink;
    margin-bottom: 10rpx;
  }
  .empty-tip {
    display: block;
    font-size: 24rpx;
    color: #9ca3af;
  }
}
</style>
