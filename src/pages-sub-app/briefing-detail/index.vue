<template>
  <SubPageCard2 :title="pageTitle" :subtitle="subtitle">
    <view class="broadcast-detail">
      <view v-if="loading" class="state-view">
        <text>播报加载中...</text>
      </view>

      <view v-else-if="!broadcast" class="state-view">
        <SvgIcon name="file-line" size="72rpx" color="#8a96b0" />
        <text>{{ typeLabel }}播报尚未生成</text>
      </view>

      <template v-else>
        <AudioPlayer
          v-if="audioUrl"
          class="broadcast-audio-player"
          :src="audioUrl"
        />

        <view class="dialogue-list">
          <view
            v-for="(line, index) in broadcast.dialogue"
            :key="`${line.role}-${index}`"
            class="dialogue-line"
            :class="line.role"
          >
            <view class="speaker-icon">
              <SvgIcon
                :name="line.role === 'host' ? 'mic-line' : 'broadcast-line'"
                size="30rpx"
                color="#ffffff"
              />
            </view>
            <view class="dialogue-copy">
              <text class="speaker-name">{{ line.role === 'host' ? '主持人' : '分析师' }}</text>
              <text class="dialogue-content">{{ line.content }}</text>
            </view>
          </view>
        </view>

      </template>

      <view class="date-nav">
        <view class="date-btn" @tap="changeDate(-1)">
          <SvgIcon name="arrow-left-line" size="28rpx" color="#0b5fff" />
          <text>前一天</text>
        </view>
        <view class="date-btn" @tap="changeDate(1)">
          <text>后一天</text>
          <SvgIcon name="arrow-right-line" size="28rpx" color="#0b5fff" />
        </view>
      </view>
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { agentApi, type BriefType, type BroadcastV1 } from '@/shared/api/modules/agent'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import AudioPlayer from '@/shared/components/AudioPlayer.vue'
import { parseBroadcastReport } from '@/shared/utils/broadcastReport'
import { normalizeBriefingType } from '@/shared/utils/briefingDetail'
import { API_BASE_URL } from '@/shared/utils/constants'
import { addCalendarDays, shanghaiDateString } from '@/shared/utils/tradingTime'

const currentDate = ref('')
const briefType = ref<BriefType>('morning')
const broadcast = ref<BroadcastV1 | null>(null)
const loading = ref(true)

const typeLabel = computed(() => briefType.value === 'morning' ? '晨报' : '晚报')
const pageTitle = computed(() => `${typeLabel.value}双人播报`)
const subtitle = computed(() => `${currentDate.value} · AI 生成内容，仅供参考`)
const audioUrl = computed(() => {
  const audioPath = broadcast.value?.audio_path
  if (!audioPath) return ''
  const filename = audioPath.split('/').pop() || ''
  return `${API_BASE_URL}/agent/audio/${filename}`
})

async function loadBroadcast() {
  loading.value = true
  try {
    const data = await agentApi.getBroadcast(briefType.value, currentDate.value)
    broadcast.value = parseBroadcastReport(data, briefType.value, currentDate.value)
  } catch {
    broadcast.value = null
  } finally {
    loading.value = false
  }
}

function changeDate(delta: number) {
  currentDate.value = addCalendarDays(currentDate.value, delta)
  loadBroadcast()
}

onLoad((options) => {
  const opts = options as Record<string, string> || {}
  briefType.value = normalizeBriefingType(opts.type)
  currentDate.value = opts.date || shanghaiDateString()
  loadBroadcast()
})

</script>

<style lang="scss" scoped>
.broadcast-detail {
  min-height: 100%;
  padding: 32rpx 28rpx 44rpx;
  background: $bg-page;
}

.state-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
  padding-top: 200rpx;
  color: $ink-mute;
  font-size: $font-size-sm;
}

/* 详情页只保留播放控制：去掉标题行，并收紧三个圆形按钮，避免抢占对话内容空间。 */
:deep(.broadcast-audio-player) {
  margin-bottom: 28rpx;
}

:deep(.broadcast-audio-player .as-audio-player__controls) {
  gap: 36rpx;
  margin-bottom: 12rpx;
}

:deep(.broadcast-audio-player .as-audio-player__btn--side) {
  width: 64rpx;
  height: 64rpx;
}

:deep(.broadcast-audio-player .as-audio-player__btn--main) {
  width: 88rpx;
  height: 88rpx;
}

:deep(.broadcast-audio-player .as-audio-player__btn-icon) {
  width: 30rpx;
  height: 30rpx;
}

:deep(.broadcast-audio-player .as-audio-player__btn-icon--main) {
  width: 38rpx;
  height: 38rpx;
}

:deep(.broadcast-audio-player .as-audio-player__progress) {
  height: 32rpx;
}

.dialogue-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.dialogue-line {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;

  &.analyst {
    flex-direction: row-reverse;
    text-align: right;
  }
}

.speaker-icon {
  display: flex;
  flex: 0 0 56rpx;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: $brand-color;
}

.analyst .speaker-icon {
  background: $success-color;
}

.dialogue-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
  max-width: 80%;
  padding: 16rpx 24rpx;
  border-radius: 16rpx 16rpx 16rpx 4rpx;
  background: #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.analyst .dialogue-copy {
  border-radius: 16rpx 16rpx 4rpx 16rpx;
  background: $primary;
  text-align: left;
}

.speaker-name {
  color: $ink-mute;
  font-size: $font-size-xs;
  font-weight: 600;
}

.dialogue-content {
  color: $ink;
  font-size: $font-size-base;
  line-height: 1.75;
}

.analyst .speaker-name,
.analyst .dialogue-content {
  color: #ffffff;
}

.date-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 36rpx;
}

.date-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 14rpx 22rpx;
  border-radius: $r-full;
  background: #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(11, 95, 255, 0.08);
  color: $brand-color;
  font-size: $font-size-sm;
}
</style>
