<template>
  <view class="panel">
    <!-- 头部：标题 + 模式 Segmented（仅展开态展示）+ 展开/收起 -->
    <view class="panel-head">
      <text class="panel-title">节奏日历</text>
      <Segmented
        v-if="expanded"
        :items="[{ label: '仓位', value: 'position' }, { label: '事件', value: 'event' }]"
        :model-value="mode"
        @change="onModeChange"
      />
      <text class="panel-toggle" @tap="toggle">{{ expanded ? '收起' : '展开' }}</text>
    </view>

    <!-- 折叠态：近 7 交易日紧凑条（升序，左旧右新；点格切日） -->
    <view v-if="!expanded" class="day-strip">
      <view
        v-for="d in stripDays"
        :key="d.date"
        class="day-cell"
        :class="{ active: d.date === targetDate, dim: !d.level }"
        :style="{ background: dayCellBg(d) }"
        @tap="pick(d)"
      >
        <text class="day-date">{{ d.date.slice(5) }}</text>
        <text class="day-lev" v-if="d.level">{{ LEVEL_SHORT[d.level] ?? d.level.slice(0, 1) }}</text>
        <text class="day-pos" v-else>沿用</text>
        <text class="day-pos" v-if="d.level && bandShort(d)">{{ bandShort(d) }}</text>
      </view>
    </view>

    <!-- 展开态：60 交易日自然周网格（周一列开头，周末留空；今日高亮；事件模式标点） -->
    <view v-else>
      <view class="week-head">
        <text v-for="w in ['一', '二', '三', '四', '五', '六', '日']" :key="w" class="week-head-cell">{{ w }}</text>
      </view>
      <view v-for="(row, ri) in gridRows" :key="ri" class="cal-row">
        <view
          v-for="(cell, ci) in row"
          :key="ci"
          class="cal-cell-wrap"
        >
          <view
            v-if="cell"
            class="cal-cell"
            :class="{ active: cell.date === targetDate, today: cell.date === todayStr() }"
            :style="{ background: dayCellBg(cell) }"
            @tap="pick(cell)"
          >
            <text class="cal-date">{{ cell.date.slice(8) }}</text>
            <text class="cal-lev" v-if="cell.level">{{ LEVEL_SHORT[cell.level] ?? cell.level.slice(0, 1) }}</text>
            <view v-if="mode === 'event' && eventsOf(cell).length" class="ev-badge" :class="{ hasHigh: highCount(cell) > 0 }">
              <text v-if="highCount(cell) > 0" class="ev-badge-num">{{ highCount(cell) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 事件模式：选中日事件行（tradingvane 风格：影响度·时间·标题；result 尾注；US 隔夜角标） -->
      <view v-if="mode === 'event'" class="ev-panel">
        <view class="ev-panel-title">当日宏观事件</view>
        <template v-if="selectedEvents.length">
          <view v-for="(ev, i) in selectedEvents" :key="i" class="ev-item">
            <view class="ev-imp" :class="`imp-${ev.importance}`"></view>
            <text class="ev-time">{{ ev.event_time ?? '--:--' }}</text>
            <text class="ev-title">{{ ev.title }}</text>
            <text v-if="isOvernight(ev)" class="ev-tag">隔夜</text>
            <text v-if="ev.result" class="ev-result">{{ ev.result }}</text>
          </view>
        </template>
        <text v-else class="ev-empty">当日无宏观事件</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Segmented } from '@/shared/components'
import { agentApi } from '@/shared/api/modules/agent'
import type { RhythmCalendarDay, RhythmEvent } from '@/shared/api/modules/agent'

const props = withDefaults(defineProps<{ targetDate?: string }>(), { targetDate: '' })
const emit = defineEmits<{ pick: [date: string] }>()

const STORAGE_KEY = 'rhythm.calendar.expanded'
const expanded = ref(true)
try { expanded.value = uni.getStorageSync(STORAGE_KEY) !== '' ? uni.getStorageSync(STORAGE_KEY) === true || uni.getStorageSync(STORAGE_KEY) === 'true' : true } catch { /* 忽略 */ }

const mode = ref<'position' | 'event'>('position')
const dayList = ref<RhythmCalendarDay[]>([]) // API 原序（降序：最近在前）

const LEVEL_SHORT: Record<string, string> = { ice: '冰', low: '低', normal: '常', active: '活', euphoria: '亢' }
const LEVEL_COLOR: Record<string, string> = {
  ice: '#8a6fae', low: '#2f9e9e', normal: '#4d7cfe', active: '#f59e0b', euphoria: '#ef4444',
}
const GREY = '#eceef1'

// 折叠态最近 7 日（升序展示：左旧右新）
const ascending = computed(() => [...dayList.value].reverse())
const stripDays = computed(() => ascending.value.slice(-7))

function dayCellBg(d: RhythmCalendarDay): string {
  return (d.level && LEVEL_COLOR[d.level]) || GREY
}
function bandShort(d: RhythmCalendarDay): string {
  return (d.position_band?.text?.trim() ?? '').replace(/^建议仓位\s*/, '')
}

// 今日高亮：模板以 todayStr() 调用取当日 YYYY-MM-DD 串（brief 样例漏了括号——函数引用恒不等于字符串，今日格永不亮，此处修正）
function todayStr(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// 事件角标口径：high 计数 >0 → 红点+计数；否则当日有 medium/low → 灰点
function eventsOf(d: RhythmCalendarDay): RhythmEvent[] {
  return d.events ?? []
}
function highCount(d: RhythmCalendarDay): number {
  return eventsOf(d).filter((e) => e.importance === 'high').length
}

function isOvernight(ev: RhythmEvent): boolean {
  // 对外契约已把 US 隔夜顺延到交易日；角标语义由 event_time>=15:00 近似标识（CN 16:00 后无发布惯例）
  return !!ev.event_time && Number(ev.event_time.slice(0, 2)) >= 15
}

const selectedEvents = computed<RhythmEvent[]>(() => {
  const day = ascending.value.find((d) => d.date === props.targetDate)
  return day ? eventsOf(day) : []
})

// —— 展开网格：自然周对齐（周一列开头；相邻交易日之间的周末/假日列留空；跨周换行）——
const WEEK_COL: Record<number, number> = { 0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 } // jsDay(0=周日) → col(0=周一)
type GridCell = RhythmCalendarDay | null
const gridRows = computed<GridCell[][]>(() => {
  const rows: GridCell[][] = []
  let row: GridCell[] = []
  let cursor = 0 // 上一格已占列 +1
  const pushRow = () => {
    if (!row.length) return
    while (row.length < 7) row.push(null) // 每行恒 7 列：周末/空列留空，跨行周一对齐
    rows.push(row)
    row = []
  }
  for (const d of ascending.value) {
    const col = WEEK_COL[new Date(`${d.date}T00:00:00`).getDay()]
    // 新的一周（本日列号小于当前游标）→ 换行，回到周一列起排
    if (cursor > 0 && col < cursor) { pushRow(); cursor = 0 }
    while (cursor < col) { row.push(null); cursor++ }
    row.push(d)
    cursor = col + 1
  }
  pushRow()
  return rows
})

function onModeChange(v: string | number) { mode.value = v as 'position' | 'event' }
function toggle() {
  expanded.value = !expanded.value
  try { uni.setStorageSync(STORAGE_KEY, expanded.value) } catch { /* 忽略 */ }
}
function pick(d: RhythmCalendarDay) { emit('pick', d.date) }

agentApi.getRhythmMasterCalendar(60).then((res) => { dayList.value = res?.days ?? [] }).catch(() => { dayList.value = [] })
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';
/* 类名约定：day-* 系照搬详情页 index.vue 既有紧凑条样式；cal-* 系照搬节奏日历页 calendar.vue 热力格样式（视觉同源）。
   新增 panel/week-head/ev-* 面板专属类：rpx 单位，事件影响度色点语义同 RhythmCard .rc-evimp（high 红 / medium 橙 / low 灰）。 */
.panel { margin-bottom: 24rpx; }

/* —— 头部：标题 + 模式切换 + 展开/收起 —— */
.panel-head { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.panel-title { font-size: 28rpx; font-weight: 600; color: $ink; }
.panel-toggle { font-size: 24rpx; color: $primary; margin-left: auto; padding: 4rpx 0 4rpx 16rpx; }

/* —— 折叠态紧凑条（index.vue .day-* 原样语义）—— */
.day-strip { display: flex; gap: 12rpx; }
.day-cell {
  flex: 1;
  min-width: 0;
  border-radius: 12rpx;
  border: 4rpx solid transparent;
  padding: 8rpx 4rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  box-shadow: $shadow-sm;
}
.day-cell.active { border-color: $primary; }
.day-cell.dim { opacity: 0.75; }
.day-date { font-size: 20rpx; font-weight: 600; color: $ink; }
.day-lev {
  font-size: 20rpx; color: #fff; background: rgba(0, 0, 0, 0.18);
  border-radius: 8rpx; padding: 1rpx 8rpx;
}
.day-pos {
  font-size: 16rpx; color: #fff; max-width: 100%;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* —— 展开态：自然周网格（行=周，列=一~日；空位留白）—— */
.week-head { display: flex; gap: 10rpx; margin-bottom: 6rpx; }
.week-head-cell {
  flex: 0 0 calc((100% - 60rpx) / 7);
  text-align: center;
  font-size: 20rpx;
  color: $ink-mute;
  font-weight: 500;
}
.cal-row { display: flex; gap: 10rpx; margin-bottom: 10rpx; }
.cal-cell-wrap { width: calc((100% - 60rpx) / 7); }
.cal-cell {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 0.9;
  border-radius: 12rpx;
  border: 4rpx solid transparent;
  padding: 8rpx 4rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
}
.cal-cell.today { border-color: $gold; }
.cal-cell.active { border-color: $primary; }
.cal-date { font-size: 22rpx; font-weight: 600; color: $ink; }
.cal-date.dim { color: $ink-soft; }
.cal-lev { font-size: 20rpx; color: #fff; background: rgba(0, 0, 0, 0.18); border-radius: 8rpx; padding: 1rpx 8rpx; }

/* —— 事件角标：hasHigh 红点+计数；否则小灰点 —— */
.ev-badge {
  position: absolute;
  top: 2rpx;
  right: 2rpx;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: $ink-faint;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.ev-badge.hasHigh {
  width: auto;
  min-width: 30rpx;
  height: 30rpx;
  padding: 0 6rpx;
  border-radius: 999rpx;
  background: $up;
}
.ev-badge-num { font-size: 18rpx; color: #fff; line-height: 1; font-weight: 600; }

/* —— 事件模式：选中日事件行 —— */
.ev-panel {
  margin-top: 16rpx;
  background: $bg-card;
  border: 1rpx solid $line;
  border-radius: 16rpx;
  padding: 20rpx;
}
.ev-panel-title { font-size: 24rpx; font-weight: 600; color: $ink; margin-bottom: 8rpx; }
.ev-item { display: flex; align-items: center; gap: 12rpx; padding: 10rpx 0; }
.ev-imp { width: 14rpx; height: 14rpx; border-radius: 50%; flex-shrink: 0; }
.ev-imp.imp-high { background: $up; }
.ev-imp.imp-medium { background: #b45309; }
.ev-imp.imp-low { background: $ink-soft; }
.ev-time { font-size: 22rpx; color: $ink-mute; flex-shrink: 0; font-variant-numeric: tabular-nums; }
.ev-title {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  color: $ink;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ev-tag {
  flex-shrink: 0;
  font-size: 18rpx;
  color: $primary;
  background: $primary-50;
  border: 1rpx solid $primary-200;
  border-radius: 6rpx;
  padding: 0 8rpx;
}
.ev-result {
  flex-shrink: 0;
  font-size: 22rpx;
  color: $ink-soft;
  max-width: 200rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ev-empty { display: block; font-size: 24rpx; color: $ink-mute; padding: 8rpx 0; }
</style>
