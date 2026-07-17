<template>
  <SubPageCard title="我的">
    <view class="profile-content">
      <!-- 用户信息卡片 -->
      <view class="user-card">
        <view class="user-info">
          <view class="avatar-wrap">
            <image
              v-if="userInfo?.avatar"
              :src="userInfo.avatar"
              class="avatar-img"
              mode="aspectFill"
            />
            <SvgIcon v-else name="bear-smile-line" size="56rpx" color="#ffffff" />
          </view>
          <view class="user-detail">
            <text v-if="isLoggedIn" class="user-name">{{ userInfo?.nickname || '未设置昵称' }}</text>
            <text v-else class="user-name login-prompt" @tap="goLogin">点击登录</text>
            <text v-if="isLoggedIn && userInfo?.createdAt" class="user-since">
              加入于 {{ formatJoinDate(userInfo.createdAt) }}
            </text>
          </view>
        </view>
      </view>

      <!-- 推送设置 -->
      <view v-if="isLoggedIn" class="section">
        <text class="section-title">推送设置</text>
        <view class="settings-card">
          <view class="setting-row">
            <view class="setting-info">
              <text class="setting-label">自选股异动</text>
              <text class="setting-desc">重大利好/利空实时推送</text>
            </view>
            <switch
              :checked="settings.stock_push"
              color="#4d7cfe"
              @change="(e) => onSettingChange('stock_push', getSwitchValue(e))"
            />
          </view>
          <view class="setting-divider" />
          <view class="setting-row">
            <view class="setting-info">
              <text class="setting-label">机构调研推荐</text>
              <text class="setting-desc">每日 9:00 和 17:00 推送</text>
            </view>
            <switch
              :checked="settings.outbreak_push"
              color="#4d7cfe"
              @change="(e) => onSettingChange('outbreak_push', getSwitchValue(e))"
            />
          </view>
          <view class="setting-divider" />
          <view class="setting-row">
            <view class="setting-info">
              <text class="setting-label">风口龙头</text>
              <text class="setting-desc">每日 8:30 推送</text>
            </view>
            <switch
              :checked="settings.leader_push"
              color="#4d7cfe"
              @change="(e) => onSettingChange('leader_push', getSwitchValue(e))"
            />
          </view>
        </view>
      </view>

      <!-- 我的自选股 -->
      <view v-if="isLoggedIn && favoriteStocks.length" class="section">
        <view class="section-header">
          <text class="section-title">我的自选股</text>
          <text class="section-count">{{ favoriteStocks.length }} 只</text>
        </view>
        <view class="favorites-card">
          <view
            v-for="(stock, idx) in favoriteStocks"
            :key="idx"
            class="favorite-row"
            @tap="goStockDetail(stock.symbol)"
          >
            <view class="fav-left">
              <text class="fav-name">{{ stock.name }}</text>
              <text class="fav-code">{{ stock.symbol }}</text>
            </view>
            <view class="fav-right">
              <text class="fav-market">{{ stock.market || 'SH' }}</text>
              <text class="fav-date">{{ formatDate(stock.addedAt || '') }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 菜单项 -->
      <view class="section">
        <view class="menu-card">
          <view class="menu-row" @tap="goFavorites">
            <SvgIcon name="bar-chart-line" size="36rpx" color="#6b7280" />
            <text class="menu-label">自选股</text>
            <text class="menu-arrow">›</text>
          </view>
          <view class="setting-divider" />
          <view class="menu-row" @tap="goAlerts">
            <SvgIcon name="bell-line" size="36rpx" color="#6b7280" />
            <text class="menu-label">特别提醒</text>
            <text class="menu-arrow">›</text>
          </view>
          <view class="setting-divider" />
          <view class="menu-row" @tap="goAbout">
            <SvgIcon name="information-line" size="36rpx" color="#6b7280" />
            <text class="menu-label">关于</text>
            <text class="menu-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 退出登录 -->
      <view v-if="isLoggedIn" class="section">
        <view class="logout-btn" @tap="handleLogout">
          <text class="logout-text">退出登录</text>
        </view>
      </view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/shared/store/modules/user'
import { useFavoritesStore } from '@/shared/store/modules/favorites'
import { authApi, type UserSettings } from '@/shared/api/modules/auth'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

const userStore = useUserStore()
const favoritesStore = useFavoritesStore()
const isLoggedIn = computed(() => userStore.isLoggedIn())
const userInfo = computed(() => userStore.userInfo)
// 默认全部关闭，由 API 返回值覆盖
const DEFAULT_SETTINGS: UserSettings = {
  stock_push: false,
  outbreak_push: false,
  leader_push: false,
}
const settings = ref<UserSettings>({ ...DEFAULT_SETTINGS })
const favoriteStocks = computed(() => favoritesStore.stocks)

onShow(async () => {
  if (!isLoggedIn.value) return
  await Promise.all([loadSettings(), favoritesStore.fetchFavorites({ silent: true })])
})

async function loadSettings() {
  try {
    const s = await authApi.getSettings()
    // 合并：API 返回值覆盖默认值，确保未返回的字段仍有默认值
    settings.value = { ...DEFAULT_SETTINGS, ...s }
  } catch (e) {
    // API 未实现或失败时，保持默认值（全部开启）
    settings.value = { ...DEFAULT_SETTINGS }
  }
}

async function onSettingChange(key: keyof UserSettings, enabled: boolean) {
  settings.value[key] = enabled
  try {
    await authApi.updateSettings(key, { enabled })
    uni.showToast({ title: enabled ? '已开启' : '已关闭', icon: 'none' })
  } catch (e) {
    settings.value[key] = !enabled // 回滚
    uni.showToast({ title: '设置失败', icon: 'none' })
  }
}

/** 从 switch change 事件中安全提取 checked 值 */
function getSwitchValue(e: unknown): boolean {
  if (e && typeof e === 'object' && 'detail' in e) {
    const detail = (e as { detail: { value?: boolean } }).detail
    return !!detail.value
  }
  return false
}

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '退出后自选股和推送设置将不会同步',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        settings.value = { ...DEFAULT_SETTINGS }
        uni.showToast({ title: '已退出登录', icon: 'none' })
        // 退出后返回首页，避免停留在 profile 页面造成"没退出"的错觉
        setTimeout(() => {
          uni.redirectTo({ url: '/modules/home/pages/index' })
        }, 500)
      }
    }
  })
}

function goLogin() {
  uni.navigateTo({ url: '/modules/user/pages/login' })
}

function goFavorites() {
  uni.navigateTo({ url: '/modules/favorites/pages/favorites' })
}

function goAlerts() {
  uni.reLaunch({ url: '/modules/home/pages/index?tab=alert' })
}

function goAbout() {
  uni.showToast({ title: 'AI Stock v2.1', icon: 'none' })
}

function goStockDetail(symbol: string) {
  if (!symbol) return
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` })
}

function formatJoinDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}-${d.getDate()}`
}
</script>

<style lang="scss" scoped>
.profile-content {
  padding: 0 24rpx 48rpx;
}

/* ===== 用户卡片 ===== */
.user-card {
  background: linear-gradient(135deg, #4d7cfe, #6366f1);
  border-radius: 20rpx;
  padding: 32rpx 24rpx;
  margin-bottom: 32rpx;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.avatar-wrap {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
}

.avatar-default {
  font-size: 56rpx;
}

.user-detail {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.user-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #ffffff;

  &.login-prompt {
    font-weight: 500;
  }
}

.user-since {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}

/* ===== 通用 section ===== */
.section {
  margin-bottom: 32rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.section-title {
  font-size: 28rpx;
  color: #1a1d24;
  font-weight: 600;
}

.section-count {
  font-size: 24rpx;
  color: #9ca3af;
}

/* ===== 设置卡片 ===== */
.settings-card,
.favorites-card,
.menu-card {
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.setting-label {
  font-size: 28rpx;
  color: #1a1d24;
}

.setting-desc {
  font-size: 22rpx;
  color: #9ca3af;
}

.setting-divider {
  height: 1rpx;
  background: #f3f4f6;
  margin: 0 24rpx;
}

/* ===== 自选股列表 ===== */
.favorite-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }
}

.fav-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.fav-name {
  font-size: 28rpx;
  color: #1a1d24;
  font-weight: 500;
}

.fav-code {
  font-size: 22rpx;
  color: #9ca3af;
}

.fav-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.fav-market {
  font-size: 20rpx;
  color: #4d7cfe;
  background: rgba(77, 124, 254, 0.1);
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
}

.fav-date {
  font-size: 22rpx;
  color: #9ca3af;
}

/* ===== 菜单 ===== */
.menu-row {
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  gap: 16rpx;
}

.menu-icon {
  font-size: 36rpx;
}

.menu-label {
  flex: 1;
  font-size: 28rpx;
  color: #1a1d24;
}

.menu-arrow {
  font-size: 32rpx;
  color: #d1d5db;
}

/* ===== 退出登录 ===== */
.logout-btn {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx 0;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.logout-text {
  font-size: 30rpx;
  color: #f43f5e;
  font-weight: 500;
}
</style>
