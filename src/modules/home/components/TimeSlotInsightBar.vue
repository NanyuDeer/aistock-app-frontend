<template>
  <view class="insight-bar">
    <!-- 模块 Tab：风口/消息/市场/节奏；时段（盘前/盘中/盘后）后台自动切换，仅右上角徽标展示 -->
    <view class="insight-bar__tabs">
      <view
        v-for="m in MODULES"
        :key="m.key"
        class="insight-bar__tab"
        :class="{ 'insight-bar__tab--active': m.key === activeModule }"
        @tap="activeModule = m.key"
      >
        <text class="insight-bar__tab-text">{{ m.label }}</text>
      </view>
      <view class="insight-bar__badge">
        <text class="insight-bar__badge-text">{{ slotLabel }}</text>
      </view>
    </view>

    <view class="insight-bar__list">
      <!-- 风口：序号 + 板块名 + 涨跌标签（副行一句话预判，单行截断） -->
      <template v-if="activeModule === 'sectors'">
        <view
          v-for="(s, i) in sectorRows"
          :key="'sec-' + i"
          class="insight-bar__row"
          @tap="emit('navigate', 'sectors')"
        >
          <text class="insight-bar__rank" :class="'is-' + (i + 1)">{{ i + 1 }}</text>
          <view class="insight-bar__row-main">
            <view class="insight-bar__row-line1">
              <text class="insight-bar__row-title">{{ s.name }}</text>
              <text class="insight-bar__row-tag" :class="tagClass(s.tagType)">{{ s.tag || '--' }}</text>
            </view>
            <text v-if="s.hint" class="insight-bar__row-hint">{{ s.hint }}</text>
          </view>
        </view>
      </template>

      <!-- 消息：时间 chip + 两行标题 -->
      <template v-else-if="activeModule === 'events'">
        <view
          v-for="(e, i) in eventRows"
          :key="'evt-' + i"
          class="insight-bar__row"
          @tap="emit('navigate', 'events')"
        >
          <text class="insight-bar__chip">{{ e.tag || '新' }}</text>
          <text class="insight-bar__row-title insight-bar__row-title--wrap">{{ e.name }}</text>
        </view>
      </template>

      <!-- 市场：日期 chip + 两行结论 -->
      <template v-else-if="activeModule === 'trace'">
        <view
          v-for="(t, i) in traceRows"
          :key="'tr-' + i"
          class="insight-bar__row"
          @tap="emit('navigate', 'trace')"
        >
          <text class="insight-bar__chip">{{ t.tag || '—' }}</text>
          <text class="insight-bar__row-title insight-bar__row-title--wrap">{{ t.name }}</text>
        </view>
      </template>

      <!-- 节奏：日期 chip + 档位 + 档位短码色标（与四网格节奏卡片一致） -->
      <template v-else>
        <view
          v-for="(r, i) in rhythmItems"
          :key="'rh-' + i"
          class="insight-bar__row"
          @tap="emit('navigate', 'rhythm')"
        >
          <text class="insight-bar__chip">{{ dateShort(r.date) }}</text>
          <text class="insight-bar__row-title">{{ r.band || EMPTY }}</text>
          <view class="insight-bar__level-chip" :style="{ background: levelColor(r.level) }">
            <text class="insight-bar__level-text">{{ levelShort(r.level) }}</text>
          </view>
        </view>
      </template>

      <view v-if="emptyHint" class="insight-bar__empty">{{ emptyHint }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getTradingTimeSlot, type TradingTimeSlot } from '@/shared/utils/tradingTime'
import { RHYTHM_LEVEL_COLORS, RHYTHM_GREY, isRhythmLevelKey, levelShort } from '@/shared/utils/rhythmColors'

type BarTarget = 'rhythm' | 'sectors' | 'events' | 'trace'
type ModuleKey = 'sectors' | 'events' | 'trace' | 'rhythm'

interface Props {
  leaderSectors: ReadonlyArray<{ name: string; tag?: string; tagType?: string; hint?: string }>
  chainEvents: ReadonlyArray<{ name: string; tag?: string; tagType?: string; eventId?: string }>
  traceReports: ReadonlyArray<{ name: string; tag?: string; tagType?: string }>
  rhythmRows: ReadonlyArray<{ date?: string | null; level?: string | null; band: string; basis_date: string | null }>
  currentSlot?: TradingTimeSlot
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'navigate', target: BarTarget): void }>()

const EMPTY = '暂无'

const MODULES: ReadonlyArray<{ key: ModuleKey; label: string }> = [
  { key: 'sectors', label: '风口' },
  { key: 'events', label: '消息' },
  { key: 'trace', label: '市场' },
  { key: 'rhythm', label: '节奏' },
]

// 模块 Tab 切换（用户交互）；时段由父组件 currentSlot 自动驱动，仅徽标展示
const activeModule = ref<ModuleKey>('sectors')

// 时段徽标：优先父组件传入（onShow 重算），缺省按本地时钟兜底
const slotLabel = computed(() => {
  const slot = props.currentSlot ?? getTradingTimeSlot()
  return slot === 'pre' ? '盘前' : slot === 'intraday' ? '盘中' : '盘后'
})

const sectorRows = computed(() => props.leaderSectors.slice(0, 3))
const eventRows = computed(() => props.chainEvents.slice(0, 3))
const traceRows = computed(() => props.traceReports.slice(0, 3))
const rhythmItems = computed(() => props.rhythmRows.slice(0, 3))

const emptyHint = computed(() => {
  switch (activeModule.value) {
    case 'sectors': return sectorRows.value.length ? '' : '暂无风口数据'
    case 'events': return eventRows.value.length ? '' : '暂无重磅消息'
    case 'trace': return traceRows.value.length ? '' : '暂无溯源报告'
    default: return rhythmItems.value.length ? '' : '暂无节奏数据'
  }
})

function tagClass(tagType?: string): string {
  if (tagType === 'up' || tagType === 'buy') return 'is-up'
  if (tagType === 'down' || tagType === 'sell') return 'is-down'
  if (tagType === 'wash') return 'is-wash'
  return 'is-neutral'
}

function dateShort(date?: string | null): string {
  if (!date) return '—'
  return date.length > 5 ? date.slice(5) : date
}

// 档位色标：合法档位用色板原色，缺失/未知档位回退灰格（与四网格节奏卡片同源）
function levelColor(level?: string | null): string {
  return level && isRhythmLevelKey(level) ? RHYTHM_LEVEL_COLORS[level] : RHYTHM_GREY
}
</script>

<style lang="scss" scoped>
.insight-bar {
  position: relative;
  padding: $s-3;
  /* 白底卡片，与下方风口洞见/消息洞见卡片视觉一致 */
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
  margin-bottom: $s-2;
  box-shadow: $shadow-card;
  overflow: hidden;
}

.insight-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4rpx;
  background: $brand-gradient;
}

.insight-bar__tabs {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx;
  background: $bg-card;
  border: 1rpx solid $line;
  border-radius: $r-full;
}

.insight-bar__tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10rpx 0;
  border-radius: $r-full;
}

.insight-bar__tab--active {
  background: $brand-gradient;
}

.insight-bar__tab-text {
  font-size: $font-size-sm;
  color: $ink-soft;
}

.insight-bar__tab--active .insight-bar__tab-text {
  color: #ffffff;
  font-weight: 600;
}

/* 时段徽标：仅展示，不可点击（后台自动切换） */
.insight-bar__badge {
  flex: none;
  padding: 0 16rpx;
  border-radius: $r-full;
  background: $bg-soft;
  border: 1rpx solid $line;
}

.insight-bar__badge-text {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.insight-bar__list {
  margin-top: $s-2;
}

.insight-bar__row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 16rpx 4rpx;

  & + & {
    border-top: 1rpx solid $line;
  }
}

.insight-bar__rank {
  flex: none;
  width: 40rpx;
  height: 40rpx;
  border-radius: $r-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-sm;
  font-weight: 600;
  color: #ffffff;

  &.is-1 {
    background: #2b2f36;
  }

  &.is-2,
  &.is-3 {
    background: #c3c8cf;
  }
}

.insight-bar__chip {
  flex: none;
  padding: 6rpx 12rpx;
  border-radius: $r-sm;
  /* 静尘蓝标签，与四网格卡片日期 Tag（neutral）视觉一致 */
  background: rgba(11, 95, 255, 0.08);
  color: $primary;
  font-size: $font-size-xs;
}

.insight-bar__row-title {
  flex: 1;
  font-size: $font-size-sm;
  color: $ink;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 风口行主区：首行（板块名+涨跌）与预判副行 */
.insight-bar__row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.insight-bar__row-line1 {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.insight-bar__row-hint {
  font-size: $font-size-xs;
  color: $ink-mute;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.insight-bar__row-title--wrap {
  white-space: normal;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.insight-bar__row-tag {
  flex: none;
  padding: 6rpx 14rpx;
  border-radius: $r-full;
  font-size: $font-size-xs;
  font-weight: 600;

  &.is-up {
    background: $up-soft;
    color: $up;
  }

  &.is-down {
    background: $down-soft;
    color: $down;
  }

  &.is-wash,
  &.is-neutral {
    background: $bg-card;
    color: $ink-soft;
  }
}

/* 档位短码色标：与四网格节奏卡片 rhythm-chip 同规格 */
.insight-bar__level-chip {
  flex: none;
  width: 40rpx;
  height: 34rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.insight-bar__level-text {
  color: #ffffff;
  font-size: 18rpx;
  line-height: 1;
}

.insight-bar__empty {
  padding: 24rpx 0;
  text-align: center;
  font-size: $font-size-xs;
  color: $ink-mute;
}
</style>
