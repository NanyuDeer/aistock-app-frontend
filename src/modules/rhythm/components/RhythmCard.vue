<template>
  <view class="rhythm-card">
    <!-- 标题行：卡片标题 + 三时点 slot 标注 -->
    <view class="rc-head">
      <text class="rc-title">{{ title }}</text>
      <text class="rc-slot" v-if="slot">{{ slotLabel }}</text>
    </view>

    <!-- 主档位卡：大数字 + 档位 chip + 仓位倾向 + 五档色带刻度 + target/basis/refresh 元信息 -->
    <view class="rc-main" v-if="card.position_band">
      <view class="rc-bandline">
        <text class="rc-score" v-if="card.score != null">{{ card.score }}</text>
        <text class="rc-level" :class="levelMeta.cls" v-if="levelMeta.label">{{ levelMeta.label }}</text>
        <!-- G2 背离纪律：冲突时隐藏确定性仓位建议，只出区间与提示（design-debate A3/N4） -->
        <text class="rc-pos" v-if="card.position_band.text && !card.conflict">{{ card.position_band.text }}</text>
      </view>
      <view class="rc-scale">
        <view v-for="(s, i) in bandSegs" :key="i" class="rc-seg" :class="s.cls"></view>
      </view>
      <view class="rc-labels">
        <text v-for="(l, i) in bandLabels" :key="i" class="rc-lab" :class="{ on: levelMeta.idx === i }">{{ l }}</text>
      </view>
      <view class="rc-meta" v-if="targetDate || basisDate || refreshSlot">
        <text v-if="targetDate">target {{ targetDate }}</text>
        <text v-if="basisDate">basis {{ basisDate }}</text>
        <text v-if="refreshSlot">{{ refreshSlotLabel }}</text>
      </view>
    </view>

    <!-- 情绪周期：阶段 chip（缺失时兜底"数据缺失（沿用前值）"，G3 实验性判定） -->
    <view class="rc-sec" v-if="showPhase">
      <text class="rc-sec-title">情绪周期</text>
      <view class="rc-phase-row">
        <text class="rc-chip" :class="phaseMeta.cls">{{ phaseLabel }}</text>
        <text class="rc-exp">实验性判定</text>
      </view>
      <text class="rc-phase-ev" v-if="phaseEvidenceText">{{ phaseEvidenceText }}</text>
    </view>

    <!-- 近 7 日情绪温度迷你曲线（渐变柱 + 数值 + 日期） -->
    <view class="rc-sec" v-if="card.temperature_series && card.temperature_series.length">
      <text class="rc-sec-title">近 7 日情绪温度</text>
      <view class="rc-temp-bars">
        <view v-for="(t, i) in card.temperature_series" :key="i" class="rc-temp-col">
          <view class="rc-temp-bar" :style="{ height: tempBarHeight(t.score) }"></view>
          <text class="rc-tval">{{ tempValue(t.score) }}</text>
          <text class="rc-temp-date">{{ t.date.slice(5) }}</text>
        </view>
      </view>
    </view>

    <!-- 信号背离提示：只出区间 + 提示，不输出单一档（G2） -->
    <view class="rc-conflict" v-if="card.conflict">
      <text>{{ card.conflict_detail || '信号背离，仅提供区间与提示' }}</text>
    </view>

    <!-- 事件日历（自 target_date 起 ≤5 交易日；空态两态区分 G7） -->
    <view class="rc-sec">
      <text class="rc-sec-title">未来 5 交易日事件日历</text>
      <!-- 下一重大事件锚点（design-debate P1：无锚点整块不渲染） -->
      <view class="rc-anchor" v-if="card.next_event_anchor">
        <text class="rc-anchor-label">下一重大事件</text>
        <text class="rc-anchor-title">{{ card.next_event_anchor.title }}</text>
        <text class="rc-anchor-note">{{ card.next_event_anchor.note }}（{{ card.next_event_anchor.event_date }}）</text>
      </view>
      <view class="rc-evlist" v-if="card.event_window && card.event_window.length">
        <view class="rc-evit" v-for="(ev, i) in card.event_window" :key="i">
          <text class="rc-evd">{{ ev.date }}</text>
          <text class="rc-evtag">{{ eventTypeLabel(ev.type) }}</text>
          <text class="rc-evimp" :class="importanceCls(ev.importance)">{{ ev.importance }}</text>
          <text class="rc-evtitle">{{ ev.title }}</text>
        </view>
      </view>
      <view class="rc-empty" v-else-if="card.event_source_missing">
        <text>该维度数据源未接入</text>
      </view>
      <view class="rc-empty" v-else>
        <text>今日无事件（正常交易日）</text>
      </view>
    </view>

    <!-- 事件前置提示：未来 high 级事件，不改主档位（§7.1 事件前置纪律 / 验收 3） -->
    <view class="rc-hint" v-if="card.event_high_hint"><text>{{ card.event_high_hint }}</text></view>

    <!-- 关键节点分支（≤3：技术点位 ∪ 事件节点，点位由 engine 确定性计算，G19） -->
    <view class="rc-sec" v-if="card.branches && card.branches.length">
      <text class="rc-sec-title">关键节点分支</text>
      <view class="rc-branch" v-for="(b, i) in card.branches" :key="i">
        <!-- 触发条件：如"收盘站上 3994 压力位"（engine 注入，G19） -->
        <text class="rc-branch-cond">{{ branchCondText(b) }}</text>
        <view class="rc-branch-concl">
          <text class="rc-dir" :class="directionMeta(b).cls">{{ directionMeta(b).label }}</text>
          <!-- 目标参考区间：触发后的目标空间（design-debate A1：锚定突破后空间，非触发条件本身） -->
          <view class="rc-range-row" v-if="b.conclusion.range">
            <text class="rc-range-tag">目标区间</text>
            <text class="rc-range">{{ b.conclusion.range }}</text>
          </view>
          <text class="rc-note">{{ branchNoteText(b) }}</text>
        </view>
      </view>
      <!-- 点位来源脚注（design-debate A2/A4：直引公式，消除"为什么是压力/支撑"困惑） -->
      <view class="rc-footnote" v-if="showFootnote">
        支撑位 = 近 20 日最低价 与 20 日均线×0.97 取较大者；压力位 = 近 20 日最高价 与 20 日均线×1.03 取较小者（以当日收盘数据计算）
      </view>
    </view>

    <!-- 数据缺失标注（如实展示降权/沿用前值） -->
    <view class="rc-missing" v-if="card.data_missing && card.data_missing.length">
      <text v-for="(m, i) in card.data_missing" :key="i" class="rc-missing-item">{{ m }}</text>
    </view>

    <!-- 免责横幅（恒在，§7.2） -->
    <view class="rc-disclaimer">本页内容为研究参考，不构成任何投资建议，据此操作风险自担。</view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RhythmBranch, RhythmCard as RhythmCardData } from '@/shared/api/modules/agent'

const props = withDefaults(
  defineProps<{
    card: RhythmCardData
    title?: string
    slot?: string
    targetDate?: string
    basisDate?: string
    refreshSlot?: string
  }>(),
  { title: '节奏状态卡', slot: '', targetDate: '', basisDate: '', refreshSlot: '' },
)

// ── 档位（五档语义复用 sentiment_level：冰点/低迷/常温/活跃/亢奋）──
const LEVEL_META: Record<string, { label: string; idx: number; cls: string }> = {
  ice: { label: '冰点', idx: 0, cls: 'lv-ice' },
  low: { label: '低迷', idx: 1, cls: 'lv-low' },
  normal: { label: '常温', idx: 2, cls: 'lv-normal' },
  active: { label: '活跃', idx: 3, cls: 'lv-active' },
  euphoria: { label: '亢奋', idx: 4, cls: 'lv-euphoria' },
}
const BAND_LABELS = ['冰点', '低迷', '常温', '活跃', '亢奋']
const BAND_SEG_CLS = ['seg-ice', 'seg-low', 'seg-normal', 'seg-active', 'seg-euphoria']

const levelMeta = computed(() => LEVEL_META[props.card.level ?? ''] ?? { label: '', idx: -1, cls: '' })
const bandLabels = BAND_LABELS
const bandSegs = BAND_SEG_CLS.map((cls, i) => ({ cls, on: levelMeta.value.idx === i }))

// ── 情绪周期四态（G3 仅展示，实验性判定）──
const PHASE_META: Record<string, { label: string; cls: string }> = {
  ice: { label: '冰点', cls: 'ph-ice' },
  warm_up: { label: '升温', cls: 'ph-warm' },
  overheat: { label: '过热', cls: 'ph-overheat' },
  ebb: { label: '退潮', cls: 'ph-ebb' },
}
const phaseMeta = computed(() => PHASE_META[props.card.phase ?? ''] ?? { label: '', cls: 'ph-missing' })
const phaseLabel = computed(() => phaseMeta.value.label || props.card.phase || '数据缺失（沿用前值）')
const showPhase = computed(() => !!props.card.phase || !!phaseMeta.value.label)
const phaseEvidenceText = computed(() => {
  const ev = props.card.phase_evidence
  if (!ev || typeof ev !== 'object') return ''
  const reason = String(ev.reason ?? '')
  const slope = ev.slope != null ? `斜率 ${ev.slope}` : ''
  return [reason, slope].filter(Boolean).join(' · ')
})

// ── slot 标注 ──
const slotLabel = computed(() => {
  const m: Record<string, string> = { after_close: '收盘基准', morning: '盘前', midday: '午间' }
  return m[props.slot] ?? props.slot
})
const refreshSlotLabel = computed(() => {
  const m: Record<string, string> = { after_close: '收盘基准', morning: '盘前', midday: '午间' }
  return `refresh ${m[props.refreshSlot] ?? props.refreshSlot}`
})

// ── 事件日历 ──
function eventTypeLabel(t: string): string {
  const m: Record<string, string> = { delivery: '交割日', earnings: '财报', macro: '宏观', seed: '种子' }
  return m[t] ?? t
}
function importanceCls(imp: string): string {
  if (imp === 'high') return 'imp-high'
  if (imp === 'medium') return 'imp-med'
  return 'imp-low'
}

// ── 分支（G19：点位由 engine 注入，前端只渲染；G15：事件节点公布前不展示方向标签）──
function branchCondText(b: RhythmBranch): string {
  return b.condition.label || b.condition.value || b.condition.indicator || ''
}
function directionMeta(b: RhythmBranch): { label: string; cls: string; show: boolean } {
  // G15：事件分支（enum）公布前 range 为空，direction 为占位值——不展示方向标签，避免误读为预判方向
  if (b.condition.kind === 'enum' && !b.conclusion.range) {
    return { label: '待公布', cls: 'dir-neutral', show: true }
  }
  const m: Record<string, { label: string; cls: string }> = {
    bullish: { label: '偏多', cls: 'dir-up' },
    bearish: { label: '偏空', cls: 'dir-down' },
    neutral: { label: '中性', cls: 'dir-neutral' },
  }
  const meta = m[b.conclusion.direction] ?? { label: b.conclusion.direction, cls: 'dir-neutral' }
  return { ...meta, show: true }
}
function branchNoteText(b: RhythmBranch): string {
  if (b.conclusion.range) return b.conclusion.note || ''
  return b.conclusion.note || '结果待公布'
}

// 点位来源脚注：仅点位分支（indicator=上证指数点位）显示（design-debate A2/A4）
const showFootnote = computed(() =>
  (props.card.branches ?? []).some((b) => b.condition.indicator === '上证指数点位')
)

// ── 温度迷你柱 ──
function tempBarHeight(score: number): string {
  const pct = Math.max(4, Math.min(100, Number(score) || 0))
  return `${pct}%`
}
function tempValue(score: number): string {
  const n = Number(score)
  return Number.isFinite(n) ? String(Math.round(n)) : ''
}
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';
.rhythm-card { padding: 24rpx; }

.rc-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.rc-title { font-size: 32rpx; font-weight: 600; color: $ink; }
.rc-slot { font-size: 24rpx; color: $primary; }

.rc-main { background: $bg-card; border: 1rpx solid $line; border-radius: 24rpx; padding: 24rpx 28rpx; margin-bottom: 20rpx; }
.rc-bandline { display: flex; align-items: center; gap: 16rpx; flex-wrap: wrap; }
.rc-score { font-size: 72rpx; font-weight: 700; color: $primary; font-family: 'DIN Alternate', sans-serif; }
.rc-level { font-size: 26rpx; font-weight: 600; color: #fff; border-radius: 999rpx; padding: 4rpx 20rpx; }
.rc-level.lv-ice { background: #6b7f9e; }
.rc-level.lv-low { background: #4d7cfe; }
.rc-level.lv-normal { background: $primary; }
.rc-level.lv-active { background: $warning; }
.rc-level.lv-euphoria { background: $up; }
.rc-pos { font-size: 30rpx; font-weight: 600; color: $ink; }

.rc-scale { display: flex; height: 12rpx; border-radius: 999rpx; overflow: hidden; margin: 20rpx 0 10rpx; }
.rc-seg { flex: 1; }
.rc-seg.seg-ice { background: #6b7f9e; }
.rc-seg.seg-low { background: #4d7cfe; }
.rc-seg.seg-normal { background: $primary; }
.rc-seg.seg-active { background: $warning; }
.rc-seg.seg-euphoria { background: $up; }
.rc-labels { display: flex; }
.rc-lab { flex: 1; text-align: center; font-size: 22rpx; color: $ink-soft; }
.rc-lab.on { color: $ink; font-weight: 600; }

.rc-meta { display: flex; gap: 24rpx; flex-wrap: wrap; font-size: 22rpx; color: $ink-soft; margin-top: 20rpx; padding-top: 20rpx; border-top: 1rpx dashed $line; }

.rc-sec { background: $bg-card; border: 1rpx solid $line; border-radius: 24rpx; padding: 24rpx 28rpx; margin-bottom: 20rpx; }
.rc-sec-title { display: block; font-size: 24rpx; color: $ink-soft; font-weight: 600; letter-spacing: 1rpx; margin-bottom: 16rpx; }

.rc-phase-row { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.rc-chip { font-size: 24rpx; font-weight: 600; border-radius: 999rpx; padding: 6rpx 22rpx; }
.rc-chip.ph-ice { color: #33518f; background: #e8eefc; }
.rc-chip.ph-warm { color: #b45309; background: #fef3c7; }
.rc-chip.ph-overheat { color: $up; background: rgba($up, 0.1); }
.rc-chip.ph-ebb { color: $ink-soft; background: rgba($ink-soft, 0.12); }
.rc-chip.ph-missing { color: $ink-soft; background: rgba($ink-soft, 0.12); }
.rc-exp { font-size: 20rpx; color: $ink-soft; border: 1rpx dashed $line; border-radius: 8rpx; padding: 2rpx 10rpx; }
.rc-phase-ev { display: block; font-size: 24rpx; color: $ink-soft; margin-top: 12rpx; }

.rc-temp-bars { display: flex; align-items: flex-end; gap: 14rpx; height: 200rpx; }
.rc-temp-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.rc-temp-bar { width: 26rpx; border-radius: 8rpx 8rpx 4rpx 4rpx; background: linear-gradient(180deg, $primary, lighten($primary, 28%)); }
.rc-tval { font-size: 20rpx; color: $ink-soft; font-family: 'DIN Alternate', sans-serif; }
.rc-temp-date { font-size: 20rpx; color: $ink-soft; }

.rc-conflict { font-size: 26rpx; color: $warning; background: rgba($warning, 0.08); border: 1rpx solid rgba($warning, 0.35); border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 20rpx; }

.rc-evlist { display: flex; flex-direction: column; gap: 14rpx; }
.rc-evit { display: flex; align-items: center; gap: 12rpx; }
.rc-evd { font-size: 24rpx; color: $primary-700; font-weight: 600; min-width: 100rpx; }
.rc-evtag { font-size: 20rpx; color: $ink-soft; background: $primary-50; border-radius: 8rpx; padding: 2rpx 12rpx; }
.rc-evimp { font-size: 20rpx; border-radius: 8rpx; padding: 2rpx 10rpx; }
.rc-evimp.imp-high { color: $up; background: rgba($up, 0.1); }
.rc-evimp.imp-med { color: #b45309; background: rgba($warning, 0.14); }
.rc-evimp.imp-low { color: $ink-soft; background: rgba($ink-soft, 0.1); }
.rc-evtitle { font-size: 26rpx; color: $ink; flex: 1; }
.rc-empty { font-size: 26rpx; color: $ink-soft; }

.rc-hint { font-size: 26rpx; color: $warning; background: rgba($warning, 0.08); border: 1rpx solid rgba($warning, 0.35); border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 20rpx; }

.rc-anchor { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; background: rgba($warning, 0.08); border: 1rpx solid rgba($warning, 0.35); border-radius: 12rpx; padding: 14rpx 20rpx; margin-bottom: 16rpx; }
.rc-anchor-label { font-size: 22rpx; color: $warning; font-weight: 600; }
.rc-anchor-title { font-size: 26rpx; color: $ink; font-weight: 600; }
.rc-anchor-note { font-size: 24rpx; color: $ink-soft; }

.rc-branch { padding: 16rpx 20rpx; background: $bg-card; border: 1rpx solid $line; border-radius: 16rpx; margin-bottom: 14rpx; }
.rc-branch-cond { display: block; font-size: 22rpx; color: $ink-soft; margin-bottom: 10rpx; }
.rc-branch-concl { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.rc-dir { font-size: 22rpx; font-weight: 600; border-radius: 8rpx; padding: 2rpx 12rpx; }
.rc-dir.dir-up { color: $up; background: rgba($up, 0.1); }
.rc-dir.dir-down { color: $down; background: rgba($down, 0.1); }
.rc-dir.dir-neutral { color: $ink-soft; background: rgba($ink-soft, 0.1); }
.rc-range { font-size: 26rpx; font-weight: 700; color: $ink; font-family: 'DIN Alternate', sans-serif; }
.rc-note { font-size: 22rpx; color: $ink-soft; }

.rc-missing { margin-top: 4rpx; }
.rc-missing-item { display: block; font-size: 22rpx; color: $ink-soft; margin-bottom: 6rpx; }

.rc-disclaimer { margin-top: 16rpx; font-size: 22rpx; color: $ink-soft; text-align: center; padding-top: 20rpx; border-top: 1rpx solid $line; }
</style>
