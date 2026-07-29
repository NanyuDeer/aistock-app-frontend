/**
 * DualHostPlayer 双主播播放器
 * 视觉层：基于组件库 AudioPlayer（同步时间：2026-07-28）
 * 保留业务逻辑：双主播分段（segments）选择 —— 跟踪当前分段索引，推导当前主播与文案，
 * 在一段播放结束后自动推进到下一段。
 *
 * 组件映射：AudioPlayer 负责全部播放控制（播放/暂停/快进快退/进度条/时间，内置 SVG 图标，无 emoji），
 * 本组件作为 wrapper 维护分段状态并把 currentText 作为 AudioPlayer 的 title 展示。
 * 主播头像使用 SvgIcon（mic-line / broadcast-line）。
 */
<template>
  <view class="as-dual-host-player">
    <!-- 双主播分段选择：高亮当前主播 -->
    <view class="as-dual-host-player__hosts">
      <view :class="['as-dual-host-player__host', currentHost === 'A' ? 'is-active' : '']">
        <SvgIcon name="mic-line" size="32rpx" :color="hostColor('A')" />
        <text class="as-dual-host-player__host-name">主播 A</text>
      </view>
      <view :class="['as-dual-host-player__host', currentHost === 'B' ? 'is-active' : '']">
        <SvgIcon name="broadcast-line" size="32rpx" :color="hostColor('B')" />
        <text class="as-dual-host-player__host-name">主播 B</text>
      </view>
    </view>

    <!-- AudioPlayer 作为播放基础：key 变化时重新挂载以触发下一段自动播放 -->
    <AudioPlayer
      :key="playKey"
      :src="currentSrc"
      :title="currentText"
      :autoplay="autoAdvance"
      @ended="onEnded"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AudioPlayer from '@/shared/components/AudioPlayer.vue'
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

/** 当前分段索引（双主播分段选择状态） */
const currentSegmentIdx = ref(0)
/** 是否自动播放下一段（首段由用户手动播放，后续段自动推进） */
const autoAdvance = ref(false)
/** 强制 AudioPlayer 重新挂载的 key，用于分段切换后重置播放器并触发 autoplay */
const playKey = ref(0)

const currentSegment = computed(() => props.segments[currentSegmentIdx.value] || null)
const currentHost = computed<'A' | 'B'>(() => currentSegment.value?.host || 'A')
const currentText = computed(() => currentSegment.value?.text || '')
/** 当前分段音频源：优先取分段自带 audioUrl，回退到全局 audioUrl */
const currentSrc = computed(() => currentSegment.value?.audioUrl || props.audioUrl)

/** SvgIcon 颜色需 JS 字符串，取与设计令牌等价的值：$primary / $ink-mute */
const HOST_ACTIVE_COLOR = '#0b5fff'
const HOST_INACTIVE_COLOR = '#8a96b0'

function hostColor(host: 'A' | 'B'): string {
  return currentHost.value === host ? HOST_ACTIVE_COLOR : HOST_INACTIVE_COLOR
}

/** 一段播放结束：推进到下一段并自动播放；末段结束后回到首段并停止 */
function onEnded() {
  if (currentSegmentIdx.value < props.segments.length - 1) {
    currentSegmentIdx.value++
    autoAdvance.value = true
    playKey.value++
  } else {
    currentSegmentIdx.value = 0
    autoAdvance.value = false
    playKey.value++
  }
}
</script>

<style lang="scss" scoped>
.as-dual-host-player {
  background: $bg-card;
  border-radius: $r-lg;
  padding: $s-4 $s-3 $s-2;
}

.as-dual-host-player__hosts {
  display: flex;
  justify-content: center;
  gap: $s-6;
  margin-bottom: $s-3;
}

.as-dual-host-player__host {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  opacity: $op-disabled;
  transition: opacity $t-base;

  &.is-active {
    opacity: 1;
  }
}

.as-dual-host-player__host-name {
  font-size: $font-size-xs;
  color: $ink-soft;
}
</style>
