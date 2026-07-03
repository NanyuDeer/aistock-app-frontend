<template>
  <view class="as-avatar" :style="{ width: size + 'rpx', height: size + 'rpx' }">
    <text v-if="emoji" class="as-avatar-emoji">{{ emoji }}</text>
    <image v-else-if="src" class="as-avatar-img" :src="src" mode="aspectFill" />
    <text v-else class="as-avatar-text">{{ initial }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  src?: string
  emoji?: string
  name?: string
  size?: number
}>(), {
  size: 80,
  emoji: '',
  name: '',
  src: ''
})

const initial = computed(() => props.name?.charAt(0) || 'A')
</script>

<style lang="scss" scoped>
.as-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #4d7cfe, #6366f1);
  overflow: hidden;
  flex-shrink: 0;
}

.as-avatar-emoji { font-size: 48rpx; }

.as-avatar-img { width: 100%; height: 100%; }

.as-avatar-text {
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
}
</style>
