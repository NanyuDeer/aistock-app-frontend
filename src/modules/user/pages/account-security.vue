<template>
  <SubPageCard title="账号与安全" noChatBar>
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
          <ListCell title="手机号" :description="phoneDesc">
            <template #prefix>
              <SvgIcon name="smartphone-line" size="36rpx" color="#0b5fff" />
            </template>
            <template #value>
              <Tag v-if="hasPhone" type="up" size="sm">已绑定</Tag>
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

      <!-- 绑定表单（内联展开） -->
      <view v-if="bindMode" class="section">
        <Card>
          <view class="bind-form">
            <text class="bind-form-title">
              {{ bindMode === 'wechat' ? '绑定微信（验证归属）' : '绑定手机号' }}
            </text>
            <view class="form-row">
              <SvgIcon name="smartphone-line" size="36rpx" color="#9ca3af" />
              <Input
                v-model="bindPhone"
                type="number"
                :maxlength="11"
                placeholder="请输入手机号"
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
                :disabled="countdown > 0 || !isValidPhone"
                size="sm"
                @click="handleSendSms"
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
            手机号登录的账户也可以绑定微信：绑定后即可用微信登录，原有微信账号（自选股、推送设置等）信息将保留在本账户中。
            若提示「该微信已绑定其他账户」，请先用该微信登录一次，再在「账号与安全」页绑定手机号。
          </text>
        </Card>
      </view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '@/shared/store/modules/user'
import { authApi } from '@/shared/api/modules/auth'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import Input from '@/shared/components/Input.vue'
import { ListCell, Card, Tag, Button } from '@/shared/components'

const userStore = useUserStore()

const hasWechat = computed(() => !!userStore.userInfo?.openid)
const hasPhone = computed(() => !!userStore.userInfo?.phone)
const wechatDesc = computed(() => {
  const nickname = userStore.userInfo?.nickname
  return hasWechat.value ? (nickname || '已绑定微信') : '未绑定'
})
const phoneDesc = computed(() => {
  const phone = userStore.userInfo?.phone
  return hasPhone.value && phone ? maskPhone(phone) : '未绑定'
})

/** 手机号脱敏：138****1234 */
function maskPhone(phone: string): string {
  if (phone.length < 7) return phone
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

// 绑定表单状态
const bindMode = ref<'phone' | 'wechat' | ''>('')
const bindPhone = ref('')
const bindCode = ref('')
const wxCode = ref('')
const countdown = ref(0)
const binding = ref(false)
const isValidPhone = computed(() => /^1[3-9]\d{9}$/.test(bindPhone.value))
let countdownTimer: ReturnType<typeof setInterval> | null = null

function startBind(mode: 'phone' | 'wechat') {
  bindMode.value = mode
  bindPhone.value = ''
  bindCode.value = ''
  wxCode.value = ''
  // 绑定微信：先获取微信授权 code（App/小程序），H5 端扫码登录无法直接取 code，提示走微信登录
  if (mode === 'wechat') {
    // #ifdef H5
    uni.showToast({ title: '请在微信端登录后绑定手机号', icon: 'none' })
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
  bindPhone.value = ''
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

/** 发送验证码 */
async function handleSendSms() {
  if (!isValidPhone.value) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  try {
    await authApi.sendSmsCode(bindPhone.value)
    uni.showToast({ title: '验证码已发送', icon: 'none' })
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

/** 确认绑定 */
async function handleBind() {
  if (!isValidPhone.value) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  if (!bindCode.value) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }
  if (bindMode.value === 'wechat' && !wxCode.value) {
    uni.showToast({ title: '微信授权未完成，请重试', icon: 'none' })
    return
  }
  binding.value = true
  try {
    if (bindMode.value === 'wechat') {
      await authApi.bindWechat(bindPhone.value, bindCode.value, wxCode.value)
    } else {
      await authApi.bindPhone(bindPhone.value, bindCode.value)
    }
    binding.value = false
    stopCountdown()
    await userStore.fetchUserInfo()
    uni.showToast({ title: '绑定成功', icon: 'success' })
    cancelBind()
  } catch (e: any) {
    binding.value = false
    uni.showToast({ title: e?.data?.message || '绑定失败，请重试', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.security-content {
  padding: 0 24rpx 48rpx;
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

.form-code-btn {
  flex-shrink: 0;
  min-width: 180rpx;
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
