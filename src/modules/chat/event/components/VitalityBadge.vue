<template>
  <!-- 事件影响存活度小标（标题下方单独一行）：
       仅 alive/fading/expired 三档渲染；no_observation / 无数据不渲染（见 isVitalityVisible）。 -->
  <view v-if="visible" class="vitality-badge" :class="'is-' + statusKey">
    <view class="vb-dot" />
    <text class="vb-text">{{ label }}</text>
  </view>
</template>

<script setup lang="ts">
/**
 * 事件影响存活度小标（列表卡片 / 详情 Hero 卡共用）
 *
 * 语义：判断已推送重大事件的影响是否仍在推动相关板块（后端 annotation-only 标注）。
 * 展示口径（用户已确认）：标题下方单独一行小标；alive=影响持续中 / fading=影响减弱 / expired=影响消退；
 * no_observation 或无数据不渲染。语义色避开红涨绿跌 → alive=蓝 / fading=琥珀 / expired=浅灰。
 *
 * Props:
 * - vitality: ImpactVitality | null — 后端 impactVitality 字段
 */
import { computed } from 'vue'
import type { ImpactVitality } from '../types'
import { VITALITY_LABELS, isVitalityVisible } from '../constants'

const props = defineProps<{ vitality?: ImpactVitality | null }>()

const visible = computed(() => isVitalityVisible(props.vitality))
const label = computed(() => (props.vitality ? VITALITY_LABELS[props.vitality.status] ?? '' : ''))
/** 分档 class 后缀（no_observation / null → 空串；渲染由 v-if 拦截，此处仅为类型安全） */
const statusKey = computed(() => props.vitality?.status ?? '')
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

.vitality-badge {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 12rpx;
  border-radius: $r-full;
  font-size: $font-size-xs; /* 22rpx，与卡片元信息同字号 */
  line-height: 1.4;
}

.vb-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: $r-full;
  flex-shrink: 0;
}

.vb-text {
  font-size: $font-size-xs;
  font-weight: 500;
}

/* 影响持续中：蓝（存活，语义色避开红涨绿跌） */
.vitality-badge.is-alive {
  background: $primary-50;

  .vb-dot {
    background: $primary;
  }

  .vb-text {
    color: $primary;
  }
}

/* 影响减弱：琥珀 */
.vitality-badge.is-fading {
  background: $warning-soft;

  .vb-dot {
    background: $warning;
  }

  .vb-text {
    color: $warning;
  }
}

/* 影响消退：浅灰（已钝化，弱化视觉权重） */
.vitality-badge.is-expired {
  background: $bg-soft;

  .vb-dot {
    background: $ink-mute;
  }

  .vb-text {
    color: $ink-mute;
  }
}
</style>
