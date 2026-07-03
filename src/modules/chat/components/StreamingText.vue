<template>
  <view class="as-streaming">
    <text class="as-streaming-text">{{ displayText }}</text>
    <text v-if="cursor" class="as-streaming-cursor">▍</text>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  text: string
  speed?: number
}>(), {
  speed: 30
})

const displayText = ref('')
const cursor = ref(true)
let timer: any = null

watch(() => props.text, (val) => {
  if (timer) clearInterval(timer)
  if (!val) {
    displayText.value = ''
    return
  }
  // 如果新文本是旧文本的延续（追加），直接追加增量
  if (val.startsWith(displayText.value)) {
    const rest = val.slice(displayText.value.length)
    let i = 0
    timer = setInterval(() => {
      if (i >= rest.length) {
        clearInterval(timer)
        timer = null
        return
      }
      displayText.value += rest[i]
      i++
    }, props.speed)
  } else {
    // 完全替换
    displayText.value = ''
    let i = 0
    timer = setInterval(() => {
      if (i >= val.length) {
        clearInterval(timer)
        timer = null
        return
      }
      displayText.value += val[i]
      i++
    }, props.speed)
  }
}, { immediate: true })

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style lang="scss" scoped>
.as-streaming { display: flex; align-items: flex-end; }
.as-streaming-text { font-size: 28rpx; color: #1a1d24; line-height: 1.5; }
.as-streaming-cursor { font-size: 24rpx; color: #4d7cfe; animation: blink 1s infinite; }

@keyframes blink { 50% { opacity: 0; } }
</style>
