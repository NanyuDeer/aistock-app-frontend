<template>
  <view class="webview-page">
    <!-- 自绘返回导航栏：置于 web-view 上方（web-view 高度让位），保证返回按钮不被原生 web-view 遮挡；
         状态栏预留同 SubPageCard2 方案：custom 导航下页面从屏幕最顶渲染，需为刘海/状态栏让位 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" hover-class="nav-back--hover" @click="goBack">
        <text class="nav-back-arrow">‹</text>
        <text class="nav-back-text">返回</text>
      </view>
      <text class="nav-title">{{ loadFailed ? '加载失败' : (pageTitle || '网页') }}</text>
      <view class="nav-right" />
    </view>

    <!-- 链接有效：加载外部网页 -->
    <web-view
      v-if="targetUrl && !loadFailed"
      class="web-view"
      :src="targetUrl"
      @message="onWebviewMessage"
    />

    <!-- 链接无效或加载失败：友好提示 -->
    <view v-else class="load-fail">
      <view class="load-fail-icon">!</view>
      <text class="load-fail-text">{{ loadFailed ? '页面加载失败，请稍后重试' : '链接无效或不存在' }}</text>
      <view class="load-fail-btn" hover-class="load-fail-btn--hover" @click="goBack">返回</view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * webview/index - 通用外部网页承载页（App 内打开事件原文链接）
 *
 * 用途：事件传导标题点击原文在 APP 端改由本页 `<web-view>` 内打开，替代
 * "复制链接 + 提示" 的降级体验，同时保持 H5 用 window.open 不受影响。
 *
 * 进入方式：uni.navigateTo({ url: `/pages-sub-app/webview/index?url=${encodeURIComponent(sourceUrl)}` })
 *
 * 支持：
 * - 通过 query url 接收并解码外部链接
 * - 自绘返回栏 uni.navigateBack() 返回事件列表/详情页
 * - url 为空时展示失败占位，避免白屏
 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const targetUrl = ref('')
const pageTitle = ref('网页')
const loadFailed = ref(false)

/** 状态栏高度（px）：与 SubPageCard2 同款方案，APP 端需除以 zoom(1.2) 补偿 */
const statusBarHeight = ref(0)
try {
  const sysInfo = uni.getSystemInfoSync()
  const raw = sysInfo.statusBarHeight || 0
  // #ifdef APP-PLUS
  statusBarHeight.value = raw / 1.2
  // #endif
  // #ifndef APP-PLUS
  statusBarHeight.value = raw
  // #endif
} catch {
  statusBarHeight.value = 0
}

function goBack() {
  // 返回来源页（事件列表 / 详情页）；无法返回时兜底回首页
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/modules/chat/pages/index' })
  }
}

function onWebviewMessage(event: any) {
  // web-view postMessage 类型信息（可选）；当前无业务需求，保留扩展点。
}

onLoad((query) => {
  const raw = (query as Record<string, string> | undefined)?.url ?? ''
  if (!raw) {
    // 无 url 参数：直接按加载失败处理，不回跳以免丢失来源
    return
  }
  // uni 页面参数已自动 decode，pb_decode 兼容手动编码（双保险）
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    decoded = raw
  }
  targetUrl.value = decoded.trim()
  // 简单二次校验非法链接与空
  if (!/^https?:\/\//i.test(targetUrl.value)) {
    targetUrl.value = ''
  }
})
</script>

<style lang="scss" scoped>
.webview-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f6f8;
}

.nav-bar {
  flex-shrink: 0;
  height: 88rpx;
  padding: 0 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  background: #ffffff;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.06);
}

.nav-back {
  display: flex;
  align-items: center;
  padding: 12rpx;
  margin-left: -12rpx;
  color: #333;

  &--hover {
    opacity: 0.6;
  }
}

.nav-back-arrow {
  font-size: 36rpx;
  line-height: 1;
  margin-right: 4rpx;
}

.nav-back-text {
  font-size: 28rpx;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 30rpx;
  font-weight: 500;
  color: #1f2329;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 12rpx;
}

.nav-right {
  width: 88rpx;
}

/* web-view 占满导航下方剩余区域（不重叠导航，避免遮挡返回栏） */
.web-view {
  flex: 1;
  width: 100%;
}

.load-fail {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  color: #8a9099;
}

.load-fail-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #eef0f3;
  color: #8a9099;
  font-size: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.load-fail-text {
  font-size: 28rpx;
}

.load-fail-btn {
  margin-top: 8rpx;
  padding: 12rpx 48rpx;
  border-radius: 999rpx;
  background: #ffffff;
  border: 1rpx solid #d8dce1;
  color: #1f2329;
  font-size: 28rpx;

  &--hover {
    background: #f0f1f3;
  }
}
</style>