<template>
  <!-- 统一 SVG 图标组件 -->
  <!-- H5: 用 mask 实现颜色穿透（最佳方案） -->
  <!-- App/小程序: 用 data URI 内联 SVG，替换 currentColor 为具体颜色 -->
  <view class="svg-icon-wrap" :style="wrapStyle">
    <!-- #ifdef H5 -->
    <view class="svg-icon-h5" :style="h5Style" />
    <!-- #endif -->

    <!-- #ifndef H5 -->
    <image
      v-if="dataUri"
      class="svg-icon-img"
      :src="dataUri"
      mode="aspectFit"
      :style="{ width: size, height: size }"
    />
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getSvgContent } from './svg-cache'

const props = withDefaults(defineProps<{
  /** 图标名称，不含扩展名，如 'bell-line' */
  name: string
  /** 尺寸，默认 36rpx */
  size?: string
  /** 颜色，默认 #9ca3af */
  color?: string
}>(), {
  size: '36rpx',
  color: '#9ca3af',
})

const wrapStyle = computed(() => ({
  width: props.size,
  height: props.size,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: '0',
  verticalAlign: 'middle',
} as Record<string, string>))

// H5：用 mask + background-color
const h5Style = computed(() => {
  const url = `/static/assets/icons/${props.name}.svg`
  return {
    width: props.size,
    height: props.size,
    WebkitMask: `url(${url}) no-repeat center / contain`,
    mask: `url(${url}) no-repeat center / contain`,
    backgroundColor: props.color,
  } as Record<string, string>
})

// App/小程序：用 data URI，替换 currentColor 为具体颜色
const dataUri = computed(() => {
  const svgContent = getSvgContent(props.name)
  if (!svgContent) {
    // 缓存未命中：退回用文件路径
    return `/static/assets/icons/${props.name}.svg`
  }
  // 替换 currentColor 为具体颜色
  const colored = svgContent.replace(/currentColor/g, props.color)
  // 用 encodeURIComponent 编码 data URI（全平台兼容）
  const encoded = encodeURIComponent(colored)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
  return `data:image/svg+xml,${encoded}`
})
</script>

<style scoped>
.svg-icon-wrap {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}

/* #ifdef H5 */
.svg-icon-h5 {
  display: inline-block;
}
/* #endif */

/* #ifndef H5 */
.svg-icon-img {
  display: inline-block;
}
/* #endif */
</style>
