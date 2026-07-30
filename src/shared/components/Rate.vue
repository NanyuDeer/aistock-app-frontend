<template>
  <view class="as-rate" :style="{ gap: computedGap }">
    <view
      v-for="i in max"
      :key="i"
      class="as-rate__star"
      :class="{ 'is-active': i <= modelValue, 'is-interactive': !readonly }"
      :style="starStyle(i <= modelValue)"
      @tap="onTap(i)"
    />
    <text v-if="showText" class="as-rate__text">{{ modelValue }}/{{ max }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { rpxToVw } from '@/shared/utils/rpx'

type RateType = 'gold' | 'primary' | 'up'

const props = withDefaults(defineProps<{
  /** 当前评分，v-model 绑定 */
  modelValue?: number
  /** 星星总数 */
  max?: number
  /** 星星尺寸，如 '32rpx' */
  size?: string
  /** 星星间距（rpx） */
  gap?: number
  /** 是否只读 */
  readonly?: boolean
  /** 主题色：gold→金色, primary→主蓝, up→A股红 */
  type?: RateType
  /** 是否显示 "x/max" 文字 */
  showText?: boolean
}>(), {
  modelValue: 3,
  max: 5,
  size: '32rpx',
  gap: 4,
  readonly: true,
  type: 'gold',
  showText: false
})

/** rpx → vw 转换（H5 预览环境内联样式不识别 rpx） */
const computedSize = computed(() => rpxToVw(props.size))
const computedGap = computed(() => rpxToVw(props.gap + 'rpx'))

/** 星星样式：尺寸 + 背景图（用 CSS background-image 替代 <image> 标签） */
function starStyle(isActive: boolean): Record<string, string> {
  return {
    width: computedSize.value,
    height: computedSize.value,
    backgroundImage: `url("${isActive ? activeUri.value : inactiveUri.value}")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'contain'
  }
}

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

/** 主题色映射 */
const activeColor = computed<string>(() => {
  const colorMap: Record<RateType, string> = {
    gold: '#d4a843',
    primary: '#0b5fff',
    up: '#e54d5e'
  }
  return colorMap[props.type]
})

/** 未点亮星颜色统一为浅灰 */
const INACTIVE_COLOR = '#b8c3d6'

/** 星形 SVG path（24x24 viewBox） */
const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'

/** 构建内联 SVG data URI：filled=true 为填充版，false 为描边版 */
function buildStarUri(color: string, filled: boolean): string {
  const fillAttrs = filled
    ? `fill="${color}" stroke="${color}" stroke-width="1"`
    : `fill="none" stroke="${color}" stroke-width="1.5"`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${fillAttrs} stroke-linejoin="round" width="24" height="24"><path d="${STAR_PATH}"/></svg>`
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
  return `data:image/svg+xml,${encoded}`
}

const activeUri = computed(() => buildStarUri(activeColor.value, true))
const inactiveUri = computed(() => buildStarUri(INACTIVE_COLOR, false))

/** 点击星星：非只读时更新评分 */
function onTap(i: number) {
  if (props.readonly) return
  emit('update:modelValue', i)
}
</script>

<style lang="scss" scoped>
.as-rate {
  display: inline-flex;
  align-items: center;
}

.as-rate__star {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform $t-fast;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.as-rate__star.is-interactive {
  cursor: pointer;
}

.as-rate__star.is-interactive:active {
  opacity: $op-active;
  transform: scale(0.9);
}

.as-rate__icon {
  display: block;
}

.as-rate__text {
  margin-left: $s-2;
  font-size: $font-size-sm;
  color: $ink-soft;
  font-family: $font-mono;
  font-weight: 600;
}
</style>
