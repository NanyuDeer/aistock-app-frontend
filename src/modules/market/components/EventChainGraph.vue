<template>
  <Card flat class="as-event-chain">
    <view v-if="title" class="as-chain-header">
      <text class="as-chain-title">{{ title }}</text>
    </view>
    <EmptyState v-if="!chain.length" text="暂无传导链数据" />
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
            <SvgIcon class="as-chain-arrow-icon" name="arrow-right-s-line" size="24rpx" :color="iconMuted" />
            <text v-if="node.factor" class="as-chain-factor">{{ (node.factor * 100).toFixed(0) }}%</text>
          </view>
        </view>
      </view>
    </scroll-view>
    <view v-if="narrative" class="as-chain-narrative">
      <text class="as-chain-narrative-text">{{ narrative }}</text>
    </view>
  </Card>
</template>

<script setup lang="ts">
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { Card, EmptyState } from '@/shared/components'

/** SvgIcon 图标颜色（传递给 color prop，需具体色值，对应 $ink-mute） */
const iconMuted = '#8a96b0'

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
/* Card 容器覆写：传导链卡片为白底紧凑布局（flat 已去阴影，再去除边框） */
.as-event-chain.as-card { padding: 24rpx; border: none; border-radius: $r-sm; }

.as-chain-header { margin-bottom: 16rpx; }
.as-chain-title { font-size: $font-size-md; font-weight: 600; color: $ink; }

.as-chain-scroll { width: 100%; }
.as-chain-flow { display: flex; align-items: center; padding: 16rpx 0; min-width: max-content; }

.as-chain-step { display: flex; align-items: center; }

.as-chain-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 20rpx;
  border-radius: $r-xs;
  min-width: 140rpx;
  max-width: 200rpx;
}

.as-chain-main { background: linear-gradient(135deg, $primary, $primary-600); }
.as-chain-upstream { background: rgba($primary, 0.1); border: 1rpx solid rgba($primary, 0.3); }
.as-chain-downstream { background: rgba($up, 0.1); border: 1rpx solid rgba($up, 0.3); }
.as-chain-related { background: $bg-soft; border: 1rpx solid $line; }

.as-chain-node-label { font-size: $font-size-xs; color: $ink; text-align: center; }
.as-chain-main .as-chain-node-label { color: $white; font-weight: 600; }

.as-chain-change { font-size: 20rpx; margin-top: 4rpx; }
.up { color: $up; }
.down { color: $down; }
.as-chain-main .as-chain-change { color: rgba($white, 0.9); }
.as-chain-main .as-chain-change.up { color: mix($white, $up, 75%); }
.as-chain-main .as-chain-change.down { color: mix($white, $down, 75%); }

.as-chain-arrow { display: flex; flex-direction: column; align-items: center; padding: 0 8rpx; }
.as-chain-arrow-icon { font-size: $font-size-md; color: $ink-mute; }
.as-chain-factor { font-size: 18rpx; color: $ink-soft; }

.as-chain-narrative { margin-top: 16rpx; padding: 16rpx; background: $bg-soft; border-radius: $r-xs; }
.as-chain-narrative-text { font-size: $font-size-sm; color: $ink-soft; line-height: 1.5; }
</style>
