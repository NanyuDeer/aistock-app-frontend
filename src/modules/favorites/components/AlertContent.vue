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
          <ListCell
            v-for="(item, idx) in displayCaptureList"
            :key="idx"
            :title="item.name"
            :description="item.detail"
          >
            <template #prefix>
              <Tag :type="captureTagType(item.type)" size="sm">{{ badgeLabel(item.type) }}</Tag>
            </template>
            <template #value>
              <text class="capture-time">{{ item.time }}</text>
            </template>
          </ListCell>
          <EmptyState v-if="!captureList.length" title="暂无异动数据" />
        </view>
      </view>

      <!-- 个股情报模块（原StockMonitor，原异动捕手改名） -->
      <view class="alert-module">
        <view class="module-header" @tap="goStockIntel">
          <text class="module-title">个股情报</text>
          <!-- 全部/利好/利空 切换标签 -->
          <view class="intel-tabs" @tap.stop>
            <Segmented :model-value="intelSubTab" :items="intelTabItems" @change="onIntelTabChange" />
          </view>
        </view>
        <view class="intel-list">
          <ListCell
            v-for="(item, idx) in displayIntelList"
            :key="idx"
            :title="item.title"
            :description="item.meta"
          >
            <template #prefix>
              <Tag :type="sourceTagType(item.sourceType)" size="sm">{{ sourceLabel(item.sourceType) }}</Tag>
            </template>
          </ListCell>
          <EmptyState v-if="!filteredIntelList.length" title="暂无情报数据" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Segmented from '@/shared/components/Segmented.vue'
import ListCell from '@/shared/components/ListCell.vue'
import Tag from '@/shared/components/Tag.vue'
import EmptyState from '@/shared/components/EmptyState.vue'

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

const intelTabItems = [
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

/** 异动类型 → Tag type：涨→up(红)，量→neutral(蓝)，速→gold，封→warning(橙) */
function captureTagType(type: CaptureType): 'up' | 'neutral' | 'gold' | 'warning' {
  switch (type) {
    case 'up': return 'up'
    case 'vol': return 'neutral'
    case 'speed': return 'gold'
    case 'limit': return 'warning'
  }
}

/** 情报来源 → Tag type：公告→neutral(蓝)，研报→gold，新闻→warning(橙) */
function sourceTagType(type: SourceType): 'neutral' | 'gold' | 'warning' {
  switch (type) {
    case 'announce': return 'neutral'
    case 'research': return 'gold'
    case 'news': return 'warning'
  }
}

/** Segmented 的 change 回调（emit string|number），收敛回窄联合类型 */
function onIntelTabChange(val: string | number) {
  intelSubTab.value = val as 'all' | 'positive' | 'negative'
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
.alert-content {
  background: $bg-soft;
}

.content-wrap {
  padding: $s-3;
}

/* ===== 模块通用 ===== */
.alert-module {
  margin-bottom: $s-3;
}

.module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $s-2;
}

.module-title {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $ink;
}

.module-more {
  font-size: $font-size-lg;
  color: $ink-soft;
}

/* ===== 异动捕手 / 个股情报 列表卡片容器 ===== */
.capture-list,
.intel-list {
  background: $bg-card;
  border-radius: $r-md;
  padding: 0 $s-3;
  box-shadow: $shadow-sm;
  overflow: hidden;
}

.capture-time {
  font-size: $font-size-sm;
  color: $ink-mute;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.intel-tabs {
  display: flex;
}
</style>
