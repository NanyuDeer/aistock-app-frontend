<template>
  <Modal
    :visible="visible"
    title="发现新版本"
    width="560rpx"
    closeable
    @close="handleDismiss"
    @update:visible="handleUpdateVisible"
  >
    <view v-if="info" class="um-body">
      <view class="um-ver">
        <text class="um-ver__name">v{{ info.versionName }}</text>
        <text v-if="sizeTxt" class="um-ver__size">{{ sizeTxt }}</text>
      </view>
      <view class="um-desc">{{ info.description || '检测到新版本，请更新后体验' }}</view>
    </view>
    <template #footer>
      <view class="um-footer">
        <Button type="secondary" class="um-footer__btn" @click="handlePermanentIgnore">永久关闭</Button>
        <Button type="primary" class="um-footer__btn" @click="handleUpdate">立即更新</Button>
      </view>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Modal from './Modal.vue'
import Button from './Button.vue'
import {
  updatePromptState,
  neverUpdateStorageKey,
  downloadAndInstall,
} from '@/shared/utils/useAppUpdate'

const visible = computed(() => updatePromptState.visible)
const info = computed(() => updatePromptState.info)

const sizeTxt = computed(() => {
  const fileSize = info.value?.fileSize
  return fileSize && fileSize !== '待发布' ? `· ${fileSize}` : ''
})

/** 立即更新：下载并安装，同时关闭弹窗 */
function handleUpdate() {
  if (info.value) downloadAndInstall(info.value)
}

/** 永久关闭：记录该版本不再提示，然后关闭弹窗 */
function handlePermanentIgnore() {
  const vc = info.value?.versionCode
  if (vc) uni.setStorageSync(neverUpdateStorageKey(Number(vc)), '1')
  updatePromptState.visible = false
}

/** 仅叉掉 / 点遮罩关闭：不记录永久关闭，下次进入应用仍会提示 */
function handleDismiss() {
  updatePromptState.visible = false
}

function handleUpdateVisible(v: boolean) {
  if (!v) updatePromptState.visible = false
}
</script>

<style lang="scss" scoped>
.um-body {
  display: flex;
  flex-direction: column;
  gap: $s-3;
}

.um-ver {
  display: flex;
  align-items: baseline;
  gap: $s-2;
  flex-wrap: wrap;
}

.um-ver__name {
  font-size: $font-size-2xl;
  font-weight: 700;
  color: $ink;
}

.um-ver__size {
  font-size: $font-size-sm;
  color: $ink-soft;
}

.um-desc {
  font-size: $font-size-md;
  line-height: $lh-loose;
  color: $ink-soft;
  white-space: pre-wrap;
}

.um-footer {
  display: flex;
  gap: $s-3;
}

.um-footer__btn {
  flex: 1;
}
</style>