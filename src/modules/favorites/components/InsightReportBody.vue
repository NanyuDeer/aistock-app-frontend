<template>
  <view class="report-body">
    <text v-if="header" class="report-header">{{ header }}</text>

    <view v-for="(section, si) in sections" :key="si" class="report-section">
      <text class="report-heading">{{ section.heading }}</text>
      <text v-if="section.blocks.length === 0" class="report-empty">暂缺</text>

      <template v-for="(block, bi) in section.blocks" :key="bi">
        <!-- 事件事实：键值两列 -->
        <view v-if="block.type === 'kv'" class="kv-block">
          <view v-for="(item, ii) in block.items" :key="ii" class="kv-row">
            <text class="kv-label">{{ item.label }}</text>
            <text :class="['kv-value', toneClass(item.tone)]">{{ item.value }}</text>
          </view>
        </view>

        <!-- 主因结论：正文 + 徽标 -->
        <view v-else-if="block.type === 'verdict'" class="verdict-block">
          <text class="verdict-text">{{ block.text }}</text>
          <view v-if="block.badges.length" class="badge-row">
            <text v-for="(badge, xi) in block.badges" :key="xi" class="badge">{{ badge.label }} {{ badge.value }}</text>
          </view>
        </view>

        <!-- 六阶段因果链：纵向时间轴（左侧序号圆点 + 连接线，右侧节点卡） -->
        <view v-else-if="block.type === 'chain'" class="chain-block">
          <view
            v-for="(stage, ci) in block.stages"
            :key="ci"
            :class="['chain-node', { 'is-weak': stage.statusKey !== 'established' }]"
          >
            <view class="chain-rail">
              <view class="chain-dot"><text class="chain-dot-text">{{ ci + 1 }}</text></view>
              <view v-if="ci < block.stages.length - 1" class="chain-line" />
            </view>
            <view class="chain-body">
              <view class="chain-head">
                <text class="chain-stage">{{ stage.stage }}</text>
                <text class="chain-evidence">{{ stage.evidenceCount }} 条证据</text>
              </view>
              <text class="chain-claim">{{ stage.claim }}</text>
              <view class="chain-badges">
                <text class="chain-badge">{{ stage.epistemic }}</text>
                <text class="chain-badge">{{ stage.status }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 分层候选归因：层级/状态徽标 + 正文 + 证据胶囊；非 supported 走中性弱化 -->
        <view v-else-if="block.type === 'candidates'" class="cand-block">
          <view
            v-for="(item, ci) in block.items"
            :key="ci"
            :class="['cand-card', { 'is-weak': item.statusKey !== 'supported' }]"
          >
            <view class="badge-row">
              <text class="badge">{{ item.layer }}</text>
              <text class="badge">{{ item.status }}</text>
            </view>
            <text class="cand-verdict">{{ item.verdict }}</text>
            <view v-if="item.evidenceIds.length" class="cand-evidence-row">
              <text v-for="(eid, ei) in item.evidenceIds" :key="ei" class="cand-evidence">证据 {{ eid }}</text>
            </view>
          </view>
        </view>

        <!-- 证据清单 -->
        <view v-else-if="block.type === 'evidence'" class="ev-block">
          <view v-for="(item, ei) in block.items" :key="ei" class="ev-card">
            <view class="ev-head">
              <text class="ev-id">{{ item.sourceId }}</text>
              <text class="badge">{{ item.level }}</text>
            </view>
            <text class="ev-meta">{{ item.provider }}｜{{ item.kind }}｜{{ item.occurredAt }}</text>
            <text class="ev-title">{{ item.title }}</text>
            <text class="ev-excerpt">{{ item.excerpt }}</text>
          </view>
        </view>

        <!-- 未解问题：序号圆标 + 条目 -->
        <view v-else-if="block.type === 'list'" class="list-block">
          <view v-for="(item, li) in block.items" :key="li" class="list-row">
            <view class="list-index"><text class="list-index-text">{{ li + 1 }}</text></view>
            <text class="list-text">{{ item }}</text>
          </view>
        </view>
      </template>
    </view>

    <text v-if="loading" class="report-loading">生成中…</text>
  </view>
</template>

<script setup lang="ts">
import type { ReportSection } from '@/modules/favorites/utils/useInsightReportSSE'

defineProps<{
  /** 页眉：股票名（代码） · 交易日 */
  header: string
  /** 已按流式顺序追加的章节 */
  sections: ReportSection[]
  loading?: boolean
}>()

/** 涨跌着色：只有 up/down 才加类，其它取值保持默认色 */
function toneClass(tone?: 'up' | 'down' | null): string {
  return tone === 'up' || tone === 'down' ? `is-${tone}` : ''
}
</script>

<style lang="scss" scoped>
.report-body {
  margin-top: $s-3;
  padding: $s-3;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
}
.report-header {
  display: block;
  padding-bottom: $s-2;
  margin-bottom: $s-3;
  border-bottom: 2rpx solid $line;
  font-size: $font-size-sm;
  color: $ink-soft;
  text-align: center;
}
.report-section { margin-bottom: $s-4; }
.report-section:last-child { margin-bottom: 0; }
.report-heading {
  display: block;
  margin-bottom: $s-2;
  font-size: $font-size-base;
  font-weight: 600;
  color: $primary;
}
.report-empty { display: block; font-size: $font-size-sm; color: $ink-mute; }
.report-loading { display: block; margin-top: $s-2; font-size: $font-size-xs; color: $ink-soft; }

/* ===== 通用徽标 ===== */
.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: $s-1;
}
.badge {
  padding: 2rpx $s-1;
  border-radius: $r-xs;
  background: $bg-soft;
  font-size: $font-size-xs;
  color: $ink-soft;
  line-height: 1.6;
}

/* ===== 事件事实：键值两列（左标签灰小字 / 值右对齐黑正文） ===== */
.kv-row {
  display: flex;
  align-items: flex-start;
  padding: $s-1 0;
}
.kv-row + .kv-row { border-top: 2rpx solid $line-soft; }
.kv-label {
  flex: 0 0 160rpx;
  font-size: $font-size-sm;
  color: $ink-mute;
}
.kv-value {
  flex: 1;
  font-size: $font-size-base;
  color: $ink;
}
.kv-value.is-up { color: $up; }
.kv-value.is-down { color: $down; }

/* ===== 主因结论：正文突出 + 徽标行 ===== */
.verdict-block { padding: $s-2; border-radius: $r-sm; background: $bg-soft; }
.verdict-text {
  display: block;
  margin-bottom: $s-2;
  font-size: $font-size-md;
  font-weight: 600;
  color: $ink;
  line-height: 1.6;
}

/* ===== 六阶段因果链：纵向时间轴 ===== */
.chain-node {
  display: flex;
  align-items: stretch;
}
.chain-rail {
  flex: 0 0 $s-4;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.chain-dot {
  width: $s-4;
  height: $s-4;
  border-radius: 50%;
  background: $primary;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chain-dot-text { font-size: $font-size-xs; color: #ffffff; line-height: 1; }
.chain-line {
  flex: 1;
  width: 2rpx;
  margin: $s-1 0;
  background: $line-strong;
}
.chain-body {
  flex: 1;
  min-width: 0;
  padding: 0 0 $s-3 $s-2;
}
.chain-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: $s-2;
  margin-bottom: $s-1;
}
.chain-stage {
  font-size: $font-size-md;
  font-weight: 600;
  color: $primary;
}
.chain-evidence {
  flex: 0 0 auto;
  font-size: $font-size-xs;
  color: $ink-mute;
}
.chain-claim {
  display: block;
  margin-bottom: $s-1;
  font-size: $font-size-base;
  color: $ink;
  line-height: 1.6;
}
.chain-badges {
  display: flex;
  flex-wrap: wrap;
  gap: $s-1;
}
.chain-badge {
  padding: 2rpx $s-1;
  border-radius: $r-xs;
  background: $bg-soft;
  font-size: $font-size-xs;
  color: $ink-soft;
  line-height: 1.6;
}
/* 未确立 / 部分确立 → 中性弱化（灰阶，不用告警色） */
.chain-node.is-weak .chain-dot { background: $ink-faint; }
.chain-node.is-weak .chain-stage { color: $ink-soft; }
.chain-node.is-weak .chain-claim { color: $ink-soft; }

/* ===== 分层候选归因 ===== */
.cand-card {
  padding: $s-2;
  margin-bottom: $s-2;
  border-radius: $r-sm;
  background: $bg-soft;
}
.cand-card:last-child { margin-bottom: 0; }
.cand-verdict {
  display: block;
  margin-top: $s-1;
  font-size: $font-size-sm;
  color: $ink;
  line-height: 1.6;
}
.cand-evidence-row {
  display: flex;
  flex-wrap: wrap;
  gap: $s-1;
  margin-top: $s-1;
}
.cand-evidence {
  padding: 2rpx $s-1;
  border-radius: $r-xs;
  background: $bg-card;
  font-size: $font-size-xs;
  color: $ink-mute;
  line-height: 1.6;
}
/* 非 supported（佐证偏弱/已排除/证据不足）→ 中性弱化，与因果链同一口径 */
.cand-card.is-weak .cand-verdict { color: $ink-soft; }
.cand-card.is-weak .badge { color: $ink-mute; }

/* ===== 证据清单 ===== */
.ev-card {
  padding: $s-2;
  margin-bottom: $s-2;
  border-radius: $r-sm;
  background: $bg-soft;
}
.ev-card:last-child { margin-bottom: 0; }
.ev-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $s-2;
}
.ev-id {
  flex: 1;
  min-width: 0;
  font-size: $font-size-xs;
  color: $ink-mute;
}
.ev-meta {
  display: block;
  margin: $s-1 0;
  font-size: $font-size-xs;
  color: $ink-mute;
}
.ev-title {
  display: block;
  font-size: $font-size-sm;
  color: $ink;
  line-height: 1.6;
}
.ev-excerpt {
  display: block;
  margin-top: 2rpx;
  font-size: $font-size-xs;
  color: $ink-soft;
  line-height: 1.6;
}

/* ===== 未解问题：序号圆标 ===== */
.list-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: $s-2;
}
.list-row:last-child { margin-bottom: 0; }
.list-index {
  flex: 0 0 $s-3;
  height: $s-3;
  margin-top: 4rpx;
  border-radius: 50%;
  background: $bg-deep;
  display: flex;
  align-items: center;
  justify-content: center;
}
.list-index-text { font-size: $font-size-xs; color: $ink-soft; line-height: 1; }
.list-text {
  flex: 1;
  margin-left: $s-1;
  font-size: $font-size-sm;
  color: $ink;
  line-height: 1.6;
}
</style>
