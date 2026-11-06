<template>
  <view class="rhythm-card">
    <!-- 标题行：卡片标题 + 版本 slot 标注 -->
    <view class="rc-head">
      <text class="rc-title">{{ title }}</text>
      <text class="rc-slot" v-if="slot">{{ slotLabel }}</text>
    </view>

    <!-- 主档位卡（v3 R-J：恒渲染，缺失显示占位文字不留空白）
         2026-11-04 职责重定义：主视觉＝仓位档位 0-4（空/轻/半/重/满，颜色＝建议仓位）。
         不再展示 score 数字 / 情绪周期 chip / 情绪温度区块——temperature_series 字段与判定链路保留，
         仅从主视觉移除（spec §3：温度是 detect_stage 的判定因子，不是上屏结论）。 -->
    <view class="rc-main">
      <view class="rc-bandline">
        <view class="rc-tier" :class="{ 'rc-tier--missing': card.position_index == null }" :style="{ background: positionColor(card.position_index) }">
          <text class="rc-tier-text">{{ positionShort(card.position_index) || '—' }}</text>
        </view>
        <text class="rc-pos-main" v-if="card.position_band">{{ card.position_band.text }}</text>
        <text class="rc-pos rc-pos-missing" v-else>仓位建议暂缺</text>
      </view>
      <!-- 「无主线即空仓」：整个仓位系统最反直觉的规则，必须作为 L1 档位的配套说明可见（spec §5.2 / 验收 7） -->
      <view class="rc-rule">
        <text class="rc-rule-text">无清晰主线时档位强制为空仓</text>
      </view>
      <view class="rc-meta" v-if="targetDate || basisDate || refreshSlot">
        <text v-if="targetDate">target {{ targetDate }}</text>
        <text v-if="basisDate">basis {{ basisDate }}</text>
        <text v-if="refreshSlot">{{ refreshSlotLabel }}</text>
      </view>
    </view>

    <!-- 溯源块（2026-11 T10 / spec §5.2）：只在后端产出 causality_text 时渲染，整块无壳。
         门控须同时要求 ledger 存在：spec §8「旧卡无 position_ledger → 溯源块与变奏块整块不渲染」，
         三块同源于 ledger，缺账本时单残留溯源句会成为无法追溯的孤立结论。
         文案**原样展示**：前端不拼阈值、不算「差」、不改写数字（G19 前端禁推断）。 -->
    <view class="rc-trace" v-if="ledger && card.causality_text">
      <text class="rc-trace-label">溯源</text>
      <text class="rc-trace-lead" v-if="card.causality_text.lead">{{ card.causality_text.lead }}</text>
      <text v-for="(line, i) in traceLines" :key="i" class="rc-trace-line">{{ line }}</text>
    </view>

    <!-- 变奏观察点（spec §6）：只展示后端反解出的「当前未满足项」，最多 3 条。
         排序由后端保证（sufficient_alone 优先 → gate > mainline > event），前端不重排。 -->
    <view class="rc-watch" v-if="watchPoints.length">
      <text class="rc-watch-label">变奏观察点</text>
      <!-- 双闸同时阻塞：必须显式说明「只解一条仍为空仓」，否则用户会把单信号当加仓信号 -->
      <view class="rc-watch-alert" v-if="doubleBlocked">
        <text>两条须同时满足才回到轻仓</text>
      </view>
      <view class="rc-watch-item" v-for="(wp, i) in watchPoints" :key="wp.key + i">
        <text class="rc-watch-cond">{{ wp.condition }}</text>
        <text class="rc-watch-cur">{{ wp.current_text }}</text>
        <text class="rc-watch-cands" v-if="candidateText(wp)">{{ candidateText(wp) }}</text>
      </view>
    </view>

    <!-- 折叠仓位账本（spec §5.2）：默认收起；missing 项显示「数据不可用」，不得隐藏该行 -->
    <view class="rc-ledger" v-if="ledger">
      <view class="rc-ledger-head" @tap="ledgerExpanded = !ledgerExpanded">
        <text v-if="!ledgerExpanded">展开依据 · 仓位账本（{{ ledgerItems.length }} 项输入）</text>
        <text v-else>收起依据 · 仓位账本</text>
      </view>
      <view class="rc-ledger-body" v-if="ledgerExpanded">
        <view class="rc-ledger-item" v-for="item in ledgerItems" :key="item.key" :class="{ 'rc-ledger-item--missing': item.status === 'missing' }">
          <text class="rc-ledger-judge">{{ item.judgement }}</text>
          <text class="rc-ledger-value">{{ item.value_text }}</text>
          <!-- missing 项显式标注（spec §8「禁止用默认值伪装成中性」）：行不隐藏、value_text 原样保留，
               仅额外加一枚状态标记，避免「有数字 = 有结论」的误读 -->
          <text class="rc-ledger-flag" v-if="item.status === 'missing'">数据不可用</text>
          <text class="rc-ledger-effect">{{ item.effect }}</text>
        </view>
        <!-- 温度因子（T7 / 职责 spec §3）：温度是 stage 判定依据，不参与档位判定。
             文案由后端生成（只含数值与斜率，不含分档词），前端原样展示不做加工。
             独立类名：它不是 4 项账本输入之一，不得混入 rc-ledger-item 计数 -->
        <view class="rc-ledger-note" v-if="card.temperature_note">
          <text class="rc-ledger-judge">温度因子</text>
          <text class="rc-ledger-value">{{ card.temperature_note }}</text>
          <text class="rc-ledger-effect">只用于判断阶段，不影响仓位</text>
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
import { positionColor, positionShort } from '@/shared/utils/rhythmColors'
import type { RhythmCard as RhythmCardData, RhythmWatchPoint } from '@/shared/api/modules/agent'

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

// ── 语义收口（2026-11-04）：节奏＝操作建议（仓位），卡片主视觉只表达仓位档位 0-4。
// 档位颜色统一取 shared/utils/rhythmColors.ts 唯一副本（颜色＝建议仓位）；
// level 已废弃上屏，本卡零引用。情绪周期 / 情绪温度均已从主视觉移除。

// ── slot 标注 ──
const slotLabel = computed(() => {
  const m: Record<string, string> = { after_close: '收盘后', morning: '盘前', midday: '午间' }
  return m[props.slot] ?? props.slot
})
const refreshSlotLabel = computed(() => {
  const m: Record<string, string> = { after_close: '收盘后', morning: '盘前', midday: '午间' }
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

// ── 溯源 / 变奏 / 折叠账本（2026-11-04 T10，spec §5.2 / §6）：三者同源于 position_ledger ──
// 降级（spec §8）：position_ledger == null（旧报告）→ 三块整块不渲染，不留空壳、不报错；
// causality_text == null 但 ledger 存在 → 只渲染变奏块与账本。
const ledger = computed(() => props.card.position_ledger ?? null)
/** 溯源行：后端已限 ≤2 条，前端再兜一次截断（防旧卡/异常数据撑开主区） */
const traceLines = computed(() => (props.card.causality_text?.lines ?? []).slice(0, 2))
/** 变奏观察点最多 3 条；顺序即后端给出的优先级，前端不重排 */
const watchPoints = computed(() => (ledger.value?.watch_points ?? []).slice(0, 3))
/** 双闸同时阻塞（闸门 + 无主线）：任一解除都不足以升档，块头须显式提示 */
const doubleBlocked = computed(() => ledger.value?.gate_blocked === true && ledger.value.mainline_state === 'none')
const ledgerItems = computed(() => ledger.value?.items ?? [])
const ledgerExpanded = ref(false)
/** 候选池并列展示（名称 + 超额原样，不做格式化、不推算间距） */
function candidateText(wp: RhythmWatchPoint): string {
  return (wp.candidates ?? []).map((c) => `${c.name} +${c.excess}pct`).join(' · ')
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
.rc-pos { font-size: 24rpx; color: $ink-soft; }
.rc-pos-missing { font-style: normal; color: $ink-mute; }
/* 节奏卡主视觉＝仓位档位 0-4（空/轻/半/重/满）；色块颜色＝建议仓位，与日历/摘要同源色板 */
.rc-tier {
  min-width: 56rpx;
  height: 56rpx;
  padding: 0 14rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rc-tier-text { color: #fff; font-size: 30rpx; font-weight: 700; line-height: 1; }
/* 灰格底上白字不可读：缺失档位用中性墨色 */
.rc-tier--missing .rc-tier-text { color: $ink-mute; }
.rc-pos-main { font-size: 44rpx; font-weight: 700; color: $primary; }
/* 「无主线即空仓」规则说明：L1 档位旁的可见说明（不是折叠证据区的脚注） */
.rc-rule { margin-top: 12rpx; }
.rc-rule-text { font-size: 22rpx; color: $ink-mute; }

/* ── 溯源块（spec §5.2）：小标签 + lead + ≤2 行因果，全部原样展示 ── */
.rc-trace { background: $bg-card; border: 1rpx solid $line; border-radius: 24rpx; padding: 24rpx 28rpx; margin-bottom: 20rpx; }
.rc-trace-label { display: block; font-size: 22rpx; color: $ink-soft; letter-spacing: 1rpx; margin-bottom: 12rpx; }
.rc-trace-lead { display: block; font-size: 28rpx; font-weight: 600; color: $ink; line-height: 1.5; }
.rc-trace-line { display: block; font-size: 24rpx; color: $ink-soft; line-height: 1.6; margin-top: 8rpx; }

/* ── 变奏观察点（spec §6）：condition 为主文本、current_text 为次要灰字 ── */
.rc-watch { background: $bg-card; border: 1rpx solid $line; border-radius: 24rpx; padding: 24rpx 28rpx; margin-bottom: 20rpx; }
.rc-watch-label { display: block; font-size: 22rpx; color: $ink-soft; letter-spacing: 1rpx; margin-bottom: 12rpx; }
.rc-watch-alert { background: $warning-bg; border: 1rpx solid $warning-soft; border-radius: 12rpx; padding: 12rpx 16rpx; margin-bottom: 14rpx; font-size: 24rpx; color: $warning; }
.rc-watch-item { margin-top: 16rpx; }
.rc-watch-cond { display: block; font-size: 26rpx; color: $ink; line-height: 1.5; }
.rc-watch-cur { display: block; font-size: 22rpx; color: $ink-mute; line-height: 1.5; margin-top: 4rpx; }
.rc-watch-cands { display: block; font-size: 22rpx; color: $primary-700; line-height: 1.5; margin-top: 4rpx; }

/* ── 折叠仓位账本（spec §5.2）：默认收起，只占一行摘要 ── */
.rc-ledger { background: $bg-card; border: 1rpx solid $line; border-radius: 24rpx; padding: 20rpx 28rpx; margin-bottom: 20rpx; }
.rc-ledger-head { font-size: 24rpx; color: $primary; }
.rc-ledger-body { margin-top: 16rpx; }
.rc-ledger-item { padding: 12rpx 0; border-top: 1rpx dashed $line; }
/* 温度因子行：属证据链参考项，不是档位输入项 → 独立类名 + 弱化视觉，
   避免被读成「第 5 项账本输入」 */
.rc-ledger-note {
  padding: 12rpx 0;
  border-top: 1rpx dashed $line;
  opacity: 0.75;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}
.rc-ledger-judge { display: block; font-size: 26rpx; color: $ink; font-weight: 600; }
.rc-ledger-value { display: block; font-size: 22rpx; color: $ink-soft; margin-top: 4rpx; }
.rc-ledger-flag { display: inline-block; font-size: 20rpx; color: $warning; background: $warning-bg; border: 1rpx solid $warning-soft; border-radius: 8rpx; padding: 2rpx 10rpx; margin-top: 6rpx; }
.rc-ledger-effect { display: block; font-size: 22rpx; color: $ink-mute; margin-top: 2rpx; }

.rc-meta { display: flex; gap: 24rpx; flex-wrap: wrap; font-size: 22rpx; color: $ink-soft; margin-top: 20rpx; padding-top: 20rpx; border-top: 1rpx dashed $line; }

.rc-sec { background: $bg-card; border: 1rpx solid $line; border-radius: 24rpx; padding: 24rpx 28rpx; margin-bottom: 20rpx; }
.rc-sec-title { display: block; font-size: 24rpx; color: $ink-soft; font-weight: 600; letter-spacing: 1rpx; margin-bottom: 16rpx; }

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
