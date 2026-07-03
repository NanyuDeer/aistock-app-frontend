<template>
  <view class="as-player">
    <!-- 播放控制 -->
    <view class="as-player-controls">
      <view class="as-player-btn as-player-prev" @tap="seek(-10)">
        <text class="as-player-icon">⏪</text>
      </view>
      <view class="as-player-btn as-player-main" @tap="togglePlay">
        <text class="as-player-icon">{{ playing ? '⏸' : '▶' }}</text>
      </view>
      <view class="as-player-btn as-player-next" @tap="seek(10)">
        <text class="as-player-icon">⏩</text>
      </view>
    </view>

    <!-- 进度条 -->
    <view class="as-player-progress" @tap="onProgressTap">
      <view class="as-player-progress-bg" />
      <view class="as-player-progress-fill" :style="{ width: progressPercent + '%' }" />
      <view class="as-player-progress-thumb" :style="{ left: progressPercent + '%' }" />
    </view>
    <view class="as-player-time">
      <text class="as-time-current">{{ formatTime(currentTime) }}</text>
      <text class="as-time-total">{{ formatTime(duration) }}</text>
    </view>

    <!-- 当前主播 -->
    <view class="as-player-host">
      <view :class="['as-host-avatar', currentHost === 'A' ? 'active' : '']">
        <SvgIcon class="as-host-icon" name="mic-line" size="32rpx" color="#4d7cfe" />
        <text class="as-host-name">主播 A</text>
      </view>
      <view :class="['as-host-avatar', currentHost === 'B' ? 'active' : '']">
        <SvgIcon class="as-host-icon" name="broadcast-line" size="32rpx" color="#4d7cfe" />
        <text class="as-host-name">主播 B</text>
      </view>
    </view>

    <!-- 当前文案 -->
    <view v-if="currentText" class="as-player-text">
      <text class="as-text-content">{{ currentText }}</text>
    </view>

    <!-- 音频元素（H5/App 通用） -->
    <!-- #ifdef H5 -->
    <audio ref="audioRef" :src="audioUrl" @timeupdate="onTimeUpdate" @loadedmetadata="onLoadedMeta" @ended="onEnded" />
    <!-- #endif -->
    <!-- #ifdef APP-PLUS -->
    <view class="as-player-app-placeholder">
      <text class="as-placeholder-text">App 端使用 uni.createInnerAudioContext</text>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

interface Segment {
  host: 'A' | 'B'
  text: string
  audioUrl?: string
  duration?: number
}

const props = withDefaults(defineProps<{
  segments: Segment[]
  audioUrl?: string
}>(), {
  segments: () => [],
  audioUrl: ''
})

const playing = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const currentSegmentIdx = ref(0)
const audioRef = ref<HTMLAudioElement | null>(null)
let innerAudio: UniApp.InnerAudioContext | null = null

const currentSegment = computed(() => props.segments[currentSegmentIdx.value] || null)
const currentHost = computed<'A' | 'B'>(() => currentSegment.value?.host || 'A')
const currentText = computed(() => currentSegment.value?.text || '')

const progressPercent = computed(() => {
  if (!duration.value) return 0
  return Math.min(100, (currentTime.value / duration.value) * 100)
})

function togglePlay() {
  if (playing.value) {
    pause()
  } else {
    play()
  }
}

function play() {
  // #ifdef H5
  audioRef.value?.play()
  // #endif
  // #ifdef APP-PLUS
  if (!innerAudio && props.audioUrl) {
    innerAudio = uni.createInnerAudioContext()
    innerAudio.src = props.audioUrl
    innerAudio.onTimeUpdate(() => {
      currentTime.value = innerAudio!.currentTime
      duration.value = innerAudio!.duration
    })
    innerAudio.onEnded(() => onEnded())
  }
  innerAudio?.play()
  // #endif
  playing.value = true
}

function pause() {
  // #ifdef H5
  audioRef.value?.pause()
  // #endif
  // #ifdef APP-PLUS
  innerAudio?.pause()
  // #endif
  playing.value = false
}

function seek(delta: number) {
  const target = Math.max(0, Math.min(duration.value, currentTime.value + delta))
  // #ifdef H5
  if (audioRef.value) audioRef.value.currentTime = target
  // #endif
  // #ifdef APP-PLUS
  if (innerAudio) innerAudio.seek(target)
  // #endif
  currentTime.value = target
}

function onTimeUpdate(e: Event) {
  const audio = e.target as HTMLAudioElement
  currentTime.value = audio.currentTime
}

function onLoadedMeta(e: Event) {
  const audio = e.target as HTMLAudioElement
  duration.value = audio.duration
}

function onEnded() {
  playing.value = false
  if (currentSegmentIdx.value < props.segments.length - 1) {
    currentSegmentIdx.value++
    play()
  } else {
    currentSegmentIdx.value = 0
    currentTime.value = 0
  }
}

function onProgressTap(e: any) {
  // #ifdef H5
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const pct = (e.clientX - rect.left) / rect.width
  const target = pct * duration.value
  if (audioRef.value) audioRef.value.currentTime = target
  currentTime.value = target
  // #endif
}

function formatTime(sec: number): string {
  if (!sec || isNaN(sec)) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

onUnmounted(() => {
  // #ifdef H5
  audioRef.value?.pause()
  // #endif
  // #ifdef APP-PLUS
  innerAudio?.destroy()
  innerAudio = null
  // #endif
})
</script>

<style lang="scss" scoped>
.as-player { background: #ffffff; border-radius: 16rpx; padding: 32rpx 24rpx; }

.as-player-controls { display: flex; align-items: center; justify-content: center; gap: 48rpx; margin-bottom: 24rpx; }

.as-player-btn {
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
}
.as-player-prev, .as-player-next { width: 72rpx; height: 72rpx; background: #f5f7fa; }
.as-player-main { width: 96rpx; height: 96rpx; background: linear-gradient(135deg, #4d7cfe, #6366f1); box-shadow: 0 4rpx 16rpx rgba(77, 124, 254, 0.3); }

.as-player-icon { font-size: 32rpx; color: #6b7280; }
.as-player-main .as-player-icon { color: #ffffff; font-size: 40rpx; }
.as-player-prev .as-player-icon, .as-player-next .as-player-icon { font-size: 24rpx; }

.as-player-progress { position: relative; height: 8rpx; background: #f5f7fa; border-radius: 4rpx; margin: 16rpx 0; }
.as-player-progress-bg { position: absolute; top: 0; left: 0; right: 0; height: 100%; background: #f5f7fa; border-radius: 4rpx; }
.as-player-progress-fill { position: absolute; top: 0; left: 0; height: 100%; background: linear-gradient(90deg, #4d7cfe, #6366f1); border-radius: 4rpx; transition: width 0.1s; }
.as-player-progress-thumb { position: absolute; top: 50%; width: 20rpx; height: 20rpx; background: #ffffff; border: 4rpx solid #4d7cfe; border-radius: 50%; transform: translate(-50%, -50%); transition: left 0.1s; }

.as-player-time { display: flex; justify-content: space-between; }
.as-time-current, .as-time-total { font-size: 22rpx; color: #9ca3af; }

.as-player-host { display: flex; justify-content: center; gap: 48rpx; margin: 24rpx 0; }
.as-host-avatar { display: flex; flex-direction: column; align-items: center; gap: 4rpx; opacity: 0.4; transition: opacity 0.3s; }
.as-host-avatar.active { opacity: 1; }
.as-host-icon { font-size: 40rpx; }
.as-host-name { font-size: 22rpx; color: #6b7280; }

.as-player-text { padding: 16rpx; background: #f5f7fa; border-radius: 8rpx; }
.as-text-content { font-size: 26rpx; color: #1a1d24; line-height: 1.6; }

.as-player-app-placeholder { display: none; }
</style>
