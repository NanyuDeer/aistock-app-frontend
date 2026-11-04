<template>
  <view class="rhythm-card">
    <!-- 标题行：卡片标题 + 版本 slot 标注 -->
    <view class="rc-head">
      <text class="rc-title">{{ title }}</text>
      <text class="rc-slot" v-if="slot">{{ slotLabel }}</text>
    </view>

    <!-- 主档位卡（v3 R-J：恒渲染，缺失显示占位文字不留空白）
         2026-11-03 语义收口：节奏卡只表达「仓位动作」，不再展示 score 数字——
         该字段是档位序号×20（0/20/40/60/80）的查表值，单独上屏会被误读成温度分。
         情绪强度改由「情绪温度」独立表达（temperature_series）。 -->
    <view class="rc-main">
      <view class="rc-bandline">
        <text class="rc-pos-main" v-if="card.position_band">{{ card.position_band.text }}</text>
        <text class="rc-pos rc-pos-missing" v-else>仓位建议暂缺</text>
      </view>
      <view class="rc-meta" v-if="targetDate || basisDate || refreshSlot">
        <text v-if="targetDate">target {{ targetDate }}</text>
        <text v-if="basisDate">basis {{ basisDate }}</text>
        <text v-if="refreshSlot">{{ refreshSlotLabel }}</text>
      </view>
    </view>

    <!-- 情绪周期：阶段 chip（缺失时兜底"数据缺失（沿用前值）"，G3 实验性判定；证据行已上移洞见卡 trace） -->
    <view class="rc-sec" v-if="showPhase">
      <text class="rc-sec-title">情绪周期</text>
      <view class="rc-phase-row">
        <text class="rc-chip">{{ phaseLabel }}</text>
        <text class="rc-exp">实验性判定</text>
      </view>
    </view>

    <!-- 情绪温度（语义收口 2026-11-04：温度＝情绪强度，独立于节奏/仓位表达）
         顶部给当日值 + 分档文字，下方保留近 7 日柱状图 -->
    <view class="rc-sec" v-if="card.temperature_series && card.temperature_series.length">
      <view class="rc-temp-head">
        <text class="rc-sec-title">情绪温度</text>
        <text class="rc-temp-today" v-if="tempToday">{{ tempToday.score }} · {{ tempToday.label }}</text>
      </view>
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

    <!-- 事件日历（v3 极简：未来最近 3 个事件 + 锚点 + 更远折叠；事件明细看顶部日历事件模式） -->
    <view class="rc-sec">
      <text class="rc-sec-title">未来事件日历</text>
      <!-- 下一事件锚点（design-debate P1：无锚点整块不渲染） -->
      <view class="rc-anchor" v-if="card.next_event_anchor">
        <view class="rc-anchor-head">
          <text class="rc-anchor-label">下一事件</text>
          <text
            v-if="card.next_event_anchor.importance === 'high'"
            class="rc-anchor-flag"
          >重大</text>
        </view>
        <text class="rc-anchor-title">{{ card.next_event_anchor.title }}</text>
        <text class="rc-anchor-note">{{ card.next_event_anchor.note }}（{{ card.next_event_anchor.event_date }}）</text>
      </view>
      <view class="rc-evlist" v-if="eventGroups.next.length || eventGroups.far.length">
        <view class="rc-evit" v-for="(ev, i) in eventGroups.next" :key="i">
          <text class="rc-evd">{{ ev.date }}</text>
          <text class="rc-evtag">{{ eventTypeLabel(ev.type) }}</text>
          <text class="rc-evimp" :class="importanceCls(ev.importance)">{{ ev.importance }}</text>
          <text class="rc-evtitle">{{ ev.title }}</text>
        </view>
        <template v-if="farExpanded">
          <view v-for="(ev, i) in eventGroups.far" :key="'f' + i" class="rc-evit">
            <text class="rc-evd">{{ ev.date }}</text>
            <text class="rc-evtag">{{ eventTypeLabel(ev.type) }}</text>
            <text class="rc-evimp" :class="importanceCls(ev.importance)">{{ ev.importance }}</text>
            <text class="rc-evtitle">{{ ev.title }}</text>
          </view>
        </template>
        <view v-if="eventGroups.far.length" class="rc-far-toggle" @tap="farExpanded = !farExpanded">
          <text v-if="!farExpanded">更远事件（共 {{ eventGroups.far.length }} 条）</text>
          <text v-else>收起更远事件</text>
        </view>
      </view>
      <view class="rc-empty" v-else-if="card.event_source_missing">
        <text>该维度数据源未接入</text>
      </view>
      <view class="rc-empty" v-else>
        <text>暂无已登记事件</text>
      </view>
    </view>

    <!-- 事件前置提示：未来 high 级事件，不改主档位（§7.1 事件前置纪律 / 验收 3） -->
    <view class="rc-hint" v-if="card.event_high_hint"><text>{{ card.event_high_hint }}</text></view>

    <!-- 数据缺失标注（如实展示降权/沿用前值） -->
    <view class="rc-missing" v-if="card.data_missing && card.data_missing.length">
      <text v-for="(m, i) in card.data_missing" :key="i" class="rc-missing-item">{{ m }}</text>
    </view>

    <!-- 免责横幅（恒在，§7.2） -->
    <view class="rc-disclaimer">本页内容为研究参考，不构成任何投资建议，据此操作风险自担。</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { groupEventWindow } from '../utils/rhythmEventWindow'
import type { RhythmCard as RhythmCardData } from '@/shared/api/modules/agent'

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

// ── 语义收口（2026-11-04）：节奏＝操作建议（仓位），卡片不再输出五档档位词与刻度条。
// 档位（level）仅保留在日历热力图与摘要卡中做颜色映射，不在本卡重复表达。

// ── 情绪周期五态（对齐后端 stage：ice/launch/rally/overheat/ebb；G3 仅展示，实验性判定）──
const PHASE_META: Record<string, string> = {
  ice: '冰点', launch: '启动', rally: '主升', overheat: '过热', ebb: '退潮',
}
const phaseLabel = computed(() => PHASE_META[props.card.phase ?? ''] ?? props.card.phase ?? '数据缺失（沿用前值）')
const showPhase = computed(() => !!props.card.phase)

// ── slot 标注 ──
const slotLabel = computed(() => {
  const m: Record<string, string> = { after_close: '收盘基准', morning: '盘前', midday: '午间' }
  return m[props.slot] ?? props.slot
})
const refreshSlotLabel = computed(() => {
  const m: Record<string, string> = { after_close: '收盘基准', morning: '盘前', midday: '午间' }
  return `refresh ${m[props.refreshSlot] ?? props.refreshSlot}`
})

// ── 事件日历（v3 极简，spec §4.1）：未来最近 3 个事件（跳过锚点重复）+ 更远折叠；明细看顶部日历事件模式 ──
const farExpanded = ref(false)
const eventGroups = computed(() =>
  groupEventWindow(props.card.event_window, props.targetDate, props.card.next_event_anchor),
)
function eventTypeLabel(t: string): string {
  const m: Record<string, string> = { delivery: '交割日', earnings: '财报', macro: '宏观', seed: '种子' }
  return m[t] ?? t
}
function importanceCls(imp: string): string {
  if (imp === 'high') return 'imp-high'
  if (imp === 'medium') return 'imp-med'
  return 'imp-low'
}

// ── 温度迷你柱 ──
function tempBarHeight(score: number): string {
  const pct = Math.max(4, Math.min(100, Number(score) || 0))
  return `${pct}%`
}
function tempValue(score: number): string {
  const n = Number(score)
  return Number.isFinite(n) ? String(Math.round(n)) : ''
}

// ── 情绪温度分档（阈值对齐后端 sentiment_temp.level：
//    冰点 ≤20 / 低迷 (20,45] / 常温 (45,55] / 活跃 (55,80] / 亢奋 >80）──
const TEMP_BANDS: { max: number; label: string }[] = [
  { max: 20, label: '冰点' },
  { max: 45, label: '低迷' },
  { max: 55, label: '常温' },
  { max: 80, label: '活跃' },
  { max: 100, label: '亢奋' },
]
function tempLabel(score: number): string {
  const n = Number(score)
  if (!Number.isFinite(n)) return ''
  for (const b of TEMP_BANDS) if (n <= b.max) return b.label
  return '亢奋'
}
/** 当日温度：优先取与 basisDate 同日的那条（序列含展示窗内的其他日期） */
const tempToday = computed(() => {
  const series = props.card.temperature_series ?? []
  if (!series.length) return null
  const hit = props.basisDate ? series.find((t) => t.date === props.basisDate) : undefined
  const item = hit ?? series[series.length - 1]
  return { score: Math.round(Number(item.score)), label: tempLabel(item.score) }
})
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';
.rhythm-card { padding: 24rpx; }

.rc-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.rc-title { font-size: 32rpx; font-weight: 600; color: $ink; }
.rc-slot { font-size: 24rpx; color: $primary; }

.rc-main { background: $bg-card; border: 1rpx solid $line; border-radius: 24rpx; padding: 24rpx 28rpx; margin-bottom: 20rpx; }
.rc-bandline { display: flex; align-items: center; gap: 16rpx; flex-wrap: wrap; }
.rc-pos { font-size: 24rpx; color: $ink-soft; }
.rc-pos-missing { font-style: normal; color: $ink-mute; }
/* 节奏卡主视觉＝仓位动作（空仓/轻仓/五成…），不再展示 score 数字 */
.rc-pos-main { font-size: 44rpx; font-weight: 700; color: $primary; }


.rc-meta { display: flex; gap: 24rpx; flex-wrap: wrap; font-size: 22rpx; color: $ink-soft; margin-top: 20rpx; padding-top: 20rpx; border-top: 1rpx dashed $line; }

.rc-sec { background: $bg-card; border: 1rpx solid $line; border-radius: 24rpx; padding: 24rpx 28rpx; margin-bottom: 20rpx; }
.rc-sec-title { display: block; font-size: 24rpx; color: $ink-soft; font-weight: 600; letter-spacing: 1rpx; margin-bottom: 16rpx; }

.rc-phase-row { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.rc-chip { font-size: 24rpx; font-weight: 600; border-radius: 999rpx; padding: 6rpx 22rpx; color: $ink-soft; background: rgba($ink-soft, 0.12); }
.rc-exp { font-size: 20rpx; color: $ink-soft; border: 1rpx dashed $line; border-radius: 8rpx; padding: 2rpx 10rpx; }

.rc-temp-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16rpx; }
.rc-temp-head .rc-sec-title { margin-bottom: 0; }
.rc-temp-today { font-size: 32rpx; font-weight: 700; color: $primary; }
.rc-temp-bars { display: flex; align-items: flex-end; gap: 14rpx; height: 200rpx; }
.rc-temp-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.rc-temp-bar { width: 26rpx; border-radius: 8rpx 8rpx 4rpx 4rpx; background: linear-gradient(180deg, $primary, $primary-300); }
.rc-tval { font-size: 20rpx; color: $ink-soft; font-family: 'DIN Alternate', sans-serif; }
.rc-temp-date { font-size: 20rpx; color: $ink-soft; }

.rc-conflict { font-size: 26rpx; color: $warning; background: rgba($warning, 0.08); border: 1rpx solid rgba($warning, 0.35); border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 20rpx; }

.rc-evlist { display: flex; flex-direction: column; gap: 14rpx; }
.rc-evit { display: flex; align-items: center; gap: 12rpx; }
.rc-evd { font-size: 24rpx; color: $primary-700; font-weight: 600; min-width: 100rpx; }
.rc-evtag { font-size: 20rpx; color: $ink-soft; background: $primary-50; border-radius: 8rpx; padding: 2rpx 12rpx; }
.rc-evimp { font-size: 20rpx; border-radius: 8rpx; padding: 2rpx 10rpx; }
.rc-evimp.imp-high { color: $up; background: rgba($up, 0.1); }
.rc-evimp.imp-med { color: $ink-soft; background: rgba($ink-soft, 0.1); }
.rc-evimp.imp-low { color: $ink-soft; background: rgba($ink-soft, 0.1); }
.rc-evtitle { font-size: 26rpx; color: $ink; flex: 1; }
.rc-far-toggle { font-size: 24rpx; color: $primary; }
.rc-empty { font-size: 26rpx; color: $ink-soft; }

.rc-hint { font-size: 26rpx; color: $warning; background: rgba($warning, 0.08); border: 1rpx solid rgba($warning, 0.35); border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 20rpx; }

.rc-anchor { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; background: rgba($warning, 0.08); border: 1rpx solid rgba($warning, 0.35); border-radius: 12rpx; padding: 14rpx 20rpx; margin-bottom: 16rpx; }
.rc-anchor-head { display: flex; align-items: center; }
.rc-anchor-flag {
  margin-left: 8rpx;
  padding: 0 8rpx;
  font-size: 20rpx;
  line-height: 28rpx;
  border-radius: 6rpx;
  color: $up;
  border: 1rpx solid $up;
}
.rc-anchor-label { font-size: 22rpx; color: $warning; font-weight: 600; }
.rc-anchor-title { font-size: 26rpx; color: $ink; font-weight: 600; }
.rc-anchor-note { font-size: 24rpx; color: $ink-soft; }

.rc-missing { margin-top: 4rpx; }
.rc-missing-item { display: block; font-size: 22rpx; color: $ink-soft; margin-bottom: 6rpx; }

.rc-disclaimer { margin-top: 16rpx; font-size: 22rpx; color: $ink-soft; text-align: center; padding-top: 20rpx; border-top: 1rpx solid $line; }
</style>
