<template>
  <view class="acv">
    <view class="acv-head">
      <text class="acv-title">大盘归因链</text>
      <text v-if="mock" class="acv-mock-tag">演示数据</text>
      <text class="acv-date">{{ displayDate }}</text>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="acv-state">
      <text class="acv-state-text">归因链加载中…</text>
    </view>

    <!-- 空态：无链（无板块驱动异动或尚未生成）不报错 -->
    <view v-else-if="chain === null" class="acv-state">
      <text class="acv-state-text">当日无主驱动归因链（无板块驱动异动或尚未生成）</text>
    </view>

    <template v-else>
      <!-- 大盘根 -->
      <view class="acv-root">
        <text class="acv-root-tag">大盘</text>
        <text class="acv-root-sum">{{ chain.root.summary || '今日无显著主因' }}</text>
        <text v-if="chain.root.index_pct != null" class="acv-pct" :class="pctCls(chain.root.index_pct)">
          {{ fmtPct(chain.root.index_pct) }}
        </text>
      </view>

      <!-- 板块分支（按 |pct| 降序，null 排末尾） -->
      <view class="acv-children">
        <view v-for="c in sortedChildren" :key="c.sector" class="acv-child">
          <view class="acv-child-row">
            <text class="acv-badge" :class="'rel-' + c.relation">{{ relText(c.relation) }}</text>
            <text class="acv-sec">{{ c.sector }}</text>
            <text v-if="c.pct != null" class="acv-pct" :class="pctCls(c.pct)">{{ fmtPct(c.pct) }}</text>
          </view>
          <!-- 每分支溯源一句话驱动卡 -->
          <view v-if="c.trace_summary" class="acv-driver">{{ c.trace_summary }}</view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  fetchAttributionChain,
  type AttributionChain,
  type AttributionChainChild
} from '../api/attributionChain'

const props = withDefaults(defineProps<{ date: string; mock?: boolean }>(), { mock: false })

/** 展示日期：沿用页面传入的交易日（YYYY-MM-DD） */
const displayDate = computed(() => props.date)

/**
 * 内置演示数据（mock=true 时渲染，供无链日/后端未生成时向老师演示）。
 * 语义与后端组装契约一致：大盘根一句话 + 多主驱动板块分支（relation/pct/trace_summary）。
 */
const MOCK_CHAIN: AttributionChain = {
  date: displayDate.value,
  root: {
    type: 'market',
    date: displayDate.value,
    summary: '半导体材料与券商走弱拖累大盘',
    index_pct: -1.2
  },
  children: [
    { sector: '半导体材料', relation: 'self_driven', pct: -3, trace_summary: '美对华设备出口限制落地，产业链避险' },
    { sector: '券商', relation: 'market_follow', pct: -0.8, trace_summary: '大盘情绪拖累，资金观望' }
  ]
}

const chain = ref<AttributionChain | null>(null)
const loading = ref(false)

onMounted(async () => {
  if (props.mock) {
    chain.value = MOCK_CHAIN
    return
  }
  loading.value = true
  try {
    // fetchAttributionChain 内部已 catch → null，此处仅兜底异常与 loading 结算
    chain.value = await fetchAttributionChain(displayDate.value)
  } catch (e) {
    console.error('[AttributionChainView] load failed:', e)
    chain.value = null
  } finally {
    loading.value = false
  }
})

/** relation 徽文案：自驱动 / 跟随大盘 / 关系未知 */
function relText(relation: AttributionChainChild['relation']): string {
  if (relation === 'self_driven') return '自驱动'
  if (relation === 'market_follow') return '跟随大盘'
  return '关系未知'
}

/** 带符号百分号：+3.0% / -1.2% / 0.0% */
function fmtPct(n: number): string {
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
}

/** 涨跌 class（A 股红涨绿跌；0 平灰） */
function pctCls(n: number): string {
  if (n > 0) return 'acv-up'
  if (n < 0) return 'acv-down'
  return 'acv-flat'
}

/** 板块分支展示序：按 |pct| 降序稳定排序；pct 为 null 的分支排末尾（保持原相对顺序） */
const sortedChildren = computed(() => {
  const list = [...(chain.value?.children ?? [])]
  const withPct = list.filter((c): c is AttributionChainChild & { pct: number } => c.pct != null)
  const withoutPct = list.filter((c) => c.pct == null)
  withPct.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
  return [...withPct, ...withoutPct]
})
</script>

<style lang="scss" scoped>
/* 外卡：白底描边圆角（与 modules/market 既有卡面一致：sl-row / SectorInsightCard） */
.acv {
  padding: $spacing-base;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-xl;
  box-shadow: $shadow-sm;
}

.acv-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: $spacing-sm;
}

.acv-title {
  font-size: $font-size-md;
  font-weight: 600;
  color: $text-color-title;
}

.acv-mock-tag {
  flex-shrink: 0;
  padding: 2rpx 12rpx;
  border-radius: $r-xs;
  background: $warning-bg;
  color: $warning;
  font-size: $font-size-xs;
  line-height: 1.6;
}

.acv-date {
  margin-left: auto;
  flex-shrink: 0;
  font-size: $font-size-sm;
  color: $ink-mute;
}

/* 加载中 / 空态：灰字居中 */
.acv-state {
  display: flex;
  justify-content: center;
  padding: 40rpx 0;
}

.acv-state-text {
  font-size: $font-size-sm;
  color: $ink-mute;
  line-height: 1.6;
  text-align: center;
}

/* 大盘根：浅底圆角卡，tag + 一句话 + 涨跌 */
.acv-root {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 20rpx 24rpx;
  background: $bg-soft;
  border-radius: $r-md;
}

.acv-root-tag {
  flex-shrink: 0;
  padding: 2rpx 12rpx;
  border-radius: $r-xs;
  background: $primary-50;
  color: $primary;
  font-size: $font-size-xs;
  font-weight: 600;
  line-height: 1.6;
}

.acv-root-sum {
  flex: 1;
  min-width: 0;
  font-size: $font-size-sm;
  color: $ink-soft;
  line-height: 1.6;
}

/* 板块分支区：与根卡之间留白，分支间细分隔线 */
.acv-children {
  display: flex;
  flex-direction: column;
  margin-top: $spacing-base;
}

.acv-child {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding-top: 18rpx;
}

.acv-child + .acv-child {
  border-top: 2rpx solid $line-soft;
  margin-top: 18rpx;
}

.acv-child-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

/* relation 徽：中性描边文字徽（方向语义交由涨跌 pct 表达，避免颜色双语义）；
   自驱动=墨色强调，跟随大盘=常规，关系未知=弱化灰 */
.acv-badge {
  flex-shrink: 0;
  padding: 2rpx 12rpx;
  border: 2rpx solid $line-strong;
  border-radius: $r-xs;
  color: $ink-soft;
  font-size: $font-size-xs;
  line-height: 1.6;
}

.acv-badge.rel-self_driven {
  color: $ink;
  border-color: $ink-soft;
  font-weight: 600;
}

.acv-badge.rel-unknown {
  color: $ink-faint;
  border-color: $line;
}

.acv-sec {
  flex: 1;
  min-width: 0;
  font-size: $font-size-base;
  font-weight: 600;
  color: $ink;
  line-height: 1.4;
}

/* 涨跌 pct：A 股红涨绿跌 */
.acv-pct {
  flex-shrink: 0;
  font-size: $font-size-sm;
  font-weight: 600;
  font-family: $font-mono;
}

.acv-up {
  color: $stock-up-color;
}

.acv-down {
  color: $stock-down-color;
}

.acv-flat {
  color: $ink-mute;
}

/* 溯源一句话驱动卡：浅蓝底（对齐 sl-trace 溯源横幅）灰字换行 */
.acv-driver {
  padding: 10rpx 14rpx;
  border-radius: $r-sm;
  background: $primary-50;
  font-size: $font-size-sm;
  color: $ink-soft;
  line-height: 1.6;
}
</style>
