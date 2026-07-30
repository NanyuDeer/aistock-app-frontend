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
        <Card flush>
          <ListCell title="自选股异动" description="重大利好/利空实时推送" :border="true">
            <template #value>
              <Switch v-model="settings.stock_push" @change="(val) => onSettingChange('stock_push', val)" />
            </template>
          </ListCell>
          <ListCell title="机构调研推荐" description="每日 9:00 和 17:00 推送" :border="true">
            <template #value>
              <Switch v-model="settings.outbreak_push" @change="(val) => onSettingChange('outbreak_push', val)" />
            </template>
          </ListCell>
          <ListCell title="风口龙头" description="每日 8:30 推送" :border="true">
            <template #value>
              <Switch v-model="settings.leader_push" @change="(val) => onSettingChange('leader_push', val)" />
            </template>
          </ListCell>
        </Card>
      </view>

      <!-- 我的自选股 -->
      <view v-if="isLoggedIn && favoriteStocks.length" class="section">
        <view class="section-header">
          <text class="section-title">我的自选股</text>
          <text class="section-count">{{ favoriteStocks.length }} 只</text>
        </view>
        <Card flush>
          <ListCell
            v-for="(stock, idx) in favoriteStocks"
            :key="idx"
            :title="stock.name"
            :description="stock.symbol"
            :border="true"
            clickable
            @click="goStockDetail(stock.symbol)"
          >
            <template #value>
              <Tag size="sm">{{ stock.market || 'SH' }}</Tag>
              <text class="fav-date">{{ formatDate(stock.addedAt || '') }}</text>
            </template>
          </ListCell>
        </Card>
      </view>

      <!-- 菜单项 -->
      <view class="section">
        <Card flush>
          <ListCell title="自选股" clickable showArrow :border="true" @click="goFavorites">
            <template #prefix>
              <SvgIcon name="bar-chart-line" size="36rpx" color="#4b5a7a" />
            </template>
          </ListCell>
          <ListCell title="关于" clickable showArrow :border="true" @click="goAbout">
            <template #prefix>
              <SvgIcon name="information-line" size="36rpx" color="#4b5a7a" />
            </template>
          </ListCell>
        </Card>
      </view>

      <!-- 退出登录 -->
      <view v-if="isLoggedIn" class="section">
        <Button type="danger" block @click="handleLogout">退出登录</Button>
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
import { Switch, ListCell, Card, Tag, Button } from '@/shared/components'

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
    const s = await authApi.getSettings() as unknown as {
      openid?: string
      settings?: Array<{ setting_type?: string; enabled?: boolean }>
    }
    // 后端返回 { openid, settings: [{ setting_type, enabled, updated_at }, ...] }
    // 转换为前端扁平结构 { stock_push, outbreak_push, leader_push }
    const arr = Array.isArray(s?.settings) ? s.settings : []
    const map: Record<string, boolean> = {}
    for (const item of arr) {
      if (item.setting_type) {
        map[item.setting_type] = !!item.enabled
      }
    }
    settings.value = {
      stock_push: map.stock_push ?? false,
      outbreak_push: map.outbreak_push ?? false,
      leader_push: map.leader_push ?? false,
    }
  } catch (e) {
    // API 未实现或失败时，保持默认值
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
  background: linear-gradient(135deg, $primary, $primary-600);
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
  color: $ink;
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
  color: $ink;
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
  color: $ink;
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
  color: $primary;
  background: rgba(77, 124, 254, 0.1);
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
}

.fav-date {
  font-size: 22rpx;
  color: #9ca3af;
}
</style>
