<template>
  <view class="as-event-chain">
    <view v-if="title" class="as-chain-header">
      <text class="as-chain-title">{{ title }}</text>
    </view>
    <view v-if="!chain.length" class="as-chain-empty">
      <text class="as-chain-empty-text">暂无传导链数据</text>
    </view>
    <scroll-view v-else scroll-x class="as-chain-scroll">
      <view class="as-chain-flow">
        <view
          v-for="(node, idx) in chain"
          :key="idx"
          class="as-chain-step"
        >
          <view :class="['as-chain-node', `as-chain-${node.type || 'main'}`]" @tap="$emit('node-click', node)">
            <text class="as-chain-node-label">{{ node.label }}</text>
            <text v-if="node.change !== undefined" :class="['as-chain-change', node.change >= 0 ? 'up' : 'down']">
              {{ node.change >= 0 ? '+' : '' }}{{ node.change }}%
            </text>
          </view>
          <view v-if="idx < chain.length - 1" class="as-chain-arrow">
            <SvgIcon class="as-chain-arrow-icon" name="arrow-right-s-line" size="24rpx" color="#9ca3af" />
            <text v-if="node.factor" class="as-chain-factor">{{ (node.factor * 100).toFixed(0) }}%</text>
          </view>
        </view>
      </view>
    </scroll-view>
    <view v-if="narrative" class="as-chain-narrative">
      <text class="as-chain-narrative-text">{{ narrative }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import SvgIcon from '@/shared/components/SvgIcon.vue'

interface ChainNode {
  id: string
  label: string
  type?: 'main' | 'upstream' | 'downstream' | 'related'
  change?: number
  factor?: number
  leading_stock?: string
}

withDefaults(defineProps<{
  chain: ChainNode[]
  title?: string
  narrative?: string
}>(), {
  title: '',
  narrative: ''
})

defineEmits<{ (e: 'node-click', node: ChainNode): void }>()
</script>

<style lang="scss" scoped>
.as-event-chain { background: #ffffff; border-radius: 12rpx; padding: 24rpx; }

.as-chain-header { margin-bottom: 16rpx; }
.as-chain-title { font-size: 28rpx; font-weight: 600; color: #1a1d24; }

.as-chain-scroll { width: 100%; }
.as-chain-flow { display: flex; align-items: center; padding: 16rpx 0; min-width: max-content; }

.as-chain-step { display: flex; align-items: center; }

.as-chain-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 20rpx;
  border-radius: 8rpx;
  min-width: 140rpx;
  max-width: 200rpx;
}

.as-chain-main { background: linear-gradient(135deg, #4d7cfe, #6366f1); }
.as-chain-upstream { background: rgba(77, 124, 254, 0.1); border: 1rpx solid rgba(77, 124, 254, 0.3); }
.as-chain-downstream { background: rgba(244, 63, 94, 0.1); border: 1rpx solid rgba(244, 63, 94, 0.3); }
.as-chain-related { background: #f5f7fa; border: 1rpx solid #e5e7eb; }

.as-chain-node-label { font-size: 22rpx; color: #1a1d24; text-align: center; }
.as-chain-main .as-chain-node-label { color: #ffffff; font-weight: 600; }

.as-chain-change { font-size: 20rpx; margin-top: 4rpx; }
.up { color: #f43f5e; }
.down { color: #22c55e; }
.as-chain-main .as-chain-change { color: rgba(255, 255, 255, 0.9); }
.as-chain-main .as-chain-change.up { color: #ffe4e6; }
.as-chain-main .as-chain-change.down { color: #dcfce7; }

.as-chain-arrow { display: flex; flex-direction: column; align-items: center; padding: 0 8rpx; }
.as-chain-arrow-icon { font-size: 28rpx; color: #9ca3af; }
.as-chain-factor { font-size: 18rpx; color: #6b7280; }

.as-chain-narrative { margin-top: 16rpx; padding: 16rpx; background: #f5f7fa; border-radius: 8rpx; }
.as-chain-narrative-text { font-size: 24rpx; color: #6b7280; line-height: 1.5; }

.as-chain-empty { height: 200rpx; display: flex; align-items: center; justify-content: center; }
.as-chain-empty-text { font-size: 26rpx; color: #9ca3af; }
</style>
