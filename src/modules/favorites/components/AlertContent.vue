<template>
  <view class="alert-content">
    <view class="content-wrap">
      <!-- 异动捕手模块（新建模块：自选股异动监控） -->
      <view class="alert-module">
        <view class="module-header" @tap="goAlertCatcher">
          <text class="module-title">异动捕手</text>
          <text class="module-more">实时监控 ›</text>
        </view>
        <view class="capture-list">
          <view
            v-for="(item, idx) in displayCaptureList"
            :key="idx"
            class="capture-item"
          >
            <view :class="['capture-badge', item.type]">
              <text class="badge-text">{{ badgeLabel(item.type) }}</text>
            </view>
            <view class="capture-info">
              <text class="capture-name">{{ item.name }}</text>
              <text class="capture-detail">{{ item.detail }}</text>
            </view>
            <text class="capture-time">{{ item.time }}</text>
          </view>
          <view v-if="!captureList.length" class="empty-hint">
            <text class="empty-text">暂无异动数据</text>
          </view>
        </view>
      </view>

      <!-- 个股情报模块（原StockMonitor，原异动捕手改名） -->
      <view class="alert-module">
        <view class="module-header" @tap="goStockIntel">
          <text class="module-title">个股情报</text>
          <!-- 全部/利好/利空 切换标签 -->
          <view class="intel-tabs">
            <text
              v-for="tab in intelTabOptions"
              :key="tab.value"
              :class="['intel-tab', intelSubTab === tab.value ? 'intel-tab--active' : '']"
              @tap.stop="intelSubTab = tab.value"
            >{{ tab.label }}</text>
          </view>
        </view>
        <view class="intel-list">
          <view
            v-for="(item, idx) in displayIntelList"
            :key="idx"
            class="intel-item"
          >
            <view :class="['intel-source', item.sourceType]">
              <text class="source-text">{{ sourceLabel(item.sourceType) }}</text>
            </view>
            <view class="intel-info">
              <text class="intel-title">{{ item.title }}</text>
              <text class="intel-meta">{{ item.meta }}</text>
            </view>
          </view>
          <view v-if="!filteredIntelList.length" class="empty-hint">
            <text class="empty-text">暂无情报数据</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// 异动类型
type CaptureType = 'up' | 'vol' | 'speed' | 'limit'

interface CaptureItem {
  type: CaptureType
  name: string
  detail: string
  time: string
}

// 情报来源类型
type SourceType = 'announce' | 'research' | 'news'

interface IntelItem {
  sourceType: SourceType
  title: string
  meta: string
  sentiment: 'positive' | 'negative' | 'neutral'
}

const intelSubTab = ref<'all' | 'positive' | 'negative'>('all')

const intelTabOptions = [
  { label: '全部', value: 'all' as const },
  { label: '利好', value: 'positive' as const },
  { label: '利空', value: 'negative' as const },
]

// 异动捕手 mock 数据
const captureList = ref<CaptureItem[]>([
  { type: 'limit', name: '舒泰神', detail: '涨停封板 · 封单金额12.3亿', time: '10:15' },
  { type: 'speed', name: '迈瑞医疗', detail: '急速下跌 · 3分钟跌幅4.2%', time: '13:45' },
  { type: 'vol', name: '恒瑞医药', detail: '异常放量 · 成交额超昨日全天', time: '13:58' },
  { type: 'up', name: '广生堂', detail: '快速拉升 · 5分钟涨幅8.5%', time: '14:32' },
])

// 个股情报 mock 数据
const intelList = ref<IntelItem[]>([
  { sourceType: 'announce', title: '恒瑞医药：PD-1新药获FDA批准上市', meta: '利好 · 2小时前', sentiment: 'positive' },
  { sourceType: 'research', title: '中金上调宁德时代目标价至320元', meta: '利好 · 4小时前', sentiment: 'positive' },
  { sourceType: 'news', title: '比亚迪：上半年新能源汽车销量同比增长38%', meta: '利好 · 6小时前', sentiment: 'positive' },
  { sourceType: 'announce', title: '药明康德：美国拟扩大对华生物制造限制', meta: '利空 · 1天前', sentiment: 'negative' },
  { sourceType: 'research', title: '某头部券商下调贵州茅台评级至"中性"', meta: '利空 · 2天前', sentiment: 'negative' },
])

const filteredIntelList = computed(() => {
  if (intelSubTab.value === 'all') return intelList.value
  return intelList.value.filter(item => item.sentiment === intelSubTab.value)
})

/** 首页预览最多显示4条，其余进入详情页查看 */
const MAX_PREVIEW = 4
const displayCaptureList = computed(() => captureList.value.slice(0, MAX_PREVIEW))
const displayIntelList = computed(() => filteredIntelList.value.slice(0, MAX_PREVIEW))

function badgeLabel(type: CaptureType): string {
  const map: Record<CaptureType, string> = { up: '涨', vol: '量', speed: '速', limit: '封' }
  return map[type]
}

function sourceLabel(type: SourceType): string {
  const map: Record<SourceType, string> = { announce: '公', research: '研', news: '新' }
  return map[type]
}

/** 异动捕手（新模块：自选股异动监控） */
function goAlertCatcher() {
  uni.navigateTo({ url: '/modules/favorites/pages/alert-catcher' })
}

/** 个股情报（原异动捕手/event-catcher，已改名） */
function goStockIntel() {
  uni.navigateTo({ url: '/modules/market/pages/event-catcher' })
}

/** 暴露给父组件（保留接口兼容性） */
defineExpose({
  currentStockIdx: computed(() => 0),
  totalCount: computed(() => captureList.value.length),
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.alert-content {
  background: $bg-color-grey;
}

.content-wrap {
  padding: $spacing-base;
}

/* ===== 模块通用 ===== */
.alert-module {
  margin-bottom: $spacing-base;
}

.module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-sm;
}

.module-title {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $text-color-title;
}

.module-more {
  font-size: $font-size-lg;
  color: $text-color-secondary;
}

/* ===== 异动捕手 ===== */
.capture-list {
  background: #ffffff;
  border-radius: $radius-base;
  padding: 0 $spacing-base;
  box-shadow: $shadow-card;
}

.capture-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm 0;
  border-bottom: 1rpx solid #f0f2f5;

  &:last-child { border-bottom: none; }
}

.capture-badge {
  width: 56rpx;
  height: 56rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.up { background: rgba(232, 70, 58, 0.1); }
  &.vol { background: rgba($brand-color, 0.1); }
  &.speed { background: rgba(39, 210, 191, 0.1); }
  &.limit { background: rgba(239, 170, 23, 0.1); }
}

.badge-text {
  font-size: 24rpx;
  font-weight: 700;

  .up & { color: #E8463A; }
  .vol & { color: $brand-color; }
  .speed & { color: #27D2BF; }
  .limit & { color: #EFAA17; }
}

.capture-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.capture-name {
  font-size: $font-size-base;
  font-weight: 500;
  color: $text-color-title;
}

.capture-detail {
  font-size: $font-size-sm;
  color: $text-color-secondary;
}

.capture-time {
  font-size: $font-size-sm;
  color: $text-color-tertiary;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

/* ===== 个股情报 ===== */
.intel-tabs {
  display: flex;
  gap: 8rpx;
}

.intel-tab {
  padding: 4rpx 16rpx;
  border-radius: $radius-pill;
  font-size: 22rpx;
  color: $text-color-secondary;
  background: $bg-color-grey;
}

.intel-tab--active {
  background: $brand-color;
  color: #ffffff;
}

.intel-list {
  background: #ffffff;
  border-radius: $radius-base;
  padding: 0 $spacing-base;
  box-shadow: $shadow-card;
}

.intel-item {
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;
  padding: $spacing-xs 0;
  border-bottom: 1rpx solid #f0f2f5;

  &:last-child { border-bottom: none; }
}

.intel-source {
  width: 56rpx;
  height: 56rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.announce { background: rgba($brand-color, 0.1); }
  &.research { background: rgba(39, 210, 191, 0.1); }
  &.news { background: rgba(239, 170, 23, 0.1); }
}

.source-text {
  font-size: 24rpx;
  font-weight: 700;

  .announce & { color: $brand-color; }
  .research & { color: #27D2BF; }
  .news & { color: #EFAA17; }
}

.intel-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.intel-title {
  font-size: $font-size-base;
  color: $text-color-title;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.intel-meta {
  font-size: $font-size-sm;
  color: $text-color-secondary;
}

/* ===== 空状态 ===== */
.empty-hint {
  padding: $spacing-lg 0;
  text-align: center;
}

.empty-text {
  font-size: $font-size-sm;
  color: $text-color-tertiary;
}
</style>
