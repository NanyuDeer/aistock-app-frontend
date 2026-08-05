<template>
  <SubPageCard2 :title="'会话'">
    <template #header-right>
      <view class="new-session" @tap="onNewSession">
        <SvgIcon name="add-line" size="36rpx" color="#0b5fff" />
        <text class="new-session-text">新建</text>
      </view>
    </template>

    <!-- 会话列表（P9；P10 线 6 在此列表行增量加用量展示，本计划不渲染用量） -->
    <view class="session-list">
      <view
        v-for="s in chatStore.sessions"
        :key="s.session_id"
        class="session-item"
        :class="{ current: s.session_id === chatStore.sessionId }"
        @tap="onTapSession(s.session_id)"
      >
        <view class="session-main">
          <text class="session-title">{{ s.title }}</text>
          <text class="session-time">{{ formatTime(s.last_message_at) }}</text>
        </view>
        <view v-if="s.session_id === chatStore.sessionId" class="session-badge">当前</view>
        <view class="session-delete" @tap.stop="onDeleteSession(s.session_id)">
          <SvgIcon name="delete-bin-line" size="32rpx" color="#8a96b0" />
        </view>
      </view>

      <!-- 空态 -->
      <view v-if="chatStore.sessions.length === 0" class="session-empty">
        <SvgIcon name="chat-history-line" size="80rpx" color="#b8c3d6" />
        <text class="session-empty-text">暂无会话，点击右上角「新建」开始</text>
      </view>
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { useChatStore } from '@/shared/store/modules/chat'
import { useUserStore } from '@/shared/store/modules/user'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

const chatStore = useChatStore()
const userStore = useUserStore()

// onShow：仅登录时拉 server 列表合并（server 覆盖本地同名 title/last_message_at，保留本地仅有会话）
onShow(() => {
  if (userStore.isLoggedIn()) {
    void chatStore.syncSessionsFromServer()
  }
})

function onNewSession() {
  chatStore.createSession()
  uni.navigateBack({ delta: 1 })
}

function onTapSession(id: string) {
  chatStore.switchSession(id)
  uni.navigateBack({ delta: 1 })
}

function onDeleteSession(id: string) {
  chatStore.deleteSession(id)
  uni.showToast({ title: '已删除', icon: 'none' })
}

/** 相对时间：刚刚 / N分钟前 / N小时前 / N天前 / yyyy-MM-dd */
function formatTime(iso?: string): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const min = 60_000
  const hour = 60 * min
  const day = 24 * hour
  if (diff < min) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / min)}分钟前`
  if (diff < day) return `${Math.floor(diff / hour)}小时前`
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`
  const d = new Date(t)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.new-session {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 16rpx;
  background: rgba(77, 124, 254, 0.08);
  border-radius: $r-full;
}
.new-session-text { font-size: $font-size-sm; color: $primary; }

.session-list {
  padding: $s-3;
  display: flex;
  flex-direction: column;
  gap: $s-2;
}
.session-item {
  display: flex;
  align-items: center;
  gap: $s-2;
  background: $bg-card;
  border-radius: $r-md;
  padding: $s-3 $s-4;
  box-shadow: $shadow-xs;
}
.session-item.current { background: $primary-50; }
.session-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.session-title {
  font-size: $font-size-md;
  color: $ink;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.session-time { font-size: $font-size-xs; color: $ink-mute; }
.session-badge {
  font-size: $font-size-xs;
  color: $primary;
  border: 2rpx solid $primary;
  border-radius: $r-full;
  padding: 2rpx 12rpx;
  flex-shrink: 0;
}
.session-delete { padding: 8rpx; flex-shrink: 0; }

.session-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $s-3;
  padding: $s-16 0;
}
.session-empty-text { font-size: $font-size-sm; color: $ink-mute; }
</style>
