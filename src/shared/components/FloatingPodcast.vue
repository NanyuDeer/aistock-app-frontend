<template>
  <!-- 播报悬浮窗：初始位于屏幕纵向 1/3 处右侧贴边；悬浮球可拖动，松手自动吸附左右边缘 -->
  <view v-if="store.visible" class="fp-wrap" :style="wrapStyle">
    <!-- 展开（ready）：播放条；收起时仅视觉隐藏（组件保持挂载，音频持续播放） -->
    <AudioPlayer
      v-if="store.status === 'ready' && store.audioUrl"
      :src="fullAudioUrl"
      :title="store.title"
      :autoplay="store.autoplay"
      :initial-time="store.startTime"
      :class="['fp-player', { 'fp-player--hidden': !store.expanded }]"
      @play="onPlayerPlay"
      @pause="onPlayerPause"
      @ended="onPlayerEnded"
    >
      <template #actions>
        <view class="fp-queue-badge" v-if="store.queue.length">
          <text class="fp-queue-badge-text">队列 {{ store.queue.length }}</text>
        </view>
        <view class="fp-switch-row">
          <text class="fp-switch-label">连续播放</text>
          <Switch
            :checked="store.continuousPlay"
            :color="SWITCH_COLOR"
            style="transform: scale(0.7)"
            @change="onContinuousToggle"
          />
        </view>
        <view class="fp-icon-btn" @tap="store.collapse">
          <SvgIcon name="arrow-right-s-line" size="26rpx" color="#0b5fff" />
        </view>
        <view class="fp-icon-btn" @tap="store.close">
          <SvgIcon name="close-line" size="26rpx" color="#0b5fff" />
        </view>
      </template>
    </AudioPlayer>

    <!-- 展开（loading / error）：轻量状态条 -->
    <view v-else-if="store.expanded" class="fp-mini">
      <view class="fp-mini-head">
        <text class="fp-mini-title">{{ store.title }}</text>
        <view class="fp-icon-btn" @tap="store.collapse">
          <SvgIcon name="arrow-right-s-line" size="26rpx" color="#0b5fff" />
        </view>
        <view class="fp-icon-btn" @tap="store.close">
          <SvgIcon name="close-line" size="26rpx" color="#0b5fff" />
        </view>
      </view>
      <view class="fp-mini-body">
        <LoadingState v-if="store.status === 'loading'" size="sm" text="正在合成播报音频..." />
        <view v-else-if="store.status === 'error'" class="fp-error">
          <text class="fp-error-text">{{ store.errorMsg }}</text>
          <Button size="sm" @click="store.generate">重试</Button>
        </view>
      </view>
    </view>

    <!-- 悬浮球：收起时显示，可拖动，松手吸附左右边缘；播放中图标持续旋转；无拖动视为点击展开 -->
    <view
      v-show="!store.expanded"
      class="fp-ball"
      :class="{ 'fp-ball--playing': store.playing }"
      @touchstart.stop.prevent="onDragStart"
      @touchmove.stop.prevent="onDragMove"
      @touchend.stop="onDragEnd"
      @touchcancel.stop="onDragEnd"
      @mousedown.stop.prevent="onDragStart"
    >
      <SvgIcon name="broadcast-line" size="32rpx" color="#ffffff" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePodcastStore } from '@/shared/store/modules/podcast'
import { isH5 } from '@/shared/utils/platform'
import SvgIcon from './SvgIcon.vue'
import { Button, LoadingState, AudioPlayer } from './index'

const store = usePodcastStore()

/** Switch 开启色（模板环境无 SCSS 变量，按本组件 SvgIcon color="#0b5fff" 惯例取品牌色） */
const SWITCH_COLOR = '#0b5fff'

/** AudioPlayer 开始播放：同步 store 播放状态（悬浮球旋转）+ 消费自动播放标记 */
function onPlayerPlay() {
  store.setPlaying(true)
  store.consumeAutoplay()
}

/** AudioPlayer 暂停/结束：同步 store 播放状态 */
function onPlayerPause() {
  store.setPlaying(false)
}

/** AudioPlayer 结束：消费队列下一项（若队列为空则复位播放态） */
function onPlayerEnded() {
  store.onAudioEnded()
}

/** 连续播放开关切换：仅当状态变化时同步 store（避免 Switch 双向回写循环） */
function onContinuousToggle(e: { detail: { value: boolean } }) {
  if (store.continuousPlay !== e.detail.value) {
    store.toggleContinuous()
  }
}

/** 悬浮球尺寸（rpx）与展开面板宽度（rpx） */
const BALL_SIZE_RPX = 72
const PANEL_WIDTH_RPX = 560
/** 贴边安全间距（px） */
const EDGE_MARGIN_PX = 4
/** H5 设计稿尺寸：rpx 换算基准恒为 390px，见 shared/utils/h5-scale.ts */
const DESIGN_WIDTH = 390
const DESIGN_HEIGHT = 693

/** 画布坐标空间（px）：H5 为 390×693 固定画布，App/小程序为屏幕尺寸 */
const winW = ref(DESIGN_WIDTH)
const winH = ref(DESIGN_HEIGHT)
const ballSizePx = ref(Math.round(BALL_SIZE_RPX * DESIGN_WIDTH / 750))
const panelWidthPx = ref(Math.round(PANEL_WIDTH_RPX * DESIGN_WIDTH / 750))

const posX = ref(0)
const posY = ref(0)
const dragging = ref(false)
const startX = ref(0)
const startY = ref(0)
const startLeft = ref(0)
const startTop = ref(0)
/** 拖动累计距离，用于区分「点击展开」与「拖动」 */
let movedDistance = 0

/** 拼接完整音频 URL（后端返回 /api/agent/audio/xxx.mp3 相对路径） */
const fullAudioUrl = computed(() => {
  if (!store.audioUrl) return ''
  const base = import.meta.env.VITE_API_BASE_URL || '/api'
  const path = store.audioUrl.replace(/^\/api/, '')
  return `${base}${path}`
})

/** 面板定位：按悬浮球所在半屏决定，球在右半屏 → 面板右对齐，左半屏 → 左对齐 */
const panelLeft = computed(() =>
  posX.value >= winW.value / 2 ? winW.value - panelWidthPx.value : 0,
)

const wrapStyle = computed(() => ({
  left: (store.expanded ? panelLeft.value : posX.value) + 'px',
  top: Math.min(
    posY.value,
    store.expanded ? winH.value - 240 : winH.value - ballSizePx.value,
  ) + 'px',
  // 拖动时不加过渡，松手吸附时平滑滑动
  transition: dragging.value ? 'none' : 'left 0.2s ease',
}))

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/** H5 端 #app 等比缩放比例（视口 px → 画布 px 换算，见 h5-scale.ts）；非 H5 为 1 */
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
  // H5 桌面端：鼠标移出球体后仍能继续拖动
  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }
}

function onDragMove(e: any) {
  if (!dragging.value) return
  const p = getPoint(e)
  // 视口位移 ÷ 缩放比例 = 画布位移（H5 整体缩放时换算，App/小程序比例为 1）
  const scale = getScale()
  const dx = (p.x - startX.value) / scale
  const dy = (p.y - startY.value) / scale
  movedDistance = Math.max(movedDistance, Math.abs(dx), Math.abs(dy))
  posX.value = clamp(startLeft.value + dx, 0, winW.value - ballSizePx.value)
  posY.value = clamp(startTop.value + dy, 0, winH.value - ballSizePx.value)
}

function onDragEnd() {
  if (!dragging.value) return
  dragging.value = false
  const isTap = movedDistance <= 4
  // 松手吸附到最近的屏幕边缘（左 or 右）
  posX.value = posX.value < winW.value / 2 ? 0 : winW.value - ballSizePx.value
  if (typeof window !== 'undefined') {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }
  movedDistance = 0
  // 无拖动视为点击 → 展开播放条
  if (isTap) {
    store.expand()
  }
}

function onMouseMove(e: MouseEvent) {
  onDragMove(e)
}

function onMouseUp() {
  onDragEnd()
}

onMounted(() => {
  if (!isH5) {
    // App / 小程序：以屏幕尺寸为坐标空间
    try {
      const sys = uni.getSystemInfoSync()
      winW.value = sys.windowWidth || DESIGN_WIDTH
      winH.value = sys.windowHeight || DESIGN_HEIGHT
    } catch {
      // 保持默认画布尺寸
    }
    const factor = winW.value / 750
    ballSizePx.value = Math.round(BALL_SIZE_RPX * factor)
    panelWidthPx.value = Math.round(PANEL_WIDTH_RPX * factor)
  }
  // 初始位置：右侧贴边、屏幕纵向 1/3 处
  posX.value = winW.value - ballSizePx.value - EDGE_MARGIN_PX
  posY.value = Math.round(winH.value / 3 - ballSizePx.value / 2)
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

/* 层级在 GlobalChatBar($z-fixed+1) 之上、抽屉($z-drawer) 之下；left/top 由脚本控制 */
.fp-wrap {
  position: fixed;
  z-index: $z-fixed + 50;
  display: flex;
  justify-content: flex-end;
}

/* 悬浮球：可拖动 */
.fp-ball {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, $primary 0%, $primary-deep 100%);
  border-radius: 50%;
  box-shadow: 0 8rpx 24rpx rgba(11, 95, 255, 0.35);
  /* 拖动时阻止页面滚动 */
  touch-action: none;
}

/* 展开（ready）：仅 AudioPlayer，卡片样式由 AudioPlayer 自带 */
.fp-player {
  width: 560rpx;
}

/* 收起态：播放条仅视觉隐藏（组件保持挂载，音频持续播放） */
.fp-player--hidden {
  display: none;
}

/* 播放中：悬浮球图标持续旋转 */
.fp-ball--playing :deep(.svg-icon-wrap) {
  animation: fp-spin 2s linear infinite;
}

@keyframes fp-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 展开（loading / error）：轻量状态条 */
.fp-mini {
  width: 560rpx;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-lg;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.12);
  padding: $s-3;
}

.fp-mini-head {
  display: flex;
  align-items: center;
  gap: 4rpx;
  margin-bottom: $s-2;
}

.fp-mini-title {
  flex: 1;
  font-size: 26rpx;
  font-weight: 600;
  color: $ink;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fp-icon-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fp-mini-body {
  min-height: 48rpx;
}

.fp-error {
  display: flex;
  align-items: center;
  gap: $s-2;
}

.fp-error-text {
  flex: 1;
  font-size: 22rpx;
  color: $up;
}

/* 播放条 actions 区：队列徽标 + 连续播放开关 */
.fp-queue-badge {
  padding: 0 10rpx;
  height: 32rpx;
  display: flex;
  align-items: center;
  background: rgba(11, 95, 255, 0.1);
  border-radius: 16rpx;
}
.fp-queue-badge-text {
  font-size: 20rpx;
  color: $primary;
}
.fp-switch-row {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.fp-switch-label {
  font-size: 20rpx;
  color: $ink;
}
</style>
