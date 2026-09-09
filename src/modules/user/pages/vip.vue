<template>
  <!-- 会员中心：使用 SubPageCard2 子页面容器设计（副标题显示会员状态、footer 固定底栏开通按钮、no-chat-bar 隐藏全局 AI 对话栏） -->
  <SubPageCard2 title="会员中心" :subtitle="vipSubtitle" no-chat-bar>
    <view class="vip-content">
      <!-- 会员身份卡 -->
      <Card class="vip-hero">
        <view class="vip-hero-icon">
          <SvgIcon :name="isVip ? 'vip-crown-fill' : 'vip-crown-line'" size="52rpx" :color="isVip ? '#f0a020' : '#b8c0d0'" />
        </view>
        <view class="vip-hero-text">
          <text class="vip-hero-title">{{ isVip ? 'VIP 会员' : '开通会员' }}</text>
          <text class="vip-hero-sub">{{ isVip ? '已解锁全部 AI 深度报告' : '解锁 AI 深度报告全部内容' }}</text>
        </view>
      </Card>

      <!-- 会员权益 -->
      <Card class="vip-benefit">
        <text class="vip-section-title">会员权益</text>
        <view class="vip-benefit-item">
          <view class="vip-benefit-icon">
            <SvgIcon name="check-line" size="24rpx" color="#18a058" />
          </view>
          <text class="vip-benefit-text">查看全部 AI 深度报告详情（晨报 / 风口龙头 / 机构调研 / 趋势股评分 / 收盘复盘）</text>
        </view>
        <view class="vip-benefit-item">
          <view class="vip-benefit-icon">
            <SvgIcon name="check-line" size="24rpx" color="#18a058" />
          </view>
          <text class="vip-benefit-text">优先体验更多会员功能</text>
        </view>
      </Card>
    </view>

    <!-- 固定底栏：开通按钮 -->
    <template #footer>
      <view class="vip-footer">
        <Button
          type="primary"
          size="lg"
          block
          :disabled="isVip"
          @click="handleOpen"
        >{{ isVip ? '已开通' : '开通会员' }}</Button>
        <text class="vip-footer-hint" v-if="!isVip">支付与会员体系功能开发中，敬请期待</text>
      </view>
    </template>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { Card, Button } from '@/shared/components'
import { useUserStore } from '@/shared/store/modules/user'

const userStore = useUserStore()
const isVip = computed(() => !!userStore.userInfo?.isVip)
const vipSubtitle = computed(() => (isVip.value ? '已开通 · 感谢支持' : '未开通'))

/** 占位开通入口：后端支付/会员体系未就绪，点击先提示 */
function handleOpen() {
  uni.showToast({ title: '开通功能开发中，敬请期待', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.vip-content {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 32rpx;
}

.vip-hero {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 24rpx;
  padding: 40rpx 32rpx;
  background: linear-gradient(135deg, rgba(240, 160, 32, 0.08), rgba(240, 160, 32, 0.03));
  border-left: 6rpx solid #f0a020;
}

/* 皇冠标识左对齐，加渐变圆底增强质感 */
.vip-hero-icon {
  flex-shrink: 0;
  width: 96rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $r-full;
  background: linear-gradient(135deg, rgba(240, 160, 32, 0.16), rgba(240, 160, 32, 0.06));
}

.vip-hero-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.vip-hero-title {
  font-size: 40rpx;
  font-weight: 700;
  color: $ink;
}

.vip-hero-sub {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $ink-mute;
}

.vip-benefit {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.vip-section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $ink;
}

.vip-benefit-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

/* 权益勾选标识：浅绿圆底 */
.vip-benefit-icon {
  flex-shrink: 0;
  width: 44rpx;
  height: 44rpx;
  margin-top: 2rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $r-full;
  background: rgba(24, 160, 88, 0.08);
}

.vip-benefit-text {
  flex: 1;
  font-size: 26rpx;
  line-height: 1.6;
  color: $ink-soft;
}

.vip-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 32rpx calc(20rpx + #{$safe-bottom});
  background: $bg-card;
  border-top: 2rpx solid $line-soft;
}

.vip-footer-hint {
  font-size: 22rpx;
  color: $ink-mute;
}
</style>