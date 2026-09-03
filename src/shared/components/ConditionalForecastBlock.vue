<template>
  <!-- 条件化预判块（结构化传入）：期段切换 + 每期基准方向 + 该期互斥条件情景（分支点亮/置灰） -->
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
        <text v-if="activeBase.direction" class="as-insight-card__dir" :class="dirClass(activeBase.direction)">
          {{ dirText(activeBase.direction) }}
        </text>
        <text v-if="activeBase.label" class="as-insight-card__ph-tt">基准 · {{ activeBase.label }}</text>
        <text v-if="activeBase.confidence" class="as-insight-card__conf">置信 {{ confText(activeBase.confidence) }}</text>
        <text v-if="activeBase.remaining" class="as-insight-card__remain">{{ activeBase.remaining }}</text>
      </view>

      <view v-if="activeConditions.length" class="as-insight-card__sc-list">
        <template v-for="(cond, idx) in activeConditions" :key="idx">
          <!-- 互斥分支间以“或”分隔（2026-09-03 方案 C） -->
          <view v-if="idx > 0" class="as-insight-card__sc-or">
            <text class="as-insight-card__sc-or-tx">或</text>
          </view>

          <view
            class="as-insight-card__sc"
            :class="{
              'as-insight-card__sc--live': cond.met === true,
              'as-insight-card__sc--off': cond.met === false,
              'as-insight-card__sc--up': cond.direction === 'bullish',
              'as-insight-card__sc--dn': cond.direction === 'bearish'
            }"
          >
            <!-- 条件已触发：右上四字状态徽（染方向色） -->
            <text v-if="cond.met === true" class="as-insight-card__sc-live">条件成立</text>

            <!-- 路径首行：方向 + 短语名（label；sentence 模式或旧数据无 label → 长句主干） -->
            <view class="as-insight-card__sc-top">
              <text v-if="cond.direction" class="as-insight-card__dir" :class="dirClass(cond.direction)">
                {{ dirText(cond.direction) }}
              </text>
              <text v-if="cond.label && conditionDisplay !== 'sentence'" class="as-insight-card__sc-lead">{{ cond.label }}</text>
              <text v-else class="as-insight-card__sc-lead">{{ condMain(cond.condition) }}</text>
            </view>

            <!-- 关键词量化行：仅标签形态时独立成行（sentence/长句兜底不再重复） -->
            <view v-if="useKeywords(cond) && cond.label" class="as-insight-card__sc-kws">
              <text
                v-for="(k, ki) in cond.keywords"
                :key="ki"
                class="as-insight-card__sc-chip"
              >{{ k }}</text>
            </view>

            <!-- 情景正文（幅度/目标位段弱化；整句内联流，幅度段与前后文字粘连不孤立换行） -->
            <view class="as-insight-card__sc-then">
              <template v-for="(part, i) in scenarioParts(cond.scenario)" :key="i">
                <text
                  v-if="part.kind === 'amp'"
                  class="as-insight-card__sc-amp"
                >{{ part.t }}</text>
                <text v-else class="as-insight-card__sc-scenario">{{ part.t }}</text>
              </template>
            </view>

            <!-- 验证锚点（大盘等粒度 anchor.threshold/metric 透传，板块暂无则不渲染） -->
            <view v-if="hasAnchor(cond)" class="as-insight-card__sc-anchors">
              <text v-if="cond.anchor?.threshold" class="as-insight-card__anchor-chip">{{ cond.anchor.threshold }}</text>
              <text v-if="cond.anchor?.metric" class="as-insight-card__anchor-chip">{{ cond.anchor.metric }}</text>
            </view>
          </view>
        </template>
      </view>

      <view v-if="!activeBase && !activeConditions.length" class="as-insight-card__sc-empty">
        该期暂无细分情景
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * ConditionalForecastBlock 条件化预判块（洞见卡系通用块，2026-09-02 抽取）
 *
 * 用途：凡有条件化预判（structured：horizons 基准档 + conditions 互斥分支）的粒度——
 * 大盘/板块/个股——统一用本块渲染，与整卡形态（InsightCard structured）视觉完全一致。
 * 纯 UI 组件，方向/置信/期段/条件全部经 props 结构化传入，不引业务。
 * 类型与 InsightCard.structured 结构性一致，供整卡与块两种用法同源同构。
 */
type HorizonKey = 'short' | 'mid' | 'long'
type Direction = 'bullish' | 'bearish' | 'neutral'
type Confidence = 'high' | 'medium' | 'low'
type Verification = 'pending' | 'hit' | 'miss'

interface StructuredHorizon {
  horizon: HorizonKey
  /** 档位时长描述，如 "1-5 交易日"（缺省只显示 短/中/长） */
  remaining?: string
  /** 基准走势短语（4~6 字，如 恐慌出清为主；基准行“基准 · {label}”展示；旧数据无则回退） */
  label?: string
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
  /** 路径短语名，两段式“状态 · 走势”（如 恐慌出清 · 下跌中继；路径首行加粗展示） */
  label?: string
  /** 触发条件（可量化的市场事实描述） */
  condition: string
  /** 条件满足后的走势预判（含幅度/目标位等，展示原文） */
  scenario: string
  /** 简洁展示用关键词（1~2 个，单条 ≤10 字；仅新数据携带，旧记录无 → 走长句兜底） */
  keywords?: string[]
  /** 验证锚点（可选透传：threshold/metric 以 chip 展示） */
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
  /** 条件化预判结构化数据（null → 整块不渲染） */
  structured: InsightStructuredForecast | null
  /** 条件行显示模式：tags=有 keywords 显示关键词标签（无则长句兜底）；sentence=强制长句原文（预测详情页用） */
  conditionDisplay?: 'tags' | 'sentence'
}>(), {
  structured: null,
  conditionDisplay: 'tags'
})

/** 该条件是否以关键词标签展示（tags 模式且有 keywords） */
function useKeywords(cond: StructuredCondition): boolean {
  return props.conditionDisplay === 'tags' && Boolean(cond.keywords?.length)
}

// ===== 期段状态 =====
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

/** 当前期内的条件情景（conditions 按 horizon 归组） */
const activeConditions = computed<StructuredCondition[]>(() => {
  const data = props.structured
  if (!data) return []
  return (data.conditions ?? []).filter((c) => c.horizon === activeHorizon.value)
})

const verifyText = computed(() => {
  const v = props.structured?.verification
  if (v === 'hit') return '已验证'
  if (v === 'miss') return '验证未中'
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

/** 是否有可展示的验证锚点 chip */
function hasAnchor(cond: StructuredCondition): boolean {
  return Boolean(cond.anchor && (cond.anchor.metric || cond.anchor.threshold))
}

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

/** 期段点击切换（方法化：避免模板内联赋值在跨端编译下的边界问题） */
const setActiveHorizon = (seg: HorizonKey) => {
  activeHorizon.value = seg
}

/**
 * 拆解 scenario 文本：幅度/目标位段（如 -3% ~ -5%、+3%、±1%、75 元）置灰弱化，
 * 其余正文保持主色。仅按带符号数字+%的形态拆分，不解析语义。
 * 幅度段首尾插入零宽连字符（U+2060）：段与前后文字不可在边界断开——避免
 * "+3%" 孤立到行首/行尾导致黑字换行（洞见卡换行优化 2026-09-03）。
 */
function splitScenario(text: string): Array<{ t: string; kind: 'text' | 'amp' }> {
  const ampRe = /[±+\-]?\d+(?:\.\d+)?%?(?:\s*[~～至到]\s*[±+\-]?\d+(?:\.\d+)?%?)?/g
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

/** 供模板渲染：与 splitScenario 同构，但幅度段首尾带 U+2060 防断行 */
function scenarioParts(text: string): Array<{ t: string; kind: 'text' | 'amp' }> {
  return splitScenario(text).map((p) =>
    p.kind === 'amp' ? { t: `\u2060${p.t}\u2060`, kind: 'amp' } : p,
  )
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
/* ===== 预判子卡（浅中性面板；与 InsightCard 文本形态预判同款。去金全中性 2026-09-03 方案 C） ===== */
.as-insight-card__fc {
  background: #f7f8fb;
  border: 1rpx solid #e3e6ec;
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
  padding: 2rpx 6rpx 0;
}

.as-insight-card__fc-key {
  font-size: 24rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  color: $ink;
}

/* 验证状态 pill */
.as-insight-card__verify {
  font-size: 22rpx;
  font-weight: 600;
  border-radius: $r-full;
  padding: 3rpx 16rpx;
}

.as-insight-card__verify--pending {
  color: #a4640b;
  background: #fff7e6;
  border: 1rpx solid #f0dcae;
}

.as-insight-card__verify--hit {
  color: $white;
  background: #1faf64;
}

.as-insight-card__verify--miss {
  color: $ink-mute;
  background: $bg-soft;
  border: 1rpx solid $line;
}

/* 期段切换 */
.as-insight-card__seg {
  display: flex;
  background: $white;
  border: 1rpx solid $line;
  border-radius: $r-sm;
  padding: 3rpx;
  margin: 0 4rpx;
}

.as-insight-card__seg-item {
  flex: 1;
  text-align: center;
  font-size: 24rpx;
  font-weight: 600;
  color: $ink-mute;
  padding: 6rpx 0;
  border-radius: $r-xs;
  transition: background $t-fast, color $t-fast;
}

.as-insight-card__seg-item--on {
  background: #edf2ff;
  color: #2455e6;
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
  padding: 0 6rpx;
}

.as-insight-card__ph-tt {
  font-size: 24rpx;
  color: $ink;
}

.as-insight-card__remain {
  margin-left: auto;
  font-size: 20rpx;
  color: $ink-faint;
}

/* 方向徽标（A股：看多=红 看空=绿 震荡=灰，文字随附消除歧义） */
.as-insight-card__dir {
  font-size: 22rpx;
  font-weight: 600;
  border-radius: $r-full;
  padding: 2rpx 14rpx;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
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
  font-size: 22rpx;
  color: $ink-mute;
}

/* 互斥情景路径（每支一张卡；行间“或”分隔；触发点亮/未触发置灰/缺省待观察） */
.as-insight-card__sc-list {
  display: flex;
  flex-direction: column;
  padding: 0 4rpx;
}

.as-insight-card__sc-or {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: 8rpx 8rpx 2rpx;
  color: $ink-faint;
}

.as-insight-card__sc-or::before,
.as-insight-card__sc-or::after {
  content: '';
  flex: 1;
  height: 1rpx;
  background: $line;
}

.as-insight-card__sc-or-tx {
  font-size: 22rpx;
  color: $ink-faint;
}

.as-insight-card__sc {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: $s-2 $s-3;
  border-radius: $r-sm;
  background: $white;
  border: 1rpx solid $line;
  transition: opacity $t-fast;
}

.as-insight-card__sc + .as-insight-card__sc-or + .as-insight-card__sc {
  margin-top: 0;
}

/* 触发（条件成立）：染方向色（看多=红 / 看空=绿），幅度段同染 */
.as-insight-card__sc--up.as-insight-card__sc--live {
  border-color: rgba(229, 77, 94, 0.6);
  background: linear-gradient(0deg, rgba(229, 77, 94, 0.08) 0%, $white 78%);
}

.as-insight-card__sc--dn.as-insight-card__sc--live {
  border-color: rgba(24, 160, 88, 0.6);
  background: linear-gradient(0deg, rgba(24, 160, 88, 0.08) 0%, $white 78%);
}

/* 明确未触发：整支降饱和 */
.as-insight-card__sc--off {
  opacity: 0.42;
}

/* 条件成立徽（右上；染方向色实心） */
.as-insight-card__sc-live {
  position: absolute;
  top: 10rpx;
  right: 12rpx;
  font-size: 20rpx;
  font-weight: 700;
  color: $white;
  border-radius: $r-full;
  padding: 2rpx 14rpx;
}

.as-insight-card__sc--up.as-insight-card__sc--live .as-insight-card__sc-live {
  background: $up;
}

.as-insight-card__sc--dn.as-insight-card__sc--live .as-insight-card__sc-live {
  background: $down;
}

/* 路径首行：方向 + 短语名（label）或长句主干 */
.as-insight-card__sc-top {
  display: flex;
  align-items: center;
  gap: $s-1;
  flex-wrap: wrap;
  padding-right: 90rpx;
}

/* 路径短语名（两段式 label；长句兜底同款）：加粗主句 */
.as-insight-card__sc-lead {
  font-size: 24rpx;
  font-weight: 600;
  color: $ink;
  line-height: $lh-tight;
}

/* 关键词量化行（独立于短语名下一行） */
.as-insight-card__sc-kws {
  display: inline-flex;
  flex-wrap: wrap;
  gap: $s-1;
  align-items: center;
  padding-right: 90rpx;
}

.as-insight-card__sc-chip {
  font-size: 22rpx;
  font-weight: 600;
  color: $ink;
  background: #f4f5f7;
  border: 1rpx solid #e3e6ec;
  border-radius: $r-xs;
  padding: 2rpx 14rpx;
  line-height: $lh-tight;
}

/* 情景正文：整句内联文本流（黑/灰同句排版，非 chip 拆分）——
   灰色幅度段以 U+2060 与前后文字粘连，行内自然换行不再孤立断句（2026-09-03） */
.as-insight-card__sc-then {
  display: block;
  font-size: 24rpx;
  color: $ink;
  line-height: $lh-tight;
}

.as-insight-card__sc-scenario {
  font-size: 24rpx;
  color: $ink;
  line-height: $lh-tight;
}

/* 幅度/目标位段（-3% ~ -5%、+3% 等）：弱化置灰；触发路径内随方向色 */
.as-insight-card__sc-amp {
  color: $ink-mute;
  font-weight: 600;
}

.as-insight-card__sc--up.as-insight-card__sc--live .as-insight-card__sc-amp {
  color: $up;
}

.as-insight-card__sc--dn.as-insight-card__sc--live .as-insight-card__sc-amp {
  color: $down;
}

/* 验证锚点 chip（threshold/metric；大盘等粒度传入时展示） */
.as-insight-card__sc-anchors {
  display: flex;
  flex-wrap: wrap;
  gap: $s-1;
  margin-top: 2rpx;
}

.as-insight-card__anchor-chip {
  font-size: 20rpx;
  line-height: 1.6;
  color: $ink-mute;
  background: #f4f5f7;
  border: 1rpx solid #e6e8ee;
  border-radius: $r-full;
  padding: 1rpx 14rpx;
}

.as-insight-card__sc-empty {
  font-size: 20rpx;
  color: $ink-faint;
  padding: 0 6rpx;
}
</style>
