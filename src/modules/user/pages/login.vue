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
      <view v-if="!qrCodeUrl && !loginLoading && !errorMsg && !showEmailForm && !showSmsForm && !showPasswordForm" class="login-methods">
        <!-- #ifdef MP-WEIXIN -->
        <button @tap="handleWxLogin" class="btn-wx-login">
          <SvgIcon name="wechat" size="36rpx" color="#ffffff" />
          <text class="btn-text">微信一键登录</text>
        </button>
        <!-- #endif -->

        <!-- #ifdef H5 -->
        <button @click="startScanLogin" class="btn-wx-login">
          <SvgIcon name="wechat" size="36rpx" color="#ffffff" />
          <text class="btn-text">微信扫码登录</text>
        </button>
        <!-- #endif -->

        <!-- #ifdef APP-PLUS -->
        <!-- 测试号 AppID 无法走微信原生登录(uni.login code 为空)，统一用扫码登录 -->
        <button @tap="startScanLogin" class="btn-wx-login">
          <SvgIcon name="wechat" size="36rpx" color="#ffffff" />
          <text class="btn-text">微信扫码登录</text>
        </button>
        <!-- #endif -->

        <!-- 邮箱验证码登录入口（全平台） -->
        <button @click="showEmailForm = true" class="btn-email-login">
          <SvgIcon name="mail-line" size="36rpx" color="#0b5fff" />
          <text class="btn-text">邮箱验证码登录</text>
        </button>

        <!-- 手机号验证码登录入口（全平台） -->
        <button @click="showSmsForm = true" class="btn-email-login">
          <SvgIcon name="phone-line" size="36rpx" color="#0b5fff" />
          <text class="btn-text">手机号验证码登录</text>
        </button>

        <!-- 密码登录 / 注册入口（全平台） -->
        <button @click="openPasswordForm" class="btn-email-login">
          <SvgIcon name="key-line" size="36rpx" color="#0b5fff" />
          <text class="btn-text">密码登录 / 注册</text>
        </button>

        <view class="login-tip">
          <text class="tip-text">登录后可同步自选股、接收异动提醒</text>
        </view>
        <view class="skip-wrap">
          <Button type="ghost" size="sm" @click="goHome">暂不登录，先看看</Button>
        </view>
      </view>

      <!-- 邮箱验证码登录表单（全平台） -->
      <view v-else-if="showEmailForm" class="email-form">
        <text class="form-title">邮箱验证码登录</text>
        <view class="form-row">
          <SvgIcon name="mail-line" size="36rpx" color="#9ca3af" />
          <Input
            v-model="email"
            placeholder="请输入邮箱"
            class="form-input"
          />
        </view>
        <view class="form-row">
          <SvgIcon name="lock-line" size="36rpx" color="#9ca3af" />
          <Input
            v-model="smsCode"
            type="number"
            :maxlength="6"
            placeholder="请输入验证码"
            class="form-input"
          />
          <Button
            class="form-code-btn"
            :disabled="countdown > 0 || !isValidEmail"
            size="sm"
            @click="handleSendEmail"
          >
            {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
          </Button>
        </view>
        <view class="form-submit">
          <Button block :loading="loginLoading" @click="handleEmailLogin">登录</Button>
        </view>
        <view class="form-back" @click="showEmailForm = false">
          <SvgIcon name="arrow-left-line" size="28rpx" color="#4b5a7a" />
          <text class="form-back-text">返回微信登录</text>
        </view>
      </view>

      <!-- 手机号验证码登录表单（全平台） -->
      <view v-else-if="showSmsForm" class="email-form">
        <text class="form-title">手机号验证码登录</text>
        <view class="form-row">
          <SvgIcon name="phone-line" size="36rpx" color="#9ca3af" />
          <Input
            v-model="phone"
            type="number"
            :maxlength="11"
            placeholder="请输入手机号"
            class="form-input"
          />
        </view>
        <view class="form-row">
          <SvgIcon name="lock-line" size="36rpx" color="#9ca3af" />
          <Input
            v-model="smsCode"
            type="number"
            :maxlength="6"
            placeholder="请输入验证码"
            class="form-input"
          />
          <Button
            class="form-code-btn"
            :disabled="countdown > 0 || !isValidPhone"
            size="sm"
            @click="handleSendSms"
          >
            {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
          </Button>
        </view>
        <view class="form-submit">
          <Button block :loading="loginLoading" @click="handlePhoneLogin">登录</Button>
        </view>
        <view class="form-back" @click="showSmsForm = false">
          <SvgIcon name="arrow-left-line" size="28rpx" color="#4b5a7a" />
          <text class="form-back-text">返回微信登录</text>
        </view>
      </view>

      <!-- 密码登录 / 注册表单（全平台） -->
      <view v-else-if="showPasswordForm" class="email-form">
        <text class="form-title">{{ passwordMode === 'login' ? '密码登录' : '注册 / 首次设置密码' }}</text>
        <text v-if="passwordMode === 'register'" class="form-tip">已有账号（微信 / 验证码登录创建）尚未设置密码？也在这里设置。</text>
        <view class="form-row">
          <SvgIcon name="user-line" size="36rpx" color="#9ca3af" />
          <Input
            v-model="pwdAccount"
            placeholder="请输入手机号或邮箱"
            class="form-input"
          />
        </view>
        <view v-if="passwordMode === 'register'" class="form-row">
          <SvgIcon name="lock-line" size="36rpx" color="#9ca3af" />
          <Input
            v-model="pwdCode"
            type="number"
            :maxlength="6"
            placeholder="请输入验证码"
            class="form-input"
          />
          <Button
            class="form-code-btn"
            :disabled="countdown > 0 || !canSendPwdCode"
            size="sm"
            @click="handleSendPwdCode"
          >
            {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
          </Button>
        </view>
        <view class="form-row">
          <SvgIcon name="lock-line" size="36rpx" color="#9ca3af" />
          <Input
            v-model="pwdPassword"
            type="password"
            placeholder="请输入密码（至少 8 位，含字母和数字）"
            class="form-input"
          />
        </view>
        <view class="form-submit">
          <Button block :loading="loginLoading" @click="handlePasswordSubmit">
            {{ passwordMode === 'login' ? '登录' : '注册并登录' }}
          </Button>
        </view>
        <view class="form-switch" @click="togglePasswordMode">
          <text class="form-switch-text">
            {{ passwordMode === 'login' ? '首次使用密码 / 注册账号' : '已有密码？去登录' }}
          </text>
        </view>
        <view class="form-back" @click="closePasswordForm">
          <SvgIcon name="arrow-left-line" size="28rpx" color="#4b5a7a" />
          <text class="form-back-text">返回微信登录</text>
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
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/shared/store/modules/user'
import { authApi } from '@/shared/api/modules/auth'
import { storage, STORAGE_KEYS } from '@/shared/utils/storage'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import Input from '@/shared/components/Input.vue'
import { LoadingState, Card, EmptyState, Button } from '@/shared/components'

const userStore = useUserStore()

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch (e) {}

const qrCodeUrl = ref('')
const scanState = ref('')
const scanStatus = ref<'waiting' | 'scanned' | 'confirmed' | 'expired'>('waiting')
const loginLoading = ref(false)
const errorMsg = ref('')

// 邮箱验证码登录状态
const showEmailForm = ref(false)
const email = ref('')
const smsCode = ref('')
const countdown = ref(0)
const isValidEmail = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value))
let countdownTimer: ReturnType<typeof setInterval> | null = null

// 手机号验证码登录状态
const showSmsForm = ref(false)
const phone = ref('')
const isValidPhone = computed(() => /^1[3-9]\d{9}$/.test(phone.value))

// 密码登录 / 首次设置密码状态（注册即登录；存量账号可通过此表单补设密码）
const showPasswordForm = ref(false)
const passwordMode = ref<'login' | 'register'>('login')
const pwdAccount = ref('')
const pwdPassword = ref('')
const pwdCode = ref('')
const pwdAccountIsEmail = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pwdAccount.value.trim()))
const pwdAccountIsPhone = computed(() => /^1[3-9]\d{9}$/.test(pwdAccount.value.trim()))
const canSendPwdCode = computed(() => pwdAccountIsPhone.value || pwdAccountIsEmail.value)

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
  stopCountdown()
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

/** 停止验证码倒计时 */
function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

/** 发送手机号验证码（60s 倒计时；阿里云短信认证真实下发） */
async function handleSendSms() {
  if (!isValidPhone.value) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  try {
    await authApi.sendSmsCode(phone.value)
    uni.showToast({ title: '验证码已发送，请查收短信', icon: 'none' })
    countdown.value = 60
    stopCountdown()
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) stopCountdown()
    }, 1000)
  } catch (e: any) {
    uni.showToast({ title: e?.data?.message || '发送失败，请稍后再试', icon: 'none' })
  }
}

/** 手机号 + 验证码登录 */
async function handlePhoneLogin() {
  if (!isValidPhone.value) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  if (!smsCode.value) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }
  loginLoading.value = true
  try {
    await userStore.smsLogin(phone.value, smsCode.value)
    loginLoading.value = false
    stopCountdown()
    handleLoginOk()
  } catch (e: any) {
    loginLoading.value = false
    uni.showToast({ title: e?.data?.message || '登录失败，请重试', icon: 'none' })
  }
}

/** 发送邮箱验证码（60s 倒计时） */
async function handleSendEmail() {
  if (!isValidEmail.value) {
    uni.showToast({ title: '请输入正确的邮箱', icon: 'none' })
    return
  }
  try {
    await authApi.sendEmailCode(email.value)
    uni.showToast({ title: '验证码已发送，请查收邮箱', icon: 'none' })
    countdown.value = 60
    stopCountdown()
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) stopCountdown()
    }, 1000)
  } catch (e: any) {
    uni.showToast({ title: e?.data?.message || '发送失败，请稍后再试', icon: 'none' })
  }
}

/** 邮箱 + 验证码登录 */
async function handleEmailLogin() {
  if (!isValidEmail.value) {
    uni.showToast({ title: '请输入正确的邮箱', icon: 'none' })
    return
  }
  if (!smsCode.value) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }
  loginLoading.value = true
  try {
    await userStore.emailLogin(email.value, smsCode.value)
    loginLoading.value = false
    stopCountdown()
    handleLoginOk()
  } catch (e: any) {
    loginLoading.value = false
    uni.showToast({ title: e?.data?.message || '登录失败，请重试', icon: 'none' })
  }
}

/** 打开密码登录入口（默认登录模式） */
function openPasswordForm() {
  passwordMode.value = 'login'
  showPasswordForm.value = true
}

/** 关闭密码表单并清理状态 */
function closePasswordForm() {
  showPasswordForm.value = false
  pwdAccount.value = ''
  pwdPassword.value = ''
  pwdCode.value = ''
  stopCountdown()
  countdown.value = 0
}

/** 登录 / 注册模式切换 */
function togglePasswordMode() {
  passwordMode.value = passwordMode.value === 'login' ? 'register' : 'login'
  pwdCode.value = ''
  pwdPassword.value = ''
  stopCountdown()
  countdown.value = 0
}

/** 注册模式发送验证码：按账号类型自动选择短信 / 邮箱通道 */
async function handleSendPwdCode() {
  const account = pwdAccount.value.trim()
  if (!pwdAccountIsPhone.value && !pwdAccountIsEmail.value) {
    uni.showToast({ title: '请输入正确的手机号或邮箱', icon: 'none' })
    return
  }
  try {
    if (pwdAccountIsPhone.value) {
      await authApi.sendSmsCode(account)
    } else {
      await authApi.sendEmailCode(account)
    }
    uni.showToast({ title: pwdAccountIsPhone.value ? '验证码已发送，请查收短信' : '验证码已发送，请查收邮箱', icon: 'none' })
    countdown.value = 60
    stopCountdown()
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) stopCountdown()
    }, 1000)
  } catch (e: any) {
    uni.showToast({ title: e?.data?.message || '发送失败，请稍后再试', icon: 'none' })
  }
}

/** 密码登录 / 注册提交 */
async function handlePasswordSubmit() {
  const account = pwdAccount.value.trim()
  if (!account) {
    uni.showToast({ title: '请输入手机号或邮箱', icon: 'none' })
    return
  }
  const mode = passwordMode.value
  if (mode === 'register') {
    if (!pwdCode.value) {
      uni.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pwdPassword.value)) {
      uni.showToast({ title: '密码至少 8 位且需包含字母和数字', icon: 'none' })
      return
    }
  } else if (!pwdPassword.value) {
    uni.showToast({ title: '请输入密码', icon: 'none' })
    return
  }

  loginLoading.value = true
  try {
    if (mode === 'login') {
      await userStore.passwordLogin(account, pwdPassword.value)
    } else {
      await userStore.register(account, pwdPassword.value, pwdCode.value)
    }
    loginLoading.value = false
    stopCountdown()
    handleLoginOk(mode === 'login' ? '登录成功' : '注册成功')
  } catch (e: any) {
    loginLoading.value = false
    handlePasswordError(e)
  }
}

/** 密码登录 / 注册错误处理：统一 toast，仅 409 引导去登录 */
function handlePasswordError(e: any) {
  const status = e?.statusCode || e?.status
  const message = e?.data?.message || e?.message || '操作失败，请重试'

  // 409：该账号已设置密码（重复注册），引导改为密码登录
  if (status === 409) {
    uni.showModal({
      title: '提示',
      content: message || '该账号已设置密码，请直接登录',
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          passwordMode.value = 'login'
          pwdPassword.value = ''
          pwdCode.value = ''
          stopCountdown()
          countdown.value = 0
        }
      }
    })
    return
  }

  // 400 / 401 / 429 / 500：直接提示后端文案（429 不再降级为验证码登录）
  uni.showToast({ title: message, icon: 'none' })
}

/** 扫码登录成功处理 */
async function handleLoginSuccess(scanData?: { token?: string; openid?: string }) {
  loginLoading.value = true
  // 传入 poll 返回的 token，存储后用 Authorization 头认证
  const success = await userStore.handleScanLoginSuccess(scanData)
  loginLoading.value = false

  if (success) {
    handleLoginOk()
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
        handleLoginOk()
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

/** 未设密码且已绑手机/邮箱时返回 true，并写入一次性标记（避免重复打扰） */
function maybeHintSetPassword(): boolean {
  const info = userStore.userInfo
  const hasBinding = !!(info?.phone || info?.email)
  if (!hasBinding || userStore.hasPassword) return false
  if (storage.get(STORAGE_KEYS.PWD_HINT_SHOWN)) return false
  storage.set(STORAGE_KEYS.PWD_HINT_SHOWN, true)
  return true
}

/** 登录成功统一收尾：成功提示 + 未设密码时的一次性引导 + 延迟跳转 */
function handleLoginOk(title = '登录成功') {
  const needHint = maybeHintSetPassword()
  if (needHint) {
    uni.showToast({ title: '登录成功，可在「账号与安全」中设置密码', icon: 'none', duration: 2000 })
  } else {
    uni.showToast({ title, icon: 'success' })
  }
  setTimeout(() => goHome(), needHint ? 2000 : 500)
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

/* 邮箱验证码登录入口（描边按钮） */
.btn-email-login {
  width: 100%;
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: #ffffff;
  border: 2rpx solid $line;
  border-radius: 48rpx;
  padding: 18rpx 0;
  line-height: 1.2;

  .btn-text {
    font-size: 30rpx;
    color: $primary;
    font-weight: 600;
  }
}

/* ===== 邮箱验证码登录表单 ===== */
.email-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  padding-top: 16rpx;
}

.form-title {
  font-size: 36rpx;
  font-weight: 700;
  color: $ink;
  margin-bottom: 40rpx;
  text-align: center;
}

.form-tip {
  display: block;
  margin-bottom: 32rpx;
  font-size: 24rpx;
  line-height: 1.5;
  color: #6b7280;
  text-align: center;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.form-input {
  flex: 1;
}

.form-code-btn {
  flex-shrink: 0;
  min-width: 180rpx;
}

/* 验证码倒计时禁用态：整体 opacity 会让白字变浅灰看不清，
   改为背景手动淡化（保持"按钮颜色变淡"）＋文字固定纯白保证可读 */
.form-code-btn.is-disabled {
  opacity: 1;
  background: rgba(11, 95, 255, 0.4);
  box-shadow: none;
}
.form-code-btn.is-disabled :deep(.as-btn__text) {
  color: #ffffff;
}

.form-submit {
  margin-top: 16rpx;
}

.form-back {
  margin-top: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;

  .form-back-text {
    font-size: 28rpx;
    color: #4b5a7a;
  }
}

.form-switch {
  margin-top: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  .form-switch-text {
    font-size: 28rpx;
    color: $primary;
  }
}

.skip-wrap {
  margin-top: 48rpx;
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
