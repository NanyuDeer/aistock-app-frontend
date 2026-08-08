/**
 * TheFooter 组件 — 同步自 aistock-component-lib/src/components/Footer.vue
 * 同步时间：2026-07-28
 * 向后兼容：保留 text prop，新增 default slot 支持自定义内容
 */
<template>
  <view class="as-footer">
    <slot>
      <text class="as-footer__text">{{ text }}</text>
    </slot>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  /** 页脚文案 */
  text?: string
}>(), {
  text: '洞见 · 智能投顾'
})
</script>

<style lang="scss" scoped>
.as-footer {
  padding: $s-4 $s-3;
  margin-top: $s-5;
  text-align: center;
}

.as-footer__text {
  font-size: $font-size-xs;
  color: $ink-mute;
  line-height: $lh-base;
}
</style>
