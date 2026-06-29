<template>
  <view class="page-profile">
    <view class="user-card">
      <image v-if="userInfo?.avatar" :src="userInfo.avatar" class="avatar" />
      <view v-else class="avatar-placeholder">{{ nickname.charAt(0) }}</view>
      <text class="nickname">{{ nickname }}</text>
    </view>

    <view class="menu-list">
      <view class="menu-item" @tap="goFavorites">
        <text>我的自选</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @tap="goAlerts">
        <text>异动提醒</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @tap="goUpdateLogs">
        <text>更新日志</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <button v-if="userStore.isLoggedIn()" @tap="handleLogout" class="btn-logout">退出登录</button>
    <button v-else @tap="goLogin" class="btn-login">去登录</button>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/store/modules/user'

const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)
const nickname = computed(() => userStore.userInfo?.nickname || '未登录')

function goFavorites() { uni.switchTab({ url: '/pages/favorites/index' }) }
function goAlerts() {
  // #ifdef APP-PLUS
  uni.navigateTo({ url: '/pages-sub-app/portfolio/index' })
  // #endif
}
function goUpdateLogs() { uni.navigateTo({ url: '/pages/about/update-logs' }) }
function goLogin() { uni.navigateTo({ url: '/pages/user/login' }) }

function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定退出登录？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.reLaunch({ url: '/pages/index/index' })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.page-profile { padding: 20rpx; }
.user-card {
  display: flex; align-items: center; gap: 20rpx;
  background: #1a1a2e; border-radius: 12rpx; padding: 30rpx; margin-bottom: 20rpx;
}
.avatar { width: 100rpx; height: 100rpx; border-radius: 50%; }
.avatar-placeholder {
  width: 100rpx; height: 100rpx; border-radius: 50%; background: #007AFF;
  display: flex; align-items: center; justify-content: center; font-size: 40rpx;
}
.nickname { font-size: 32rpx; }
.menu-list { background: #1a1a2e; border-radius: 12rpx; overflow: hidden; }
.menu-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 30rpx; border-bottom: 1rpx solid #2a2a4a;
}
.arrow { color: #666; }
.btn-logout, .btn-login {
  margin-top: 40rpx; background: #1a1a2e; color: #FF3B30;
  border-radius: 12rpx; padding: 24rpx;
}
.btn-login { color: #007AFF; }
</style>
