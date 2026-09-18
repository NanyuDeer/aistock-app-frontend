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
    <view v-else-if="displayChain === null" class="acv-state">
      <text class="acv-state-text">当日无主驱动归因链（无板块驱动异动或尚未生成）</text>
    </view>

    <template v-else>
      <!-- 大盘根 -->
      <view class="acv-root">
        <text class="acv-root-tag">大盘</text>
        <text class="acv-root-sum">{{ displayChain.root.summary || '今日无显著主因' }}</text>
        <text v-if="displayChain.root.index_pct != null" class="acv-pct" :class="pctCls(displayChain.root.index_pct)">
          {{ fmtPct(displayChain.root.index_pct) }}
        </text>
      </view>

      <!-- 板块分支（按 |pct| 降序，null 排末尾） -->
      <view class="acv-children">
        <view v-for="c in sortedChildren" :key="c.sector" class="acv-child">
          <view class="acv-child-row">
            <text class="acv-badge" :class="'rel-' + c.relation">{{ relText(c.relation) }}</text>
            <!-- 板块级弱依据标记（child.extraction.weak=true，2026-09-17 R16）：
                 snapshot=纯异动兜底无归因理由 →「无归因依据」；candidate_claim →「依据较弱」；缺省不渲染 -->
            <text v-if="weakTextOf(c)" class="acv-weak">{{ weakTextOf(c) }}</text>
            <text class="acv-sec">{{ c.sector }}</text>
            <text v-if="c.pct != null" class="acv-pct" :class="pctCls(c.pct)">{{ fmtPct(c.pct) }}</text>
          </view>
          <!-- 每分支溯源一句话驱动卡 -->
          <view v-if="c.trace_summary" class="acv-driver">{{ c.trace_summary }}</view>
          <!-- 事件胶囊（spec §7.2 链树补事件节点）：**只展示「中台」来源**（2026-09-18 晚组长裁定
               「隐藏检索的新闻条」）—— 检索补漏来的多是行情综述/研报观点/栏目碎片；
               过滤后为空 → 整区不渲染（不占位），旧链无 events 行为不变 -->
          <view v-if="warehouseEvents(c).length" class="acv-events">
            <EventRefChip
              v-for="(ev, i) in warehouseEvents(c)"
              :key="`${i}-${ev.headline}`"
              :headline="ev.headline"
              :source="ev.source"
              :event-ref="ev.ref"
              @select="openEventRef"
            />
          </view>
          <!-- 板块原因链 3 段（2026-09-18）：触发 → 传导 → 结果，与大盘主因链同形；
               数据由页面首屏拉一次 sector-insight 索引传入，无数据 → 该分支不出入口（不占位） -->
          <template v-if="stageRowsOf(c).length">
            <view class="acv-more" @tap.stop="toggleStages(c)">
              <text class="acv-more-tx">{{ isStagesOpen(c) ? '收起' : '溯源过程' }}</text>
              <view class="acv-more-chev" :class="{ 'acv-more-chev--open': isStagesOpen(c) }" />
            </view>
            <view v-if="isStagesOpen(c)" class="acv-detail">
              <view v-for="(st, i) in stageRowsOf(c)" :key="i" class="acv-detail-st">
                <text class="acv-detail-k">{{ st.name }}</text>
                <text class="acv-detail-v">{{ st.text }}</text>
              </view>
            </view>
          </template>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AttributionChain, AttributionChainChild, AttributionChainEvent } from '@/shared/api/modules/attributionChain'
import { extractionWeakLabel, isUnconfirmedAttribution, type ReasonStageRow } from '@/shared/utils/sectorInsight'
import EventRefChip from './EventRefChip.vue'

/**
 * 大盘归因链视图（App 专属 wrapper）
 *
 * 2026-09-17 P3' Task 4.1：**改为受控组件**——链数据由页面侧拉取（`fetchAttributionChain`）
 * 后经 `chain` prop 传入。原因：市场洞见页需要同一份链做「主因卡排序 + marketLink 匹配」，
 * 组件内自拉会让页面拿不到链（两处重复请求/口径漂移）。空态/加载态仍由本组件承接
 * （loading prop / chain=null）；`:date` 仅作展示与 mock 数据日期。
 */
const props = withDefaults(defineProps<{
  /** 展示日期（YYYY-MM-DD），仅用于表头与 mock 演示数据构造 */
  date: string
  /** 链数据（页面侧拉取；null=无链 → 组件内空态） */
  chain?: AttributionChain | null
  /** 拉取中（页面侧传入） */
  loading?: boolean
  /** 演示模式：忽略 chain prop，渲染内置演示数据（本地/演示环境用，生产不传） */
  mock?: boolean
  /**
   * 每板块原因链 3 段（触发/传导/结果），键为 `ts_code` 或板块名（两种形态都查）。
   * 由页面侧首屏拉一次 `sector-insight` 后索引传入（组件不自己请求；无数据 → 该分支不出展开入口）。
   */
  sectorStages?: Record<string, ReasonStageRow[]>
}>(), {
  chain: null,
  loading: false,
  mock: false,
  sectorStages: () => ({})
})

/** 分支展开态（本地交互；键 = ts_code 优先 → 权威名 → 原始名，与板块名解析同序） */
const expandedKeys = ref<Set<string>>(new Set())

function keyOf(c: AttributionChainChild): string {
  return (c.ts_code ?? '').trim() || (c.sector_std ?? '').trim() || (c.sector ?? '').trim()
}

/**
 * 取该分支的板块原因链 3 段：`ts_code` → `sector_std` → 原始名逐级降级查表
 * （链节点命名会在权威名↔复盘原始名之间漂移，故三级都试）。
 */
function stageRowsOf(c: AttributionChainChild): ReasonStageRow[] {
  const map = props.sectorStages
  if (!map) return []
  const keys = [(c.ts_code ?? '').trim(), (c.sector_std ?? '').trim(), (c.sector ?? '').trim()]
  for (const k of keys) {
    if (k && map[k]?.length) return map[k]
  }
  return []
}

function isStagesOpen(c: AttributionChainChild): boolean {
  return expandedKeys.value.has(keyOf(c))
}

/** 展开/收起该分支的溯源过程（新建 Set 触发响应式：Set 原地增删不触发 ref 更新） */
function toggleStages(c: AttributionChainChild): void {
  const k = keyOf(c)
  if (!k) return
  const next = new Set(expandedKeys.value)
  if (next.has(k)) next.delete(k)
  else next.add(k)
  expandedKeys.value = next
}

/** 展示日期：沿用页面传入的交易日（YYYY-MM-DD） */
const displayDate = computed(() => props.date)

/**
 * 该分支可展示的事件胶囊（2026-09-18 晚组长裁定「隐藏检索的新闻条」）：
 * **只保留 `source === 'warehouse'`（中台）**，丢弃 `search`（板块定向检索补漏）——
 * 检索那批多是行情综述/研报观点/栏目碎片，是反复要求挡在链外的噪声。
 * 旧链无 events / 全被过滤 → 返回空数组 → 模板侧整区不渲染（不占位）。
 */
function warehouseEvents(c: AttributionChainChild): AttributionChainEvent[] {
  return (c.events ?? []).filter((ev) => ev.source === 'warehouse')
}

/**
 * 内置演示数据（mock=true 时渲染，供无链日/后端未生成时向老师演示）。
 * 按当前展示日期动态构造：date 切换时 date 字段同步更新，不残留旧日。
 * 语义与后端组装契约一致：大盘根一句话 + 多主驱动板块分支（relation/pct/trace_summary/events）。
 */
function buildMockChain(date: string): AttributionChain {
  return {
    date,
    root: {
      type: 'market',
      date,
      summary: '半导体材料与券商走弱拖累大盘',
      index_pct: -1.2
    },
    children: [
      { sector: '半导体材料', relation: 'self_driven', pct: -3, trace_summary: '美对华设备出口限制落地，产业链避险' },
      { sector: '券商', relation: 'market_follow', pct: -0.8, trace_summary: '大盘情绪拖累，资金观望' }
    ]
  }
}

/** 实际渲染的链：mock 模式用内置演示数据，否则用页面传入的链 */
const displayChain = computed<AttributionChain | null>(() => (props.mock ? buildMockChain(props.date) : props.chain))

/** relation 徽文案：自驱动 / 跟随大盘 / 关系未知 */
function relText(relation: AttributionChainChild['relation']): string {
  if (relation === 'self_driven') return '自驱动'
  if (relation === 'market_follow') return '跟随大盘'
  return '关系未知'
}

/** 板块级弱依据标记文案（2026-09-17 R16；口径单点在 sectorInsight.extractionWeakLabel） */
function weakTextOf(c: AttributionChainChild): string {
  return extractionWeakLabel(c.extraction)
}

/**
 * 带符号百分号：+3.0% / -1.2% / 0.0%。
 * 负零边界：toFixed(1) 对 -0.0/微小负值可能产出 '-0.0' → |n| < 0.05 统一归零显示
 * （与 pctCls 判平同口径，避免「显示 -0.0% 却判跌」的不一致）。
 */
function fmtPct(n: number): string {
  if (Math.abs(n) < 0.05) return '0.0%'
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
}

/** 涨跌 class（A 股红涨绿跌；舍入后为 0 判平灰——与 fmtPct 归零口径一致） */
function pctCls(n: number): string {
  if (Math.abs(n) < 0.05) return 'acv-flat'
  if (n > 0) return 'acv-up'
  return 'acv-down'
}

/**
 * 事件胶囊 → 事件原文：非 URL 引用不会触发本回调（EventRefChip 侧保证不可点）。
 * 跨端惯例同既有事件链页：H5 新标签打开，App/小程序走 webview 承载页。
 */
function openEventRef(url: string): void {
  if (!url) return
  // #ifdef H5
  window.open(url, '_blank', 'noopener')
  // #endif
  // #ifndef H5
  uni.navigateTo({ url: `/pages-sub-app/webview/index?url=${encodeURIComponent(url)}` })
  // #endif
}

/** 板块分支展示序：「未确认驱动原因」的分支先剔除（口径单点在 sectorInsight.isUnconfirmedAttribution）→
 *  按 |pct| 降序稳定排序；pct 为 null 的分支排末尾（保持原相对顺序）。
 *  2026-09-18 R17：摘要为空/中性未确认表述（如「未确认驱动原因」）的节点不是驱动原因（events 里多是行情综述），
 *  与市场洞见页主因卡列表同一过滤口径，避免"看起来已归因"。 */
const sortedChildren = computed(() => {
  const list = [...(displayChain.value?.children ?? [])].filter((c) => !isUnconfirmedAttribution(c.trace_summary))
  const withPct = list.filter((c): c is AttributionChainChild & { pct: number } => c.pct != null)
  const withoutPct = list.filter((c) => c.pct == null)
  withPct.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
  return [...withPct, ...withoutPct]
})
</script>

<style lang="scss" scoped>
/* 外卡：白底描边圆角（与既有 shared/market 卡面一致：sl-row / SectorInsightCard） */
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

/* 弱依据标记：中性灰描边小标（2026-09-17 R16 弱归因日；弱化呈现，刻意不用告警色/涨跌色） */
.acv-weak {
  flex-shrink: 0;
  padding: 2rpx 10rpx;
  border: 2rpx solid $line-strong;
  border-radius: $r-xs;
  color: $ink-mute;
  font-size: $font-size-xs;
  line-height: 1.6;
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

/* 链上事件胶囊区（spec §7.2 事件节点；胶囊样式见 EventRefChip） */
.acv-events {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

/* 溯源过程展开（2026-09-18）：与组件库 InsightCard「依据详情」同款交互与排布
   （右对齐文字入口 + 展开后「阶段名 | 文本」两列），保持全站洞见类展开一致 */
.acv-more {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8rpx;
  padding: 4rpx 0 0;

  &:active {
    opacity: 0.8;
  }
}

.acv-more-tx {
  font-size: $font-size-xs;
  color: $primary;
}

/* 展开箭头：右下三角，展开时翻转（与 InsightCard 同款） */
.acv-more-chev {
  width: 0;
  height: 0;
  border-left: 8rpx solid transparent;
  border-right: 8rpx solid transparent;
  border-top: 8rpx solid $primary;
  transition: transform 0.2s;

  &--open {
    transform: rotate(180deg);
  }
}

.acv-detail {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 10rpx;
  padding-top: 10rpx;
  border-top: 2rpx dashed $line-soft;
}

.acv-detail-st {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.acv-detail-k {
  flex: 0 0 72rpx;
  font-size: $font-size-xs;
  font-weight: 600;
  color: $ink-mute;
}

.acv-detail-v {
  flex: 1;
  min-width: 0;
  font-size: $font-size-xs;
  line-height: 1.6;
  color: $ink;
}
</style>
