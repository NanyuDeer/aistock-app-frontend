<template>
  <view class="as-streaming">
    <text class="as-streaming__text">{{ displayText }}</text>
    <text v-if="showCursor && isTyping" class="as-streaming__cursor">{{ cursorChar }}</text>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'

/**
 * StreamingText 流式打字效果
 * 模拟 AI 逐字输出，支持两种模式（自动判断）：
 * - 追加模式：新文本以已显示内容为前缀时，从断点继续往后打字（流式追加场景）
 * - 替换模式：新文本与已显示内容不衔接时，清空重打
 * 打字完成时触发 done 事件；光标在打字过程中以主色闪烁。
 */
const props = withDefaults(defineProps<{
  /** 目标文本（随流式更新而变化） */
  text: string
  /** 单字间隔毫秒 */
  speed?: number
  /** 是否显示光标 */
  showCursor?: boolean
  /** 光标字符 */
  cursorChar?: string
}>(), {
  speed: 30,
  showCursor: true,
  cursorChar: '▍'
})

const emit = defineEmits<{
  /** 打字完成 */
  done: []
}>()

const displayText = ref('')
const isTyping = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

function clearTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function startTyping(val: string) {
  clearTimer()
  if (!val) {
    displayText.value = ''
    isTyping.value = false
    return
  }
  // 追加模式：新文本以已显示内容为前缀 → 从断点继续；否则替换重打
  const startIdx = val.startsWith(displayText.value) ? displayText.value.length : 0
  if (startIdx === 0) displayText.value = ''

  isTyping.value = true
  let i = startIdx
  timer = setInterval(() => {
    if (i >= val.length) {
      clearTimer()
      isTyping.value = false
      emit('done')
      return
    }
    displayText.value += val[i]
    i++
  }, Math.max(1, props.speed))
}

watch(() => props.text, (val) => startTyping(val), { immediate: true })

onUnmounted(() => clearTimer())
</script>

<style lang="scss" scoped>
.as-streaming {
  display: block;
}

.as-streaming__text {
  font-size: $font-size-md;
  line-height: $lh-base;
  color: $ink;
}

.as-streaming__cursor {
  font-size: $font-size-md;
  line-height: $lh-base;
  color: $primary;
  margin-left: 2rpx;
  animation: as-streaming-blink 1s infinite;
}

@keyframes as-streaming-blink {
  0%,
  49% {
    opacity: 1;
  }

  50%,
  100% {
    opacity: 0;
  }
}
</style>
