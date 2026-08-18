<template>
  <view class="page-login" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- 自定义导航栏：返回按钮 -->
    <view class="login-nav">
      <view class="nav-back" @tap="goBack">
        <SvgIcon name="arrow-left-line" size="40rpx" color="#0a1733" />
      </view>
    </view>

    <!-- 顶部区域 -->
    <view class="login-top">
      <view class="logo-wrap">
        <SvgIcon name="bear-smile-line" size="56rpx" color="#0b5fff" />
        <text class="logo-text">洞见</text>
      </view>
      <text class="logo-desc">AI 智能体驱动的中长线投资助手</text>
    </view>

    <!-- 登录方式区域（统一模板：H5 / APP-PLUS / MP-WEIXIN 共用二维码 + 错误状态） -->
    <view class="login-body">
      <!-- 初始状态：登录方式选择 -->
      <view v-if="!qrCodeUrl && !loginLoading && !errorMsg && !showingShare && !h5OauthDone" class="login-methods">
        <!-- #ifdef MP-WEIXIN -->
        <button @tap="handleWxLogin" class="btn-wx-login">
          <image class="btn-wx-icon" src="/static/icons/wechat.svg" mode="aspectFit" />
          <text class="btn-text">微信一键登录</text>
        </button>
        <!-- #endif -->

        <!-- #ifdef H5 -->
        <button @click="handleH5Login" class="btn-wx-login">
          <image class="btn-wx-icon" src="/static/icons/wechat.svg" mode="aspectFit" />
          <text class="btn-text">微信登录</text>
        </button>
        <!-- 微信网页授权仅在微信内浏览器可用；非微信环境自动转扫码，也可手动切换 -->
        <view class="qr-fallback">
          <Button type="ghost" size="sm" @click="startScanLogin">使用扫码登录</Button>
        </view>
        <!-- #endif -->

        <!-- #ifdef APP-PLUS -->
        <button @tap="handleAppOauthShare" class="btn-wx-login">
          <image class="btn-wx-icon" src="/static/icons/wechat.svg" mode="aspectFit" />
          <text class="btn-text">微信登录</text>
        </button>
        <!-- #endif -->

        <view class="login-tip">
          <text class="tip-text">登录后可同步自选股、接收异动提醒</text>
        </view>
        <view class="skip-wrap">
          <Button type="ghost" size="sm" @click="goHome">暂不登录，先看看</Button>
        </view>
      </view>

      <!-- 扫码登录中：显示二维码（全平台通用） -->
      <view v-else-if="qrCodeUrl && !loginLoading" class="qr-section">
        <text class="qr-title">微信扫一扫登录</text>
        <image :src="qrCodeUrl" class="qr-image" mode="aspectFit" />
        <text v-if="scanStatus === 'waiting'" class="qr-status">请使用微信扫描二维码</text>
        <text v-else-if="scanStatus === 'scanned'" class="qr-status scanned">已扫描，请在手机上确认</text>
        <text v-else-if="scanStatus === 'expired'" class="qr-status expired">二维码已过期</text>

        <view v-if="scanStatus === 'expired'" class="qr-action">
          <Button size="sm" @click="startScanLogin">刷新二维码</Button>
        </view>
        <view class="qr-action qr-action--cancel">
          <Button type="ghost" size="sm" @click="cancelScanLogin">取消</Button>
        </view>
      </view>

      <!-- App「分享到微信再授权」：复制链接让用户在微信中完成授权，App 轮询领取令牌 -->
      <view v-else-if="showingShare" class="share-section">
        <text class="share-title">微信授权登录</text>
        <text class="share-desc">请将下方链接发送到微信（如「文件传输助手」）后在微信中打开，完成授权后 App 将自动登录</text>
        <text class="share-link" @tap="copyShareLink">{{ shareUrl }}</text>
        <view class="share-action">
          <Button size="sm" @click="copyShareLink">复制链接并到微信打开</Button>
        </view>
        <text class="share-status">{{ shareStatusText }}</text>
        <view class="qr-action qr-action--cancel">
          <Button type="ghost" size="sm" @click="cancelShareLogin">取消 / 使用扫码登录</Button>
        </view>
      </view>

      <!-- H5（微信内 App 授权落地页）：授权成功后提示返回 App -->
      <view v-else-if="h5OauthDone" class="oauth-done-section">
        <SvgIcon name="checkbox-circle-line" size="72rpx" color="#22c55e" />
        <text class="oauth-done-title">授权成功</text>
        <text class="oauth-done-desc">请点击右上角…关闭本页，回到「洞见」App，即可自动登录</text>
        <view class="qr-action"><Button size="sm" @click="goHome">进入首页</Button></view>
      </view>

      <!-- 错误状态 -->
      <Card v-else-if="errorMsg && !loginLoading" class="error-section">
        <EmptyState title="登录失败" :description="errorMsg">
          <template #icon>
            <SvgIcon name="error-warning-line" size="64rpx" color="#ef4444" />
          </template>
        </EmptyState>
        <view class="error-actions">
          <Button size="sm" @click="handleRetry">重试</Button>
          <!-- #ifdef APP-PLUS -->
          <Button type="ghost" size="sm" @click="startScanLogin">使用扫码登录</Button>
          <!-- #endif -->
          <Button type="ghost" size="sm" @click="goHome">暂不登录，先看看</Button>
        </view>
      </Card>

      <!-- 登录验证中 -->
      <LoadingState v-else text="登录中..." />
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
import { LoadingState, Card, EmptyState, Button } from '@/shared/components'

const userStore = useUserStore()

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch (e) {}

const qrCodeUrl = ref('')
const scanState = ref('')
const scanStatus = ref<'waiting' | 'scanned' | 'confirmed' | 'expired'>('waiting')
const loginLoading = ref(false)
const errorMsg = ref('')

// App「分享到微信再授权」UI 状态
const showingShare = ref(false)
const shareUrl = ref('')
const shareState = ref('')
const shareStatusText = ref('')
// H5（微信内 App 授权落地页）：授权成功后提示返回 App
const h5OauthDone = ref(false)

// H5 网页授权（测试号/正式服务号）AppID：公开标识，用于前端拼装授权链接。
// 未配置时 H5 的"微信登录"自动降级为扫码登录。需与后端的 WECHAT_APPID 保持一致。
const H5_WECHAT_APPID: string = (import.meta.env.VITE_WECHAT_H5_APPID as string) || ''

// H5 授权落地页地址（App「分享到微信再授权」链接指向它）。
// 未配置时 App"微信登录"直接降级为扫码登录。
const H5_LOGIN_URL: string = (import.meta.env.VITE_H5_LOGIN_URL as string) || ''

let pollTimer: ReturnType<typeof setInterval> | null = null
let pollCount = 0
const MAX_POLL = 150 // 约 5 分钟（每 2 秒一次）

onLoad((options) => {
  // 已登录则直接跳首页
  if (userStore.isLoggedIn()) {
    goHome()
    return
  }
  // H5 网页授权回调：微信授权后会携带 code 回到本页，用于换取登录 token
  // 若来自 App 分享，还携带 mode=app 与 state（用作用户身份回传标识）
  const code = options?.code as string | undefined
  const mode = options?.mode as string | undefined
  const state = options?.state as string | undefined
  if (code) {
    handleOAuthCallback(code, mode, state)
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

/**
 * 微信登录（小程序 MP-WEIXIN：uni.login）。
 * App 端已改用「分享到微信再授权」（handleAppOauthShare），不再走原生 uni.login——
 * 因测试号/服务号不支持开放平台「移动应用」登录，原生拉微信需要移动应用 AppID。
 */
// #ifdef APP-PLUS
/**
 * App「分享到微信再授权」：
 * 1. 生成随机 state，并构造 H5 授权落地页链接（带 mode=app&state=）
 * 2. 复制链接，提示用户在微信中打开完成网页授权
 * 3. App 轮询后端 /auth/oauth/result，已 confirmed 即领取 token 登录
 * 说明：测试号/服务号仅支持网页授权，App 无法原生拉微信，故经 H5 中转；
 * 未配置 VITE_H5_LOGIN_URL 时直接降级到扫码登录。
 */
async function handleAppOauthShare() {
  if (!H5_LOGIN_URL) {
    startScanLogin()
    return
  }
  errorMsg.value = ''
  h5OauthDone.value = false
  shareState.value = generateOauthState()
  shareUrl.value = `${H5_LOGIN_URL}?mode=app&state=${shareState.value}`
  shareStatusText.value = ''
  showingShare.value = true
  await copyShareLink()
  startOauthBridgePoll()
}

/** 生成随机的 state（32 位十六进制），作为本次登录会话标识 */
function generateOauthState(): string {
  let s = ''
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16)
  return s
}

/** 复制 H5 授权链接到剪贴板，供用户粘贴到微信打开 */
function copyShareLink(): Promise<void> {
  return new Promise((resolve) => {
    uni.setClipboardData({
      data: shareUrl.value,
      success: () => {
        shareStatusText.value = '已复制到剪贴板，请粘贴到微信（如「文件传输助手」）后点击打开'
      },
      fail: () => {
        shareStatusText.value = '复制失败，请长按链接手动复制'
      },
      complete: () => resolve(),
    })
  })
}

/** 开始轮询后端 OAuth 结果：pending 等待 / confirmed 领取 token / expired 提示失效 */
function startOauthBridgePoll() {
  stopPolling()
  pollTimer = setInterval(async () => {
    pollCount++
    if (pollCount >= MAX_POLL) {
      stopPolling()
      shareStatusText.value = '链接已失效，请取消后重新发起登录'
      return
    }
    try {
      const result = await authApi.getOauthResult(shareState.value)
      if (result.status === 'confirmed') {
        stopPolling()
        await handleLoginSuccess({ token: result.token, openid: result.openid })
      } else if (result.status === 'expired') {
        stopPolling()
        shareStatusText.value = '链接已失效，请取消后重新发起登录'
      }
    } catch (e) {
      // 网络错误不中断轮询
    }
  }, 2000)
}

/** 取消 / 退出「分享到微信再授权」 */
function cancelShareLogin() {
  stopPolling()
  showingShare.value = false
  shareUrl.value = ''
  shareState.value = ''
  shareStatusText.value = ''
}
// #endif

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

/**
 * H5 登录入口：优先尝试微信网页授权（OAuth），不满足条件时降级到扫码登录。
 * 原因：uni.login 在 Web 平台不支持（官方兼容表标注 Web: x），H5 只能走网页授权重定向。
 * 测试号同样支持 snsapi_userinfo 网页授权，仅在微信内浏览器可正常弹出授权页。
 * 若本页由 App 分享打开（带 mode=app&state=），授权后需把 token 回传后端供 App 领取。
 */
function handleH5Login() {
  if (H5_WECHAT_APPID && isWechatBrowser()) {
    startOAuthLogin(getQueryParam('mode'), getQueryParam('state'))
  } else {
    // 非微信环境（桌面浏览器、未配置 AppID）：网页授权不可用，直接走扫码登录
    startScanLogin()
  }
}

/** 读取当前页面 URL 查询参数（H5 环境；App/小程序无 location，返回空串） */
function getQueryParam(name: string): string {
  if (typeof location === 'undefined') return ''
  return new URLSearchParams(location.search).get(name) || ''
}

/** 是否为微信内置浏览器（只有在此环境下网页授权才能正常弹出） */
function isWechatBrowser(): boolean {
  return /MicroMessenger/i.test(navigator.userAgent)
}

/**
 * 发起微信网页授权：302 跳到微信授权页，授权后带 code 回到当前 H5 页面。
 * App 分享场景需把 mode 保留在回调 URL（微信只回显 state，改由 redirect_uri 承载 mode），
 * 并把真实 state 作为微信 authorize 的 state 回显，便于回调页按 state 回传 token。
 */
function startOAuthLogin(mode: string, state: string) {
  let redirectUri = `${location.origin}${location.pathname}`
  if (mode) redirectUri = `${redirectUri}?mode=${encodeURIComponent(mode)}`
  // 非 App 分享场景使用默认 state=oauth；App 分享场景使用本次会话 state
  const authorizeState = mode === 'app' && state ? state : 'oauth'
  const url =
    'https://open.weixin.qq.com/connect/oauth2/authorize' +
    `?appid=${H5_WECHAT_APPID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=snsapi_userinfo` +
    `&state=${encodeURIComponent(authorizeState)}` +
    `#wechat_redirect`
  window.location.href = url
}

/**
 * H5 网页授权回调：用 code 换取 token，失败时回落到登录页错误态（可选扫码登录）。
 * 若来自 App 分享（mode=app），授权成功后改用微信（把 token 按 state 交后端），
 * 提示返回 App；否则为普通 H5 登录，直接入库并跳首页。
 */
async function handleOAuthCallback(code: string, mode?: string, state?: string) {
  loginLoading.value = true
  errorMsg.value = ''
  try {
    await userStore.wxLogin(code)
    // App 分享场景：token 已存入 userStore，按 state 回传后端供 App 轮询领取
    if (mode === 'app' && state) {
      try {
        await authApi.storeOauthResult(state, userStore.token, userStore.userInfo?.openid || '')
      } catch (storeErr: any) {
        console.warn('[login] 回传 OAuth token 到后端失败：', storeErr)
      }
      clearOAuthParams()
      loginLoading.value = false
      h5OauthDone.value = true
      return
    }
    clearOAuthParams()
    loginLoading.value = false
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => goHome(), 500)
  } catch (e: any) {
    clearOAuthParams()
    loginLoading.value = false
    const msg = e?.data?.message || e?.errMsg || e?.message || '微信授权登录失败，请使用扫码登录'
    errorMsg.value = msg
  }
}

/** 清除 URL 上的 code/state，避免刷新页面重复触发登录 */
function clearOAuthParams() {
  if (typeof history !== 'undefined' && history.replaceState) {
    const url = location.pathname + stripOAuthParams(location.search)
    history.replaceState({}, '', url)
  }
}

function stripOAuthParams(search: string): string {
  const params = new URLSearchParams(search)
  params.delete('code')
  params.delete('state')
  const qs = params.toString()
  return qs ? `?${qs}` : ''
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
  color: $primary;
}

.logo-desc {
  font-size: 26rpx;
  color: $ink-soft;
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

.skip-wrap {
  margin-top: 48rpx;
}

/* H5 仅：微信登录（OAuth）失败时的扫码登录手动降级入口 */
.qr-fallback {
  margin-top: 32rpx;
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
  color: $ink;
  margin-bottom: 32rpx;
}

.qr-image {
  width: 400rpx;
  height: 400rpx;
  background: #ffffff;
  border-radius: 16rpx;
  border: 1rpx solid $line;
}

.qr-status {
  margin-top: 24rpx;
  font-size: 28rpx;
  color: $ink-soft;

  &.scanned {
    color: $primary;
    font-weight: 500;
  }
  &.expired {
    color: #f43f5e;
  }
}

.qr-action {
  margin-top: 24rpx;
}

.qr-action--cancel {
  margin-top: 32rpx;
}

/* ===== App「分享到微信再授权」 ===== */
.share-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.share-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $ink;
  margin-bottom: 20rpx;
}

.share-desc {
  font-size: 26rpx;
  color: $ink-soft;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 32rpx;
}

.share-link {
  width: 100%;
  padding: 20rpx 24rpx;
  background: #f5f7fb;
  border: 1rpx dashed $line;
  border-radius: 12rpx;
  font-size: 24rpx;
  color: $primary;
  word-break: break-all;
  text-align: center;
  margin-bottom: 32rpx;
}

.share-action {
  width: 100%;
}

.share-status {
  margin-top: 24rpx;
  font-size: 24rpx;
  color: $ink-soft;
  text-align: center;
}

/* ===== H5 微信内 App 授权成功 ===== */
.oauth-done-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.oauth-done-title {
  margin-top: 24rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: $ink;
  margin-bottom: 16rpx;
}

.oauth-done-desc {
  font-size: 26rpx;
  color: $ink-soft;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 32rpx;
}

/* ===== 错误状态 ===== */
.error-section {
  width: 100%;
}

.error-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  margin-top: 24rpx;
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
