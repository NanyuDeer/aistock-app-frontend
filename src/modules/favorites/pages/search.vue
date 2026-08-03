<template>
  <SubPageCard title="搜索股票" noChatBar>
    <view class="page-search">
      <!-- 文字 / 识图 Tab -->
      <view class="search-tabs">
        <view
          class="search-tab"
          :class="{ active: tab === 'text' }"
          @tap="switchTab('text')"
        >文字搜索</view>
        <view
          class="search-tab"
          :class="{ active: tab === 'ocr' }"
          @tap="switchTab('ocr')"
        >识图添加</view>
      </view>

      <!-- ============ 文字搜索 ============ -->
      <template v-if="tab === 'text'">
        <!-- 搜索框（位于导航栏下方） -->
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
              <text v-if="item.industry" class="result-industry">{{ item.industry }}</text>
            </view>
            <view class="result-actions">
              <view
                class="favorite-btn"
                :class="{ active: favoritesStore.isFavorite(item.symbol), disabled: favoritesStore.isPending(item.symbol) }"
                @tap.stop="toggleFavorite(item)"
              >
                <text>{{ favoritesStore.isFavorite(item.symbol) ? '已自选' : '加自选' }}</text>
              </view>
              <text class="result-arrow">›</text>
            </view>
          </view>
        </view>

        <view v-else-if="searched" class="empty">
          <text class="empty-text">未找到相关股票</text>
        </view>
      </template>

      <!-- ============ 识图添加 ============ -->
      <view v-else class="ocr-section">
        <!-- 选图入口 -->
        <view class="ocr-pick" @tap="chooseImages">
          <SvgIcon name="camera-line" size="40rpx" color="#0b5fff" />
          <view class="ocr-pick-info">
            <text class="ocr-pick-text">
              {{ ocrImages.length ? `已选择 ${ocrImages.length} 张图片` : '选择图片（最多8张）' }}
            </text>
            <text class="ocr-pick-sub">支持持仓截图 / 自选列表截图，AI 自动识别股票</text>
          </view>
        </view>

        <!-- 图片预览 -->
        <view v-if="ocrImages.length" class="ocr-previews">
          <view v-for="(img, i) in ocrImages" :key="i" class="ocr-preview">
            <image :src="img" mode="aspectFill" class="ocr-preview-img" />
            <view class="ocr-preview-del" @tap.stop="removeOcrImage(i)">
              <SvgIcon name="close-line" size="24rpx" color="#ffffff" />
            </view>
          </view>
        </view>

        <Button v-if="ocrImages.length && !ocrLoading" type="primary" block @click="startOcr">
          开始识别
        </Button>

        <LoadingState v-if="ocrLoading" text="AI 正在识别图片中的股票..." />

        <!-- 识别结果 -->
        <view v-if="ocrResults.length && !ocrLoading" class="ocr-results">
          <view class="ocr-result-head">
            <text class="ocr-result-title">识别到 {{ ocrResults.length }} 只股票</text>
            <text class="ocr-select-all" @tap="toggleSelectAll">{{ allSelected ? '取消全选' : '全选' }}</text>
          </view>
          <view
            v-for="item in ocrResults"
            :key="item.code"
            class="ocr-result-item"
            @tap="toggleSelect(item)"
          >
            <view class="ocr-check" :class="{ checked: item.selected }">
              <SvgIcon v-if="item.selected" name="check-line" size="24rpx" color="#ffffff" />
            </view>
            <text class="ocr-result-name">{{ item.name }}</text>
            <text class="ocr-result-code">{{ item.code }}</text>
            <text v-if="favoritesStore.isFavorite(item.code)" class="ocr-result-state">已自选</text>
          </view>
          <Button v-if="selectedCount" type="primary" block @click="addSelectedStocks">
            加入自选（{{ selectedCount }}）
          </Button>
        </view>

        <view v-if="ocrDone && !ocrResults.length && !ocrLoading" class="empty">
          <text class="empty-text">未识别到股票，请更换图片后重试</text>
        </view>
      </view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { stockApi, type StockListItem } from '@/shared/api/modules/stock'
import { useFavoritesStore } from '@/shared/store/modules/favorites'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import { Button, LoadingState } from '@/shared/components'
import { chooseOcrImages, toOcrImageInput } from '@/shared/utils/ocrImage'

// ============ 文字搜索 ============
const keyword = ref('')
const results = ref<StockListItem[]>([])
const loading = ref(false)
const searched = ref(false)
const favoritesStore = useFavoritesStore()

// ============ 识图添加 ============
const tab = ref<'text' | 'ocr'>('text')
const ocrImages = ref<string[]>([])
const ocrLoading = ref(false)
const ocrDone = ref(false)

interface OcrResultItem {
  code: string
  name: string
  selected: boolean
}
const ocrResults = ref<OcrResultItem[]>([])

onShow(() => {
  void favoritesStore.fetchFavorites({ silent: true })
})

const hotStocks: StockListItem[] = [
  { symbol: '600519', name: '贵州茅台', market: 'SH', industry: '白酒' },
  { symbol: '300750', name: '宁德时代', market: 'SZ', industry: '电池' },
  { symbol: '000001', name: '平安银行', market: 'SZ', industry: '银行' },
  { symbol: '601318', name: '中国平安', market: 'SH', industry: '保险' },
  { symbol: '000858', name: '五粮液', market: 'SZ', industry: '白酒' },
  { symbol: '002594', name: '比亚迪', market: 'SZ', industry: '汽车' },
  { symbol: '600036', name: '招商银行', market: 'SH', industry: '银行' },
  { symbol: '601899', name: '紫金矿业', market: 'SH', industry: '有色' },
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
    const res = await stockApi.getStockList({ keyword: kw, page: 1, pageSize: 20 })
    results.value = res.list
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

async function toggleFavorite(stock: StockListItem) {
  if (favoritesStore.isPending(stock.symbol)) return
  const changed = favoritesStore.isFavorite(stock.symbol)
    ? await favoritesStore.remove(stock.symbol)
    : await favoritesStore.add(stock.symbol, stock.name)
  if (changed) {
    uni.showToast({
      title: favoritesStore.isFavorite(stock.symbol) ? '已加入自选' : '已移除自选',
      icon: 'none',
    })
  }
}

// ============ 识图逻辑 ============
function switchTab(next: 'text' | 'ocr') {
  tab.value = next
}

async function chooseImages() {
  try {
    const paths = await chooseOcrImages()
    if (paths.length) {
      // 追加并截断到 8 张
      ocrImages.value = [...ocrImages.value, ...paths].slice(0, 8)
      ocrResults.value = []
      ocrDone.value = false
    }
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : '选择图片失败', icon: 'none' })
  }
}

function removeOcrImage(index: number) {
  ocrImages.value = ocrImages.value.filter((_, i) => i !== index)
}

async function startOcr() {
  if (!ocrImages.value.length || ocrLoading.value) return
  ocrLoading.value = true
  ocrDone.value = false
  uni.showLoading({ title: 'AI 识别中...', mask: true })
  try {
    // 逐张转 base64（H5 canvas 压缩 / App 压缩后读文件）
    const inputs = await Promise.all(ocrImages.value.map(toOcrImageInput))
    const result = await stockApi.ocrStocksFromImages(inputs, '自选股列表截图')
    // 扁平化 + 按代码去重
    const map = new Map<string, string>()
    ;(result || []).forEach((group) => {
      ;(group || []).forEach((item) => {
        const code = String(item['股票代码'] || '').trim()
        const name = String(item['股票简称'] || '').trim()
        if (code && !map.has(code)) map.set(code, name)
      })
    })
    ocrResults.value = Array.from(map.entries()).map(([code, name]) => ({
      code,
      name,
      selected: true,
    }))
    ocrDone.value = true
  } catch (e) {
    console.error('[OCR] error:', e)
    uni.showToast({ title: '识别失败，请稍后重试', icon: 'none' })
  } finally {
    uni.hideLoading()
    ocrLoading.value = false
  }
}

function toggleSelect(item: OcrResultItem) {
  item.selected = !item.selected
}

const selectedCount = computed(() => ocrResults.value.filter((i) => i.selected).length)
const allSelected = computed(
  () => ocrResults.value.length > 0 && ocrResults.value.every((i) => i.selected)
)

function toggleSelectAll() {
  const next = !allSelected.value
  ocrResults.value.forEach((i) => {
    i.selected = next
  })
}

async function addSelectedStocks() {
  const items = ocrResults.value
    .filter((i) => i.selected)
    .map((i) => ({ symbol: i.code, name: i.name }))
  if (!items.length) return
  const ok = await favoritesStore.addMany(items)
  if (ok) {
    uni.showToast({ title: '已加入自选', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

.page-search {
  display: flex;
  flex-direction: column;
  padding: 24rpx;
  background: $bg-page;
  min-height: 100%;
}

/* 文字 / 识图 Tab */
.search-tabs {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.search-tab {
  flex: 1;
  padding: 16rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: $ink-soft;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  &.active {
    color: $primary;
    font-weight: 600;
    background: $primary-50;
  }
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
  color: $ink;
}

.clear-btn {
  font-size: 28rpx;
  color: #9ca3af;
  padding: 4rpx 8rpx;
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
  color: $ink;
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
  background: $bg-soft;
  border-radius: 12rpx;
}

.hot-tag-name {
  font-size: 26rpx;
  color: $ink;
  font-weight: 500;
}

.hot-tag-code {
  font-size: 22rpx;
  color: $ink-soft;
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
  color: $ink;
  font-weight: 500;
}

.result-code {
  font-size: 24rpx;
  color: $ink-soft;
  padding: 2rpx 12rpx;
  background: #f0f2f5;
  border-radius: 8rpx;
}

.result-industry {
  font-size: 22rpx;
  color: $ink-soft;
  margin-left: 4rpx;
}

.result-arrow {
  font-size: 36rpx;
  color: #9ca3af;
}

.result-actions {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.favorite-btn {
  min-width: 96rpx;
  padding: 10rpx 16rpx;
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

/* 识图添加 */
.ocr-section {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.ocr-pick {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 32rpx 28rpx;
  background: #ffffff;
  border: 2rpx dashed $line-strong;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.ocr-pick-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.ocr-pick-text {
  font-size: 28rpx;
  color: $ink;
  font-weight: 500;
}

.ocr-pick-sub {
  font-size: 22rpx;
  color: $ink-soft;
}

/* 图片预览 */
.ocr-previews {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.ocr-preview {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  overflow: hidden;
}

.ocr-preview-img {
  width: 100%;
  height: 100%;
}

.ocr-preview-del {
  position: absolute;
  top: 0;
  right: 0;
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border-bottom-left-radius: 12rpx;
}

/* 识别结果 */
.ocr-results {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.ocr-result-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 4rpx;
}

.ocr-result-title {
  font-size: 26rpx;
  color: $ink;
  font-weight: 600;
}

.ocr-select-all {
  font-size: 24rpx;
  color: $primary;
}

.ocr-result-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.ocr-check {
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid $line-strong;
  border-radius: 8rpx;
  flex-shrink: 0;

  &.checked {
    background: $primary;
    border-color: $primary;
  }
}

.ocr-result-name {
  font-size: 28rpx;
  color: $ink;
  font-weight: 500;
}

.ocr-result-code {
  font-size: 24rpx;
  color: $ink-soft;
  padding: 2rpx 12rpx;
  background: #f0f2f5;
  border-radius: 8rpx;
}

.ocr-result-state {
  margin-left: auto;
  font-size: 22rpx;
  color: $success;
}

/* 加载/空状态 */
.loading, .empty {
  display: flex;
  justify-content: center;
  padding: 100rpx 0;
}

.loading-text, .empty-text {
  font-size: 28rpx;
  color: $ink-soft;
}
</style>
