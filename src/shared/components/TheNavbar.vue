<template>
  <view class="as-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
    <view class="as-navbar-inner">
      <view class="as-navbar-left" @tap="handleBack">
        <SvgIcon v-if="showBack" name="arrow-left-s-line" size="40rpx" color="#1a1d24" />
        <slot v-else name="left" />
      </view>
      <view class="as-navbar-title">
        <slot>{{ title }}</slot>
      </view>
      <view class="as-navbar-right">
        <slot name="right" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

withDefaults(defineProps<{
  title?: string
  showBack?: boolean
}>(), {
  title: '',
  showBack: false
})

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch {}

function handleBack() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.as-navbar {
  background: #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.as-navbar-inner {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 24rpx;
}

.as-navbar-left { width: 80rpx; display: flex; align-items: center; }

.as-navbar-back {
  font-size: 40rpx;
  color: #1a1d24;
}

.as-navbar-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1d24;
}

.as-navbar-right { width: 80rpx; display: flex; align-items: center; justify-content: flex-end; }
</style>
