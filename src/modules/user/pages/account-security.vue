<template>
  <SubPageCard2 title="账号与安全" no-chat-bar>
    <view class="security-content">
      <!-- 当前绑定状态 -->
      <view class="section">
        <text class="section-title">当前绑定</text>
        <Card flush>
          <ListCell title="微信" :description="wechatDesc" :border="true">
            <template #prefix>
              <SvgIcon name="wechat" size="36rpx" color="#22c55e" />
            </template>
            <template #value>
              <Tag v-if="hasWechat" type="up" size="sm">已绑定</Tag>
              <Tag v-else type="gray" size="sm">未绑定</Tag>
            </template>
          </ListCell>
          <ListCell title="手机号" :description="phoneDesc" :border="true">
            <template #prefix>
              <SvgIcon name="phone-line" size="36rpx" color="#22c55e" />
            </template>
            <template #value>
              <Tag v-if="hasPhone" type="up" size="sm">已绑定</Tag>
              <Tag v-else type="gray" size="sm">未绑定</Tag>
            </template>
          </ListCell>
          <ListCell title="邮箱" :description="emailDesc">
            <template #prefix>
              <SvgIcon name="mail-line" size="36rpx" color="#0b5fff" />
            </template>
            <template #value>
              <Tag v-if="hasEmail" type="up" size="sm">已绑定</Tag>
              <Tag v-else type="gray" size="sm">未绑定</Tag>
            </template>
          </ListCell>
        </Card>
      </view>

      <!-- 绑定设置 -->
      <view class="section">
        <text class="section-title">绑定设置</text>
        <Card flush>
          <ListCell
            v-if="!hasPhone"
            title="绑定手机号"
            description="绑定后可用手机号验证码登录"
            clickable
            showArrow
            :border="true"
            @click="startBind('phone')"
          >
            <template #prefix>
              <SvgIcon name="phone-line" size="36rpx" color="#4b5a7a" />
            </template>
          </ListCell>
          <ListCell
            v-if="!hasEmail"
            title="绑定邮箱"
            description="绑定后可用邮箱验证码登录"
            clickable
            showArrow
            :border="true"
            @click="startBind('email')"
          >
            <template #prefix>
              <SvgIcon name="mail-line" size="36rpx" color="#4b5a7a" />
            </template>
          </ListCell>
          <ListCell
            v-if="!hasWechat"
            title="绑定微信"
            description="绑定后可用微信登录，保留微信账号数据"
            clickable
            showArrow
            @click="startBind('wechat')"
          >
            <template #prefix>
              <SvgIcon name="wechat" size="36rpx" color="#4b5a7a" />
            </template>
          </ListCell>
        </Card>
      </view>

      <!-- 绑定表单（内联展开：phone / email / wechat） -->
      <view v-if="bindMode" class="section">
        <Card>
          <view class="bind-form">
            <text class="bind-form-title">{{ bindFormTitle }}</text>
            <!-- 绑定微信：用当前账户已绑定的邮箱/手机号证明归属（只读展示） -->
            <view v-if="bindMode === 'wechat'" class="form-row">
              <SvgIcon :name="wechatProveIcon" size="36rpx" color="#9ca3af" />
              <text class="prove-identity">{{ wechatProveDesc }}</text>
            </view>
            <!-- 绑定手机号 / 邮箱：输入新身份 -->
            <view v-else class="form-row">
              <SvgIcon :name="bindMode === 'phone' ? 'phone-line' : 'mail-line'" size="36rpx" color="#9ca3af" />
              <Input
                v-model="bindTarget"
                :type="bindMode === 'phone' ? 'number' : 'text'"
                :maxlength="bindMode === 'phone' ? 11 : undefined"
                :placeholder="bindMode === 'phone' ? '请输入手机号' : '请输入邮箱'"
                class="form-input"
              />
            </view>
            <view class="form-row">
              <SvgIcon name="lock-line" size="36rpx" color="#9ca3af" />
              <Input
                v-model="bindCode"
                type="number"
                :maxlength="6"
                placeholder="请输入验证码"
                class="form-input"
              />
              <Button
                class="form-code-btn"
                :disabled="countdown > 0 || !canSendCode"
                size="sm"
                @click="handleSendCode"
              >
                {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
              </Button>
            </view>
            <view class="bind-form-actions">
              <Button block :loading="binding" @click="handleBind">确认绑定</Button>
              <Button type="ghost" block @click="cancelBind">取消</Button>
            </view>
          </view>
        </Card>
      </view>

      <!-- 绑定说明 -->
      <view class="section">
        <Card>
          <text class="as-desc">
            微信 / 手机号 / 邮箱三者可互相绑定，绑定后均可用于登录。绑定冲突时会自动合并账户：自选股取并集、
            VIP 自动继承、设置保留当前登录账户。若该身份已绑定他人账户且对方有数据，合并后对方账户将注销为空壳，
            该身份（连同对方账户的自选股/VIP）归入当前账户。
          </text>
        </Card>
      </view>
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '@/shared/store/modules/user'
import { authApi } from '@/shared/api/modules/auth'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import Input from '@/shared/components/Input.vue'
import { ListCell, Card, Tag, Button } from '@/shared/components'

const userStore = useUserStore()

const hasWechat = computed(() => !!userStore.userInfo?.openid)
const hasPhone = computed(() => !!userStore.userInfo?.phone)
const hasEmail = computed(() => !!userStore.userInfo?.email)
const wechatDesc = computed(() => {
  const nickname = userStore.userInfo?.nickname
  return hasWechat.value ? (nickname || '已绑定微信') : '未绑定'
})
const phoneDesc = computed(() => {
  const phone = userStore.userInfo?.phone
  return hasPhone.value && phone ? maskPhone(phone) : '未绑定'
})
const emailDesc = computed(() => {
  const email = userStore.userInfo?.email
  return hasEmail.value && email ? maskEmail(email) : '未绑定'
})

/** 邮箱脱敏：use***@163.com */
function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  if (!domain) return email
  const head = name.slice(0, 3)
  return `${head}***@${domain}`
}

/** 手机号脱敏：138****0000 */
function maskPhone(phone: string): string {
  if (phone.length < 7) return phone
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

// 绑定表单状态：phone（绑新手机号）/ email（绑新邮箱）/ wechat（绑微信，用已绑定身份证明归属）
const bindMode = ref<'phone' | 'email' | 'wechat' | ''>('')
const bindTarget = ref('')
const bindCode = ref('')
const wxCode = ref('')
const countdown = ref(0)
const binding = ref(false)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const bindFormTitle = computed(() => {
  if (bindMode.value === 'wechat') return '绑定微信（验证归属）'
  return bindMode.value === 'phone' ? '绑定手机号' : '绑定邮箱'
})

/** 绑定微信时用于证明归属的当前账户身份（邮箱优先，其次手机号） */
const wechatProve = computed(() => {
  const email = userStore.userInfo?.email
  const phone = userStore.userInfo?.phone
  if (email) return { kind: 'email' as const, value: email }
  if (phone) return { kind: 'phone' as const, value: phone }
  return null
})
const wechatProveIcon = computed(() => (wechatProve.value?.kind === 'phone' ? 'phone-line' : 'mail-line'))
const wechatProveDesc = computed(() => {
  const prove = wechatProve.value
  if (!prove) return '请先绑定邮箱或手机号后再绑定微信'
  return prove.kind === 'phone' ? `验证身份：手机号 ${maskPhone(prove.value)}` : `验证身份：邮箱 ${maskEmail(prove.value)}`
})

/** 校验目标身份合法性（决定"获取验证码"按钮是否可点） */
const isValidPhone = computed(() => /^1[3-9]\d{9}$/.test(bindTarget.value))
const isValidEmail = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bindTarget.value))
const canSendCode = computed(() => {
  if (bindMode.value === 'phone') return isValidPhone.value
  if (bindMode.value === 'email') return isValidEmail.value
  return !!wechatProve.value // wechat：当前账户已有可证明身份即可发码
})

function startBind(mode: 'phone' | 'email' | 'wechat') {
  bindMode.value = mode
  bindTarget.value = ''
  bindCode.value = ''
  wxCode.value = ''
  // 绑定微信：先获取微信授权 code（App/小程序）；H5 无法直接取 code，提示走扫码登录
  if (mode === 'wechat') {
    if (!wechatProve.value) {
      uni.showToast({ title: '请先绑定邮箱或手机号，再绑定微信', icon: 'none' })
      bindMode.value = ''
      return
    }
    // #ifdef H5
    uni.showToast({ title: '请在微信端绑定（App/小程序内操作）', icon: 'none' })
    bindMode.value = ''
    return
    // #endif
    // #ifndef H5
    uni.login({
      provider: 'weixin',
      success: (res) => {
        wxCode.value = res.code || ''
      },
      fail: () => {
        uni.showToast({ title: '微信授权失败，请重试', icon: 'none' })
      },
    })
    // #endif
  }
}

function cancelBind() {
  bindMode.value = ''
  bindTarget.value = ''
  bindCode.value = ''
  wxCode.value = ''
  stopCountdown()
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

/** 发送验证码：phone/email 模式发到输入的新身份；wechat 模式发到当前账户已绑定身份 */
async function handleSendCode() {
  let target = ''
  let sendSms = false
  if (bindMode.value === 'phone') {
    if (!isValidPhone.value) {
      uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    target = bindTarget.value
    sendSms = true
  } else if (bindMode.value === 'email') {
    if (!isValidEmail.value) {
      uni.showToast({ title: '请输入正确的邮箱', icon: 'none' })
      return
    }
    target = bindTarget.value
  } else {
    // wechat：发到当前账户已绑定身份（邮箱/手机号）
    const prove = wechatProve.value
    if (!prove) {
      uni.showToast({ title: '请先绑定邮箱或手机号', icon: 'none' })
      return
    }
    target = prove.value
    sendSms = prove.kind === 'phone'
  }
  try {
    if (sendSms) {
      // 绑定场景走"绑定新手机号"模板（scenario=bind → 100004）
      await authApi.sendSmsCode(target, 'bind')
      uni.showToast({ title: '验证码已发送，请查收短信', icon: 'none' })
    } else {
      await authApi.sendEmailCode(target)
      uni.showToast({ title: '验证码已发送，请查收邮箱', icon: 'none' })
    }
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

/** 确认绑定：按模式分派 bindPhone / bindEmail / bindWechat */
async function handleBind() {
  if (bindMode.value === 'phone') {
    if (!isValidPhone.value) {
      uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
  } else if (bindMode.value === 'email') {
    if (!isValidEmail.value) {
      uni.showToast({ title: '请输入正确的邮箱', icon: 'none' })
      return
    }
  } else {
    if (!wechatProve.value) {
      uni.showToast({ title: '请先绑定邮箱或手机号，再绑定微信', icon: 'none' })
      return
    }
    if (!wxCode.value) {
      uni.showToast({ title: '微信授权未完成，请重试', icon: 'none' })
      return
    }
  }
  if (!bindCode.value) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }
  binding.value = true
  try {
    if (bindMode.value === 'phone') {
      await authApi.bindPhone(bindTarget.value, bindCode.value)
    } else if (bindMode.value === 'email') {
      await authApi.bindEmail(bindTarget.value, bindCode.value)
    } else {
      // 绑定微信：用当前账户已绑定身份证明归属（后端 bindWechat 支持 email|phone）
      const prove = wechatProve.value!
      if (prove.kind === 'phone') {
        await authApi.bindWechatByPhone(prove.value, bindCode.value, wxCode.value)
      } else {
        await authApi.bindWechat(prove.value, bindCode.value, wxCode.value)
      }
    }
    binding.value = false
    stopCountdown()
    await userStore.fetchUserInfo()
    uni.showToast({ title: '绑定成功', icon: 'success' })
    cancelBind()
  } catch (e: any) {
    binding.value = false
    // e.data.message（后端业务 message）优先，e.message 兜底；取不到再显示通用文案
    uni.showToast({ title: e?.data?.message || e?.message || '绑定失败，请重试', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.security-content {
  padding: 32rpx 24rpx 48rpx;
}

.section {
  margin-bottom: 32rpx;
}

.section-title {
  display: block;
  font-size: 28rpx;
  color: $ink;
  font-weight: 600;
  margin-bottom: 12rpx;
}

/* ===== 绑定表单 ===== */
.bind-form {
  display: flex;
  flex-direction: column;
}

.bind-form-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $ink;
  margin-bottom: 24rpx;
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

/* 绑定微信：证明身份展示（只读） */
.prove-identity {
  flex: 1;
  font-size: 26rpx;
  color: $ink-soft;
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

.bind-form-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 8rpx;
}

.as-desc {
  font-size: $font-size-sm;
  line-height: $lh-loose;
  color: $ink-soft;
}
</style>
