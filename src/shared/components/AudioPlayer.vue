<template>
  <view class="as-audio-player">
    <!-- 头部：封面 + 标题（标题位于按钮上方） -->
    <view v-if="title || cover" class="as-audio-player__header">
      <image
        v-if="cover"
        class="as-audio-player__cover"
        :src="cover"
        mode="aspectFill"
      />
      <text v-if="title" class="as-audio-player__title">{{ title }}</text>
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
}>(), {
  autoplay: false
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

  audio.addEventListener('timeupdate', () => {
    currentTime.value = audio.currentTime
    if (audio.duration && !Number.isNaN(audio.duration)) duration.value = audio.duration
    emit('timeupdate', audio.currentTime)
  })
  audio.addEventListener('loadedmetadata', () => {
    if (audio.duration && !Number.isNaN(audio.duration)) duration.value = audio.duration
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
      try { audio.currentTime = t } catch { /* 无 src 时设置可能失败，忽略 */ }
      currentTime.value = t
    },
    setSrc: (s: string) => { audio.src = s; audio.load() },
    destroy: () => { audio.pause(); audio.removeAttribute('src'); audio.load() }
  }
}

function createUniEngine(src: string): AudioEngine {
  const ctx = uniApi!.createInnerAudioContext()
  ctx.src = src

  ctx.onTimeUpdate(() => {
    currentTime.value = ctx.currentTime
    if (ctx.duration) duration.value = ctx.duration
    emit('timeupdate', ctx.currentTime)
  })
  ctx.onCanplay(() => {
    if (ctx.duration) duration.value = ctx.duration
  })
  ctx.onPlay(() => { playing.value = true; emit('play') })
  ctx.onPause(() => { playing.value = false; emit('pause') })
  ctx.onEnded(() => { playing.value = false; emit('ended') })
  ctx.onError(() => { playing.value = false })

  return {
    play: () => ctx.play(),
    pause: () => ctx.pause(),
    seek: (t: number) => { ctx.seek(t); currentTime.value = t },
    setSrc: (s: string) => { ctx.src = s },
    destroy: () => ctx.destroy()
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
  setupEngine(src)
  if (src && props.autoplay) {
    nextTick(() => engine?.play())
  }
})

onMounted(() => {
  if (props.src) {
    setupEngine(props.src)
    if (props.autoplay) {
      nextTick(() => engine?.play())
    }
  }
})

onUnmounted(() => {
  engine?.destroy()
  engine = null
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
