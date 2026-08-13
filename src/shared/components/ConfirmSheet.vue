<template>
  <BottomSheet :visible="visible" :closeable="!waiting" @close="$emit('close')">
    <template #header>
      <view class="cs-header">
        <SvgIcon name="question-line" size="36rpx" color="#0b5fff" />
        <text class="cs-title">请确认</text>
      </view>
    </template>

    <template v-if="visible">
      <view class="cs-question">{{ question }}</view>
      <view class="cs-options">
        <view
          v-for="opt in options"
          :key="opt.key"
          class="cs-option"
          :class="{ disabled: waiting }"
          @tap="onSelect(opt)"
        >
          <text class="cs-option-label">{{ opt.label }}</text>
          <SvgIcon name="arrow-right-s-line" size="32rpx" color="#0b5fff" />
        </view>
      </view>
    </template>

    <template #footer>
      <view v-if="waiting" class="cs-waiting">
        <SvgIcon name="loader-3-line" size="28rpx" color="#0b5fff" class="cs-spin" />
        <text class="cs-waiting-text">已确认「{{ chosenLabel }}」，继续回答…</text>
      </view>
    </template>
  </BottomSheet>
</template>

<script setup lang="ts">
/**
 * Phase 4-2 改进 13：交互式确认弹框（纯 UI 组件，props/events 驱动，不含业务逻辑）。
 * 流程：confirm_request 终态 → 页面传入 question/options → 用户点选 emit select(key, label) →
 * 页面发 confirm_response 续跑并置 waiting=true → 本组件显示「已确认 XX，继续回答…」并禁用选项；
 * 关框 → 发送 confirm_response(choice='none')（语义=「都不是」）→ 后端立即回退澄清；
 * WS 不可用则软 re-arm，由后端 60s 超时自动回退（abandonConfirm，useChatStream）。
 */
import { ref, watch } from 'vue'
import BottomSheet from './BottomSheet.vue'
import SvgIcon from './SvgIcon.vue'

interface ConfirmOption {
  key: string
  label: string
}

const props = withDefaults(defineProps<{
  visible: boolean
  question: string
  options: ConfirmOption[]
  /** 已点选、等待后端 fresh run 续跑（禁用选项 + 显示确认态） */
  waiting: boolean
}>(), {
  visible: false,
  question: '',
  options: () => [],
  waiting: false,
})

const emit = defineEmits<{
  (e: 'select', key: string, label: string): void
  (e: 'close'): void
}>()

/** 已点选选项 label（waiting 态「已确认 XX，继续回答…」展示用） */
const chosenLabel = ref('')
/** 提交守卫：防双击/连点重复 emit（页面置 waiting 前有一次渲染间隙） */
const submitted = ref(false)

watch(() => props.visible, (v) => {
  // 每次重新打开弹框（新一轮 confirm_request）复位提交守卫
  if (v) submitted.value = false
})

function onSelect(opt: ConfirmOption) {
  if (props.waiting || submitted.value) return
  submitted.value = true
  chosenLabel.value = opt.label
  emit('select', opt.key, opt.label)
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.cs-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.cs-title {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $ink;
  line-height: $lh-tight;
}

.cs-question {
  font-size: $font-size-md;
  color: $ink-soft;
  line-height: $lh-base;
  margin: 8rpx 0 16rpx;
}

.cs-options {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.cs-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: $bg-soft;
  border-radius: $r-lg;
  border: 2rpx solid $line-soft;
}
.cs-option:active { background: $primary-50; }
/* waiting 态：选项禁用（视觉弱化 + 点击守卫见 onSelect） */
.cs-option.disabled { opacity: $op-disabled; }
.cs-option-label {
  font-size: $font-size-md;
  color: $ink;
}

.cs-waiting {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 8rpx 0;
}
.cs-waiting-text {
  font-size: $font-size-sm;
  color: $ink-mute;
}
.cs-spin { animation: cs-spin 0.8s linear infinite; }
@keyframes cs-spin { to { transform: rotate(360deg); } }
</style>
