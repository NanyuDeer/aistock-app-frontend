<template>
  <text class="as-skill-btn" @tap="$emit('tap')">
    <text v-if="icon" class="as-skill-icon">{{ icon }}</text>
    <text class="as-skill-text">{{ label }}</text>
  </text>
</template>

<script setup lang="ts">
defineProps<{
  icon?: string
  label: string
}>()

defineEmits<{ (e: 'tap'): void }>()
</script>

<style lang="scss" scoped>
.as-skill-btn {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  background: rgba(77, 124, 254, 0.08);
  color: #4d7cfe;
  border-radius: 20rpx;
  padding: 8rpx 20rpx;
  font-size: 24rpx;
}

.as-skill-icon { font-size: 24rpx; }
.as-skill-text { font-size: 24rpx; }

&:active { opacity: 0.7; }
</style>
