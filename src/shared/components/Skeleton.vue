<template>
  <view class="as-skeleton" :class="[`as-skeleton--${variant}`]" :style="customStyle" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

type SkeletonVariant = 'text' | 'title' | 'circle' | 'block' | 'card'

const props = withDefaults(defineProps<{
  variant?: SkeletonVariant
  width?: string
  height?: string
  rows?: number
}>(), {
  variant: 'text',
  width: '',
  height: '',
  rows: 1
})

const customStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.width) style.width = props.width
  if (props.height) style.height = props.height
  return style
})
</script>

<style lang="scss" scoped>
.as-skeleton {
  display: block;
  background: linear-gradient(90deg, $bg-deep 25%, $line-soft 37%, $bg-deep 63%);
  background-size: 400% 100%;
  animation: as-skeleton-loading 1.4s ease infinite;
  border-radius: $r-xs;
}

@keyframes as-skeleton-loading {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

.as-skeleton--text {
  height: 28rpx;
  width: 100%;
}

.as-skeleton--title {
  height: 40rpx;
  width: 60%;
  border-radius: $r-sm;
}

.as-skeleton--circle {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.as-skeleton--block {
  height: 160rpx;
  width: 100%;
  border-radius: $r-md;
}

.as-skeleton--card {
  height: 200rpx;
  width: 100%;
  border-radius: $r-lg;
}
</style>