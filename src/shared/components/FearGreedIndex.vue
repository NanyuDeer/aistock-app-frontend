<template>
  <!-- 市场恐贪指数悬浮温度计：常驻首页，可拖拽 + 磁吸左右边缘；点击跳转恐贪指数页 -->
  <view class="fgi-wrap" :style="wrapStyle">
    <!-- 温度计主体：可拖动（touch / mouse），无拖动视为点击跳转恐贪指数页 -->
    <view
      class="fgi-body"
      :class="{ 'fgi-body--dragging': dragging }"
      @touchstart.stop.prevent="onDragStart"
      @touchmove.stop.prevent="onDragMove"
      @touchend.stop="onDragEnd"
      @touchcancel.stop="onDragEnd"
      @mousedown.stop.prevent="onDragStart"
    >
      <!-- 顶部数值 + 状态文字 -->
      <view class="fgi-head">
        <text class="fgi-head__value" :style="{ color: range.end }">{{ indexValue }}</text>
        <text class="fgi-head__label" :style="{ color: range.end }">{{ range.label }}</text>
      </view>

      <!-- 温度计管（垂直圆柱体） -->
      <view class="fgi-tube" :class="{ 'fgi-tube--pulse': range.isExtreme }">
        <!-- 呼吸灯外圈：仅冰点/沸点极端情绪时显示，提醒风险 -->
        <view
          v-if="range.isExtreme"
          class="fgi-pulse-ring"
          :style="{ '--pulse-color': range.pulseColor }"
        />

        <!-- 水银柱：高度随指数动态变化 -->
        <view class="fgi-mercury" :style="mercuryStyle" />
      </view>

      <!-- 底部圆球 -->
      <view class="fgi-bulb" :style="{ background: `linear-gradient(135deg, ${range.start}, ${range.end})` }" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { isH5 } from '@/shared/utils/platform'
import { fearGreedApi } from '@/shared/api/modules/fear-greed'

/**
 * 恐贪指数分档定义（国际 Fear & Greed Index 标准配色）
 * 颜色为恐贪指数固定标准色，非设计 token，故在本组件内常量定义。
 */
interface RangeDef {
  min: number
  max: number
  label: string
  /** 渐变起始色（深） */
  start: string
  /** 渐变结束色（浅） */
  end: string
  /** 呼吸灯颜色（rgba） */
  pulseColor: string
  advice: string
  /** 是否极端档（冰点 / 沸点），触发呼吸灯 */
  isExtreme: boolean
}

const RANGES: RangeDef[] = [
  { min: 0, max: 25, label: '冰点', start: '#FF3B30', end: '#FF6B60', pulseColor: 'rgba(255, 59, 48, 0.55)', advice: '市场恐慌，可能错配，可关注超跌机会', isExtreme: true },
  { min: 25, max: 45, label: '寒冷', start: '#FF9500', end: '#FFB84D', pulseColor: 'rgba(255, 149, 0, 0)', advice: '市场偏谨慎，建议控制仓位', isExtreme: false },
  { min: 45, max: 55, label: '常温', start: '#FFCC00', end: '#FFE066', pulseColor: 'rgba(255, 204, 0, 0)', advice: '市场情绪平稳，保持观望', isExtreme: false },
  { min: 55, max: 80, label: '温热', start: '#34C759', end: '#6AE07A', pulseColor: 'rgba(52, 199, 89, 0)', advice: '市场偏乐观，注意追高风险', isExtreme: false },
  { min: 80, max: 100, label: '沸点', start: '#00C853', end: '#5AFF8F', pulseColor: 'rgba(0, 200, 83, 0.55)', advice: '市场过热，谨防回调风险', isExtreme: true },
]

/**
 * 指数数值（0-100）。
 * 页面挂载时从恐贪指数服务拉取真实值；失败时保留默认值。
 */
const indexValue = ref(12)

/** 当前分档（颜色 / 状态 / 建议 / 是否极端） */
const range = computed<RangeDef>(() => {
  const v = indexValue.value
  return RANGES.find((r) => v >= r.min && v < r.max) ?? RANGES[RANGES.length - 1]
})

/** 水银柱高度 + 渐变颜色 */
const mercuryStyle = computed(() => ({
  height: Math.max(0, Math.min(100, indexValue.value)) + '%',
  background: `linear-gradient(to top, ${range.value.start} 0%, ${range.value.end} 100%)`,
}))

/* ===== 悬浮拖拽 + 磁吸（参考 FloatingPodcast 实现） ===== */
const BODY_WIDTH_RPX = 88
/** 贴边安全间距（px） */
const EDGE_MARGIN_PX = 4
/** H5 设计稿尺寸：rpx 换算基准恒为 390px，见 shared/utils/h5-scale.ts */
const DESIGN_WIDTH = 390
const DESIGN_HEIGHT = 693

const winW = ref(DESIGN_WIDTH)
const winH = ref(DESIGN_HEIGHT)
const bodyWidthPx = ref(Math.round((BODY_WIDTH_RPX * DESIGN_WIDTH) / 750))

// 初始位置直接定为「左侧贴边、屏幕纵向中部」，声明时就渲染在目标位置，
// 避免 onMounted 之后才定位导致首帧先出现在左上角再跳变的闪烁。
// App 端 onMounted 会用真实窗口尺寸重算；H5 端 winH 恒为 DESIGN_HEIGHT，故数值一致不变。
const posX = ref(EDGE_MARGIN_PX)
const posY = ref(Math.round((DESIGN_HEIGHT - 240) / 2))
const dragging = ref(false)
const startX = ref(0)
const startY = ref(0)
const startLeft = ref(0)
const startTop = ref(0)
/** 拖动累计距离，用于区分「点击跳转」与「拖动」 */
let movedDistance = 0

const wrapStyle = computed(() => ({
  left: posX.value + 'px',
  top: posY.value + 'px',
  // 拖动时透明度略微降低（触感反馈）；松手吸附时平滑滑动
  opacity: dragging.value ? 0.85 : 1,
  transition: dragging.value ? 'none' : 'left 0.2s ease, top 0.2s ease',
}))

/* ===== 拖拽逻辑 ===== */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/** H5 端 #app 等比缩放比例（视口 px → 画布 px 换算）；非 H5 为 1 */
function getScale(): number {
  if (!isH5) return 1
  const s = Math.min(
    1,
    window.innerWidth / DESIGN_WIDTH,
    window.innerHeight / DESIGN_HEIGHT,
  )
  return s > 0 ? s : 1
}

/** 统一取触点坐标（touch / mouse） */
function getPoint(e: any): { x: number; y: number } {
  const t = e?.touches?.[0] || e?.changedTouches?.[0]
  if (t && typeof t.clientX === 'number') return { x: t.clientX, y: t.clientY }
  return { x: e?.clientX ?? 0, y: e?.clientY ?? 0 }
}

function onDragStart(e: any) {
  dragging.value = true
  movedDistance = 0
  const p = getPoint(e)
  startX.value = p.x
  startY.value = p.y
  startLeft.value = posX.value
  startTop.value = posY.value
  // H5 桌面端：鼠标移出组件后仍能继续拖动
  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }
}

function onDragMove(e: any) {
  if (!dragging.value) return
  const p = getPoint(e)
  const scale = getScale()
  const dx = (p.x - startX.value) / scale
  const dy = (p.y - startY.value) / scale
  movedDistance = Math.max(movedDistance, Math.abs(dx), Math.abs(dy))
  posX.value = clamp(startLeft.value + dx, 0, winW.value - bodyWidthPx.value)
  posY.value = clamp(startTop.value + dy, 0, winH.value - bodyWidthPx.value)
}

function onDragEnd() {
  if (!dragging.value) return
  dragging.value = false
  const isTap = movedDistance <= 4
  // 松手吸附到最近的屏幕边缘（左 or 右）
  posX.value = posX.value < winW.value / 2 ? EDGE_MARGIN_PX : winW.value - bodyWidthPx.value - EDGE_MARGIN_PX
  if (typeof window !== 'undefined') {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }
  movedDistance = 0
  // 无拖动视为点击 → 跳转到恐贪指数页面
  if (isTap) {
    uni.navigateTo({ url: '/modules/fear-greed/pages/index' })
  }
}

function onMouseMove(e: MouseEvent) {
  onDragMove(e)
}

function onMouseUp() {
  onDragEnd()
}

onMounted(async () => {
  // 拉取真实恐贪指数：首页悬浮温度计显示实时情绪
  try {
    const d = await fearGreedApi.getDashboard('jq')
    if (d?.currentIndex != null) indexValue.value = d.currentIndex
  } catch {
    // 拉取失败时保留默认值，不阻塞首页渲染
  }
  if (!isH5) {
    try {
      const sys = uni.getSystemInfoSync()
      winW.value = sys.windowWidth || DESIGN_WIDTH
      winH.value = sys.windowHeight || DESIGN_HEIGHT
    } catch {
      // 保持默认画布尺寸
    }
    bodyWidthPx.value = Math.round((BODY_WIDTH_RPX * winW.value) / 750)
  }
  // 初始位置：左侧贴边、屏幕纵向中部（避免默认悬在右侧带来的"乱飘"观感）
  posX.value = EDGE_MARGIN_PX
  posY.value = Math.round((winH.value - 240) / 2)
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }
})
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

/* 悬浮层：层级在 GlobalChatBar($z-fixed+1) 之上，避免被内容覆盖 */
.fgi-wrap {
  position: fixed;
  z-index: $z-fixed + 40;
}

.fgi-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  touch-action: none;
  cursor: grab;

  &--dragging {
    cursor: grabbing;
  }
}

/* 顶部数值 + 状态文字 */
.fgi-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 6rpx;
  background: rgba(255, 255, 255, 0.88);
  border-radius: $r-sm;
  padding: 4rpx 12rpx;
  box-shadow: $shadow-sm;
  backdrop-filter: blur(8rpx);
  border: 1rpx solid rgba(255, 255, 255, 0.9);
}

.fgi-head__value {
  font-size: 28rpx;
  font-weight: 800;
  line-height: 1.1;
  font-family: $font-mono;
}

.fgi-head__label {
  font-size: 18rpx;
  font-weight: 600;
  margin-top: 1rpx;
}

/* 温度计管：垂直圆柱体，磨砂玻璃外管 */
.fgi-tube {
  position: relative;
  width: 36rpx;
  height: 180rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.65);
  border: 1rpx solid $line;
  box-shadow: $shadow-sm, inset 0 1rpx 4rpx rgba(11, 95, 255, 0.06);
  backdrop-filter: blur(6rpx);
  overflow: hidden;
}

/* 呼吸灯外圈：冰点/沸点极端情绪时提醒风险 */
.fgi-pulse-ring {
  position: absolute;
  top: -6rpx;
  left: -6rpx;
  right: -6rpx;
  bottom: -6rpx;
  border-radius: 22rpx;
  animation: fgi-pulse 1.6s ease-out infinite;
}

@keyframes fgi-pulse {
  0% {
    box-shadow: 0 0 0 0 var(--pulse-color);
  }
  100% {
    box-shadow: 0 0 0 20rpx rgba(0, 0, 0, 0);
  }
}

/* 水银柱：从底部升起，高度随指数变化 */
.fgi-mercury {
  position: absolute;
  bottom: 4rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 20rpx;
  border-radius: 8rpx 8rpx 2rpx 2rpx;
  transition: height 0.6s ease-in-out;
}

/* 底部圆球：温度计水银球 */
.fgi-bulb {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  margin-top: -8rpx;
  box-shadow: $shadow-sm, inset 0 2rpx 4rpx rgba(255, 255, 255, 0.4);
  border: 1rpx solid rgba(255, 255, 255, 0.8);
}
</style>
