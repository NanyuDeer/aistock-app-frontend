<template>
  <!-- 播报悬浮窗：初始位于屏幕纵向 1/3 处右侧贴边；悬浮球可拖动，松手自动吸附左右边缘 -->
  <!-- 仅"当前前台页面"的实例渲染：store.activePage === pageKey（由页面根容器 MainTabs/
       SubPageCard/SubPageCard2 在 onShow/onActivated/onMounted 维护），避免返回页/旧页
       多实例并存导致双播放或悬浮球渲染在隐藏页。 -->
  <view v-if="store.visible && renderAllowed" class="fp-wrap" :style="wrapStyle">
    <!-- 展开（ready）：播放条；收起时仅视觉隐藏（组件保持挂载，音频持续播放） -->
    <AudioPlayer
      v-if="store.status === 'ready' && store.audioUrl"
      ref="playerRef"
      :src="fullAudioUrl"
      :title="store.title"
      :autoplay="store.autoplay"
      :initial-time="store.startTime"
      :persist="true"
      :class="['fp-player', { 'fp-player--hidden': !store.expanded }]"
      @play="onPlayerPlay"
      @pause="onPlayerPause"
      @ended="onPlayerEnded"
      @unmount="onPlayerUnmount"
    >
      <template #actions>
        <view class="fp-queue-badge" v-if="store.queue.length || store.pendingExternal">
          <text class="fp-queue-badge-text">队列 {{ store.queue.length + (store.pendingExternal ? 1 : 0) }}</text>
        </view>
        <view class="fp-switch-row">
          <text class="fp-switch-label">连续播放</text>
          <!-- uni-app 原生 switch 组件必须用小写标签，大写 <Switch> 会被当作自定义组件解析报 "Failed to resolve component" -->
          <switch
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
      @touchstart.stop="onDragStart"
      @touchmove.stop="onDragMove"
      @touchend.stop="onDragEnd"
      @touchcancel.stop="onDragEnd"
      @mousedown.stop.prevent="onDragStart"
    >
      <SvgIcon name="broadcast-line" size="32rpx" color="#ffffff" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, getCurrentInstance, onMounted, onUnmounted } from 'vue'
import { usePodcastStore } from '@/shared/store/modules/podcast'
import { API_BASE_URL } from '@/shared/utils/constants'
import { isH5 } from '@/shared/utils/platform'
import SvgIcon from './SvgIcon.vue'
import { Button, LoadingState, AudioPlayer } from './index'

const store = usePodcastStore()

/** 所属页面标识（由页面根容器 SubPageCard/SubPageCard2/MainTabs 传入）：
 *  H5 端与 store.activePage 比对判定本页是否前台（KeepAlive 多实例去重） */
const props = withDefaults(defineProps<{ pageKey?: string }>(), { pageKey: '' })

/** 本组件实例唯一标识：用于播放器控制句柄的归属校验（防止失活实例误清新实例注册） */
const myId = String(getCurrentInstance()?.uid ?? '')

// ===== 渲染权（当前前台页面唯一渲染） =====
// 全端统一：仅当 store.activePage === pageKey（本实例所在页面处于前台）时渲染，避免多实例双播放。
// store.activePage 由页面根容器 MainTabs/SubPageCard/SubPageCard2 在
// onShow/onActivated/onMounted（前台）与 onHide/onDeactivated（离场）时维护。
// 注：曾为 App/小程序单独采用"页面栈轮询 getCurrentPages() 比对路由"（提交 1f2e2f3），
// 但 App 端页面路由不暴露在 Vue 实例链上（findPageRoute 取不到自身路由），导致悬浮球
// 在 App 端不渲染；已回退统一走 store.activePage，与 H5 行为一致且可靠。
const renderAllowed = computed(() => store.activePage === props.pageKey)

/** AudioPlayer 实例引用：挂载后注册控制句柄到 store，供页面播放按钮暂停/继续 */
const playerRef = ref<InstanceType<typeof AudioPlayer> | null>(null)

/** AudioPlayer 挂载/卸载时同步注册播放器控制（flush:post 保证 ref 已赋值；携带实例 id 归属） */
watch(playerRef, () => {
  const ctrl = playerRef.value
  if (ctrl) {
    store.registerPlayer(myId, {
      pause: () => ctrl.pause(),
      play: () => ctrl.play(),
      togglePlay: () => ctrl.togglePlay(),
      seekTo: (t: number) => ctrl.seekTo(t),
    })
    // 跨页返回：AudioPlayer 重建，若存在未消费的续播点（切页前正在播放）则从记录进度自动续播。
    // play 延迟到 nextTick：同轮刷新中旧页面播放器销毁完成后才启动，避免新旧引擎短暂并存造成双音
    if (store.resumePending) {
      const t = store.playbackTime
      store.consumeResume()
      if (t > 0) ctrl.seekTo(t)
      nextTick(() => ctrl.play())
    }
  } else {
    store.unregisterPlayer(myId)
  }
}, { flush: 'post' })

/**
 * 续播竞态兜底：页面切换时序可能为「新页播放器先挂载、旧页后卸载上报续播点」，
 * 此时 watch(playerRef) 挂载时 resumePending 尚为 false，不会消费；后续旧页卸载写入
 * resumePending=true 后，本 watch 负责消费续播（仅当前渲染实例有 playerRef 时生效，
 * 多实例并存时只有前台实例渲染 AudioPlayer，天然单点消费）。
 */
watch(() => store.resumePending, () => {
  if (!store.resumePending) return
  const ctrl = playerRef.value
  if (ctrl) {
    const t = store.playbackTime
    store.consumeResume()
    if (t > 0) ctrl.seekTo(t)
    nextTick(() => ctrl.play())
  }
})

/** AudioPlayer 卸载（页面切换/换源）前上报播放状态：记录跨页续播点（携带本实例 id 防误续播） */
function onPlayerUnmount(state: { playing: boolean; currentTime: number }) {
  store.suspendPlayback(state, myId)
}

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

/** 连续播放开关切换：仅当状态变化时同步 store（避免 switch 双向回写循环）
 *  原生 <switch> 的 change 事件为 { detail: { value } }，类型用宽松 unknown 兼容 */
function onContinuousToggle(e: unknown) {
  const value = (e as { detail?: { value?: boolean } } | undefined)?.detail?.value
  if (value !== undefined && store.continuousPlay !== value) {
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
  const base = API_BASE_URL
  const path = store.audioUrl.replace(/^\/api/, '')
  return `${base}${path}`
})

/** 面板定位：按悬浮球所在半屏决定，球在右半屏 → 面板右对齐，左半屏 → 左对齐 */
const panelLeft = computed(() =>
  posX.value >= winW.value / 2 ? winW.value - panelWidthPx.value : 0,
)

const wrapStyle = computed(() => {
  // 顶部坐标：App/小程序 与 H5 一致换算（clamp 防止小屏/异常尺寸时跑到屏外）
  const baseTop = Math.min(
    posY.value,
    store.expanded ? winH.value - 240 : winH.value - ballSizePx.value,
  )
  // #ifdef H5
  const baseLeft = store.expanded ? panelLeft.value : posX.value
  const transition = dragging.value ? 'none' : 'left 0.2s ease'
  return { left: baseLeft + 'px', top: baseTop + 'px', transition }
  // #endif
  // #ifndef H5
  // App/小程序：内核可能把整页 n 倍整体缩放（实测 windowWidth=360 但 CSS rpx 基准 432），
  // 用 windowWidth 推算的 JS 尺寸与 CSS 渲染基准不一致，`left%` 推算的右缘位置会溢出
  // （贴右缘时悬浮球部分出屏）。静止/吸附态改用以可视区边缘为基准的 right/left 定位，
  // 保证悬浮球完全落在屏内；拖动中临时用 left% 跟随手指。
  const topPct = (baseTop / winH.value) * 100 + '%'
  const margin = EDGE_MARGIN_PX + 'px'
  if (dragging.value) {
    const baseLeft = store.expanded ? panelLeft.value : posX.value
    return {
      left: (baseLeft / winW.value) * 100 + '%',
      top: topPct,
      transition: 'none',
    }
  }
  // 静止/吸附：球在右半屏 → right:4px 贴右缘；左半屏 → left:4px 贴左缘。
  // 展开面板同理按所在半屏对齐（panelLeft 语义与 ball 相同）。
  const dockRight = posX.value >= winW.value / 2
  return dockRight
    ? { right: margin, top: topPct, transition: 'left 0.2s ease, right 0.2s ease' }
    : { left: margin, top: topPct, transition: 'left 0.2s ease, right 0.2s ease' }
  // #endif
})

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/**
 * 坐标空间说明：
 * - H5：#app 有 transform（translateZ(0) scale(s)，见 h5-scale.ts），transform 创建包含块，
 *   position:fixed 子元素相对 390×693 画布定位（非视口）。因此 winW/winH 用画布尺寸 390×693，
 *   rpx 按 390 基准换算（1rpx = 390/750）。拖动位移需按缩放比例换算回画布空间：
 *   屏幕位移 ÷ scale = 画布位移。用视口坐标会在大视口（>390px）时把悬浮球定位到画布外，
 *   被 #app 的 overflow:hidden 裁剪（"跑到页面外部"）。
 * - App/小程序：无整体 transform 缩放，fixed 相对屏幕。但 windowWidth 与 CSS rpx 的
 *   换算基准可能不一致（实测 App 端 CSS 按 432px 基准、windowWidth 却报 360px），
 *   因此 rpx→px 与坐标空间必须经 uni.upx2px() 取得（见 onMounted），scale 恒 1。
 */
function getScale(): number {
  if (!isH5 || typeof window === 'undefined') return 1
  // 与 h5-scale.ts applyScale 同公式：scale = min(1, 视口宽/390, 视口高/693)
  return Math.min(
    1,
    window.innerWidth / DESIGN_WIDTH,
    window.innerHeight / DESIGN_HEIGHT,
  )
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
  if (isH5) {
    // H5：fixed 相对 #app 画布（transform 包含块），winW/winH 用画布尺寸 390×693，
    // rpx 按 390 基准换算（见 getScale 注释：视口坐标在宽视口会超出画布被 overflow:hidden 裁剪）
    winW.value = DESIGN_WIDTH
    winH.value = DESIGN_HEIGHT
    const factor = DESIGN_WIDTH / 750
    ballSizePx.value = Math.round(BALL_SIZE_RPX * factor)
    panelWidthPx.value = Math.round(PANEL_WIDTH_RPX * factor)
  } else {
    // App / 小程序：坐标空间宽度统一取 CSS rpx 渲染基准，避免与 windowWidth 错位。
    // App 内核可能对整页 n 倍整体缩放（实测某真机 windowWidth=360 但 CSS rpx 基准=432），
    // 用 windowWidth 推算的 JS 尺寸与 CSS 渲染基准不一致，导致贴右缘的坐标推算溢出屏外
    // （此前悬浮球贴右侧时有一小段落在屏幕外侧）。uni.upx2px(750) 即渲染基准宽，
    // 使 JS 计算（拖拽 clamp、贴边阈值）与 CSS 渲染落在同一坐标系。
    try {
      const sys = uni.getSystemInfoSync()
      const renderedW = (typeof uni.upx2px === 'function' ? uni.upx2px(750) : 0)
        || sys.windowWidth || DESIGN_WIDTH
      winW.value = renderedW
      winH.value = sys.windowHeight || DESIGN_HEIGHT
    } catch {
      // 保持默认画布尺寸
    }
    // 悬浮球/面板宽也用 upx2px，与 CSS 的 rpx 尺寸一致（否则拖拽 clamp 与贴边判断偏小）
    ballSizePx.value = (typeof uni.upx2px === 'function' ? uni.upx2px(BALL_SIZE_RPX) : 0)
      || Math.round(BALL_SIZE_RPX * winW.value / 750)
    panelWidthPx.value = (typeof uni.upx2px === 'function' ? uni.upx2px(PANEL_WIDTH_RPX) : 0)
      || Math.round(PANEL_WIDTH_RPX * winW.value / 750)
  }
  // 初始位置：右侧贴边、屏幕纵向 1/3 处（clamp 防止小屏/异常尺寸时跑到屏外）
  posX.value = Math.max(0, winW.value - ballSizePx.value - EDGE_MARGIN_PX)
  posY.value = Math.max(0, Math.round(winH.value / 3 - ballSizePx.value / 2))
})

onUnmounted(() => {
  store.unregisterPlayer(myId)
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
  /* 防御：任何设备下面板/悬浮球不超出画布（H5 相对 #app 画布，App/小程序相对屏幕） */
  max-width: 100%;
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
  max-width: 100%;
  box-sizing: border-box;
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
  max-width: 100%;
  box-sizing: border-box;
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
  color: $primary;
  /* 浅蓝背景 + 蓝色边框：连续播放开关的胶囊按钮标签 */
  background: rgba(11, 95, 255, 0.08);
  border: 1rpx solid rgba(11, 95, 255, 0.4);
  border-radius: 999rpx;
  padding: 2rpx 14rpx;
  line-height: 1.5;
}
</style>
