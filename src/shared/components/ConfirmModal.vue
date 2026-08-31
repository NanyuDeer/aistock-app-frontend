<template>
  <Modal
    :visible="visible"
    :title="title"
    width="560rpx"
    closeable
    :mask-closable="maskClosable"
    @close="handleCancel"
    @update:visible="handleVisible"
  >
    <!-- 内容区：默认文本，支持插槽自定义 -->
    <view class="cm-body">
      <slot>
        <text class="cm-content">{{ content }}</text>
      </slot>
    </view>
    <!-- 底部按钮区：样式对齐 UpdateModal（等宽按钮并排） -->
    <template #footer>
      <view class="cm-footer">
        <Button v-if="showCancel" type="secondary" class="cm-footer__btn" @click="handleCancel">
          {{ cancelText }}
        </Button>
        <Button :type="confirmBtnType" class="cm-footer__btn" @click="handleConfirm">
          {{ confirmText }}
        </Button>
      </view>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Modal from './Modal.vue'
import Button from './Button.vue'

const props = withDefaults(defineProps<{
  /** 是否可见（v-model） */
  visible: boolean
  /** 弹窗标题 */
  title?: string
  /** 提示内容文本（可用 \n 换行） */
  content?: string
  /** 确认按钮文案 */
  confirmText?: string
  /** 取消按钮文案 */
  cancelText?: string
  /** 是否显示取消按钮（信息类弹窗可置 false） */
  showCancel?: boolean
  /** 确认按钮是否用 danger 类型（删除等危险操作） */
  danger?: boolean
  /** 点击遮罩是否可关闭（默认 true；会员开通等需明确选择的场景设 false） */
  maskClosable?: boolean
}>(), {
  title: '',
  content: '',
  confirmText: '确定',
  cancelText: '取消',
  showCancel: true,
  danger: false,
  maskClosable: true,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: []
  cancel: []
}>()

/** 危险操作用 danger 按钮，否则 primary（与版本更新弹窗的按钮层级一致） */
const confirmBtnType = computed(() => (props.danger ? 'danger' : 'primary'))

/** 确认：触发 confirm 并自动关闭 */
function handleConfirm() {
  emit('confirm')
  emit('update:visible', false)
}

/** 取消/叉号/遮罩关闭：触发 cancel 并自动关闭 */
function handleCancel() {
  emit('cancel')
  emit('update:visible', false)
}

/** 转发 Modal 的关闭事件（叉号/遮罩已由 Modal 内部关闭并通知） */
function handleVisible(v: boolean) {
  emit('update:visible', v)
}
</script>

<style lang="scss" scoped>
.cm-body {
  display: flex;
  flex-direction: column;
}

.cm-content {
  font-size: $font-size-md;
  line-height: $lh-loose;
  color: $ink-soft;
  white-space: pre-wrap;
}

.cm-footer {
  display: flex;
  gap: $s-3;
}

.cm-footer__btn {
  flex: 1;
}
</style>
