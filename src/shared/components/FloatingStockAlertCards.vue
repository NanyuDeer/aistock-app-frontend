<template>
  <!-- ① 首页悬浮「自选股消息卡」：一只股票一张卡，多股堆叠（最多 3 张，下层只露头部）；
       上滑拖出即可叉掉该卡（H5 桌面用鼠标上拖演示；左右/下滑不响应）；
       点击下层卡把它置顶（只浏览，不关闭）；右上角圆钮一键关闭全部（本次会话隐藏） -->
  <view v-if="stack.length" class="fsac" :style="wrapStyle">
    <!-- measured 前只渲染最上层卡：拿不到实测高度时下层定位不可靠，避免"被完全遮住"的错误视觉 -->
    <template v-for="(card, idx) in stack" :key="card.symbol">
      <view
        v-if="idx === 0 || measured"
        class="fsac__card"
        :class="{ 'is-lower': idx > 0, 'is-dragging': following }"
        :style="cardStyle(idx)"
        @touchstart="onTouchStart($event, idx)"
        @touchmove="onTouchMove($event, idx)"
        @touchend="onTouchEnd($event, idx)"
        @touchcancel="onTouchCancel(idx)"
        @mousedown="onMouseDown($event, idx)"
        @tap="idx > 0 && promote(card.symbol)"
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

    <!-- 一键关闭全部：堆叠右上角悬浮圆钮，贴在卡片顶边之上（本次会话隐藏全部卡片） -->
    <view v-if="measured" class="fsac__close-all-float" :style="floatCloseStyle" @tap.stop="emit('closeAll')">
      <SvgIcon name="close-line" size="28rpx" color="#8a96b0" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { getTabBarBottomPx, getTabBarHeightPx, rpx2px } from '@/shared/utils/layout'
import { isH5 } from '@/shared/utils/platform'
import {
  dragProgress,
  resolveDragAxis,
  type DragAxis,
} from '@/shared/utils/cardStackSwipe'
import type { StockAlertCard } from '@/shared/utils/useStockAlerts'

/** 最多同时堆叠的卡片数（其余股票需关闭上层卡或点击下层卡置顶查看） */
const MAX_STACK = 3
/** 上滑关闭阈值（px）：向上拖出超过该距离松手即叉掉该卡（约卡片高度的 0.8 倍） */
const DISMISS_DISTANCE_PX = rpx2px(220)
/** 飞出动画时长（ms）：必须与 .fsac__card 的 transition 时长一致，否则复位早于动画结束会闪跳 */
const FLY_OUT_MS = 220
/** 鼠标拖动仅 H5 启用：电脑端用鼠标演示同一套「拖出即关闭」手势 */
const MOUSE_DRAG_ENABLED = isH5

const props = defineProps<{ cards: StockAlertCard[] }>()
const emit = defineEmits<{ close: [symbol: string]; closeAll: []; viewAll: [symbol: string] }>()

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

/** 跟手拖动状态：dragY = 手指（鼠标）纵向位移（px，仅向上为负），dragAxis = 已锁定的手势主轴 */
const dragY = ref(0)
const dragAxis = ref<DragAxis>('none')
/** 上滑达阈值：上层卡向上飞出后关闭（叉掉该卡） */
const dismissing = ref(false)
let dragStartX = 0
let dragStartY = 0
let settleTimer: ReturnType<typeof setTimeout> | null = null
/** 鼠标拖动监听是否已挂到 window（仅 H5 桌面演示用） */
let mouseListening = false

/** 是否处于「跟手」阶段：此间必须关闭 CSS 过渡，卡片才能 1:1 跟随手指/鼠标 */
const following = computed(() => dragAxis.value !== 'none' && !dismissing.value)

/**
 * 逐层定位：
 *   idx=0 完整展开卡 —— 上滑跟手位移（松手后回弹 / 飞出交给 transition）；左右/下滑不响应
 *   idx>0 下层卡 —— 静态堆叠位（底边、缩放、透明度、模糊按层固定；点击可置顶）
 */
function cardStyle(idx: number): Record<string, string> {
  if (idx === 0) {
    // 拖出进度只用于淡出；下层卡不随拖动升位（切换改为点击下层卡置顶）
    const dragProgressValue = dragProgress(dragY.value, DISMISS_DISTANCE_PX)
    return {
      bottom: '0px',
      zIndex: '100',
      transform: `translateY(${dragY.value}px) scale(1)`,
      transformOrigin: 'bottom center',
      opacity: String(dismissing.value ? 0 : 1 - dragProgressValue * 0.45),
    }
  }
  const slot = layerSlot(idx)
  return {
    bottom: `${slot.bottom}px`,
    zIndex: String(100 - idx),
    transform: `scale(${slot.scale})`,
    transformOrigin: 'bottom center',
    opacity: String(slot.opacity),
    filter: `blur(${slot.blur}px)`,
  }
}

/** 一键关闭全部：贴在堆叠卡顶边之上（依赖于最上层卡实测高度） */
const floatCloseStyle = computed(() => ({
  bottom: `${(cardHeights.value[0] || 0) + 8}px`,
}))

/** 点击下层卡：把它置顶（只改变浏览顺序，不关闭任何卡） */
function promote(symbol: string): void {
  if (!order.value.includes(symbol)) return
  order.value = [symbol, ...order.value.filter((s) => s !== symbol)]
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

/** 起手：记录起点并清空位移（关闭动画进行中不再接受新手势） */
function beginDrag(x: number, y: number): void {
  if (dismissing.value) return
  dragStartX = x
  dragStartY = y
  dragAxis.value = 'none'
  dragY.value = 0
}

/**
 * 跟手移动：只响应「向上」的纵向手势（关闭手势）。
 * 左右与下滑一律不跟手（用户已确认取消：左右滑/下滑不做事）。
 */
function applyDrag(x: number, y: number): void {
  if (dismissing.value) return
  const dx = x - dragStartX
  const dy = y - dragStartY
  if (dragAxis.value === 'none') dragAxis.value = resolveDragAxis(dx, dy)

  if (dragAxis.value === 'vertical') {
    dragY.value = Math.min(0, dy)
    return
  }
  // 横向手势：不跟手、不关闭
  if (dragAxis.value === 'horizontal') dragY.value = 0
}

/** 松手结算：上滑超过阈值即叉掉该卡；其余情况（左右/下滑/位移不足）一律回弹归位 */
function settleDrag(x: number, y: number): void {
  if (dismissing.value) return
  const dy = y - dragStartY
  const axis = dragAxis.value
  dragAxis.value = 'none'

  if (axis === 'vertical' && dy <= -DISMISS_DISTANCE_PX) {
    flyAway()
    return
  }
  dragY.value = 0
}

/**
 * 只有最上层卡参与拖动（下层卡被上层遮住大半，点它 = 置顶）。
 * 之前把监听挂在每张卡上，拖动下层卡会移动上层卡，是「左右滑动有 bug」的来源之一。
 */
function onTouchStart(event: TouchEvent, idx: number): void {
  if (idx !== 0) return
  const touch = event.touches?.[0]
  beginDrag(touch?.clientX ?? 0, touch?.clientY ?? 0)
}

function onTouchMove(event: TouchEvent, idx: number): void {
  if (idx !== 0) return
  const touch = event.touches?.[0]
  if (!touch) return
  applyDrag(touch.clientX ?? 0, touch.clientY ?? 0)
}

function onTouchEnd(event: TouchEvent, idx: number): void {
  if (idx !== 0) return
  const touch = event.changedTouches?.[0]
  settleDrag(touch?.clientX ?? dragStartX, touch?.clientY ?? dragStartY)
}

/** 手指中断/被系统抢占：直接回弹归位，避免卡片停在半路 */
function onTouchCancel(idx: number): void {
  if (idx !== 0 || dismissing.value) return
  dragAxis.value = 'none'
  dragY.value = 0
}

/**
 * H5 桌面：触摸事件不会触发，改用鼠标拖动，让「上滑关闭」在电脑上也能演示。
 * 卡内按钮（单卡关闭 ×/一键关闭/查看全部）不参与拖动，避免点按钮时误触发手势。
 */
function onMouseDown(event: MouseEvent, idx: number): void {
  if (idx !== 0 || !MOUSE_DRAG_ENABLED || typeof window === 'undefined') return
  const target = event.target as HTMLElement | null
  if (target?.closest?.('.fsac__close, .fsac__more, .fsac__close-all-float')) return
  beginDrag(event.clientX, event.clientY)
  if (!mouseListening) {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    mouseListening = true
  }
  event.preventDefault()
}

function onMouseMove(event: MouseEvent): void {
  applyDrag(event.clientX, event.clientY)
}

function onMouseUp(event: MouseEvent): void {
  settleDrag(event.clientX, event.clientY)
  stopMouseListeners()
}

function stopMouseListeners(): void {
  if (!mouseListening || typeof window === 'undefined') return
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  mouseListening = false
}

/**
 * 上滑达阈值：上层卡向上飞出淡出，动画结束后 emit close 交给父组件
 * （本次会话关闭该卡）。
 */
function flyAway(): void {
  const symbol = stack.value[0]?.symbol
  dismissing.value = true
  dragY.value = -((cardHeights.value[0] || 0) + 80)
  settleTimer = setTimeout(() => {
    settleTimer = null
    dismissing.value = false
    dragY.value = 0
    if (symbol) emit('close', symbol)
  }, FLY_OUT_MS)
}

onBeforeUnmount(() => {
  if (settleTimer) clearTimeout(settleTimer)
  stopMouseListeners()
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

/* 底部右侧：查看全部 */
.fsac__more {
  display: inline-flex;
  align-items: center;
  gap: 2rpx;
}

/* 一键关闭全部：堆叠右上角悬浮圆钮（贴在堆叠卡顶边之上） */
.fsac__close-all-float {
  position: absolute;
  right: 0;
  z-index: 101;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52rpx;
  height: 52rpx;
  border: 2rpx solid $line;
  border-radius: 50%;
  background: $bg-card;
  box-shadow: $shadow-sm;
}

.fsac__close-all-float:active {
  opacity: 0.6;
}

.fsac__more-text {
  color: $primary;
  font-size: $font-size-xs;
  font-weight: 600;
}
</style>
