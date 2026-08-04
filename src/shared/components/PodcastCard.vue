<template>
  <Card class="podcast-card">
    <view class="podcast-header">
      <SvgIcon name="broadcast-line" size="32rpx" color="#0b5fff" />
      <text class="podcast-title">{{ title }}</text>
    </view>

    <!-- idle：未生成，显示文本预览 + 生成按钮 -->
    <view v-if="status === 'idle'" class="podcast-body">
      <text v-if="previewText" class="podcast-preview">{{ previewText }}</text>
      <Button size="sm" @click="generate">生成播报</Button>
    </view>

    <!-- loading：生成中 -->
    <view v-else-if="status === 'loading'" class="podcast-body">
      <LoadingState text="正在合成播报音频，约 5-15 秒..." />
    </view>

    <!-- ready：播放器 -->
    <view v-else-if="status === 'ready' && audioUrl" class="podcast-body">
      <AudioPlayer :src="fullAudioUrl" :title="title" />
    </view>

    <!-- error -->
    <view v-else-if="status === 'error'" class="podcast-body">
      <text class="podcast-error">{{ errorMsg }}</text>
      <Button size="sm" @click="generate">重试</Button>
    </view>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { agentApi } from '@/shared/api/modules/agent'
import SvgIcon from './SvgIcon.vue'
import { Card, Button, LoadingState, AudioPlayer } from './index'

type PodcastStatus = 'idle' | 'loading' | 'ready' | 'error'

/** 播报文本最大长度（约1分钟播报时长），与后端 generate-podcast 校验一致 */
const MAX_PODCAST_TEXT_LENGTH = 250

const props = withDefaults(defineProps<{
  /** 播报文本（podcast_brief），必填 */
  text: string
  /** 缓存键，用于幂等（如 alert_603601_2026-08-01） */
  cacheKey: string
  /** 卡片标题 */
  title?: string
}>(), {
  title: 'AI 播报'
})

const status = ref<PodcastStatus>('idle')
const audioUrl = ref('')
const errorMsg = ref('')

/** 文本预览（前 60 字） */
const previewText = computed(() => {
  const t = props.text || ''
  return t.length > 60 ? t.slice(0, 60) + '...' : t
})

/** 完整音频 URL（后端返回的是 /api/agent/audio/xxx.mp3 相对路径） */
const fullAudioUrl = computed(() => {
  if (!audioUrl.value) return ''
  const base = import.meta.env.VITE_API_BASE_URL || '/api'
  // audioUrl 形如 /api/agent/audio/xxx.mp3，需去掉前缀 /api 后拼接 base
  const path = audioUrl.value.replace(/^\/api/, '')
  return `${base}${path}`
})

/** 传给后端的播报文本：裁剪到 250 字，避免后端拒绝超长文本（约1分钟时长上限） */
const podcastTextForRequest = computed(() => {
  const t = props.text || ''
  return t.length > MAX_PODCAST_TEXT_LENGTH ? t.slice(0, MAX_PODCAST_TEXT_LENGTH) : t
})

async function generate() {
  if (!props.text || !props.cacheKey) return
  status.value = 'loading'
  errorMsg.value = ''
  try {
    const res = await agentApi.generatePodcast(podcastTextForRequest.value, props.cacheKey)
    audioUrl.value = res.audio_url
    status.value = 'ready'
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '播报生成失败，请稍后重试'
    status.value = 'error'
  }
}
</script>

<style lang="scss" scoped>
.podcast-card {
  margin-bottom: $s-3;
}

.podcast-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: $s-2;
}

.podcast-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $primary;
}

.podcast-body {
  display: flex;
  flex-direction: column;
  gap: $s-2;
  align-items: flex-start;
}

.podcast-preview {
  font-size: 24rpx;
  color: $ink-mute;
  line-height: 1.6;
  background: $bg-soft;
  padding: $s-2 $s-3;
  border-radius: $r-md;
  width: 100%;
  box-sizing: border-box;
}

.podcast-error {
  font-size: 24rpx;
  color: $down;
  line-height: 1.5;
}
</style>
