<template>
  <view class="event-tab-bar">
    <scroll-view scroll-x class="tab-scroll" :show-scrollbar="false">
      <view class="tab-list">
        <view
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-item"
          :class="{ active: active === tab.value }"
          @tap="handleChange(tab.value)"
        >
          <text class="tab-text">{{ tab.label }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
/**
 * 事件分类 Tab 栏
 *
 * 横向滚动胶囊按钮，活跃态渐变高亮
 */
import type { EventType } from '../types'

interface TabItem {
  label: string
  value: string
}

interface Props {
  active?: string
}

const props = withDefaults(defineProps<Props>(), {
  active: '全部',
})

const emit = defineEmits<{
  change: [value: string]
}>()

const tabs: TabItem[] = [
  { label: '全部', value: '全部' },
  { label: '产业政策', value: '产业政策' },
  { label: '地缘政治', value: '地缘政治' },
  { label: '技术突破', value: '技术突破' },
  { label: '市场动态', value: '市场动态' },
  { label: '监管变化', value: '监管变化' },
  { label: '公司公告', value: '公司公告' },
]

function handleChange(value: string) {
  if (value === props.active) return
  emit('change', value)
}
</script>

<style scoped>
.event-tab-bar {
  padding: 16rpx 0 8rpx;
}

.tab-scroll {
  width: 100%;
  white-space: nowrap;
}

.tab-list {
  display: inline-flex;
  gap: 12rpx;
  padding: 0 32rpx;
}

.tab-item {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  border-radius: 9999rpx;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  transition: all 0.2s;
}

.tab-item.active {
  background: var(--ev-blue-gradient);
  border-color: transparent;
  box-shadow: 0 4rpx 24rpx rgba(59, 130, 246, 0.35);
}

.tab-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #1a1d24;
  white-space: nowrap;
}

.tab-item.active .tab-text {
  color: #FFFFFF;
  font-weight: 600;
}
</style>
