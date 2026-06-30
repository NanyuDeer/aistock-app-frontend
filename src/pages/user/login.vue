<template>
  <view class="page-login">
    <view class="logo">AI Stock</view>

    <!-- #ifdef H5 || APP-PLUS -->
    <view class="form">
      <input v-model="form.username" placeholder="用户名" class="input" />
      <input v-model="form.password" type="password" placeholder="密码" class="input" />
      <button @tap="handleLogin" class="btn-primary">登录</button>
    </view>
    <!-- #endif -->

    <!-- #ifdef MP-WEIXIN -->
    <button @tap="handleWxLogin" class="btn-wx">微信一键登录</button>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useUserStore } from '@/store/modules/user'

const userStore = useUserStore()
const form = reactive({ username: '', password: '' })

async function handleLogin() {
  if (!form.username || !form.password) {
    uni.showToast({ title: '请输入用户名和密码', icon: 'none' })
    return
  }
  try {
    await userStore.login(form)
    uni.reLaunch({ url: '/pages/index/index' })
  } catch (e: any) {
    uni.showToast({ title: e.message || '登录失败', icon: 'none' })
  }
}

async function handleWxLogin() {
  uni.login({
    provider: 'weixin',
    success: async (res) => {
      try {
        await userStore.wxLogin(res.code)
        uni.reLaunch({ url: '/pages/index/index' })
      } catch (e: any) {
        uni.showToast({ title: e.message || '登录失败', icon: 'none' })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.page-login { padding: 80rpx 40rpx; display: flex; flex-direction: column; align-items: center; min-height: 100vh; background: #f5f7fa; }
.logo { font-size: 48rpx; font-weight: 600; margin-bottom: 80rpx; color: #4d7cfe; }
.form { width: 100%; }
.input {
  width: 100%; background: #ffffff; border-radius: 12rpx; padding: 24rpx;
  margin-bottom: 20rpx; color: #1a1d24; border: 1rpx solid #e5e7eb;
}
.btn-primary {
  width: 100%; background: #4d7cfe; color: #fff; border-radius: 12rpx;
  padding: 24rpx; font-size: 32rpx;
}
.btn-wx {
  width: 100%; background: #22c55e; color: #fff; border-radius: 12rpx;
  padding: 24rpx; font-size: 32rpx;
}
</style>
