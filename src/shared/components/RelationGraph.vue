/** RelationGraph 组件 — 同步自 aistock-component-lib/src/components/RelationGraph.vue | 同步时间：2026-07-28 */
<template>
  <view class="as-relation-graph">
    <view v-if="title" class="as-relation-graph__title">
      <text class="as-relation-graph__title-text">{{ title }}</text>
    </view>

    <!-- 空态 -->
    <view v-if="!nodes.length" class="as-relation-graph__empty">
      <view class="as-relation-graph__empty-icon"></view>
      <text class="as-relation-graph__empty-text">暂无关联数据</text>
    </view>

    <template v-else>
      <view class="as-relation-graph__canvas">
        <svg class="as-relation-graph__svg" viewBox="0 0 360 280">
          <defs>
            <linearGradient :id="centerGradId" x1="0" y1="0" x2="0" y2="1">
              <stop class="as-relation-graph__center-stop-top" offset="0%" />
              <stop class="as-relation-graph__center-stop-bottom" offset="100%" />
            </linearGradient>
          </defs>

          <!-- 连线（先画，被节点圆覆盖端点） -->
          <line
            v-for="(l, i) in links"
            :key="'link-' + i"
            class="as-relation-graph__link"
            :class="'is-' + l.relType"
            :x1="l.x1"
            :y1="l.y1"
            :x2="l.x2"
            :y2="l.y2"
          />

          <!-- 节点 -->
          <g
            v-for="(p, i) in layout"
            :key="'node-' + i"
            class="as-relation-graph__node"
            :class="p.isMain ? 'is-main' : 'is-' + p.relType"
            @click="onNodeClick(p)"
          >
            <circle
              class="as-relation-graph__circle"
              :class="p.isMain ? 'is-main' : 'is-' + p.relType"
              :cx="p.x"
              :cy="p.y"
              :r="p.isMain ? 36 : 24"
              :fill="p.isMain ? `url(#${centerGradId})` : undefined"
            />
            <!-- 中心节点：文字在圆内，白色 -->
            <text
              v-if="p.isMain"
              class="as-relation-graph__main-label"
              :x="p.x"
              :y="p.y"
              text-anchor="middle"
              dominant-baseline="central"
              font-size="12"
              font-weight="700"
            >{{ truncateLabel(p.node.label, 4) }}</text>
            <!-- 外围节点：文字在圆下方，按关系类型着色 -->
            <template v-else>
              <text
                class="as-relation-graph__node-label"
                :class="'is-' + p.relType"
                :x="p.x"
                :y="p.y + 33"
                text-anchor="middle"
                dominant-baseline="central"
                font-size="10"
                font-weight="600"
              >{{ truncateLabel(p.node.label, 6) }}</text>
              <text
                v-if="p.node.subLabel"
                class="as-relation-graph__node-sub"
                :x="p.x"
                :y="p.y + 44"
                text-anchor="middle"
                dominant-baseline="central"
                font-size="8"
              >{{ p.node.subLabel }}</text>
            </template>
          </g>
        </svg>
      </view>

      <!-- 图例 -->
      <view class="as-relation-graph__legend">
        <view class="as-relation-graph__legend-item">
          <view class="as-relation-graph__legend-dot is-upstream"></view>
          <text class="as-relation-graph__legend-text">上游</text>
        </view>
        <view class="as-relation-graph__legend-item">
          <view class="as-relation-graph__legend-dot is-downstream"></view>
          <text class="as-relation-graph__legend-text">下游</text>
        </view>
        <view class="as-relation-graph__legend-item">
          <view class="as-relation-graph__legend-dot is-related"></view>
          <text class="as-relation-graph__legend-text">关联</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface GraphNode {
  id: string
  label: string
  subLabel?: string
  type?: 'main' | 'upstream' | 'downstream' | 'related'
  factor?: number // 0-1，影响因子
}

const props = withDefaults(defineProps<{
  nodes: GraphNode[]
  title?: string
}>(), {
  title: ''
})

const emit = defineEmits<{
  (e: 'node-click', node: GraphNode): void
}>()

// 画布中心与外围节点分布半径
const CENTER = { x: 180, y: 120 }
const R = 105

// 每个实例独立的渐变 id，避免多图共用导致引用错乱
const centerGradId = 'as-rel-center-' + Math.random().toString(36).slice(2, 9)

type RelType = 'upstream' | 'downstream' | 'related'

interface PositionedNode {
  node: GraphNode
  x: number
  y: number
  isMain: boolean
  relType: RelType
}

const mainNode = computed(() => props.nodes.find(n => n.type === 'main') ?? null)

// 按关系类型分组（type 缺省归为 related）
const peripheralByType = computed<{ up: GraphNode[]; down: GraphNode[]; rel: GraphNode[] }>(() => {
  const up: GraphNode[] = []
  const down: GraphNode[] = []
  const rel: GraphNode[] = []
  for (const n of props.nodes) {
    if (n.type === 'main') continue
    const t = n.type ?? 'related'
    if (t === 'upstream') up.push(n)
    else if (t === 'downstream') down.push(n)
    else rel.push(n)
  }
  return { up, down, rel }
})

// 将一组节点均匀分布在以 centerAngle 为中心的弧段上
function distribute(centerAngleDeg: number, k: number): number[] {
  if (k <= 0) return []
  if (k === 1) return [centerAngleDeg]
  // 单位间距 36°，节点多时自动收紧，最大展开 110°
  const step = Math.min(36, 110 / (k - 1))
  const half = (k - 1) / 2
  return Array.from({ length: k }, (_, i) => centerAngleDeg + (i - half) * step)
}

const layout = computed<PositionedNode[]>(() => {
  const result: PositionedNode[] = []
  if (mainNode.value) {
    result.push({
      node: mainNode.value,
      x: CENTER.x,
      y: CENTER.y,
      isMain: true,
      relType: 'related'
    })
  }
  const place = (list: GraphNode[], centerAngle: number, relType: RelType) => {
    const angles = distribute(centerAngle, list.length)
    list.forEach((n, i) => {
      const a = (angles[i] * Math.PI) / 180
      result.push({
        node: n,
        x: CENTER.x + R * Math.cos(a),
        y: CENTER.y + R * Math.sin(a),
        isMain: false,
        relType
      })
    })
  }
  // 上游居左、下游居右、关联居下
  place(peripheralByType.value.up, 180, 'upstream')
  place(peripheralByType.value.down, 0, 'downstream')
  place(peripheralByType.value.rel, 90, 'related')
  return result
})

// 连线：从中心指向各外围节点
const links = computed(() => {
  return layout.value
    .filter(p => !p.isMain)
    .map(p => ({
      x1: CENTER.x,
      y1: CENTER.y,
      x2: p.x,
      y2: p.y,
      relType: p.relType
    }))
})

function truncateLabel(s: string, max = 6): string {
  return s.length > max ? s.slice(0, max) + '…' : s
}

function onNodeClick(p: PositionedNode) {
  emit('node-click', p.node)
}
</script>

<style lang="scss" scoped>
.as-relation-graph {
  width: 100%;
}

.as-relation-graph__title {
  margin-bottom: $s-3;
}

.as-relation-graph__title-text {
  font-size: $font-size-md;
  font-weight: 700;
  color: $ink;
}

/* ===== 空态 ===== */
.as-relation-graph__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $s-10 $s-6;
}

.as-relation-graph__empty-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: $bg-deep;
  margin-bottom: $s-3;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 40rpx;
    height: 40rpx;
    border: 4rpx solid $line-strong;
    border-radius: 50%;
  }
}

.as-relation-graph__empty-text {
  font-size: $font-size-sm;
  color: $ink-mute;
}

/* ===== 画布 ===== */
.as-relation-graph__canvas {
  width: 100%;
  max-width: 690rpx;
  margin: 0 auto;
}

.as-relation-graph__svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}

/* ===== 连线 ===== */
.as-relation-graph__link {
  fill: none;
  stroke-width: 1.5;

  &.is-upstream {
    stroke: $primary;
  }

  &.is-downstream {
    stroke: $up;
  }

  &.is-related {
    stroke: $ink-mute;
    stroke-dasharray: 4 3;
  }
}

/* ===== 节点 ===== */
.as-relation-graph__node {
  cursor: pointer;
}

.as-relation-graph__node:active .as-relation-graph__circle {
  opacity: $op-active;
}

.as-relation-graph__circle {
  &.is-main {
    stroke: $primary-deep;
    stroke-width: 2;
  }

  &.is-upstream {
    fill: $bg-soft;
    stroke: $primary;
    stroke-width: 2;
  }

  &.is-downstream {
    fill: $up-bg;
    stroke: $up;
    stroke-width: 2;
  }

  &.is-related {
    fill: $bg-soft;
    stroke: $ink-mute;
    stroke-width: 2;
  }
}

.as-relation-graph__main-label {
  font-family: $font-sans;
  fill: $white;
}

.as-relation-graph__node-label {
  font-family: $font-sans;

  &.is-upstream {
    fill: $primary;
  }

  &.is-downstream {
    fill: $up;
  }

  &.is-related {
    fill: $ink-soft;
  }
}

.as-relation-graph__node-sub {
  font-family: $font-sans;
  fill: $ink-mute;
}

/* 中心节点渐变：主色 -> 深主色 */
.as-relation-graph__center-stop-top {
  stop-color: $primary;
}

.as-relation-graph__center-stop-bottom {
  stop-color: $primary-deep;
}

/* ===== 图例 ===== */
.as-relation-graph__legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $s-4;
  margin-top: $s-2;
}

.as-relation-graph__legend-item {
  display: flex;
  align-items: center;
  gap: $s-1;
}

.as-relation-graph__legend-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;

  &.is-upstream {
    background: $primary;
  }

  &.is-downstream {
    background: $up;
  }

  &.is-related {
    background: $ink-mute;
  }
}

.as-relation-graph__legend-text {
  font-size: $font-size-xs;
  color: $ink-mute;
}
</style>
