<template>
  <SubPageCard title="板块四环">
    <view class="sl-content">
      <!-- 日期回看：近三个交易日按钮（准确日期）；更多→下拉选更早交易日 -->
      <view class="sl-datewrap">
        <view class="sl-datebar">
          <view
            v-for="d in recentThree"
            :key="d"
            class="sl-datebar__pill"
            :class="{ 'is-on': d === insightDate }"
            @tap="setInsight(d)"
          >
            <text class="sl-datebar__pill-text">{{ dayLabel(d) }}</text>
          </view>
          <view v-if="hasMoreDays" class="sl-datebar__pickwrap">
            <view class="sl-datebar__pill sl-datebar__more" @tap="pickerOpen = !pickerOpen">
              <text class="sl-datebar__pill-text">更多</text>
              <text class="sl-datebar__caret">▾</text>
            </view>
            <!-- 下拉（仅交易日；落在按钮下方；点外部关闭） -->
            <view v-if="pickerOpen" class="sl-dd-mask" @tap="pickerOpen = false"></view>
            <view v-if="pickerOpen" class="sl-sheet sl-sheet--dd">
              <view class="sl-sheet__hd">
                <text class="sl-sheet__title">选择交易日</text>
                <text v-if="hasToday" class="sl-sheet__action" @tap="jumpToday">回今天</text>
                <text v-else class="sl-sheet__action" @tap="pickerOpen = false">关闭</text>
              </view>
              <scroll-view scroll-y class="sl-sheet__list" :show-scrollbar="false">
                <view
                  v-for="d in sheetDays"
                  :key="d"
                  class="sl-sheet__item"
                  :class="{ 'is-active': d === insightDate }"
                  @tap="pickFromList(d)"
                >
                  <text class="sl-sheet__item-date">{{ d }}</text>
                  <text v-if="d === insightDate" class="sl-sheet__item-mark">✓</text>
                  <text v-else-if="d === todayStr" class="sl-sheet__item-mark is-today">今日</text>
                </view>
              </scroll-view>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载中（首载 / 切日） -->
      <view v-if="loading" class="sl-state">
        <LoadingState text="正在加载板块四环数据..." />
      </view>

      <!-- 加载失败：可重试 -->
      <Card v-else-if="error" class="sl-state-card">
        <EmptyState title="板块四环加载失败" description="请检查网络连接后重新加载">
          <Button size="sm" @click="retry">重新加载</Button>
        </EmptyState>
      </Card>

      <!-- 空态：该日无板块溯源/预判（20:30 前主因未产出属正常） -->
      <view v-else-if="!rows.length" class="sl-state-card">
        <EmptyState title="该日暂无板块溯源/预判" description="收盘后数据更全（20:30 前主因未产出属正常）" />
      </view>

      <template v-else>
        <!-- 大盘归因链路条：上证 {跌/涨} → 主因板块（-x%）；仅主因候选（review_primary/both）且带行情时展示 -->
        <view v-if="chain" class="sl-chain" @tap="tapChain">
          <text class="sl-chain__text">
            <text class="sl-chain__lead">上证</text>
            <text class="sl-chain__dir" :class="chain.dir.cls">{{ chain.dir.text }}</text>
            <text class="sl-chain__arrow-sep">→</text>
            <text class="sl-chain__name">{{ chain.name }}</text>
            <text class="sl-chain__pct" :class="chain.pct.cls">（{{ chain.pct.text }}）</text>
          </text>
          <text class="sl-chain__go">›</text>
        </view>

        <!-- 卡片列表：大盘溯源·主因置顶分组；行内展开预判（复用共享条件化预判块格式） -->
        <view class="sl-list">
          <template v-for="(row, idx) in rows" :key="row.key">
            <view v-if="row.isPrimary" class="sl-group-title">大盘溯源 · 主因板块</view>
            <view v-else-if="idx > 0 && rows[idx - 1].isPrimary" class="sl-group-title">风口板块（长线）</view>

            <view
              class="sl-row"
              :class="{ 'sl-row--primary': row.isPrimary }"
              @tap="onRowTap(row)"
            >
              <view class="sl-row__head">
                <!-- 第 1 行：板块名 + 当日涨跌 + 方向 pill（全部同行） -->
                <view class="sl-row__mainline">
                  <view class="sl-row__namewrap">
                    <text class="sl-row__name">{{ row.name }}</text>
                    <text v-if="row.pct" :class="['sl-row__pct', row.pct.cls]">{{ row.pct.text }}</text>
                  </view>
                  <view v-if="row.pred?.pill" class="sl-row__right">
                    <view class="sl-pill" :class="row.pred.pill.cls">
                      <text class="sl-pill__text">{{ row.pred.pill.text }}</text>
                    </view>
                  </view>
                </view>

                <!-- 第 2 行：来源 tag；验证/日期副文案靠卡片右侧 -->
                <view class="sl-row__subline">
                  <view v-if="row.tag" class="sl-tag" :class="row.tag.cls">
                    <text class="sl-tag__text">{{ row.tag.text }}</text>
                  </view>
                  <text
                    v-if="row.pred?.sub"
                    :class="['sl-sub', 'sl-sub--right', row.pred.sub.cls]"
                  >{{ row.pred.sub.text }}</text>
                  <text v-else-if="!row.pred" class="sl-sub sl-sub--muted sl-sub--right">未预判</text>
                </view>
              </view>

              <!-- 溯源横幅（对齐洞见卡溯源样式，展示在预判上方） -->
              <view v-if="row.summary" class="sl-trace">
                <text class="sl-trace__key">溯源</text>
                <text class="sl-trace__text">{{ row.summary }}</text>
              </view>

              <!-- 预判详情区：复用组件库条件化预判格式（分支/期段/点亮），行样式白卡 -->
              <view v-if="row.structured" class="sl-row__fc" @tap.stop>
                <ConditionalForecastBlock :structured="row.structured" />
              </view>
            </view>
          </template>
        </view>
      </template>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { agentApi } from '@/shared/api/modules/agent'
import type {
  SectorInsightCandidate,
  SectorInsightResponse,
  SectorInsightPrediction
} from '@/shared/api/modules/agent'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import { LoadingState, EmptyState, Button, Card } from '@/shared/components'
import ConditionalForecastBlock from '@/shared/components/ConditionalForecastBlock.vue'
import { todayDateStr, sectorPredictionToStructured } from '@/shared/utils/sectorInsight'
import type { SectorStructuredForecast } from '@/shared/utils/sectorInsight'

/** 回看窗口：近 20 个交易日（含当日若为交易日），供步进与日期列表回看 */
const RECENT_DAYS = 20

const todayStr = todayDateStr()

const tradingDays = ref<string[]>([])
const insightDate = ref('')
const sectorInsight = ref<SectorInsightResponse | null>(null)
const loading = ref(false)
const error = ref(false)

/** 日期选择浮层开关 */
const pickerOpen = ref(false)

/** 交易日序列统一按升序（接口可能返回降序，此处归一化，YYYY-MM-DD 字典序=时间序） */
const ascDays = computed(() => [...tradingDays.value].sort())

/** 列表展示用：新→旧倒序（基于升序归一） */
const sheetDays = computed(() => [...ascDays.value].reverse())

/** 近三个交易日（新→旧 展示序：9/3 · 9/2 · 9/1） */
const recentThree = computed(() => [...ascDays.value.slice(-3)].reverse())

/** 交易日多于 3 天时展示“更多”下拉入口 */
const hasMoreDays = computed(() => ascDays.value.length > 3)
const hasToday = computed(() => ascDays.value.includes(todayStr))

/** 进入数据切换（日期按钮/下拉共用） */
function setInsight(day: string) {
  if (!day || day === insightDate.value || loading.value) return
  insightDate.value = day
  void load(day)
}

/** 下拉列表选择：关闭浮层 → 加载 */
function pickFromList(day: string) {
  pickerOpen.value = false
  if (!day) return
  setInsight(day)
}

/** 一键回今天 */
function jumpToday() {
  pickFromList(todayStr)
}

/** 拉取可回看日期序列（近 7 交易日，末位最近）；失败回退单日今天 */
async function loadTradingDays() {
  try {
    const days = await agentApi.getRecentTradingDays(todayDateStr(), RECENT_DAYS)
    if (Array.isArray(days) && days.length) {
      tradingDays.value = days
      return
    }
  } catch (e) {
    console.error('[sector-loop] 交易日历加载失败:', e)
  }
  tradingDays.value = [todayDateStr()]
}

/** 按日拉取板块四环聚合；异常置 error（可重试），不抛出 */
async function load(date: string) {
  loading.value = true
  error.value = false
  sectorInsight.value = null
  try {
    sectorInsight.value = await agentApi.getSectorInsight(date)
  } catch (e) {
    console.error(`[sector-loop] ${date} 板块四环加载失败:`, e)
    error.value = true
  } finally {
    loading.value = false
  }
}

function retry() {
  if (insightDate.value) void load(insightDate.value)
}

/** 日期按钮文案：M/D 准确日期（无前导零） */
function dayLabel(day: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!m) return day
  return `${Number(m[2])}/${Number(m[3])}`
}

/* ===== 行展示模型（模板零逻辑，全部在此预计算） ===== */
interface PillModel { text: string; cls: string }
interface PredModel { pill: PillModel | null; sub: PillModel | null }
interface RowVM {
  key: string
  name: string
  source: SectorInsightCandidate['source']
  tag: PillModel | null
  summary: string
  pct: PillModel | null
  pred: PredModel | null
  /** 大盘溯源主因候选（review_primary/both）——置顶分组 */
  isPrimary: boolean
  /** 预判结构化数据（存在分支/期段才渲染详情块） */
  structured: SectorStructuredForecast | null
}

/** 来源 tag：wind_leader→风口(蓝) / review_primary→大盘主因(红) / both→风口 · 主因(红) */
function tagModel(c: SectorInsightCandidate): PillModel | null {
  if (c.source === 'wind_leader') return { text: '风口', cls: 'sl-tag--blue' }
  if (c.source === 'review_primary') return { text: '大盘主因', cls: 'sl-tag--red' }
  return { text: '风口 · 主因', cls: 'sl-tag--red' }
}

/** 当日行情：pct_change 存在才显示（红涨绿跌；0 灰） */
function pctModel(c: SectorInsightCandidate): PillModel | null {
  const pct = c.quote?.pct_change
  if (typeof pct !== 'number' || !Number.isFinite(pct)) return null
  const text = `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`
  const cls = pct > 0 ? 'c-up' : pct < 0 ? 'c-down' : 'c-flat'
  return { text, cls }
}

/** 预判概要：方向 pill + 验证/置信 sub；无有效内容返回 null（行显示"未预判"） */
function predModel(p: SectorInsightPrediction | null | undefined): PredModel | null {
  if (!p?.present) return null
  let pill: PillModel | null = null
  if (p.direction === 'bullish') pill = { text: '看多', cls: 'sl-pill--up' }
  else if (p.direction === 'bearish') pill = { text: '看空', cls: 'sl-pill--down' }
  else if (p.direction === 'neutral') pill = { text: '震荡', cls: 'sl-pill--flat' }

  let sub: PillModel | null = null
  const v = p.verification
  if (v === 'hit') sub = { text: '已验证·命中', cls: 'sl-sub--hit' }
  else if (v === 'miss') sub = { text: '已验证·未中', cls: 'sl-sub--miss' }
  else if (v === 'pending') sub = { text: p.dueLabel ? `待验证 ${p.dueLabel}` : '待验证', cls: 'sl-sub--muted' }
  else if (p.confidence) {
    const text = { high: '高置信', medium: '中置信', low: '低置信' }[p.confidence]
    sub = { text, cls: 'sl-sub--muted' }
  }
  if (!pill && !sub) return null
  return { pill, sub }
}

function buildRow(c: SectorInsightCandidate): RowVM {
  const isPrimary = c.source === 'review_primary' || c.source === 'both'
  const structured = sectorPredictionToStructured(c.prediction)
  return {
    key: c.ts_code,
    name: c.name,
    source: c.source,
    tag: tagModel(c),
    summary: c.trace?.summary ?? '',
    pct: pctModel(c),
    pred: predModel(c.prediction),
    isPrimary,
    // 仅当预判含期段/分支时渲染条件化预判块，避免空块（纯概要行保持轻量）
    structured: structured && (structured.horizons?.length || structured.conditions?.length) ? structured : null
  }
}

/** 行序：大盘溯源主因置顶，其余风口板块保持原序 */
const rows = computed<RowVM[]>(() => {
  const list = (sectorInsight.value?.candidates ?? []).map(buildRow)
  return [...list.filter((r) => r.isPrimary), ...list.filter((r) => !r.isPrimary)]
})

/** 主因候选（首个 review_primary/both）——归因链与"仅主因"行跳转共用 */
const primaryRow = computed<RowVM | null>(() => {
  const c = (sectorInsight.value?.candidates ?? []).find(
    (x) => x.source === 'review_primary' || x.source === 'both'
  )
  return c ? buildRow(c) : null
})

/** 大盘归因链：上证 {涨/跌} → {主因板块名}（±x%）；主因缺行情时不显示该条 */
const chain = computed<{ name: string; dir: PillModel; pct: PillModel } | null>(() => {
  const row = primaryRow.value
  if (!row?.pct) return null
  const isUp = row.pct.cls === 'c-up'
  const isDown = row.pct.cls === 'c-down'
  const dir: PillModel = isUp
    ? { text: '涨', cls: 'c-up' }
    : isDown
      ? { text: '跌', cls: 'c-down' }
      : { text: '平', cls: 'c-flat' }
  return { name: row.name, dir, pct: row.pct }
})

/** 点击分流：风口（wind_leader/both）→ 板块详情（风口榜才有行情）；仅大盘主因 → 大盘溯源页 */
function onRowTap(row: RowVM) {
  if (!row) return
  if (row.source === 'wind_leader' || row.source === 'both') {
    uni.navigateTo({ url: `/modules/market/pages/sector-detail?name=${encodeURIComponent(row.name)}` })
    return
  }
  // review_primary-only：板块不在风口榜、无板块行情页；traceability 不支持 date 入参 → 不带参跳转
  uni.navigateTo({ url: '/modules/analytics/pages/traceability' })
}

function tapChain() {
  const row = primaryRow.value
  if (row) onRowTap(row)
}

onLoad(async (options) => {
  await loadTradingDays()
  // 上游（大盘溯源页）可带 date 指定回看日：不在近 7 日序列则并入（升序），保持可选
  const preset = typeof options?.date === 'string' && options.date ? options.date : ''
  if (preset && !tradingDays.value.includes(preset)) {
    tradingDays.value = [...tradingDays.value, preset].sort()
  }
  // 页面默认选最近交易日（升序末位）；更多下拉可回看更早交易日
  const initial = preset || ascDays.value[ascDays.value.length - 1] || todayDateStr()
  insightDate.value = initial
  await load(initial)
})
</script>

<style lang="scss" scoped>
.sl-content {
  padding: 24rpx;
}

/* ===== 日期回看：今日 / 昨天 胶囊 + “日期 ▾”下拉 ===== */
.sl-datewrap {
  position: relative;
  margin-bottom: 24rpx;
}

.sl-datebar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12rpx;
}

.sl-datebar__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  flex: none;
  width: 140rpx;
  padding: 10rpx 0;
  border-radius: 999rpx;
  background: $bg-card;
  border: 2rpx solid $line;

  &:active {
    opacity: 0.75;
  }
}

.sl-datebar__pill.is-on {
  color: $primary;
  background: rgba(11, 95, 255, 0.08);
  border-color: $primary;
}

.sl-datebar__pill.is-static {
  cursor: default;
  pointer-events: none;
}

.sl-datebar__pill-text {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $ink;
}

.sl-datebar__pill.is-on .sl-datebar__pill-text {
  color: $primary;
}

.sl-datebar__caret {
  font-size: $font-size-xs;
  color: $primary;
}

/* 第三个下拉按钮（与日期按钮等宽；含绝对定位窄下拉） */
.sl-datebar__pickwrap {
  position: relative;
  flex: none;
  width: 140rpx;
  min-width: 0;
  display: flex;
}

.sl-datebar__pickwrap .sl-datebar__pill {
  width: 100%;
}

/* ===== 日期下拉（absolute，紧随日期胶囊下方；mask 负责点外部关闭） ===== */
.sl-dd-mask {
  position: fixed;
  inset: 0;
  z-index: 90;
}

.sl-sheet--dd {
  position: absolute;
  top: calc(100% + 8rpx);
  right: 0;
  left: auto;
  width: 300rpx;
  z-index: 91;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
  padding: 8rpx 20rpx 14rpx;
  box-shadow: 0 8rpx 28rpx rgba(16, 24, 40, 0.12);
  display: flex;
  flex-direction: column;
  max-height: 60vh;
  overflow: hidden;
}

.sl-sheet__hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4rpx 4rpx 20rpx;
}

.sl-sheet__title {
  font-size: $font-size-md;
  font-weight: 600;
  color: $ink;
}

.sl-sheet__action {
  font-size: $font-size-sm;
  color: $primary;
  padding: 8rpx 12rpx;
}

.sl-sheet__list {
  height: 44vh;
  overflow: hidden;
}

.sl-sheet__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 18rpx;
  border-radius: $r-sm;
}

.sl-sheet__item + .sl-sheet__item {
  border-top: 2rpx solid rgba(23, 43, 77, 0.06);
}

.sl-sheet__item.is-active {
  background: rgba(11, 95, 255, 0.08);
}

.sl-sheet__item-date {
  font-size: $font-size-sm;
  color: $ink;
}

.sl-sheet__item.is-active .sl-sheet__item-date {
  color: $primary;
  font-weight: 600;
}

.sl-sheet__item-mark {
  font-size: $font-size-xs;
  color: $primary;
}

.sl-sheet__item-mark.is-today {
  color: $stock-up-color;
}

/* ===== 状态区 ===== */
.sl-state {
  padding: 40rpx 0;
}

.sl-state-card {
  margin-top: 8rpx;
}

/* ===== 大盘归因链路条 ===== */
.sl-chain {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 20rpx;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
  box-shadow: $shadow-sm;

  &:active {
    background: $bg-soft;
  }
}

.sl-chain__text {
  font-size: $font-size-base;
  line-height: 1.5;
  flex: 1;
  min-width: 0;
}

.sl-chain__lead {
  color: $ink;
  font-weight: 600;
}

.sl-chain__dir {
  font-weight: 600;
}

.sl-chain__arrow-sep {
  color: $ink-mute;
  margin: 0 4rpx;
}

.sl-chain__name {
  color: $ink;
  font-weight: 600;
}

.sl-chain__pct {
  font-weight: 600;
}

.sl-chain__go {
  font-size: 36rpx;
  color: $ink-mute;
  flex-shrink: 0;
}

/* ===== 列表 ===== */
.sl-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* ===== 分组标题 ===== */
.sl-group-title {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $ink-soft;
  padding: 4rpx 8rpx 0;
}

/* ===== 卡片行 ===== */
.sl-row {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 24rpx 28rpx;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-lg;
  box-shadow: $shadow-sm;
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.98);
  }
}

/* 大盘溯源·主因：置顶首卡 + 红强调描边 */
.sl-row--primary {
  border-color: rgba(229, 77, 94, 0.35);
  box-shadow: 0 4rpx 20rpx rgba(229, 77, 94, 0.08);
}

/* 预判详情区（条件化预判块，占满卡宽） */
.sl-row__fc {
  min-width: 0;
}

/* 头行（最多两行）：第 1 行 板块名+涨跌 | 右预判概要；第 2 行 来源 tag+溯源 */
.sl-row__head {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.sl-row__mainline {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

/* 板块名 + 涨跌同行：名过长单行省略（如 共封装光学(CPO)），不挤占换行 */
.sl-row__namewrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 10rpx;
}

.sl-row__name {
  flex: 0 1 auto;
  min-width: 0;
  font-size: $font-size-md;
  font-weight: 600;
  color: $ink;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sl-row__pct {
  flex-shrink: 0;
  font-size: $font-size-sm;
  font-weight: 600;
  font-family: $font-mono;
}

.sl-tag {
  align-self: flex-start;
  flex-shrink: 0;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}

.sl-tag--blue {
  color: $primary;
  background: rgba(11, 95, 255, 0.08);
}

.sl-tag--red {
  color: $stock-up-color;
  background: $up-bg;
}

.sl-tag__text {
  font-size: $font-size-xs;
  font-weight: 500;
  line-height: 1.6;
}

.sl-row__subline {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-width: 0;
}

/* 溯源横幅（对齐洞见卡溯源样式：浅蓝底 + 溯源 key） */
.sl-trace {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  padding: 10rpx 14rpx;
  border-radius: $r-sm;
  background: $primary-50;
  border: 1rpx solid rgba(11, 95, 255, 0.12);
}

.sl-trace__key {
  flex-shrink: 0;
  font-size: $font-size-xs;
  font-weight: 600;
  color: $primary;
  line-height: 1.6;
}

.sl-trace__text {
  flex: 1;
  min-width: 0;
  font-size: $font-size-xs;
  color: $ink-soft;
  line-height: 1.6;
}

/* 右区（第 1 行方向 pill）：与板块名同行右端 */
.sl-row__right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.sl-pill {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-size: $font-size-xs;
  line-height: 1.4;
  font-weight: 600;
}

.sl-pill--up {
  color: $stock-up-color;
  background: $up-bg;
}

.sl-pill--down {
  color: $stock-down-color;
  background: $down-bg;
}

.sl-pill--flat {
  color: $ink-mute;
  background: $bg-soft;
}

.sl-sub {
  font-size: $font-size-xs;
  line-height: 1.4;
  white-space: nowrap;
}

.sl-sub--right {
  margin-left: auto;
  white-space: nowrap;
  flex-shrink: 0;
}

.sl-sub--hit {
  color: $stock-down-color;
}

.sl-sub--miss {
  color: $stock-up-color;
}

.sl-sub--muted {
  color: $ink-mute;
}

/* 涨跌通用色（A股红涨绿跌） */
.c-up {
  color: $stock-up-color;
}

.c-down {
  color: $stock-down-color;
}

.c-flat {
  color: $ink-mute;
}
</style>
