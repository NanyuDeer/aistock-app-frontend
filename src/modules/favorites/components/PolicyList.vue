<template>
  <view class="policy-list">
    <view v-for="(policy, idx) in policies" :key="idx" class="policy-item">
      <text v-if="policy.tag" :class="['policy-tag', policy.type]">{{ policy.tag }}</text>
      <text :class="['policy-text', { 'is-collapsed': !isExpanded(idx) }]">{{ policy.text }}</text>
      <view v-if="needsToggle(idx)" class="policy-toggle" @tap="toggle(idx)">
        <text class="policy-toggle-text">{{ isExpanded(idx) ? '收起' : '展开' }}</text>
        <text class="policy-toggle-icon" :class="{ 'is-open': isExpanded(idx) }">▾</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface PolicyItem {
  tag?: string
  type?: string
  text: string
}

interface Props {
  policies: ReadonlyArray<PolicyItem>
}

const props = defineProps<Props>()

/** 超过该字数即按 2 行截断（与 CSS 的 2 行 clamp 对应），超出才显示单条展开按钮 */
const CLAMP_THRESHOLD = 42

/** 展开态：同一时刻只允许展开一条，点另一条会自动收起前一条 */
const expandedIndex = ref<number | null>(null)

function isExpanded(index: number): boolean {
  return expandedIndex.value === index
}

function needsToggle(index: number): boolean {
  return String(props.policies[index]?.text ?? '').length > CLAMP_THRESHOLD
}

function toggle(index: number): void {
  expandedIndex.value = isExpanded(index) ? null : index
}
</script>

<style lang="scss" scoped>
.policy-list {
  display: flex;
  flex-direction: column;
}

.policy-item {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid $line-soft;

  &:last-child {
    border-bottom: none;
  }
}

.policy-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 56rpx;
  height: 34rpx;
  padding: 0 10rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  line-height: 1;
  font-weight: 700;

  &.is-good {
    background: $up-soft;
    color: $up;
  }

  &.is-neutral {
    background: $bg-deep;
    color: $ink-mute;
  }
}

.policy-text {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  color: $ink-soft;
  line-height: 1.65;

  &.is-collapsed {
    display: -webkit-box;
    overflow: hidden;
    text-overflow: ellipsis;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}

/* 单条展开按钮：贴在该条末尾（与文本底部对齐） */
.policy-toggle {
  flex-shrink: 0;
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 0 2rpx 8rpx;
}

.policy-toggle-text {
  font-size: 24rpx;
  font-weight: 600;
  color: $primary;
}

.policy-toggle-icon {
  font-size: 24rpx;
  line-height: 1;
  color: $primary;
  transition: transform 0.15s ease;

  &.is-open {
    transform: rotate(180deg);
  }
}
</style>
