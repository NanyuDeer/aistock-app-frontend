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
        <!-- 音频入口条：音频统一由全局悬浮窗（FloatingPodcast）承载，与列表页同一会话，
             详情→列表/列表→详情切换时悬浮球持续播放不中断（独立 AudioPlayer 已移除——
             两套音频引擎并存会导致返回列表时内嵌播放器卸载即停止） -->
        <view v-if="audioPath" class="audio-bar">
          <view class="play-btn" @tap.stop="togglePlay">
            <SvgIcon :name="isPlaying ? 'pause-fill' : 'play-fill'" size="40rpx" color="#ffffff" />
          </view>
          <view class="audio-info">
            <text class="audio-status">{{ audioStatusText }}</text>
            <text class="audio-meta">{{ typeLabel }}播报 · 由悬浮球承载</text>
          </view>
        </view>

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
import { usePodcastStore } from '@/shared/store/modules/podcast'
import { parseBroadcastReport } from '@/shared/utils/broadcastReport'
import { normalizeBriefingType } from '@/shared/utils/briefingDetail'
import { addCalendarDays, shanghaiDateString } from '@/shared/utils/tradingTime'

const currentDate = ref('')
const briefType = ref<BriefType>('morning')
const broadcast = ref<BroadcastV1 | null>(null)
const loading = ref(true)

const typeLabel = computed(() => briefType.value === 'morning' ? '晨报' : '晚报')
const pageTitle = computed(() => `${typeLabel.value}双人播报`)
const subtitle = computed(() => `${currentDate.value} · AI 生成内容，仅供参考`)
const audioPath = computed(() => broadcast.value?.audio_path || '')

/** 播放状态来自悬浮窗 store（FloatingPodcast AudioPlayer 事件同步），页面内按钮与悬浮球状态一致 */
const podcastStore = usePodcastStore()
const isPlaying = computed(() => podcastStore.playing)
const audioStatusText = computed(() => {
  if (!audioPath.value) return '语音生成中...'
  return isPlaying.value ? '播放中' : '点击播放'
})

/**
 * 播放/暂停：音频统一由全局悬浮窗（FloatingPodcast）承载，与列表页同一会话。
 * 播放状态、进度、暂停/继续都在悬浮窗内，页面切到列表/返回后状态不丢。
 */
function togglePlay() {
  if (!audioPath.value) {
    uni.showToast({ title: '语音生成中', icon: 'none' })
    return
  }
  const filename = audioPath.value.split('/').pop() || ''
  // 与列表页（briefing/index.vue）同一缓存 key：同一音频视为同一会话，不重置进度
  const key = `briefing-${briefType.value}-${currentDate.value}`
  if (podcastStore.playing) {
    podcastStore.pause()
    return
  }
  if (podcastStore.status === 'ready' && podcastStore.cacheKey === key) {
    podcastStore.resume()
    return
  }
  const label = briefType.value === 'morning' ? 'AI 早报' : 'AI 晚报'
  // 传相对路径：FloatingPodcast 按 API 前缀（/api）拼接完整地址，与 generatePodcast 返回格式一致
  podcastStore.playDirect(`/api/agent/audio/${filename}`, key, label, 0)
}

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

/* 音频入口条：点击播放/暂停（音频由全局悬浮球承载） */
.audio-bar {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx 32rpx;
  background: #ffffff;
  margin-bottom: 24rpx;
  border-radius: 20rpx;
  border: 1rpx solid $line;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.play-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: $primary;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.audio-info {
  flex: 1;
  min-width: 0;
}

.audio-status {
  font-size: 28rpx;
  color: $ink;
  font-weight: 600;
  display: block;
}

.audio-meta {
  font-size: 22rpx;
  color: #9ca3af;
  margin-top: 4rpx;
  display: block;
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
