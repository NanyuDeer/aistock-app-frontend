<template>
  <view
    class="as-insight-card"
    :class="[`as-insight-card--${theme}`]"
    @tap="handleClick"
  >
    <!-- 头部：瞳孔 + 类型标签 + 时间 -->
    <view class="as-insight-card__head">
      <InsightTag :type="type" size="sm">{{ tagText || typeLabel }}</InsightTag>
      <text v-if="time" class="as-insight-card__time">{{ time }}</text>
    </view>

    <!-- 结论标题（一句话） -->
    <text class="as-insight-card__title">{{ title }}</text>

    <!-- 分隔线 -->
    <view class="as-insight-card__divider" />

    <!-- 溯源（横幅卡：蓝） -->
    <view v-if="trace" class="as-insight-card__line as-insight-card__line--trace">
      <text class="as-insight-card__key">溯源</text>
      <text class="as-insight-card__text">{{ trace }}</text>
    </view>

    <!-- 预判：条件化结构化块（structured 传入时） -->
    <view v-if="structured" class="as-insight-card__fc">
      <view class="as-insight-card__fc-head">
        <text class="as-insight-card__fc-key">预判</text>
        <text v-if="verifyText" class="as-insight-card__verify" :class="verifyClass">{{ verifyText }}</text>
      </view>

      <!-- 期段切换 -->
      <view class="as-insight-card__seg">
        <view
          v-for="seg in horizonSegments"
          :key="seg"
          class="as-insight-card__seg-item"
          :class="{ 'as-insight-card__seg-item--on': activeHorizon === seg }"
          @tap.stop="setActiveHorizon(seg)"
        >
          <text>{{ horizonLabel(seg) }}</text>
        </view>
      </view>

      <!-- 当前期内容：基准方向 + 该期条件情景 -->
      <view class="as-insight-card__ph">
        <view v-if="activeBase" class="as-insight-card__ph-head">
          <text class="as-insight-card__ph-label">基准</text>
          <text v-if="activeBase.direction" class="as-insight-card__dir" :class="dirClass(activeBase.direction)">
            {{ dirText(activeBase.direction) }}
          </text>
          <text v-if="activeBase.confidence" class="as-insight-card__conf">置信 {{ confText(activeBase.confidence) }}</text>
          <text v-if="activeBase.remaining" class="as-insight-card__remain">{{ activeBase.remaining }}</text>
        </view>

        <view v-if="activeConditions.length" class="as-insight-card__sc-list">
          <view
            v-for="(cond, idx) in activeConditions"
            :key="idx"
            class="as-insight-card__sc"
            :class="{
              'as-insight-card__sc--on': cond.met === true,
              'as-insight-card__sc--off': cond.met === false
            }"
          >
            <view
              class="as-insight-card__sc-bar"
              :class="{ 'as-insight-card__sc-bar--on': cond.met === true }"
            />
            <view class="as-insight-card__sc-body">
              <view class="as-insight-card__sc-if">
                <text class="as-insight-card__sc-no">{{ idx + 1 }}</text>
                <text class="as-insight-card__sc-prefix">若</text>
                <text class="as-insight-card__sc-cond">{{ condMain(cond.condition) }}</text>
              </view>
              <view class="as-insight-card__sc-then">
                <text v-if="cond.direction" class="as-insight-card__dir" :class="dirClass(cond.direction)">
                  {{ dirText(cond.direction) }}
                </text>
                <template v-for="(part, i) in splitScenario(cond.scenario)" :key="i">
                  <text
                    class="as-insight-card__sc-scenario"
                    :class="{ 'as-insight-card__sc-amp': part.kind === 'amp' }"
                  >{{ part.t }}</text>
                </template>
              </view>
            </view>
            <text v-if="cond.met === true" class="as-insight-card__sc-st as-insight-card__sc-st--yes">已触发</text>
            <text v-else-if="cond.met === false" class="as-insight-card__sc-st as-insight-card__sc-st--no">未触发</text>
          </view>
        </view>

        <view v-if="!activeBase && !activeConditions.length" class="as-insight-card__sc-empty">
          该期暂无细分情景
        </view>
      </view>
    </view>

    <!-- 预判（横幅卡：金，文本形态，兼容旧用法） -->
    <view v-else-if="forecast" class="as-insight-card__line as-insight-card__line--forecast">
      <text class="as-insight-card__key">预判</text>
      <text class="as-insight-card__text">{{ forecast }}</text>
    </view>

    <!-- 底部 meta -->
    <view v-if="showMeta" class="as-insight-card__foot">
      <text v-if="confidence" class="as-insight-card__meta">置信度 {{ confidence }}</text>
      <text class="as-insight-card__brand">INSIGHT</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import InsightTag from './InsightTag.vue'

/**
 * InsightCard 洞见卡片（全站洞见统一容器）
 * - 文本形态（兼容旧用法）：瞳孔标签 → 结论一句话 → 溯源 → 预判（两句话上限）。
 * - 条件化形态（structured 传入）：溯源 → 条件化预判块（期段切换 + 每期基准方向 + 该期互斥条件情景）。
 * 组件保持纯 UI：方向/置信/期段/条件全部经 props 结构化传入，不引业务。
 */
type InsightType = 'emotion' | 'fund' | 'event' | 'market' | 'trend'
type InsightTheme = 'light' | 'dark'
type HorizonKey = 'short' | 'mid' | 'long'
type Direction = 'bullish' | 'bearish' | 'neutral'
type Confidence = 'high' | 'medium' | 'low'
type Verification = 'pending' | 'hit' | 'miss'

interface StructuredHorizon {
  horizon: HorizonKey
  /** 档位时长描述，如 "1-5 交易日"（缺省只显示 短/中/长） */
  remaining?: string
  /** 该期基准方向 */
  direction?: Direction
  /** 该期基准置信度 */
  confidence?: Confidence
}

interface StructuredCondition {
  /** 所属期段（对齐后端 anchor.horizon） */
  horizon: HorizonKey
  /** 情景方向（自挂，可与同档基准方向相反） */
  direction?: Direction
  /** 触发条件（可量化的市场事实描述） */
  condition: string
  /** 条件满足后的走势预判（含幅度/目标位等，展示原文） */
  scenario: string
  /** 验证锚点（可选透传） */
  anchor?: { metric?: string; threshold?: string }
  /** 该条件是否已触发（验证回填）：true=已触发（分支点亮）/ false=未触发（置灰）/ 缺省=待观察常态 */
  met?: boolean | null
}

/** 条件化预判结构化数据（对齐后端 PredictionResult.horizons + conditions） */
interface InsightStructuredForecast {
  horizons?: StructuredHorizon[]
  conditions?: StructuredCondition[]
  /** 到期标签，如 "09-08"（pending 状态时展示） */
  dueLabel?: string
  /** 验证结果：pending 待验证 / hit 命中 / miss 未中 */
  verification?: Verification | null
}

const props = withDefaults(defineProps<{
  /** 洞见类型 */
  type?: InsightType
  /** 结论标题（一句话说清现象） */
  title: string
  /** 溯源：原因说明 */
  trace?: string
  /** 预判：后续走向（文本形态，structured 传入时忽略） */
  forecast?: string
  /** 标签文字覆盖（如板块洞见卡传 tag-text="板块洞见"）；缺省按 type 映射 */
  tagText?: string
  /** 条件化预判结构化数据（传入则渲染期段切换的预判块） */
  structured?: InsightStructuredForecast | null
  /** 时间，如 '08-21 · 09:10' */
  time?: string
  /** 主题：light 亮色列表卡 / dark 深蓝研报卡 */
  theme?: InsightTheme
  /** 是否显示底部 meta（置信度 + INSIGHT 角标） */
  showMeta?: boolean
  /** 数据置信度，如 '0.82'（文本形态展示用） */
  confidence?: string
}>(), {
  type: 'emotion',
  trace: '',
  forecast: '',
  tagText: '',
  structured: null,
  time: '',
  theme: 'light',
  showMeta: false,
  confidence: ''
})

const emit = defineEmits<{
  click: []
}>()

const typeLabelMap: Record<InsightType, string> = {
  emotion: '情绪洞见',
  fund: '资金洞见',
  event: '事件洞见',
  market: '市场洞见',
  trend: '趋势洞见'
}

const typeLabel = computed(() => typeLabelMap[props.type])

// ===== 条件化预判块状态 =====
const HORIZON_ORDER: HorizonKey[] = ['short', 'mid', 'long']
const activeHorizon = ref<HorizonKey>('short')

/** 展示期段：horizons ∪ conditions 中实际出现的档位（保序；空则全部不展示） */
const horizonSegments = computed<HorizonKey[]>(() => {
  const data = props.structured
  if (!data) return []
  const keys = new Set<HorizonKey>()
  for (const h of data.horizons ?? []) keys.add(h.horizon)
  for (const c of data.conditions ?? []) keys.add(c.horizon)
  if (!keys.size) return []
  return HORIZON_ORDER.filter((k) => keys.has(k))
})

/** 当前期内的基准方向（horizons 匹配当期） */
const activeBase = computed<StructuredHorizon | undefined>(() => {
  const data = props.structured
  if (!data) return undefined
  return (data.horizons ?? []).find((h) => h.horizon === activeHorizon.value)
})

/** 当前期内的条件情景（conditions 按 anchor.horizon 归组） */
const activeConditions = computed<StructuredCondition[]>(() => {
  const data = props.structured
  if (!data) return []
  return (data.conditions ?? []).filter((c) => c.horizon === activeHorizon.value)
})

const verifyText = computed(() => {
  const v = props.structured?.verification
  if (v === 'hit') return '已验证 · 命中'
  if (v === 'miss') return '已验证 · 未中'
  if (v === 'pending') {
    const due = props.structured?.dueLabel
    return due ? `待验证 · ${due}` : '待验证'
  }
  return ''
})

const verifyClass = computed(() => {
  const v = props.structured?.verification
  if (v === 'hit') return 'as-insight-card__verify--hit'
  if (v === 'miss') return 'as-insight-card__verify--miss'
  return 'as-insight-card__verify--pending'
})

// ===== 文案与样式映射 =====
function horizonLabel(h: HorizonKey): string {
  const map: Record<HorizonKey, string> = { short: '短', mid: '中', long: '长' }
  return map[h]
}

function dirText(d: Direction): string {
  const map: Record<Direction, string> = { bullish: '看多', bearish: '看空', neutral: '震荡' }
  return map[d]
}

function confText(c: Confidence): string {
  const map: Record<Confidence, string> = { high: '高', medium: '中', low: '低' }
  return map[c]
}

function dirClass(d: Direction): string {
  return d === 'bullish'
    ? 'as-insight-card__dir--up'
    : d === 'bearish'
      ? 'as-insight-card__dir--down'
      : 'as-insight-card__dir--mid'
}

const handleClick = () => {
  emit('click')
}

/** 期段点击切换（方法化：避免模板内联赋值在跨端编译下的边界问题） */
const setActiveHorizon = (seg: HorizonKey) => {
  activeHorizon.value = seg
}

/**
 * 拆解 scenario 文本：幅度/目标位段（如 -3% ~ -5%、+3%、75 元）置灰弱化，
 * 其余正文保持主色。仅按带符号数字+%的形态拆分，不解析语义。
 */
function splitScenario(text: string): Array<{ t: string; kind: 'text' | 'amp' }> {
  const ampRe = /[+-]?\d+(?:\.\d+)?%?(?:\s*[~～至到]\s*[+-]?\d+(?:\.\d+)?%?)?/g
  const parts: Array<{ t: string; kind: 'text' | 'amp' }> = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = ampRe.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: text.slice(last, m.index), kind: 'text' })
    parts.push({ t: m[0], kind: 'amp' })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ t: text.slice(last), kind: 'text' })
  if (!parts.length) parts.push({ t: text, kind: 'text' })
  return parts
}

/**
 * condition 展示主干：剔除括号补充说明（（缩量阴跌）等），只留一眼可懂的触发句。
 * 括号内信息属精确化细节，展示层从简——"若…"必须一眼看懂（通俗化约束见 spec）。
 */
function condMain(text: string): string {
  return splitCondition(text)
    .filter((p) => p.kind === 'key')
    .map((p) => p.t)
    .join('')
}

/**
 * 拆解 condition 文本：括号补充说明（（缩量阴跌）/（站上 5 日线）等）与主干分离。
 * 支持全角/半角括号。
 */
function splitCondition(text: string): Array<{ t: string; kind: 'key' | 'note' }> {
  const noteRe = /（[^）]*）|\([^)]*\)/g
  const parts: Array<{ t: string; kind: 'key' | 'note' }> = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = noteRe.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: text.slice(last, m.index), kind: 'key' })
    parts.push({ t: m[0], kind: 'note' })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ t: text.slice(last), kind: 'key' })
  if (!parts.length) parts.push({ t: text, kind: 'key' })
  return parts
}
</script>

<style lang="scss" scoped>
.as-insight-card {
  display: flex;
  flex-direction: column;
  gap: $s-2;
  padding: $s-4;
  border-radius: $r-lg;
  transition: transform $t-fast;
  user-select: none;
}

.as-insight-card:active {
  transform: scale(0.995);
}

/* ===== Head ===== */
.as-insight-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.as-insight-card__time {
  font-size: $font-size-xs;
  color: $ink-mute;
}

/* ===== Title ===== */
.as-insight-card__title {
  font-size: $font-size-md;
  font-weight: 600;
  color: $ink;
  line-height: $lh-tight;
}

/* ===== Divider ===== */
.as-insight-card__divider {
  height: 2rpx;
  background: linear-gradient(90deg, $primary-100, rgba($primary-100, 0));
  margin: $s-1 0;
}

/* ===== Lines（彩色横幅卡，同"归因结论"样式） ===== */
/* 语义色：溯源=蓝 / 预判=金 */
.as-insight-card__line--trace {
  --banner-bg: #{$insight-market};
  --banner-glow: rgba(11, 95, 255, 0.18);
}

.as-insight-card__line--forecast {
  --banner-bg: #{$gold-soft-bg};
  --banner-glow: rgba(138, 100, 17, 0.12);
}

@include insight-banner('.as-insight-card__line', '.as-insight-card__key', '.as-insight-card__text');

/* 预判：浅金柔底（需在 mixin 之后覆盖白字） */
.as-insight-card__line--forecast {
  border: 1rpx solid $gold-soft-border;

  .as-insight-card__key,
  .as-insight-card__text {
    color: $gold-deep;
  }
}

/* ===== 条件化预判块 ===== */
.as-insight-card__fc {
  background: $gold-soft-bg;
  border: 1rpx solid $gold-soft-border;
  border-radius: $r-md;
  padding: $s-2 $s-2 $s-3;
  display: flex;
  flex-direction: column;
  gap: $s-2;
}

.as-insight-card__fc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.as-insight-card__fc-key {
  font-size: $font-size-xs;
  font-weight: 600;
  color: $ink;
}

/* 验证状态 */
.as-insight-card__verify {
  font-size: 20rpx;
  border-radius: $r-full;
  padding: 2rpx 14rpx;
}

.as-insight-card__verify--pending {
  color: $gold-deep;
  background: $white;
  border: 1rpx solid $gold-soft-border;
}

.as-insight-card__verify--hit {
  color: $down;
  background: $down-soft;
}

.as-insight-card__verify--miss {
  color: $up;
  background: $up-soft;
}

/* 期段切换 */
.as-insight-card__seg {
  display: flex;
  background: rgba($white, 0.55);
  border: 1rpx solid $gold-soft-border;
  border-radius: $r-sm;
  padding: 2rpx;
}

.as-insight-card__seg-item {
  flex: 1;
  text-align: center;
  font-size: $font-size-xs;
  font-weight: 600;
  color: $gold-deep;
  opacity: 0.7;
  padding: 6rpx 0;
  border-radius: $r-xs;
}

.as-insight-card__seg-item--on {
  background: $white;
  box-shadow: 0 2rpx 8rpx rgba(138, 100, 17, 0.16);
  opacity: 1;
  font-weight: 700;
}

/* 当前期内容 */
.as-insight-card__ph {
  display: flex;
  flex-direction: column;
  gap: $s-1;
}

.as-insight-card__ph-head {
  display: flex;
  align-items: center;
  gap: $s-1;
  flex-wrap: wrap;
}

.as-insight-card__ph-label {
  font-size: 20rpx;
  color: $ink-mute;
}

.as-insight-card__remain {
  margin-left: auto;
  font-size: 20rpx;
  color: $ink-faint;
}

/* 方向徽标（A股：看多=红 看空=绿 震荡=灰，文字随附消除歧义） */
.as-insight-card__dir {
  font-size: 20rpx;
  font-weight: 600;
  border-radius: $r-full;
  padding: 1rpx 12rpx;
  display: inline-flex;
  align-items: center;
}

.as-insight-card__dir--up {
  color: $up;
  background: $up-soft;
  border: 1rpx solid rgba(229, 77, 94, 0.35);
}

.as-insight-card__dir--down {
  color: $down;
  background: $down-soft;
  border: 1rpx solid rgba(24, 160, 88, 0.35);
}

.as-insight-card__dir--mid {
  color: $flat;
  background: $bg-soft;
  border: 1rpx solid $line;
}

.as-insight-card__conf {
  font-size: 20rpx;
  color: $ink-mute;
}

/* 分支情景（方案甲：触发点亮 / 未触发置灰 / 缺省待观察） */
.as-insight-card__sc-list {
  display: flex;
  flex-direction: column;
  gap: $s-1;
  margin-top: 2rpx;
}

.as-insight-card__sc {
  display: flex;
  align-items: stretch;
  gap: $s-1;
  padding: $s-1 $s-2;
  border-radius: $r-sm;
  background: rgba($white, 0.45);
  border: 1rpx solid rgba($gold-soft-border, 0.6);
  transition: opacity $t-fast;
}

/* 已触发：整支点亮（白底 + 蓝色描边/光晕 + 蓝缘条 + 蓝签） */
.as-insight-card__sc--on {
  background: rgba($white, 0.92);
  border-color: rgba($primary, 0.55);
  box-shadow: 0 2rpx 12rpx rgba($primary, 0.16);
}

/* 未触发：整支置灰 */
.as-insight-card__sc--off {
  opacity: 0.45;
}

/* 左缘触发条：灰=待观察/未触发，蓝=已触发 */
.as-insight-card__sc-bar {
  width: 4rpx;
  flex-shrink: 0;
  border-radius: $r-full;
  background: $line;
}

.as-insight-card__sc-bar--on {
  background: $primary;
}

.as-insight-card__sc-body {
  flex: 1;
  min-width: 0;
}

.as-insight-card__sc-if {
  display: flex;
  align-items: baseline;
  gap: $s-1;
  font-size: $font-size-xs;
  color: $ink-soft;
  line-height: $lh-tight;
}

.as-insight-card__sc-no {
  font-size: 20rpx;
  font-weight: 600;
  color: $ink-mute;
  flex-shrink: 0;
}

.as-insight-card__sc-prefix {
  color: $ink-mute;
  flex-shrink: 0;
}

/* 条件句：预判块内唯一金色加粗文字段（展示主干，括号补充不渲染） */
.as-insight-card__sc-cond {
  font-weight: 600;
  color: $gold-deep;
}

.as-insight-card__sc-then {
  display: flex;
  align-items: baseline;
  gap: $s-1;
  margin-top: 2rpx;
  flex-wrap: wrap;
}

.as-insight-card__sc-scenario {
  font-size: $font-size-xs;
  color: $ink;
  line-height: $lh-tight;
}

/* 幅度/目标位段（-3% ~ -5%、+3% 等）：弱化置灰 */
.as-insight-card__sc-amp {
  color: $ink-mute;
}

/* 触发状态签 */
.as-insight-card__sc-st {
  align-self: center;
  flex-shrink: 0;
  font-size: 18rpx;
  font-weight: 600;
  border-radius: $r-full;
  padding: 2rpx 12rpx;
}

.as-insight-card__sc-st--yes {
  color: $white;
  background: $primary;
}

.as-insight-card__sc-st--no {
  color: $ink-mute;
  background: $bg-soft;
}

.as-insight-card__sc-empty {
  font-size: 20rpx;
  color: $ink-faint;
}

/* ===== Foot ===== */
.as-insight-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: $s-1;
}

.as-insight-card__meta {
  font-size: 20rpx;
  color: $ink-faint;
}

.as-insight-card__brand {
  font-size: 20rpx;
  font-weight: 600;
  letter-spacing: $ls-wider;
  color: $ink-faint;
}

/* ===== Theme: Light ===== */
.as-insight-card--light {
  background: $bg-card;
  border: 2rpx solid $line;
  box-shadow: $shadow-xs;
}

/* ===== Theme: Dark（深蓝研报卡） ===== */
.as-insight-card--dark {
  background: $insight-card-dark-gradient;
  border: none;
  box-shadow: $shadow-card;

  .as-insight-card__title {
    color: $white;
  }

  .as-insight-card__divider {
    background: linear-gradient(90deg, rgba($gold-light, 0.6), rgba($white, 0.12));
  }

  .as-insight-card__meta,
  .as-insight-card__brand {
    color: rgba($white, 0.55);
  }
}
</style>
