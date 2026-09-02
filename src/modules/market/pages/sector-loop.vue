<template>
  <SubPageCard title="板块四环">
    <view class="sl-content">
      <!-- 日期回看（近 7 交易日横向胶囊；交易日历接口失败时回退单日今天，不渲染导航） -->
      <scroll-view v-if="tradingDays.length > 1" scroll-x class="sl-dates" :show-scrollbar="false">
        <view class="sl-dates__inner">
          <view
            v-for="day in tradingDays"
            :key="day"
            class="sl-date"
            :class="{ 'is-active': day === insightDate }"
            @tap="selectDate(day)"
          >
            <text class="sl-date__text">{{ dayLabel(day) }}</text>
          </view>
        </view>
      </scroll-view>

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

        <!-- 白卡列表行：左=板块名+来源tag，中=溯源+行情，右=预判概要 -->
        <view class="sl-list">
          <view v-for="row in rows" :key="row.key" class="sl-row" @tap="onRowTap(row)">
            <view class="sl-row__left">
              <text class="sl-row__name">{{ row.name }}</text>
              <view v-if="row.tag" class="sl-tag" :class="row.tag.cls">
                <text class="sl-tag__text">{{ row.tag.text }}</text>
              </view>
            </view>

            <view class="sl-row__mid">
              <text v-if="row.summary" class="sl-row__summary">{{ row.summary }}</text>
              <text v-if="row.pct" :class="['sl-row__pct', row.pct.cls]">{{ row.pct.text }}</text>
            </view>

            <view class="sl-row__right">
              <template v-if="row.pred">
                <view v-if="row.pred.pill" class="sl-pill" :class="row.pred.pill.cls">
                  <text class="sl-pill__text">{{ row.pred.pill.text }}</text>
                </view>
                <text v-if="row.pred.sub" :class="['sl-sub', row.pred.sub.cls]">{{ row.pred.sub.text }}</text>
              </template>
              <text v-else class="sl-sub sl-sub--muted">未预判</text>
            </view>
          </view>
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
import { todayDateStr } from '@/shared/utils/sectorInsight'

/** 回看窗口：近 7 个交易日（含当日若为交易日） */
const RECENT_DAYS = 7

const tradingDays = ref<string[]>([])
const insightDate = ref('')
const sectorInsight = ref<SectorInsightResponse | null>(null)
const loading = ref(false)
const error = ref(false)

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

async function selectDate(day: string) {
  if (!day || day === insightDate.value || loading.value) return
  insightDate.value = day
  await load(day)
}

function retry() {
  if (insightDate.value) void load(insightDate.value)
}

/** 日期胶囊文案：今天显示"今日"，其余 M/D（无前导零） */
function dayLabel(day: string): string {
  if (day === todayDateStr()) return '今日'
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
  return {
    key: c.ts_code,
    name: c.name,
    source: c.source,
    tag: tagModel(c),
    summary: c.trace?.summary ?? '',
    pct: pctModel(c),
    pred: predModel(c.prediction)
  }
}

const rows = computed<RowVM[]>(() => (sectorInsight.value?.candidates ?? []).map(buildRow))

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
  // 默认最近交易日（序列末位），有预设日期则优先
  const initial = preset || tradingDays.value[tradingDays.value.length - 1] || todayDateStr()
  insightDate.value = initial
  await load(initial)
})
</script>

<style lang="scss" scoped>
.sl-content {
  padding: 24rpx;
}

/* ===== 日期回看胶囊（横向滚动） ===== */
.sl-dates {
  width: 100%;
  white-space: nowrap;
  margin-bottom: 24rpx;
}

.sl-dates__inner {
  display: inline-flex;
  gap: 12rpx;
  padding: 4rpx 0;
}

.sl-date {
  flex-shrink: 0;
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  background: $bg-card;
  border: 2rpx solid $line;
}

.sl-date.is-active {
  background: rgba(11, 95, 255, 0.08);
  border-color: $primary;
}

.sl-date__text {
  font-size: $font-size-sm;
  color: $ink-soft;
}

.sl-date.is-active .sl-date__text {
  color: $primary;
  font-weight: 600;
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

.sl-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
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

/* 左区：板块名 + 来源 tag */
.sl-row__left {
  flex-shrink: 0;
  max-width: 200rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.sl-row__name {
  font-size: $font-size-md;
  font-weight: 600;
  color: $ink;
  line-height: 1.4;
}

.sl-tag {
  align-self: flex-start;
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

/* 中区：溯源短句 + 当日行情 */
.sl-row__mid {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.sl-row__summary {
  font-size: $font-size-xs;
  color: $ink-soft;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.sl-row__pct {
  font-size: $font-size-md;
  font-weight: 600;
  font-family: $font-mono;
}

/* 右区：预判概要 */
.sl-row__right {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
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
