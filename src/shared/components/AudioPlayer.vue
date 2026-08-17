<template>
  <view class="as-audio-player">
    <!-- 头部：封面 + 标题（标题左侧，右侧可注入操作按钮） -->
    <view v-if="title || cover || $slots.actions" class="as-audio-player__header">
      <image
        v-if="cover"
        class="as-audio-player__cover"
        :src="cover"
        mode="aspectFill"
      />
      <text v-if="title" class="as-audio-player__title">{{ title }}</text>
      <view v-if="$slots.actions" class="as-audio-player__actions">
        <slot name="actions" />
      </view>
    </view>

    <!-- 播放控制：快退 -10s / 播放暂停 / 快进 +10s -->
    <view class="as-audio-player__controls">
      <view class="as-audio-player__btn as-audio-player__btn--side" @tap="seekBy(-10)">
        <view class="as-audio-player__btn-icon" :style="{ backgroundImage: `url('${rewindIcon}')` }" />
      </view>
      <view class="as-audio-player__btn as-audio-player__btn--main" @tap="togglePlay">
        <view
          class="as-audio-player__btn-icon as-audio-player__btn-icon--main"
          :style="{ backgroundImage: `url('${mainIcon}')` }"
        />
      </view>
      <view class="as-audio-player__btn as-audio-player__btn--side" @tap="seekBy(10)">
        <view class="as-audio-player__btn-icon" :style="{ backgroundImage: `url('${forwardIcon}')` }" />
      </view>
    </view>

    <!-- 进度条：点击跳转 -->
    <view class="as-audio-player__progress" @tap="onProgressTap">
      <view class="as-audio-player__progress-track" />
      <view class="as-audio-player__progress-fill" :style="{ width: progressPercent + '%' }" />
      <view class="as-audio-player__progress-thumb" :style="{ left: progressPercent + '%' }" />
    </view>

    <!-- 时间：当前 / 总时长 -->
    <view class="as-audio-player__time">
      <text class="as-audio-player__time-current">{{ formatTime(currentTime) }}</text>
      <text class="as-audio-player__time-total">{{ formatTime(duration) }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, getCurrentInstance } from 'vue'
import {
  attachPersistent,
  detachPersistent,
  type PersistentEngine,
  type FloatingEvents,
} from '@/shared/utils/floatingEngine'

/**
 * AudioPlayer 通用音频播放器
 * 跨端音频播放：H5 / 浏览器环境用 HTMLAudioElement（new Audio()），
 * App / 小程序环境用 uni.createInnerAudioContext()。
 *
 * 平台判定采用运行时探测（typeof Audio / globalThis.uni），而非 // #ifdef 条件编译：
 * 条件编译注释在组件库本地预览（纯 Vite）中会被忽略导致两端代码同时执行，
 * 运行时探测可同时保证预览环境与 uni-app 各端正确分流。template 中不直接写 <audio>，
 * 由 script 创建并管理音频实例。
 *
 * 进度条点击跳转：H5 用 currentTarget.getBoundingClientRect，App/小程序用
 * uni.createSelectorQuery().in(instance) 获取节点位置。
 * 控制图标均为内联 SVG data URI，无 emoji。
 */

/** uni InnerAudioContext 最小可用接口 */
interface InnerAudioContextLike {
  src: string
  currentTime: number
  duration: number
  play(): void
  pause(): void
  stop(): void
  seek(time: number): void
  destroy(): void
  onTimeUpdate(cb: () => void): void
  onCanplay(cb: () => void): void
  onPlay(cb: () => void): void
  onPause(cb: () => void): void
  onEnded(cb: () => void): void
  onError(cb: (err: unknown) => void): void
}

/** 进度条节点尺寸 */
interface RectLike {
  left: number
  width: number
}

/** uni SelectorQuery 最小可用接口 */
interface SelectorQueryLike {
  in(component: unknown): SelectorQueryLike
  select(selector: string): SelectorQueryLike
  boundingClientRect(cb: (rect: RectLike | null) => void): SelectorQueryLike
  exec(cb?: (res: unknown[]) => void): void
}

interface UniApi {
  createInnerAudioContext(): InnerAudioContextLike
  createSelectorQuery(): SelectorQueryLike
}

/** 音频引擎统一接口（屏蔽 H5 / uni 差异） */
interface AudioEngine {
  play(): void
  pause(): void
  seek(time: number): void
  setSrc(src: string): void
  destroy(): void
}

/** 运行时获取 uni 全局对象（不存在则为 undefined） */
const uniApi: UniApi | undefined = (globalThis as unknown as { uni?: UniApi }).uni

const instance = getCurrentInstance()

const props = withDefaults(defineProps<{
  /** 音频地址 */
  src: string
  /** 曲目标题 */
  title?: string
  /** 封面图地址 */
  cover?: string
  /** 是否自动播放 */
  autoplay?: boolean
  /** 自动播放时的起始进度（秒），配合 autoplay 实现退出页面后续播 */
  initialTime?: number
  /** 持久化播放（悬浮播报专用）：把引擎提升为全局单例，页面实例卸载时仅"脱离"不销毁，
   *  切页后复用时直接续播，避免重新缓冲/重播造成的卡顿。false（默认）时引擎随组件销毁。 */
  persist?: boolean
}>(), {
  autoplay: false,
  initialTime: 0,
  persist: false,
})

const emit = defineEmits<{
  /** 开始播放 */
  play: []
  /** 暂停 */
  pause: []
  /** 播放结束 */
  ended: []
  /** 播放进度更新 */
  timeupdate: [currentTime: number]
  /** 组件卸载（引擎销毁前）：上报播放状态，供悬浮窗记录跨页续播点 */
  unmount: [{ playing: boolean; currentTime: number }]
}>()

const playing = ref(false)
const currentTime = ref(0)
const duration = ref(0)
let engine: AudioEngine | null = null

const progressPercent = computed(() => {
  if (!duration.value) return 0
  return Math.min(100, Math.max(0, (currentTime.value / duration.value) * 100))
})

/* ===== 内联 SVG 图标（data URI） ===== */
function filledIcon(path: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="24" height="24"><path d="${path}"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const playIcon = computed(() => filledIcon('M8 5v14l11-7z', '#ffffff'))
const pauseIcon = computed(() => filledIcon('M6 5h4v14H6zM14 5h4v14h-4z', '#ffffff'))
const rewindIcon = computed(() => filledIcon('M11 18V6l-8 6 8 6zM21 18V6l-8 6 8 6z', '#4b5a7a'))
const forwardIcon = computed(() => filledIcon('M13 18V6l8 6-8 6zM3 18V6l8 6-8 6z', '#4b5a7a'))
const mainIcon = computed(() => (playing.value ? pauseIcon.value : playIcon.value))

/* ===== 引擎工厂 ===== */
function createH5Engine(src: string): AudioEngine {
  const audio = new Audio()
  audio.src = src
  audio.preload = 'metadata'

  // 音频未就绪（readyState<1）时 seek 无效：暂存目标进度，loadedmetadata 后可跳转时补应用
  // （跨页续播场景：新实例挂载后可能立即 seek 到续播点，此时音频可能尚未加载）
  let pendingSeek: number | null = null

  audio.addEventListener('timeupdate', () => {
    currentTime.value = audio.currentTime
    if (audio.duration && !Number.isNaN(audio.duration)) duration.value = audio.duration
    emit('timeupdate', audio.currentTime)
  })
  audio.addEventListener('loadedmetadata', () => {
    if (audio.duration && !Number.isNaN(audio.duration)) duration.value = audio.duration
    if (pendingSeek != null) {
      try { audio.currentTime = pendingSeek } catch { /* 忽略 seek 异常 */ }
      pendingSeek = null
    }
  })
  audio.addEventListener('durationchange', () => {
    if (audio.duration && !Number.isNaN(audio.duration)) duration.value = audio.duration
  })
  audio.addEventListener('play', () => {
    playing.value = true
    emit('play')
  })
  audio.addEventListener('pause', () => {
    playing.value = false
    emit('pause')
  })
  audio.addEventListener('ended', () => {
    playing.value = false
    emit('ended')
  })

  return {
    play: () => { void audio.play().catch(() => { /* 自动播放被拦截，忽略 */ }) },
    pause: () => audio.pause(),
    seek: (t: number) => {
      try {
        if (audio.readyState >= 1) audio.currentTime = t
        else pendingSeek = t
      } catch { /* 无 src 时设置可能失败，忽略 */ }
      currentTime.value = t
    },
    setSrc: (s: string) => { audio.src = s; audio.load() },
    destroy: () => { audio.pause(); audio.removeAttribute('src'); audio.load() }
  }
}

function createUniEngine(src: string): AudioEngine {
  const ctx = uniApi!.createInnerAudioContext()
  ctx.src = src

  // App/小程序：InnerAudioContext 在 canplay 前 seek 可能无效，暂存进度、canplay 后补应用
  let pendingSeek: number | null = null

  ctx.onTimeUpdate(() => {
    currentTime.value = ctx.currentTime
    if (ctx.duration) duration.value = ctx.duration
    emit('timeupdate', ctx.currentTime)
  })
  ctx.onCanplay(() => {
    if (ctx.duration) duration.value = ctx.duration
    if (pendingSeek != null) {
      try { ctx.seek(pendingSeek) } catch { /* 忽略 seek 异常 */ }
      pendingSeek = null
    }
  })
  ctx.onPlay(() => { playing.value = true; emit('play') })
  ctx.onPause(() => { playing.value = false; emit('pause') })
  ctx.onEnded(() => { playing.value = false; emit('ended') })
  ctx.onError(() => { playing.value = false })

  return {
    play: () => ctx.play(),
    pause: () => ctx.pause(),
    seek: (t: number) => {
      try { ctx.seek(t) } catch { /* 忽略 seek 异常 */ }
      currentTime.value = t
    },
    setSrc: (s: string) => { ctx.src = s },
    // 卸载/换源时先 stop 再 destroy：保证音频立即停止（全局互斥抢占时，
    // FloatingPodcast 通过清空 src 卸载本组件，必须停掉正在播放的音频）
    destroy: () => { ctx.stop(); ctx.destroy() }
  }
}

function createEngine(src: string): AudioEngine {
  // H5 / 浏览器：HTMLAudioElement
  if (typeof Audio !== 'undefined') return createH5Engine(src)
  // App / 小程序：uni InnerAudioContext
  if (uniApi) return createUniEngine(src)
  // 兜底（类型层面 Audio 存在，不会走到此分支）
  return createH5Engine(src)
}

/* ===== 控制 ===== */
function setupEngine(src: string): AudioEngine | null {
  if (engine) { engine.destroy(); engine = null }
  if (!src) return null
  engine = createEngine(src)
  return engine
}

/* ===== persist（全局持续播放）支持 ===== */
/** 由全局引擎 native 事件驱动 AudioPlayer 的响应式状态与语义事件 */
function makeFloatingEvents(): FloatingEvents {
  return {
    onTimeUpdate: (t, d) => {
      currentTime.value = t
      if (d) duration.value = d
      emit('timeupdate', t)
    },
    onPlay: () => { playing.value = true; emit('play') },
    onPause: () => { playing.value = false; emit('pause') },
    onEnded: () => { playing.value = false; emit('ended') },
  }
}

/** 把全局引擎适配为 AudioEngine 接口（不提供真实 destroy，持久引擎由 detach/destroyPersistent 管理） */
function adaptPersistent(e: PersistentEngine): AudioEngine {
  return {
    play: () => e.play(),
    pause: () => e.pause(),
    seek: (t: number) => e.seek(t),
    setSrc: () => { /* 持久引擎换源走 attachPersistent，不在组件内换 */ },
    destroy: () => { /* 不应 destroy：脱离交给 detachPersistent，停机交给 destroyPersistent */ },
  }
}

/** 复用已持续播放的引擎时，把引擎实时状态同步到本地响应式变量（currentTime/duration/playing） */
function syncFromEngine(e: PersistentEngine) {
  currentTime.value = e.currentTime
  if (e.duration) duration.value = e.duration
  playing.value = e.isPlaying
}

/** 载入音频：persist 模式附着全局引擎；否则走引擎私有生命周期 */
function loadFor(src: string) {
  if (!props.persist) {
    setupEngine(src)
    return
  }
  if (!src) {
    engine = null
    return
  }
  const r = attachPersistent(src, makeFloatingEvents())
  engine = adaptPersistent(r.engine)
  // 复用续播：引擎仍在播放且已缓冲，无需重建；同步一次状态即可
  if (r.reused) syncFromEngine(r.engine)
}

function togglePlay() {
  if (!engine) {
    if (props.src) {
      // setupEngine 会重新赋值 engine，但 TS 在 !engine 分支内已将其收窄为 null，
      // 故用返回值调用 play，避免在 never 上取属性。
      setupEngine(props.src)?.play()
    }
    return
  }
  if (playing.value) engine.pause()
  else engine.play()
}

function seekBy(delta: number) {
  if (!engine || !duration.value) return
  const target = Math.max(0, Math.min(duration.value, currentTime.value + delta))
  engine.seek(target)
}

function readClientX(e: unknown): number | null {
  if (typeof e !== 'object' || e === null) return null
  // H5 MouseEvent
  const me = e as { clientX?: unknown }
  if (typeof me.clientX === 'number') return me.clientX
  // uni tap 事件 detail.x
  const detail = (e as { detail?: { x?: unknown } }).detail
  if (detail && typeof detail.x === 'number') return detail.x
  // uni touch 事件 changedTouches
  const touches = (e as { changedTouches?: Array<{ clientX?: unknown }> }).changedTouches
  if (touches && touches.length) {
    const cx = touches[0]?.clientX
    if (typeof cx === 'number') return cx
  }
  return null
}

function getProgressRect(e: unknown): Promise<RectLike | null> {
  return new Promise((resolve) => {
    // H5 / 浏览器：currentTarget.getBoundingClientRect
    const cur = (e as { currentTarget?: unknown }).currentTarget
    if (cur && typeof cur === 'object') {
      const getter = (cur as { getBoundingClientRect?: unknown }).getBoundingClientRect
      if (typeof getter === 'function') {
        const r = (getter as () => RectLike).call(cur)
        resolve({ left: r.left, width: r.width })
        return
      }
    }
    // App / 小程序：uni.createSelectorQuery
    const proxy = instance?.proxy
    if (uniApi && proxy) {
      uniApi
        .createSelectorQuery()
        .in(proxy)
        .select('.as-audio-player__progress')
        .boundingClientRect((rect) => {
          if (rect && rect.width) resolve({ left: rect.left, width: rect.width })
          else resolve(null)
        })
        .exec()
      return
    }
    resolve(null)
  })
}

async function onProgressTap(e: unknown) {
  if (!engine || !duration.value) return
  const clientX = readClientX(e)
  if (clientX == null) return
  const rect = await getProgressRect(e)
  if (!rect || !rect.width) return
  const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  engine.seek(pct * duration.value)
}

function formatTime(sec: number): string {
  if (!sec || Number.isNaN(sec)) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/* ===== 生命周期 ===== */
watch(() => props.src, (src) => {
  currentTime.value = 0
  duration.value = 0
  playing.value = false
  loadFor(src)
  if (src && props.autoplay) {
    nextTick(() => playFromInitial())
  }
})

onMounted(() => {
  if (props.src) {
    loadFor(props.src)
    if (props.autoplay) {
      nextTick(() => playFromInitial())
    }
  }
})

/** 自动播放并跳到指定进度（续播场景）；播放被浏览器拦截时静默，用户可手动点击 */
function playFromInitial() {
  if (!engine) return
  if (props.initialTime > 0) engine.seek(props.initialTime)
  engine.play()
}

onUnmounted(() => {
  // 先上报播放状态（引擎销毁后 currentTime 归零/事件失效），再销毁引擎
  emit('unmount', { playing: playing.value, currentTime: currentTime.value })
  if (props.persist) {
    // 持久播放：仅"脱离"事件订阅，引擎保持播放（切页后新实例复用续播）
    detachPersistent()
  } else {
    engine?.destroy()
  }
  engine = null
})

/** 暴露控制方法：FloatingPodcast 注册到 podcast store，供页面播放按钮暂停/继续 */
defineExpose({
  pause: () => engine?.pause(),
  play: () => engine?.play(),
  togglePlay,
  /** 跳转到指定进度（秒） */
  seekTo: (t: number) => engine?.seek(t),
})
</script>

<style lang="scss" scoped>
.as-audio-player {
  background: $bg-card;
  border-radius: $r-lg;
  padding: $s-3 $s-3 $s-2;
  box-shadow: $shadow-sm;
}

/* 头部：封面 + 标题 */
.as-audio-player__header {
  display: flex;
  align-items: center;
  gap: $s-2;
  margin-bottom: $s-3;
}

.as-audio-player__cover {
  flex-shrink: 0;
  width: 56rpx;
  height: 56rpx;
  border-radius: $r-sm;
  background: $bg-soft;
}

.as-audio-player__title {
  flex: 1;
  font-size: $font-size-md;
  font-weight: 600;
  line-height: $lh-tight;
  color: $ink;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 头部右侧操作区（由父组件注入） */
.as-audio-player__actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: $s-1;
}

/* 控制按钮 */
.as-audio-player__controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $s-6;
  margin-bottom: $s-3;
}

.as-audio-player__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $r-full;
  transition: transform $t-fast, opacity $t-fast;
}

.as-audio-player__btn:active {
  transform: scale(0.92);
  opacity: $op-active;
}

.as-audio-player__btn--side {
  width: 80rpx;
  height: 80rpx;
  background: $bg-soft;
}

.as-audio-player__btn--main {
  width: 112rpx;
  height: 112rpx;
  background: $brand-gradient;
  box-shadow: $shadow-primary;
}

.as-audio-player__btn-icon {
  width: 36rpx;
  height: 36rpx;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.as-audio-player__btn-icon--main {
  width: 48rpx;
  height: 48rpx;
}

/* 进度条 */
.as-audio-player__progress {
  position: relative;
  height: 40rpx;
  display: flex;
  align-items: center;
}

.as-audio-player__progress-track,
.as-audio-player__progress-fill {
  position: absolute;
  top: 50%;
  height: 8rpx;
  transform: translateY(-50%);
  border-radius: $r-full;
}

.as-audio-player__progress-track {
  left: 0;
  right: 0;
  background: $bg-deep;
}

.as-audio-player__progress-fill {
  left: 0;
  background: $primary;
  transition: width $t-fast;
}

.as-audio-player__progress-thumb {
  position: absolute;
  top: 50%;
  width: 24rpx;
  height: 24rpx;
  background: $white;
  border: 4rpx solid $primary;
  border-radius: $r-full;
  transform: translate(-50%, -50%);
  box-shadow: $shadow-xs;
  transition: left $t-fast;
}

/* 时间 */
.as-audio-player__time {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: $s-1;
}

.as-audio-player__time-current,
.as-audio-player__time-total {
  font-size: $font-size-xs;
  color: $ink-mute;
  font-family: $font-mono;
}
</style>
