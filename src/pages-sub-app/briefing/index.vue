<template>
  <SubPageCard2 :title="'双人对话播报'" :subtitle="subtitleText">
    <view class="briefing-content">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <text class="loading-text">报告加载中...</text>
      </view>

      <template v-else>
        <!-- 播放控制 -->
        <view v-if="report" class="player-bar">
          <view class="play-btn" @tap="togglePlay">
            <SvgIcon :name="isPlaying ? 'pause-fill' : 'play-fill'" size="48rpx" color="#ffffff" />
          </view>
          <view class="player-info">
            <text class="player-status">{{ audioStatusText }}</text>
          </view>
        </view>

        <!-- 对话文本 -->
        <view v-if="dialogueLines.length" class="dialogue-list">
          <view
            v-for="(line, idx) in dialogueLines"
            :key="idx"
            :class="['dialogue-item', line.role]"
          >
            <view class="role-avatar">
              <text class="avatar-text">{{ line.role === 'host' ? '主' : '析' }}</text>
            </view>
            <view class="dialogue-bubble">
              <text class="role-name">{{ line.role === 'host' ? '主持人' : '分析师' }}</text>
              <text class="dialogue-text">{{ line.content }}</text>
            </view>
          </view>
        </view>

        <!-- 纯文本降级展示 -->
        <view v-else-if="reportText && !dialogueLines.length" class="report-text-wrap">
          <text class="report-text">{{ reportText }}</text>
        </view>

        <!-- 无报告 -->
        <view v-else class="empty-state">
          <SvgIcon name="file-line" size="80rpx" color="#9ca3af" />
          <text class="empty-text">今日播报尚未生成</text>
          <text class="empty-hint">请在 9:10 后查看</text>
        </view>

        <!-- 日期切换 -->
        <view class="date-nav">
          <view class="date-btn" @tap="changeDate(-1)">
            <SvgIcon name="arrow-left-line" size="32rpx" color="#4d7cfe" />
            <text class="date-btn-text">前一天</text>
          </view>
          <view class="date-btn" @tap="changeDate(1)">
            <text class="date-btn-text">后一天</text>
            <SvgIcon name="arrow-right-line" size="32rpx" color="#4d7cfe" />
          </view>
        </view>
      </template>
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { agentApi } from '@/shared/api/modules/agent'
import { API_BASE_URL } from '@/shared/utils/constants'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

interface DialogueLine {
  role: 'host' | 'analyst'
  content: string
}

interface BroadcastReport {
  content: {
    text?: string
    audio_path?: string | null
  }
}

const currentDate = ref('')
const loading = ref(true)
const report = ref<BroadcastReport | null>(null)
const isPlaying = ref(false)
const audioContext = ref<UniApp.InnerAudioContext | null>(null)

const subtitleText = computed(() => {
  if (currentDate.value) {
    return `${currentDate.value} · AI 生成内容，仅供参考`
  }
  return 'AI 生成内容，仅供参考'
})

const reportText = computed(() => {
  return report.value?.content?.text || ''
})

const audioPath = computed(() => {
  return report.value?.content?.audio_path || null
})

const audioStatusText = computed(() => {
  if (!audioPath.value) return '语音生成中...'
  return isPlaying.value ? '播放中' : '点击播放'
})

// 解析对话文本为行数组
const dialogueLines = computed<DialogueLine[]>(() => {
  const text = reportText.value
  if (!text) return []

  // 尝试 JSON 解析（prompt 要求的格式）
  try {
    const parsed: unknown = JSON.parse(text)
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item: unknown): item is Record<string, unknown> => {
          return typeof item === 'object' && item !== null && 'role' in item && 'content' in item
        })
        .map((item: Record<string, unknown>) => ({
          role: item.role === 'host' ? 'host' as const : 'analyst' as const,
          content: String(item.content),
        }))
    }
  } catch {
    // 非 JSON 格式，降级处理
  }

  // 降级：按行解析，根据前缀判断角色
  const lines = text.split('\n').filter((l) => l.trim())
  return lines.map((line) => {
    const trimmed = line.trim()
    let role: 'host' | 'analyst' = 'host'
    let content = trimmed

    if (trimmed.startsWith('主持人') || trimmed.startsWith('host')) {
      role = 'host'
      content = trimmed.replace(/^(主持人|host)[：:]\s*/, '')
    } else if (trimmed.startsWith('分析师') || trimmed.startsWith('analyst')) {
      role = 'analyst'
      content = trimmed.replace(/^(分析师|analyst)[：:]\s*/, '')
    }

    return { role, content }
  })
})

function togglePlay() {
  if (!audioPath.value) {
    uni.showToast({ title: '语音生成中', icon: 'none' })
    return
  }

  if (!audioContext.value) {
    // 从 audio_path 提取文件名
    const filename = audioPath.value.split('/').pop() || ''
    const audioUrl = `${API_BASE_URL}/agent/audio/${filename}`
    audioContext.value = uni.createInnerAudioContext()
    audioContext.value.src = audioUrl
    audioContext.value.onEnded(() => {
      isPlaying.value = false
    })
    audioContext.value.onError(() => {
      isPlaying.value = false
      uni.showToast({ title: '音频播放失败', icon: 'none' })
    })
  }

  if (isPlaying.value) {
    audioContext.value.pause()
    isPlaying.value = false
  } else {
    audioContext.value.play()
    isPlaying.value = true
  }
}

function changeDate(delta: number) {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() + delta)
  currentDate.value = d.toISOString().split('T')[0]
  loadReport()
}

async function loadReport() {
  if (!currentDate.value) return
  loading.value = true
  // 停止当前播放
  if (audioContext.value && isPlaying.value) {
    audioContext.value.stop()
    isPlaying.value = false
  }
  try {
    const res: unknown = await agentApi.getReport('broadcast', currentDate.value)
    // 响应拦截器已解包: 返回的是 {content: {text, audio_path}, ...} 或 null
    report.value = (res as BroadcastReport) || null
  } catch {
    report.value = null
  } finally {
    loading.value = false
  }
}

onLoad(() => {
  currentDate.value = new Date().toISOString().split('T')[0]
  loadReport()
})

onUnmounted(() => {
  if (audioContext.value) {
    audioContext.value.destroy()
    audioContext.value = null
  }
})
</script>

<style lang="scss" scoped>
.briefing-content {
  padding: 32rpx;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #6b7280;
}

.player-bar {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  background: #ffffff;
  margin-bottom: 24rpx;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.play-btn {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #4d7cfe;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.player-info {
  flex: 1;
}

.player-status {
  font-size: 28rpx;
  color: #1a1d24;
  font-weight: 500;
}

.dialogue-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

.dialogue-item {
  display: flex;
  gap: 16rpx;
}

.dialogue-item.analyst {
  flex-direction: row-reverse;
}

.role-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #4d7cfe;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dialogue-item.analyst .role-avatar {
  background: #22c55e;
}

.avatar-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #ffffff;
}

.dialogue-bubble {
  flex: 1;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.04);
}

.dialogue-item.analyst .dialogue-bubble {
  background: #e8f5e9;
}

.role-name {
  font-size: 22rpx;
  color: #6b7280;
  margin-bottom: 8rpx;
  display: block;
}

.dialogue-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: #1a1d24;
}

.report-text-wrap {
  padding: 32rpx;
  background: #ffffff;
  border-radius: 20rpx;
  margin-bottom: 24rpx;
}

.report-text {
  font-size: 28rpx;
  line-height: 1.8;
  color: #1a1d24;
  white-space: pre-wrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #6b7280;
  margin-top: 24rpx;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 22rpx;
  color: #9ca3af;
}

.date-nav {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  margin-bottom: 32rpx;
}

.date-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 32rpx;
  background: #ffffff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.04);
}

.date-btn-text {
  font-size: 26rpx;
  color: #4d7cfe;
}
</style>
