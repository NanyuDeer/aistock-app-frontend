<template>
  <!-- ① 首页悬浮「自选股消息卡」：一只股票一张卡，多股堆叠（最多 3 张，下层只露头部）；
       H5/App 支持左右跟手拖动切换（iOS 式堆叠回弹），各端保留上下滑动切换 -->
  <view v-if="stack.length" class="fsac" :style="wrapStyle">
    <!-- measured 前只渲染最上层卡：拿不到实测高度时下层定位不可靠，避免"被完全遮住"的错误视觉 -->
    <template v-for="(card, idx) in stack" :key="card.symbol">
      <view
        v-if="idx === 0 || measured"
        class="fsac__card"
        :class="{ 'is-lower': idx > 0, 'is-dragging': following }"
        :style="cardStyle(idx)"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @touchcancel="onTouchCancel"
      >
      <!-- 头部：股票名 + 代码 + 涨跌幅（下层卡露出这一行；最后一层留空，只作堆叠边条） -->
      <view class="fsac__head" :class="{ 'is-blank': !showHead(idx) }">
        <template v-if="showHead(idx)">
          <view class="fsac__bar" :class="card.direction === 'up' ? 'is-up' : 'is-down'" />
          <text class="fsac__name">{{ card.stockName }}</text>
          <text class="fsac__code">{{ shortSymbol(card.symbol) }}</text>
          <text class="fsac__change" :class="card.direction === 'up' ? 'is-up' : 'is-down'">
            {{ changeText(card.changePct) }}
          </text>
          <text v-if="card.isLimitUp" class="fsac__limit">涨停</text>
          <view v-if="idx === 0" class="fsac__close" @tap.stop="emit('close', card.symbol)">
            <SvgIcon name="close-line" size="26rpx" color="#8a96b0" />
          </view>
        </template>
      </view>

      <!-- 5 类消息：每类一行，显示该类最新标题（仅最上层卡展开） -->
      <template v-if="idx === 0">
        <view class="fsac__rows">
          <view v-for="row in card.rows" :key="row.key" class="fsac__row">
            <text class="fsac__tag">{{ row.label }}</text>
            <text class="fsac__row-title">{{ row.title }}</text>
            <text v-if="row.count > 1" class="fsac__row-count">{{ row.count }}</text>
          </view>
          <view v-if="!card.rows.length" class="fsac__empty">暂无消息明细</view>
        </view>
        <!-- 底部：全部消息条数（含未读） + 查看全部入口 -->
        <view class="fsac__foot">
          <text class="fsac__count">{{ countText(card) }}</text>
          <view class="fsac__more" @tap.stop="emit('viewAll', card.symbol)">
            <text class="fsac__more-text">查看全部</text>
            <SvgIcon name="arrow-right-s-line" size="26rpx" color="#8a96b0" />
          </view>
        </view>
      </template>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { getTabBarBottomPx, getTabBarHeightPx, rpx2px } from '@/shared/utils/layout'
import { isApp, isH5 } from '@/shared/utils/platform'
import {
  dragProgress,
  lerp,
  resolveDragAxis,
  resolveSwipeDirection,
  rotateOrder,
  tiltDegrees,
  type DragAxis,
  type SwipeDirection,
} from '@/shared/utils/cardStackSwipe'
import type { StockAlertCard } from '@/shared/utils/useStockAlerts'

/** 最多同时堆叠的卡片数（其余股票需滑动查看） */
const MAX_STACK = 3
/** 纵向滑动切换阈值（px）：上/下滑沿用原有手感，未改动 */
const SWIPE_THRESHOLD_PX = 30
/** 横向拖动判定切换的距离（px，约卡片宽度的 1/3），同时作为跟手进度 1 的基准 */
const SWITCH_DISTANCE_PX = rpx2px(240)
/** 跟手倾斜上限（deg）：拖动到 SWITCH_DISTANCE_PX 时达到该角度，超出按上限截断 */
const MAX_TILT_DEG = 4
/** 飞出动画时长（ms）：必须与 .fsac__card 的 transition 时长一致，否则顺序轮转早于动画结束会闪跳 */
const FLY_OUT_MS = 220
/** 横向跟手拖动仅在 H5 / App 端启用：小程序（原生 swiper 生态不同、触摸事件语义有差异）保持原有上下滑动 */
const HORIZONTAL_SWIPE_ENABLED = isH5 || isApp

const props = defineProps<{ cards: StockAlertCard[] }>()
const emit = defineEmits<{ close: [symbol: string]; viewAll: [symbol: string] }>()

const instance = getCurrentInstance()

/**
 * 实测高度：最上层卡内容行数不定（1~5 行），高度是变量；下层卡还要逐层缩小。
 * 下层卡必须排在「最上层卡顶边之上」才能露出头部，因此偏移量必须按实测高度反推，
 * 不能用固定值（固定值会导致展开态把下一张完全盖住）。
 * 数组下标与 stack 一致：0=最上层完整卡，1/2=下层卡。
 */
const cardHeights = ref<number[]>([])
/** 是否已拿到可信高度：未拿到前只渲染最上层卡，避免用兜底高度算出错误堆叠位置（下层被全遮） */
const measured = ref(false)
let measureRetries = 0

function measureCards(): void {
  // H5 预览画布对 #app 施加了全局缩放（适配画布宽度），boundingClientRect 返回的是「缩放后」
  // 视觉尺寸，若直接与 bottom（CSS px）混算会整体压缩露出高度（实测目标 24px 只剩 18px）。
  // 故 H5 优先读 offsetHeight —— 它是不受 transform 影响的 CSS px，与 bottom 同一坐标系。
  if (typeof document !== 'undefined') {
    const nodes = document.querySelectorAll('.fsac__card')
    const heights = Array.from(nodes).map((el) => (el as HTMLElement).offsetHeight)
    if (heights.length && heights[0] > 1) {
      cardHeights.value = heights
      measured.value = true
      measureRetries = 0
      return
    }
  }
  // 非 H5（或 DOM 未就绪）走跨端查询兜底
  const query = uni.createSelectorQuery()
  query
    .in(instance?.proxy as never)
    .selectAll('.fsac__card')
    .boundingClientRect((rects) => {
      const list = (rects as Array<{ height?: number }> | null) ?? []
      const heights = list.map((r) => r?.height ?? 0)
      if (heights.length && heights[0] > 1) {
        cardHeights.value = heights
        measured.value = true
        measureRetries = 0
        return
      }
      // 布局尚未完成（拿不到有效高度）：短暂重试，避免用兜底值定位
      if (measureRetries < 3) {
        measureRetries += 1
        setTimeout(measureCards, 80)
      }
    })
    .exec()
}

/** 定位：贴在 tab 栏上边缘之上 12rpx（与原悬浮条一致） */
const wrapStyle = computed(() => ({
  bottom: `${getTabBarBottomPx() + getTabBarHeightPx() + rpx2px(12)}px`,
}))

/** 展示顺序（symbol）；数据刷新时保留用户已切换的顺序，新增股票追加到末尾 */
const order = ref<string[]>([])
watch(
  () => props.cards.map((c) => c.symbol).join(','),
  () => {
    const symbols = props.cards.map((c) => c.symbol)
    const kept = order.value.filter((s) => symbols.includes(s))
    order.value = [...kept, ...symbols.filter((s) => !kept.includes(s))]
  },
  { immediate: true },
)

/** 实际渲染的堆叠（最多 3 张，idx=0 为最上层完整卡） */
const stack = computed<StockAlertCard[]>(() => {
  const map = new Map(props.cards.map((c) => [c.symbol, c]))
  return order.value
    .map((s) => map.get(s))
    .filter((c): c is StockAlertCard => Boolean(c))
    .slice(0, MAX_STACK)
})

/** 逐层退化参数（idx 从 1 开始）：越靠后越淡、越模糊（幅度克制，保证文字可辨） */
const LOWER_LAYERS: Array<{ opacity: string; blur: string }> = [
  { opacity: '0.9', blur: '0.2px' },
  { opacity: '0.8', blur: '0.5px' },
]

/** 各下层卡的目标「露出高度」（px）：第 2 层约露 3/4（股票名大致可读），第 3 层只留一条边 */
const PEEK_HEIGHTS = [rpx2px(46), rpx2px(24)]

/** 是否渲染头部内容：最后一层只保留空白边条（不显示股票名），强化堆叠暗示 */
function showHead(idx: number): boolean {
  return idx === 0 || idx < stack.value.length - 1
}

function visualHeight(k: number): number {
  return cardHeights.value[k] || cardHeights.value[0] || 0
}

/**
 * 第 idx 层卡的底边偏移：由「目标露出高度」反推，超出部分被上层卡遮住（遮挡文字是预期效果）。
 *   B1 = H0 + peek1 - h1
 *   Bk = B(k-1) + h(k-1) + peek_k - h_k
 * 其中 H0=最上层卡高度、h_k=第 k 层卡实测（含 scale）高度、peek_k=目标露出高度。
 * 仅在 measured=true（已拿到可信高度）后被调用，故此处不做兜底。
 */
function bottomOffset(idx: number): number {
  const h0 = cardHeights.value[0] || 0
  let bottom = h0 + (PEEK_HEIGHTS[0] ?? 0) - visualHeight(1)
  for (let k = 2; k <= idx; k += 1) {
    bottom += visualHeight(k - 1) + (PEEK_HEIGHTS[k - 1] ?? PEEK_HEIGHTS[PEEK_HEIGHTS.length - 1]) - visualHeight(k)
  }
  return bottom
}

/** 层位参数：k=0 为最上层完整卡位，k>=1 为第 k 层堆叠位（仅露出头部） */
interface LayerSlot {
  bottom: number
  scale: number
  opacity: number
  blur: number
}

function layerSlot(k: number): LayerSlot {
  if (k <= 0) return { bottom: 0, scale: 1, opacity: 1, blur: 0 }
  const layer = LOWER_LAYERS[Math.min(k, LOWER_LAYERS.length) - 1]
  return {
    bottom: bottomOffset(k),
    scale: 1 - k * 0.05,
    opacity: Number(layer.opacity),
    blur: Number.parseFloat(layer.blur),
  }
}

/** 跟手拖动状态：dragX = 手指水平位移（px），dragAxis = 已锁定的手势主轴，flyingOut = 上层卡正在飞出 */
const dragX = ref(0)
const dragAxis = ref<DragAxis>('none')
const flyingOut = ref(false)
let touchStartX = 0
let touchStartY = 0
let flyOutTimer: ReturnType<typeof setTimeout> | null = null

/** 拖动进度 0~1：驱动下层卡升位、上层卡淡出；飞出阶段固定为 1（下一张已就位） */
const progress = computed(() => (flyingOut.value ? 1 : dragProgress(dragX.value, SWITCH_DISTANCE_PX)))

/** 是否处于「跟手」阶段：此间必须关闭 CSS 过渡，卡片才能 1:1 跟随手指 */
const following = computed(() => dragAxis.value === 'horizontal' && !flyingOut.value)

/**
 * 逐层定位：
 *   idx=0 完整展开卡 —— 跟手位移 + 倾斜（松手后的回弹 / 飞出交给 transition）
 *   idx>0 下层卡 —— 底边、缩放、透明度、模糊按 progress 从「第 idx 层位」过渡到「第 idx-1 层位」，
 *                   进度满时下一张正好落到完整展开位，因此顺序轮转时不会跳变
 */
function cardStyle(idx: number): Record<string, string> {
  const p = progress.value
  if (idx === 0) {
    const tilt = tiltDegrees(dragX.value, MAX_TILT_DEG, SWITCH_DISTANCE_PX)
    return {
      bottom: '0px',
      zIndex: '100',
      transform: `translateX(${dragX.value}px) rotate(${tilt}deg) scale(1)`,
      transformOrigin: 'bottom center',
      opacity: String(flyingOut.value ? 0 : 1 - p * 0.45),
    }
  }
  const from = layerSlot(idx)
  const to = layerSlot(idx - 1)
  return {
    bottom: `${lerp(from.bottom, to.bottom, p)}px`,
    zIndex: String(100 - idx),
    transform: `scale(${lerp(from.scale, to.scale, p)})`,
    transformOrigin: 'bottom center',
    opacity: String(lerp(from.opacity, to.opacity, p)),
    filter: `blur(${lerp(from.blur, to.blur, p)}px)`,
  }
}

// 最上层卡的内容（行数/股票）变化后重新测量高度，驱动下层卡重新定位
watch(
  () => [stack.value.length, stack.value[0]?.symbol ?? '', stack.value[0]?.rows.length ?? 0].join('|'),
  () => { void nextTick(measureCards) },
  { immediate: true, flush: 'post' },
)

// 首屏挂载后再测一次：immediate watch 触发时 DOM 尚未完成布局
onMounted(() => { void nextTick(measureCards) })

// measured 置位后下层卡才渲染出来，需再测一次以拿到它们的真实高度
watch(measured, (ready) => { if (ready) void nextTick(measureCards) })

// 卡片清空（全部关闭/登出）后复位，下次数据到达时重新走「先测高、再渲染下层」
watch(() => stack.value.length, (len) => { if (!len) measured.value = false })

function onTouchStart(event: TouchEvent): void {
  if (flyingOut.value) return
  const touch = event.touches?.[0]
  touchStartX = touch?.clientX ?? 0
  touchStartY = touch?.clientY ?? 0
  dragAxis.value = 'none'
  dragX.value = 0
}

function onTouchMove(event: TouchEvent): void {
  // 单张卡无从切换，不进入跟手拖动
  if (!HORIZONTAL_SWIPE_ENABLED || flyingOut.value || order.value.length < 2) return
  const touch = event.touches?.[0]
  if (!touch) return
  const dx = (touch.clientX ?? 0) - touchStartX
  const dy = (touch.clientY ?? 0) - touchStartY
  // 首次越过锁定阈值才定主轴：纵向手势直接让位给原有上下滑动，不做跟手
  if (dragAxis.value === 'none') {
    dragAxis.value = resolveDragAxis(dx, dy)
    if (dragAxis.value !== 'horizontal') return
  }
  if (dragAxis.value !== 'horizontal') return
  dragX.value = dx
}

function onTouchEnd(event: TouchEvent): void {
  if (flyingOut.value) return
  const endY = event.changedTouches?.[0]?.clientY ?? touchStartY

  // 横向跟手拖动：达阈值则飞出并轮转，未达阈值回弹归位
  if (dragAxis.value === 'horizontal') {
    dragAxis.value = 'none'
    const dir = resolveSwipeDirection(dragX.value, SWITCH_DISTANCE_PX)
    if (dir === 0) {
      dragX.value = 0
      return
    }
    flyOut(dir)
    return
  }

  // 纵向（含未锁定方向的小幅手势）：沿用原有上下滑动切换，上滑看下一张、下滑看上一张
  const delta = endY - touchStartY
  if (Math.abs(delta) < SWIPE_THRESHOLD_PX || order.value.length < 2) return
  dragX.value = 0
  order.value = rotateOrder(order.value, delta < 0 ? -1 : 1)
}

/** 手指中断/被系统抢占：直接回弹归位，避免卡片停在半路 */
function onTouchCancel(): void {
  if (flyingOut.value) return
  dragAxis.value = 'none'
  dragX.value = 0
}

/**
 * 松手达阈值：上层卡沿手势方向飞出淡出，动画结束后再轮转展示顺序并复位。
 * 动画结束时下一张卡已按 progress=1 停在完整展开位，故轮转不会产生位置跳变。
 */
function flyOut(dir: SwipeDirection): void {
  flyingOut.value = true
  dragX.value = dir * SWITCH_DISTANCE_PX * 1.6
  flyOutTimer = setTimeout(() => {
    flyOutTimer = null
    order.value = rotateOrder(order.value, dir)
    flyingOut.value = false
    dragX.value = 0
  }, FLY_OUT_MS)
}

onBeforeUnmount(() => {
  if (flyOutTimer) clearTimeout(flyOutTimer)
})

function shortSymbol(symbol: string): string {
  return symbol.replace(/^(SH|SZ|BJ)/, '')
}

function changeText(pct: number): string {
  if (pct == null || Number.isNaN(pct)) return '--'
  return `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`
}

/** 底部统计文案：共 4 条 · 2 未读（无未读时只显示条数） */
function countText(card: StockAlertCard): string {
  return card.unreadCount
    ? `共 ${card.totalCount} 条 · ${card.unreadCount} 未读`
    : `共 ${card.totalCount} 条`
}
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

.fsac {
  position: fixed;
  z-index: $z-fixed + 50;
  left: $s-3;
  right: $s-3;
  /* 高度为 0：卡片以其底边为基准向上堆叠（绝对定位子元素不参与撑高） */
  height: 0;
}

.fsac__card {
  position: absolute;
  left: 0;
  right: 0;
  overflow: hidden;
  border: 2rpx solid $line;
  border-radius: $r-md;
  background: $bg-card;
  box-shadow: $shadow-card;
  transition: bottom 0.22s ease, transform 0.22s ease, opacity 0.22s ease, filter 0.22s ease;
}

/* 下层卡：保留浅边框与弱阴影（让边缘可见），仅轻微降透明度和模糊，
   配合逐层缩小的 scale、递减露出高度，呈现"越往后越收敛"的堆叠层次 */
.fsac__card.is-lower {
  border-color: $line;
  box-shadow: $shadow-sm;
  background: rgba($bg-card, 0.94);
}

/* 跟手拖动中：关闭过渡，卡片才能 1:1 跟随手指（松手后由回弹/飞出动画接管） */
.fsac__card.is-dragging {
  transition: none;
}

.fsac__head {
  display: flex;
  align-items: center;
  gap: $s-1;
  padding: $s-2 $s-3;
}

/* 最后一层留空：只保留一条窄边，暗示"后面还有卡片" */
.fsac__head.is-blank {
  min-height: 44rpx;
}

.fsac__bar {
  flex: none;
  width: 6rpx;
  height: 32rpx;
  border-radius: $r-full;
  background: $ink-faint;

  &.is-up { background: $up; }
  &.is-down { background: $down; }
}

.fsac__name {
  font-size: $font-size-base;
  font-weight: 700;
  color: $ink;
}

.fsac__code {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.fsac__change {
  margin-left: auto;
  font-size: $font-size-base;
  font-weight: 700;

  &.is-up { color: $up; }
  &.is-down { color: $down; }
}

.fsac__limit {
  flex: none;
  padding: 0 8rpx;
  border-radius: $r-full;
  background: $up;
  color: #fff;
  font-size: 20rpx;
  line-height: 28rpx;
}

.fsac__close {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  margin-left: 4rpx;
}

.fsac__close:active {
  opacity: 0.6;
}

/* 5 类消息行 */
.fsac__rows {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: 0 $s-3 $s-2;
}

.fsac__row {
  display: flex;
  align-items: center;
  gap: $s-1;
  min-width: 0;
}

.fsac__tag {
  flex: none;
  padding: 2rpx 10rpx;
  border-radius: $r-full;
  background: $primary-50;
  color: $primary;
  font-size: 20rpx;
  line-height: 28rpx;
}

.fsac__row-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: $ink-soft;
  font-size: $font-size-xs;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fsac__row-count {
  flex: none;
  color: $ink-mute;
  font-size: 20rpx;
}

.fsac__empty {
  color: $ink-mute;
  font-size: $font-size-xs;
}

/* 底部：条数 + 查看全部 */
.fsac__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $s-1 $s-3 $s-2;
  border-top: 2rpx solid $line-soft;
}

.fsac__count {
  color: $ink-mute;
  font-size: $font-size-xs;
}

.fsac__more {
  display: inline-flex;
  align-items: center;
  gap: 2rpx;
}

.fsac__more-text {
  color: $primary;
  font-size: $font-size-xs;
  font-weight: 600;
}
</style>
