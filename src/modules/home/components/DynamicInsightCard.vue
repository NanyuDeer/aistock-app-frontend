<template>
  <view class="dyn-card">
    <!-- L1 徽标行：时段徽标 + 头条来源模块（同一行）+ NEW 角标 -->
    <view class="dyn-card__head">
      <view class="dyn-card__head-left">
        <!-- 洞见字标（复用洞见卡字标 PNG，浅底深色版） -->
        <view class="dyn-card__logo" :style="wmStyle" />
        <!-- 时段徽标：实心时段主色底 + 白字，承担卡片色彩标识（替代原顶部渐变横条） -->
        <view class="dyn-card__slot" :style="{ background: slotColor }">
          <text class="dyn-card__slot-dot"></text>
          <text class="dyn-card__slot-text">{{ slotMeta.label }}</text>
        </view>
        <text class="dyn-card__module" :style="{ background: slotTint, color: slotColor }">{{ moduleLabel(headModule) }}</text>
      </view>
      <text v-if="head" class="dyn-card__new">NEW</text>
    </view>

    <!-- 头条焦点区（标题 → 小字详情＝洞见一句话结论 → 各模块独有内容 + 蓝色文字链接） -->
    <view v-if="head" class="dyn-focus" @tap="emit('navigate', headModule)">
      <text class="dyn-focus__title">{{ head.name }}</text>
      <text class="dyn-focus__hint">{{ headDetail }}</text>
      <view class="dyn-focus__foot">
        <view class="dyn-focus__uniq">
          <!-- 风口：榜首序号 + 涨跌幅 -->
          <template v-if="headModule === 'sectors'">
            <text v-if="head.rank" class="dyn-uniq__rank">No.{{ head.rank }}</text>
            <text v-if="head.badge" class="dyn-focus__badge" :class="toneClass(head.badgeTone)">{{ head.badge }}</text>
          </template>

          <!-- 消息：影响板块胶囊（板块名黑灰 + ↑红 / ↓绿）；无板块数据时回退时间标签 -->
          <template v-else-if="headModule === 'events'">
            <template v-if="head.sectors && head.sectors.length">
              <text v-for="s in head.sectors" :key="s.name" class="dyn-uniq__sector">
                {{ s.name }}<text v-if="s.sentiment !== 'neutral'" class="dyn-uniq__arrow" :class="s.sentiment === 'bearish' ? 'is-down' : 'is-up'">{{ s.sentiment === 'bearish' ? '↓' : '↑' }}</text>
              </text>
            </template>
            <text v-else-if="head.badge" class="dyn-focus__badge is-neutral">{{ head.badge }}</text>
          </template>

          <!-- 市场：报告日期 + 更新时间 -->
          <template v-else-if="headModule === 'trace'">
            <text v-if="head.badge" class="dyn-uniq__chip">{{ head.badge }}</text>
            <text v-if="head.updatedAt" class="dyn-uniq__chip">更新 {{ head.updatedAt }}</text>
          </template>

          <!-- 节奏：档位色标 + 仓位基准日 -->
          <template v-else>
            <text class="dyn-uniq__level" :style="{ background: rhythmColor(head.level) }">{{ levelShort(head.level) || '沿' }}</text>
            <text v-if="head.basisDate" class="dyn-uniq__chip">{{ head.basisDate }} 基准</text>
          </template>
        </view>
        <text class="dyn-focus__link">详情 →</text>
      </view>
    </view>

    <view class="dyn-card__divider"></view>

    <!-- 次要焦点：3 条跨模块混排（交替底色弱化） -->
    <view class="dyn-sec">
      <view
        v-for="(it, i) in secondary"
        :key="it.module + '-' + i"
        class="dyn-sec__row"
        :class="{ 'dyn-sec__row--alt': i % 2 === 1 }"
        @tap="emit('navigate', it.module)"
      >
        <text class="dyn-sec__chip">{{ moduleLabel(it.module) }}</text>
        <text class="dyn-sec__title">{{ it.name }}</text>
        <!-- 尾部标签与四宫格同款：风口/市场用组件库 Tag；节奏用档位色块 -->
        <view
          v-if="it.badge && it.module === 'rhythm'"
          class="dyn-sec__rhythm"
          :style="{ background: rhythmColor(it.level) }"
        >
          <text class="dyn-sec__rhythm-text">{{ it.badge }}</text>
        </view>
        <Tag v-else-if="it.badge" class="dyn-sec__tag" :type="it.badgeTone" size="sm">{{ it.badge }}</Tag>
      </view>
      <view v-if="!secondary.length" class="dyn-sec__empty">暂无洞见</view>
    </view>

    <view class="dyn-card__divider"></view>

    <!-- 四入口条带：永久可见，当前时段模块高亮 + 红点 -->
    <view class="dyn-strip">
      <view
        v-for="m in MODULES"
        :key="m.key"
        class="dyn-strip__item"
        :class="{ 'dyn-strip__item--active': m.key === headModule }"
        @tap="emit('navigate', m.key)"
      >
        <view class="dyn-strip__icon-wrap">
          <SvgIcon :name="m.icon" size="40rpx" :color="m.key === headModule ? slotColor : ICON_IDLE" />
          <view v-if="m.key === headModule" class="dyn-strip__dot" :style="{ background: slotColor }"></view>
        </view>
        <text class="dyn-strip__label" :class="{ 'dyn-strip__label--active': m.key === headModule }">{{ m.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import Tag from '@/shared/components/Tag.vue'
import { getTradingTimeSlot, type TradingTimeSlot } from '@/shared/utils/tradingTime'
import { levelShort, isRhythmLevelKey, RHYTHM_LEVEL_COLORS, RHYTHM_GREY } from '@/shared/utils/rhythmColors'
import wordmarkPng from '@/shared/components/insight-wordmark.png'

/** 洞见字标底图（与洞见卡头部字标同源；卡片为白底，用深色版字标） */
const wmStyle = { backgroundImage: `url(${wordmarkPng})` }

type InsightTarget = 'rhythm' | 'sectors' | 'events' | 'trace'
type ModuleKey = InsightTarget
type Tone = 'up' | 'down' | 'neutral'

/** 影响板块（消息头条独有内容）：名称 + 方向（上箭头红 / 下箭头绿） */
interface PreviewSector {
  name: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
}

interface PreviewItem {
  name: string
  tag?: string
  tagType?: string
  /** 洞见一句话结论（小字详情） */
  hint?: string
  /** 风口：排行序号（榜首 = 1） */
  rank?: number
  /** 消息：受影响板块 */
  sectors?: ReadonlyArray<PreviewSector>
  /** 市场：报告更新时间（HH:MM） */
  updatedAt?: string
}

interface RhythmRow {
  date?: string | null
  level?: string | null
  band: string
  basis_date: string | null
  /** 洞见一句话结论（档位 + 建议仓位） */
  hint?: string
}

interface Props {
  leaderSectors: ReadonlyArray<PreviewItem>
  chainEvents: ReadonlyArray<PreviewItem>
  traceReports: ReadonlyArray<PreviewItem>
  rhythmRows: ReadonlyArray<RhythmRow>
  currentSlot?: TradingTimeSlot
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'navigate', target: InsightTarget): void }>()

/** 条带内未选中入口的图标灰（对齐 $ink-mute，SvgIcon 需具体色值） */
const ICON_IDLE = '#8a96b0'

const MODULES: ReadonlyArray<{ key: ModuleKey; label: string; icon: string }> = [
  { key: 'sectors', label: '风口', icon: 'windy-line' },
  { key: 'events', label: '消息', icon: 'article-line' },
  { key: 'trace', label: '市场', icon: 'line-chart-line' },
  { key: 'rhythm', label: '节奏', icon: 'pulse-line' },
]

/** 时段主色：盘前暖橙 / 盘中品牌蓝 / 盘后深紫（与 $warning / $primary / $insight-trend 同值） */
const SLOT_META: Record<TradingTimeSlot, { label: string; color: string }> = {
  pre: { label: '盘前', color: '#f0a020' },
  intraday: { label: '盘中', color: '#0b5fff' },
  post: { label: '盘后', color: '#7c3aed' },
}

/** 时段 → 头条模块：盘前风口、盘中消息、盘后市场（与需求约定一致） */
const SLOT_HEAD: Record<TradingTimeSlot, ModuleKey> = {
  pre: 'sectors',
  intraday: 'events',
  post: 'trace',
}

const slot = computed<TradingTimeSlot>(() => props.currentSlot ?? getTradingTimeSlot())
const slotMeta = computed(() => SLOT_META[slot.value])
const slotColor = computed(() => slotMeta.value.color)
/** 时段主色 8% 透明底（预计算 rgba，避免 8 位 hex 在小程序端兼容问题） */
const slotTint = computed(() => tint(slotColor.value, 0.08))

function tint(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function toneOf(tagType?: string): Tone {
  if (tagType === 'up' || tagType === 'buy') return 'up'
  if (tagType === 'down' || tagType === 'sell') return 'down'
  return 'neutral'
}

/** 各模块数据统一归一化为「标题 + 数据 chip + 独有内容」结构，便于头条/次要/计数复用 */
interface FocusItem {
  module: ModuleKey
  name: string
  badge?: string
  badgeTone: Tone
  hint?: string
  rank?: number
  sectors?: ReadonlyArray<PreviewSector>
  updatedAt?: string
  level?: string | null
  basisDate?: string | null
}

const pools = computed<Record<ModuleKey, FocusItem[]>>(() => ({
  sectors: props.leaderSectors.map((s, i) => ({
    module: 'sectors' as const,
    name: s.name,
    badge: s.tag,
    badgeTone: toneOf(s.tagType),
    hint: s.hint,
    rank: s.rank ?? i + 1,
  })),
  events: props.chainEvents.map(e => ({
    module: 'events' as const,
    name: e.name,
    badge: e.tag,
    badgeTone: 'neutral' as const,
    hint: e.hint,
    sectors: e.sectors,
  })),
  trace: props.traceReports.map(t => ({
    module: 'trace' as const,
    name: t.name,
    badge: t.tag,
    badgeTone: 'neutral' as const,
    hint: t.hint,
    updatedAt: t.updatedAt,
  })),
  rhythm: props.rhythmRows.map(r => ({
    module: 'rhythm' as const,
    name: r.band || (r.basis_date ? '沿用前值' : '无报告'),
    badge: levelShort(r.level) || '沿',
    badgeTone: 'neutral' as const,
    hint: r.hint,
    level: r.level,
    basisDate: r.basis_date,
  })),
}))

/** 头条小字详情兜底：各模块无真实结论时，用模块说明保证每张卡都有第二行 */
const DETAIL_FALLBACK: Record<ModuleKey, string> = {
  sectors: '板块异动与资金流向预判',
  events: '产业链最新事件追踪',
  trace: '收盘后异动溯源结论',
  rhythm: '档位与建议仓位',
}

/** 盘后头条双内容轮播：市场溯源 ↔ 节奏档位，每 5s 自动切换 */
const POST_HEAD_CYCLE: ReadonlyArray<ModuleKey> = ['trace', 'rhythm']
const CAROUSEL_INTERVAL = 5000
const postIndex = ref(0)
let postTimer: ReturnType<typeof setInterval> | null = null

const headModule = computed<ModuleKey>(() =>
  slot.value === 'post'
    ? POST_HEAD_CYCLE[postIndex.value % POST_HEAD_CYCLE.length]
    : SLOT_HEAD[slot.value]
)

function stopCarousel() {
  if (postTimer) {
    clearInterval(postTimer)
    postTimer = null
  }
}

function startCarousel() {
  stopCarousel()
  if (slot.value !== 'post') return
  postTimer = setInterval(() => {
    postIndex.value = (postIndex.value + 1) % POST_HEAD_CYCLE.length
  }, CAROUSEL_INTERVAL)
}

watch(slot, () => {
  postIndex.value = 0
  startCarousel()
}, { immediate: true })

onUnmounted(stopCarousel)

/** 节奏档位色标：非法/缺失档位回退中性灰 */
function rhythmColor(level?: string | null): string {
  return level && isRhythmLevelKey(level) ? RHYTHM_LEVEL_COLORS[level] : RHYTHM_GREY
}

const head = computed<FocusItem | null>(() => pools.value[headModule.value][0] ?? null)
const headDetail = computed(() =>
  head.value?.hint || DETAIL_FALLBACK[headModule.value]
)

/** 次要焦点：其余 3 个模块各取首条（跨模块混排，不与头条重复） */
const secondary = computed<FocusItem[]>(() =>
  MODULES.map(m => m.key)
    .filter(k => k !== headModule.value)
    .map(k => pools.value[k][0])
    .filter((item): item is FocusItem => !!item)
)

function moduleLabel(key: ModuleKey): string {
  return MODULES.find(m => m.key === key)?.label ?? ''
}

function toneClass(tone: Tone): string {
  return `is-${tone}`
}
</script>

<style lang="scss" scoped>
.dyn-card {
  position: relative;
  padding: $s-3 $s-3 $s-2;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
  margin-bottom: $s-2;
  box-shadow: $shadow-card;
  overflow: hidden;
}

/* ===== L1 徽标行（时段徽标 + 来源模块同行） ===== */
.dyn-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $s-2;
}

.dyn-card__head-left {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

/* 洞见字标（与洞见卡头部字标同源、同形；白底用深色版） */
.dyn-card__logo {
  width: 48rpx;
  height: 34rpx;
  flex: 0 0 auto;
  /* 与右侧时段徽标拉开距离（叠加 head-left 的 8rpx gap，共 16rpx） */
  margin-right: 8rpx;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}

.dyn-card__slot {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 4rpx 16rpx;
  border-radius: $r-full;
}

.dyn-card__slot-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: $white;
}

.dyn-card__slot-text {
  font-size: $font-size-xs;
  font-weight: 600;
  color: $white;
}

.dyn-card__module {
  padding: 4rpx 16rpx;
  border-radius: $r-full;
  font-size: $font-size-xs;
  font-weight: 600;
}

.dyn-card__new {
  font-size: $font-size-xs;
  font-weight: 700;
  letter-spacing: 1rpx;
  color: $up;
}

/* ===== 头条焦点区（C 式整宽资讯头条） ===== */
.dyn-focus {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10rpx;
}

.dyn-focus__title {
  font-size: $font-size-md;
  font-weight: 600;
  color: $ink;
  line-height: 1.4;
}

.dyn-focus__hint {
  font-size: $font-size-sm;
  color: $ink-soft;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.dyn-focus__foot {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-top: 6rpx;
}

/* 各模块独有内容容器：左侧横向排列，可换行 */
.dyn-focus__uniq {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx;
  min-width: 0;
}

/* 数据 chip（底部左侧）：涨红跌绿柔底标签 */
.dyn-focus__badge {
  padding: 4rpx 16rpx;
  border-radius: $r-xs;
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

  &.is-neutral {
    background: rgba($primary, 0.08);
    color: $primary;
  }
}

/* 风口：榜首序号 */
.dyn-uniq__rank {
  font-size: $font-size-xs;
  font-weight: 600;
  color: $ink-mute;
}

/* 消息：影响板块胶囊（板块名黑灰 + 箭头指向方向） */
.dyn-uniq__sector {
  display: inline-flex;
  align-items: center;
  gap: 2rpx;
  padding: 2rpx 10rpx;
  border-radius: $r-xs;
  background: $bg-soft;
  border: 2rpx solid $line-soft;
  font-size: $font-size-xs;
  color: $ink-soft;
}

.dyn-uniq__arrow {
  font-weight: 600;

  &.is-up {
    color: $up;
  }

  &.is-down {
    color: $down;
  }
}

/* 市场 / 节奏：中性信息 chip（日期、更新时间、基准日） */
.dyn-uniq__chip {
  padding: 2rpx 10rpx;
  border-radius: $r-xs;
  background: $bg-soft;
  font-size: $font-size-xs;
  color: $ink-soft;
}

/* 节奏：档位色标 */
.dyn-uniq__level {
  padding: 2rpx 10rpx;
  border-radius: $r-xs;
  font-size: $font-size-xs;
  font-weight: 600;
  color: $white;
}

/* 详情：蓝色可点击文字（非按钮） */
.dyn-focus__link {
  font-size: $font-size-sm;
  font-weight: 500;
  color: $primary;
}

/* ===== 分隔线（复用洞见卡同款渐变分隔线：品牌色左浓右淡） ===== */
.dyn-card__divider {
  height: 2rpx;
  background: linear-gradient(90deg, $primary-100, rgba($primary-100, 0));
  margin: $s-2 0;
}

/* ===== 次要焦点列表 ===== */
.dyn-sec__row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 72rpx;
  padding: 0 10rpx;
  border-radius: $r-xs;
}

.dyn-sec__row--alt {
  background: $bg-soft;
}

.dyn-sec__chip {
  flex: none;
  padding: 2rpx 10rpx;
  border-radius: $r-xs;
  background: rgba($primary, 0.08);
  color: $primary;
  font-size: $font-size-xs;
}

.dyn-sec__title {
  flex: 1;
  min-width: 0;
  font-size: $font-size-sm;
  color: $ink-soft;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.dyn-sec__tag {
  flex: none;
}

/* 节奏行：档位色块（形状/字号对齐四宫格「节奏洞见」卡的 .rhythm-chip） */
.dyn-sec__rhythm {
  flex: none;
  width: 40rpx;
  height: 34rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dyn-sec__rhythm-text {
  color: $white;
  font-size: 18rpx;
  line-height: 1;
}

.dyn-sec__empty {
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-sm;
  color: $ink-mute;
}

/* ===== 四入口条带 ===== */
.dyn-strip {
  display: flex;
  gap: 8rpx;
}

.dyn-strip__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 10rpx 0;
  border-radius: $r-sm;
}

.dyn-strip__item--active {
  background: $bg-soft;
}

.dyn-strip__icon-wrap {
  position: relative;
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dyn-strip__dot {
  position: absolute;
  top: -2rpx;
  right: -4rpx;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
}

.dyn-strip__label {
  font-size: $font-size-sm;
  color: $ink-soft;
}

.dyn-strip__label--active {
  color: $ink;
  font-weight: 600;
}
</style>