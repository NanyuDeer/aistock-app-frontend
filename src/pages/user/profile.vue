<template>
  <SubPageCard title="我的">
    <view class="content-wrap">
      <!-- 用户卡片 -->
      <view class="user-card">
        <image v-if="userInfo?.avatar" :src="userInfo.avatar" class="avatar" />
        <view v-else class="avatar-placeholder">{{ nickname.charAt(0) }}</view>
        <view class="user-info">
          <text class="nickname">{{ nickname }}</text>
          <text class="user-desc">{{ userStore.isLoggedIn() ? '已登录' : '点击登录享受更多服务' }}</text>
        </view>
      </view>

      <!-- 功能菜单 -->
      <view class="menu-list">
        <view class="menu-item" @tap="goFavorites">
          <view class="menu-left">
            <text class="menu-icon">⭐</text>
            <text class="menu-text">我的自选</text>
          </view>
          <text class="arrow">›</text>
        </view>
        <view class="menu-item" @tap="goAlerts">
          <view class="menu-left">
            <text class="menu-icon">🔔</text>
            <text class="menu-text">异动提醒</text>
          </view>
          <text class="arrow">›</text>
        </view>
        <view class="menu-item" @tap="goUpdateLogs">
          <view class="menu-left">
            <text class="menu-icon">📋</text>
            <text class="menu-text">更新日志</text>
          </view>
          <text class="arrow">›</text>
        </view>
      </view>

      <!-- 登录/退出按钮 -->
      <button v-if="userStore.isLoggedIn()" @tap="handleLogout" class="btn-action btn-logout">退出登录</button>
      <button v-else @tap="goLogin" class="btn-action btn-login">去登录</button>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/store/modules/user'
import SubPageCard from '@/components/layout/SubPageCard.vue'

const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)
const nickname = computed(() => userStore.userInfo?.nickname || '未登录')

function goFavorites() { uni.navigateTo({ url: '/pages/stock/favorites' }) }
function goAlerts() {
  uni.navigateTo({ url: '/pages-sub-app/portfolio/index' })
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
.content-wrap {
  padding: 24rpx;
}

/* ===== 用户卡片 ===== */
.user-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
}

.avatar-placeholder {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #4d7cfe, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: #fff;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.nickname {
  font-size: 32rpx;
  color: #1a1d24;
  font-weight: 600;
}

.user-desc {
  font-size: 22rpx;
  color: #9ca3af;
}

/* ===== 菜单列表 ===== */
.menu-list {
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  margin-bottom: 30rpx;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 30rpx;
  border-bottom: 1rpx solid #f0f2f5;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.menu-icon {
  font-size: 32rpx;
}

.menu-text {
  font-size: 28rpx;
  color: #1a1d24;
}

.arrow {
  font-size: 28rpx;
  color: #9ca3af;
}

/* ===== 按钮 ===== */
.btn-action {
  width: 100%;
  margin-top: 10rpx;
  background: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  font-size: 28rpx;
  font-weight: 500;
  border: none;
}

.btn-logout {
  color: #f43f5e;
}

.btn-login {
  color: #4d7cfe;
}
</style>
