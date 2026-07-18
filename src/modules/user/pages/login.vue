<template>
  <view class="page-login" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- 自定义导航栏：返回按钮 -->
    <view class="login-nav">
      <view class="nav-back" @tap="goBack">
        <text class="back-icon">‹</text>
      </view>
    </view>

    <!-- 顶部区域 -->
    <view class="login-top">
      <view class="logo-wrap">
        <SvgIcon name="bear-smile-line" size="56rpx" color="#4d7cfe" />
        <text class="logo-text">AI Stock</text>
      </view>
      <text class="logo-desc">AI 智能体驱动的中长线投资助手</text>
    </view>

    <!-- 登录方式区域（统一模板：H5 / APP-PLUS / MP-WEIXIN 共用二维码 + 错误状态） -->
    <view class="login-body">
      <!-- 初始状态：登录方式选择 -->
      <view v-if="!qrCodeUrl && !loginLoading && !errorMsg" class="login-methods">
        <!-- #ifdef MP-WEIXIN -->
        <button @tap="handleWxLogin" class="btn-wx-login">
          <image class="btn-wx-icon" src="/static/icons/wechat.svg" mode="aspectFit" />
          <text class="btn-text">微信一键登录</text>
        </button>
        <!-- #endif -->

        <!-- #ifdef H5 -->
        <button @click="startScanLogin" class="btn-wx-login">
          <image class="btn-wx-icon" src="/static/icons/wechat.svg" mode="aspectFit" />
          <text class="btn-text">微信扫码登录</text>
        </button>
        <!-- #endif -->

        <!-- #ifdef APP-PLUS -->
        <button @tap="handleWxLogin" class="btn-wx-login">
          <image class="btn-wx-icon" src="/static/icons/wechat.svg" mode="aspectFit" />
          <text class="btn-text">微信登录</text>
        </button>
        <!-- #endif -->

        <view class="login-tip">
          <text class="tip-text">登录后可同步自选股、接收异动提醒</text>
        </view>
        <view class="skip-btn" @tap="goHome">
          <text class="skip-text">暂不登录，先看看</text>
        </view>
      </view>

      <!-- 扫码登录中：显示二维码（全平台通用） -->
      <view v-else-if="qrCodeUrl && !loginLoading" class="qr-section">
        <text class="qr-title">微信扫一扫登录</text>
        <image :src="qrCodeUrl" class="qr-image" mode="aspectFit" />
        <text v-if="scanStatus === 'waiting'" class="qr-status">请使用微信扫描二维码</text>
        <text v-else-if="scanStatus === 'scanned'" class="qr-status scanned">已扫描，请在手机上确认</text>
        <text v-else-if="scanStatus === 'expired'" class="qr-status expired">二维码已过期</text>

        <view v-if="scanStatus === 'expired'" class="qr-refresh" @tap="startScanLogin">
          <text class="refresh-text">点击刷新二维码</text>
        </view>
        <view class="qr-cancel" @tap="cancelScanLogin">
          <text class="cancel-text">取消</text>
        </view>
      </view>

      <!-- 错误状态 -->
      <view v-else-if="errorMsg && !loginLoading" class="error-section">
        <SvgIcon name="error-warning-line" size="36rpx" color="#ef4444" />
        <text class="error-text">{{ errorMsg }}</text>
        <view class="error-retry" @tap="handleRetry">
          <text class="retry-text">重试</text>
        </view>
        <!-- #ifdef APP-PLUS -->
        <view class="scan-fallback" @tap="startScanLogin">
          <text class="scan-fallback-text">使用扫码登录</text>
        </view>
        <!-- #endif -->
        <view class="skip-btn" @tap="goHome">
          <text class="skip-text">暂不登录，先看看</text>
        </view>
      </view>

      <!-- 登录验证中 -->
      <view v-else class="loading-section">
        <text class="loading-text">登录中...</text>
      </view>
    </view>

    <!-- 底部协议 -->
    <view class="login-footer">
      <text class="footer-text">登录即代表同意《用户协议》和《隐私政策》</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/shared/store/modules/user'
import { authApi } from '@/shared/api/modules/auth'
import SvgIcon from '@/shared/components/SvgIcon.vue'

const userStore = useUserStore()

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch (e) {}

const qrCodeUrl = ref('')
const scanState = ref('')
const scanStatus = ref<'waiting' | 'scanned' | 'confirmed' | 'expired'>('waiting')
const loginLoading = ref(false)
const errorMsg = ref('')

let pollTimer: ReturnType<typeof setInterval> | null = null
let pollCount = 0
const MAX_POLL = 150 // 约 5 分钟（每 2 秒一次）

onLoad(() => {
  // 已登录则直接跳首页
  if (userStore.isLoggedIn()) {
    goHome()
  }
})

onUnmounted(() => {
  stopPolling()
})

/** 启动扫码登录 */
async function startScanLogin() {
  qrCodeUrl.value = ''
  scanStatus.value = 'waiting'
  pollCount = 0
  errorMsg.value = ''

  try {
    const result = await authApi.getScanLoginUrl()
    if (!result || !result.qr_url || !result.state) {
      errorMsg.value = '获取二维码数据不完整，请重试'
      return
    }
    qrCodeUrl.value = result.qr_url
    scanState.value = result.state
    startPolling()
  } catch (e: any) {
    // 页面内显示错误，而非仅 toast，避免用户以为"没反应"
    // 兼容 App 端错误对象：uni-app 网络错误是 { errMsg: 'request:fail' }，没有 message 属性
    const msg = e?.data?.message || e?.errMsg || e?.message || '获取二维码失败，请检查网络后重试'
    errorMsg.value = msg
  }
}

/** 开始轮询扫码状态 */
function startPolling() {
  stopPolling()
  pollTimer = setInterval(async () => {
    pollCount++
    if (pollCount >= MAX_POLL) {
      stopPolling()
      scanStatus.value = 'expired'
      return
    }

    try {
      const result = await authApi.checkScanLoginStatus(scanState.value)
      scanStatus.value = result.status

      if (result.status === 'confirmed') {
        stopPolling()
        await handleLoginSuccess({ token: result.token, openid: result.openid })
      } else if (result.status === 'expired') {
        stopPolling()
      }
    } catch (e) {
      // 网络错误不中断轮询
    }
  }, 2000)
}

/** 停止轮询 */
function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

/** 取消扫码登录 */
function cancelScanLogin() {
  stopPolling()
  qrCodeUrl.value = ''
  scanStatus.value = 'waiting'
  errorMsg.value = ''
}

/** 扫码登录成功处理 */
async function handleLoginSuccess(scanData?: { token?: string; openid?: string }) {
  loginLoading.value = true
  // 传入 poll 返回的 token，存储后用 Authorization 头认证
  const success = await userStore.handleScanLoginSuccess(scanData)
  loginLoading.value = false

  if (success) {
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => goHome(), 500)
  } else {
    qrCodeUrl.value = ''
    scanStatus.value = 'waiting'
    errorMsg.value = '登录验证失败，请重试'
  }
}

/** 微信登录（App 端拉起微信 App，失败时自动降级到扫码登录） */
async function handleWxLogin() {
  loginLoading.value = true
  errorMsg.value = ''

  uni.login({
    provider: 'weixin',
    success: async (res) => {
      try {
        await userStore.wxLogin(res.code)
        loginLoading.value = false
        uni.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => goHome(), 500)
      } catch (e: any) {
        loginLoading.value = false
        const msg = e?.data?.message || e?.errMsg || e?.message || '登录失败，请重试'
        errorMsg.value = msg
      }
    },
    fail: (err) => {
      loginLoading.value = false
      // 用户取消登录时 errCode 为 -2 或 -8
      if (err.errCode === -2 || err.errCode === -8) {
        // 用户取消，静默处理
        return
      }
      // #ifdef APP-PLUS
      // 微信 SDK 登录失败（未安装微信 / 签名不匹配 / SDK 通信失败），
      // 自动降级到扫码登录（二维码），不直接显示错误
      startScanLogin()
      // #endif
      // #ifndef APP-PLUS
      const msg = err?.errMsg || err?.message || '微信授权失败'
      errorMsg.value = msg
      // #endif
    }
  })
}

/** 错误重试：优先重试扫码登录（因为 uni.login 已失败过一次） */
function handleRetry() {
  errorMsg.value = ''
  // #ifdef APP-PLUS
  // APP 端：直接用扫码登录重试（uni.login 已知失败）
  startScanLogin()
  // #endif
  // #ifndef APP-PLUS
  // H5 / 小程序：重试对应平台的登录方式
  // #ifdef H5
  startScanLogin()
  // #endif
  // #ifdef MP-WEIXIN
  handleWxLogin()
  // #endif
  // #endif
}

function goHome() {
  uni.reLaunch({ url: '/modules/home/pages/index' })
}

function goBack() {
  uni.navigateBack({ delta: 1 })
}
</script>

<style lang="scss" scoped>
.page-login {
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #f5f7fb 0%, #ffffff 100%);
  overflow: hidden;
  overscroll-behavior: none;
}

/* ===== 顶部 ===== */
.login-nav {
  flex-shrink: 0;
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
}

.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 48rpx;
  color: #1a1d24;
  font-weight: 300;
  line-height: 1;
}

.login-top {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
  padding-bottom: 80rpx;
}

.logo-wrap {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.logo-emoji {
  font-size: 56rpx;
}

.logo-text {
  font-size: 48rpx;
  font-weight: 700;
  color: #4d7cfe;
}

.logo-desc {
  font-size: 26rpx;
  color: #6b7280;
}

/* ===== 登录区域 ===== */
.login-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 48rpx;
}

.login-methods {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.btn-wx-login {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: #22c55e;
  border-radius: 48rpx;
  padding: 18rpx 0;
  border: none;
  line-height: 1.2;

  .btn-wx-icon {
    width: 36rpx;
    height: 36rpx;
    flex-shrink: 0;
  }

  .btn-text {
    font-size: 30rpx;
    color: #ffffff;
    font-weight: 600;
  }
}

.login-tip {
  margin-top: 32rpx;
  text-align: center;

  .tip-text {
    font-size: 24rpx;
    color: #9ca3af;
  }
}

.skip-btn {
  margin-top: 48rpx;
  padding: 16rpx 48rpx;

  .skip-text {
    font-size: 28rpx;
    color: #6b7280;
  }
}

/* ===== 二维码区域 ===== */
.qr-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1d24;
  margin-bottom: 32rpx;
}

.qr-image {
  width: 400rpx;
  height: 400rpx;
  background: #ffffff;
  border-radius: 16rpx;
  border: 1rpx solid #e5e7eb;
}

.qr-status {
  margin-top: 24rpx;
  font-size: 28rpx;
  color: #6b7280;

  &.scanned {
    color: #4d7cfe;
    font-weight: 500;
  }
  &.expired {
    color: #f43f5e;
  }
}

.qr-refresh {
  margin-top: 24rpx;
  padding: 16rpx 48rpx;
  background: #4d7cfe;
  border-radius: 32rpx;

  .refresh-text {
    font-size: 28rpx;
    color: #ffffff;
  }
}

.qr-cancel {
  margin-top: 32rpx;
  padding: 16rpx 48rpx;

  .cancel-text {
    font-size: 28rpx;
    color: #9ca3af;
  }
}

/* ===== 加载中 ===== */
.loading-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;

  .loading-text {
    font-size: 32rpx;
    color: #4d7cfe;
  }
}

/* ===== 错误状态 ===== */
.error-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0;
}

.error-icon {
  font-size: 64rpx;
  color: #f59e0b;
  margin-bottom: 24rpx;
}

.error-text {
  font-size: 28rpx;
  color: #6b7280;
  text-align: center;
  line-height: 1.6;
  padding: 0 48rpx;
  margin-bottom: 40rpx;
}

.error-retry {
  padding: 16rpx 64rpx;
  background: #4d7cfe;
  border-radius: 32rpx;
  margin-bottom: 24rpx;

  .retry-text {
    font-size: 28rpx;
    color: #ffffff;
    font-weight: 500;
  }
}

.scan-fallback {
  padding: 12rpx 48rpx;
  margin-bottom: 24rpx;

  .scan-fallback-text {
    font-size: 26rpx;
    color: #4d7cfe;
  }
}

/* ===== 底部 ===== */
.login-footer {
  flex-shrink: 0;
  padding-bottom: 48rpx;
  text-align: center;

  .footer-text {
    font-size: 22rpx;
    color: #9ca3af;
  }
}
</style>
