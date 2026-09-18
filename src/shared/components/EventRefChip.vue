<template>
  <view
    class="as-event-chip"
    :class="[`as-event-chip--${source}`, { 'as-event-chip--link': clickable }]"
    @tap="handleTap"
  >
    <text class="as-event-chip__src">{{ sourceLabel }}</text>
    <text class="as-event-chip__tx">{{ headline }}</text>
    <!-- 可跳原文的提示符：非 URL 引用（event:<id> / search:<query>|<title>）不可点，不显示 -->
    <text v-if="clickable" class="as-event-chip__chev">›</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * EventRefChip 链上事件胶囊（spec §3.2-4 事件层 / §7 前端事件节点）
 *
 * 展示一条链上事件：来源标记（warehouse=事件抓取中台 / search=板块定向检索补漏）+ headline。
 * **跳转由调用方负责**（纯 UI 组件不直接导航，保证组件库可移植、两副本逐字一致）：
 * `eventRef` 为 http(s) URL 时点击 emit `select(url)`，由 App wrapper 按项目跨端惯例打开
 * （H5 window.open / App+小程序 webview 页）；非 URL 引用（`event:<event_id>`、
 * `search:<query>|<title>`）**不可点、纯文本展示**——不伪造跳转目标。
 */
const props = withDefaults(defineProps<{
  /** 事件一句话摘要（契约：非空） */
  headline: string
  /** 来源：warehouse=事件抓取中台存量命中 / search=板块定向检索补漏 */
  source: 'warehouse' | 'search'
  /** 事件引用：URL 可跳转；其余（事件 id / 检索 query+title）仅展示 */
  eventRef?: string
}>(), {
  eventRef: ''
})

const emit = defineEmits<{
  select: [url: string]
}>()

const URL_RE = /^https?:\/\//i

/** 可点性 = ref 是真实 URL（无 URL 时不渲染可点样式与提示符） */
const clickable = computed(() => URL_RE.test(props.eventRef.trim()))

/** 来源标记文案：中台 / 检索 */
const sourceLabel = computed(() => (props.source === 'warehouse' ? '中台' : '检索'))

function handleTap(): void {
  if (!clickable.value) return
  emit('select', props.eventRef.trim())
}
</script>

<style lang="scss" scoped>
/* 胶囊外框：中性描边（沿用既有 token；内嵌洞见卡溯源子卡时继承其 CSS 变量，深蓝卡下自动适配） */
.as-event-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  max-width: 100%;
  padding: 4rpx 12rpx;
  border: 1rpx solid var(--ins-trace-bd, #{$line});
  border-radius: $r-md;
}

/* 来源标记：中台=主色淡底（存量权威事件）/ 检索=中性灰（补漏来源），沿用既有 token */
.as-event-chip__src {
  flex-shrink: 0;
  padding: 0 8rpx;
  border-radius: $r-xs;
  background: $bg-soft;
  color: $ink-mute;
  font-size: $font-size-xs;
  line-height: 1.8;
}

.as-event-chip--warehouse .as-event-chip__src {
  background: $primary-50;
  color: $primary;
}

/* 事件摘要：单行省略（完整原文由「可跳转」承接） */
.as-event-chip__tx {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: $font-size-xs;
  line-height: 1.6;
  color: var(--ins-card-tx, #{$ink-soft});
}

.as-event-chip__chev {
  flex-shrink: 0;
  font-size: $font-size-xs;
  line-height: 1.6;
  color: var(--ins-trace-key, #{$primary});
}
</style>
