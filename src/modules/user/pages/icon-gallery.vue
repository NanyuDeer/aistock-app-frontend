<template>
  <view class="icon-gallery">
    <!-- 顶部栏 -->
    <view class="header">
      <view class="header-left">
        <text class="logo-text">🎨</text>
        <view class="header-titles">
          <text class="header-title">图标素材库</text>
          <text class="header-subtitle">icons-lxy · 林晓妍</text>
        </view>
      </view>
      <view class="header-right">
        <view class="stat-badge">
          <text class="stat-num">{{ filteredIcons.length }}</text>
          <text class="stat-label">个图标</text>
        </view>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input
          class="search-input"
          placeholder="搜索图标名称..."
          v-model="searchText"
          placeholder-class="search-placeholder"
        />
        <view v-if="searchText" class="search-clear" @tap="clearSearch">
          <text class="clear-icon">✕</text>
        </view>
      </view>
    </view>

    <!-- 分类标签 -->
    <scroll-view class="category-tabs" scroll-x="true" :show-scrollbar="false">
      <view class="tabs-inner">
        <view
          v-for="(label, key) in categoryLabels"
          :key="key"
          class="tab-item"
          :class="{ active: activeCategory === key }"
          @tap="activeCategory = key"
        >
          <text class="tab-text">{{ label }}</text>
          <text class="tab-count">{{ getCategoryCount(key) }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 工具栏 -->
    <view class="toolbar">
      <view class="tool-group">
        <text class="tool-label">图标大小</text>
        <view class="size-options">
          <view
            v-for="size in sizeOptions"
            :key="size"
            class="size-btn"
            :class="{ active: iconSize === size }"
            @tap="iconSize = size"
          >
            <text class="size-text">{{ size }}rpx</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 颜色选择 -->
    <view class="color-bar">
      <text class="color-bar-label">主题色</text>
      <view class="color-options">
        <view
          v-for="color in colorPresets"
          :key="color.value"
          class="color-dot"
          :class="{ active: activeColor === color.value }"
          :style="{ backgroundColor: color.value }"
          @tap="activeColor = color.value"
          :title="color.name"
        >
          <text v-if="activeColor === color.value" class="color-check">✓</text>
        </view>
      </view>
    </view>

    <!-- 视图切换 -->
    <view class="view-toggle">
      <view
        class="toggle-btn"
        :class="{ active: viewMode === 'grid' }"
        @tap="viewMode = 'grid'"
      >
        <text class="toggle-icon">▦</text>
        <text class="toggle-text">网格</text>
      </view>
      <view
        class="toggle-btn"
        :class="{ active: viewMode === 'list' }"
        @tap="viewMode = 'list'"
      >
        <text class="toggle-icon">☰</text>
        <text class="toggle-text">列表</text>
      </view>
    </view>

    <!-- 图标展示区 - 网格模式 -->
    <scroll-view v-if="viewMode === 'grid'" class="icon-grid" scroll-y="true">
      <view v-if="filteredIcons.length === 0" class="empty-state">
        <text class="empty-icon">📭</text>
        <text class="empty-text">没有找到匹配的图标</text>
        <text class="empty-hint">试试其他关键词吧</text>
      </view>
      
      <view v-else class="grid-inner">
        <view
          v-for="(icon, index) in filteredIcons"
          :key="index"
          class="grid-item"
          @tap="copyIconName(icon.name)"
        >
          <view class="grid-icon-wrap" :style="{ backgroundColor: cardBg }">
            <SvgIcon
              :name="`icons-lxy/${icon.name}`"
              :size="iconSize + 'rpx'"
              :color="activeColor"
            />
          </view>
          <text class="grid-name">{{ icon.label }}</text>
          <text class="grid-subname">{{ icon.name }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 图标展示区 - 列表模式 -->
    <scroll-view v-else class="icon-list" scroll-y="true">
      <view v-if="filteredIcons.length === 0" class="empty-state">
        <text class="empty-icon">📭</text>
        <text class="empty-text">没有找到匹配的图标</text>
        <text class="empty-hint">试试其他关键词吧</text>
      </view>
      
      <view v-else class="list-inner">
        <view
          v-for="(icon, index) in filteredIcons"
          :key="index"
          class="list-item"
          @tap="copyIconName(icon.name)"
        >
          <view class="list-icon-wrap" :style="{ backgroundColor: cardBg }">
            <SvgIcon
              :name="`icons-lxy/${icon.name}`"
              :size="iconSize + 'rpx'"
              :color="activeColor"
            />
          </view>
          <view class="list-info">
            <text class="list-name">{{ icon.label }}</text>
            <text class="list-subname">{{ icon.name }}</text>
          </view>
          <view class="list-category" :class="'cat-' + icon.category">
            <text class="cat-text">{{ categoryLabels[icon.category] }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部提示 -->
    <view class="footer-tip">
      <text class="tip-text">💡 点击图标可复制名称</text>
    </view>

    <!-- 复制成功提示 -->
    <view v-if="showToast" class="toast">
      <text class="toast-text">✅ 已复制: {{ copiedName }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import {
  iconsLxyList,
  categoryLabels,
  colorPresets,
  type IconItem,
} from '@/static/assets/icons/icons-lxy/icon-manifest.js'

const searchText = ref('')
const activeCategory = ref('all')
const iconSize = ref(48)
const activeColor = ref('#4d7cfe')
const viewMode = ref<'grid' | 'list'>('grid')
const showToast = ref(false)
const copiedName = ref('')

const sizeOptions = [32, 48, 64, 80, 96]

const cardBg = computed(() => {
  return activeColor.value === '#ffffff' ? '#374151' : '#f9fafb'
})

const filteredIcons = computed<IconItem[]>(() => {
  let result = iconsLxyList

  if (activeCategory.value !== 'all') {
    result = result.filter((icon) => icon.category === activeCategory.value)
  }

  if (searchText.value.trim()) {
    const keyword = searchText.value.toLowerCase().trim()
    result = result.filter(
      (icon) =>
        icon.name.toLowerCase().includes(keyword) ||
        icon.label.toLowerCase().includes(keyword)
    )
  }

  return result
})

function getCategoryCount(key: string): number {
  if (key === 'all') return iconsLxyList.length
  return iconsLxyList.filter((icon) => icon.category === key).length
}

function clearSearch() {
  searchText.value = ''
}

function copyIconName(name: string) {
  copiedName.value = name
  showToast.value = true
  
  // #ifdef H5
  if (navigator.clipboard) {
    navigator.clipboard.writeText(name).catch(() => {})
  }
  // #endif
  
  setTimeout(() => {
    showToast.value = false
  }, 1500)
}
</script>

<style scoped lang="scss">
.icon-gallery {
  min-height: 100vh;
  background-color: #f5f7fb;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 60rpx 32rpx 32rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;

  .header-left {
    display: flex;
    align-items: center;
    gap: 20rpx;
  }

  .logo-text {
    font-size: 56rpx;
  }

  .header-titles {
    display: flex;
    flex-direction: column;
  }

  .header-title {
    font-size: 40rpx;
    font-weight: bold;
    color: #fff;
    display: block;
  }

  .header-subtitle {
    font-size: 26rpx;
    color: rgba(255, 255, 255, 0.7);
    margin-top: 4rpx;
    display: block;
  }

  .stat-badge {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 32rpx;
    padding: 12rpx 24rpx;
    display: flex;
    align-items: baseline;
    gap: 8rpx;
  }

  .stat-num {
    font-size: 36rpx;
    font-weight: bold;
    color: #fff;
  }

  .stat-label {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.8);
  }
}

.search-bar {
  padding: 0 32rpx;
  margin-top: -24rpx;

  .search-input-wrap {
    display: flex;
    align-items: center;
    background: #fff;
    border-radius: 16rpx;
    padding: 0 24rpx;
    height: 88rpx;
    box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
  }

  .search-icon {
    font-size: 32rpx;
    margin-right: 16rpx;
    opacity: 0.5;
  }

  .search-input {
    flex: 1;
    height: 100%;
    font-size: 30rpx;
    color: #374151;
  }

  .search-placeholder {
    color: #9ca3af;
  }

  .search-clear {
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e5e7eb;
    border-radius: 50%;
  }

  .clear-icon {
    font-size: 24rpx;
    color: #6b7280;
  }
}

.category-tabs {
  white-space: nowrap;
  padding: 24rpx 0 16rpx;

  .tabs-inner {
    display: inline-flex;
    padding: 0 24rpx;
    gap: 16rpx;
  }

  .tab-item {
    display: inline-flex;
    align-items: center;
    gap: 10rpx;
    padding: 14rpx 28rpx;
    background: #fff;
    border-radius: 40rpx;
    border: 2rpx solid transparent;
    transition: all 0.2s;

    &.active {
      background: #4d7cfe;
      border-color: #4d7cfe;

      .tab-text,
      .tab-count {
        color: #fff;
      }

      .tab-count {
        background: rgba(255, 255, 255, 0.25);
      }
    }
  }

  .tab-text {
    font-size: 28rpx;
    color: #374151;
    font-weight: 500;
  }

  .tab-count {
    font-size: 22rpx;
    color: #9ca3af;
    background: #f3f4f6;
    padding: 2rpx 12rpx;
    border-radius: 20rpx;
    min-width: 36rpx;
    text-align: center;
  }
}

.toolbar {
  padding: 0 32rpx 16rpx;

  .tool-group {
    display: flex;
    align-items: center;
    gap: 20rpx;
  }

  .tool-label {
    font-size: 28rpx;
    color: #6b7280;
    flex-shrink: 0;
  }

  .size-options {
    display: flex;
    gap: 12rpx;
    flex: 1;
  }

  .size-btn {
    flex: 1;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    border-radius: 12rpx;
    border: 2rpx solid #e5e7eb;

    &.active {
      border-color: #4d7cfe;
      background: #eff6ff;

      .size-text {
        color: #4d7cfe;
        font-weight: 600;
      }
    }
  }

  .size-text {
    font-size: 24rpx;
    color: #6b7280;
  }
}

.color-bar {
  padding: 0 32rpx 16rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;

  .color-bar-label {
    font-size: 28rpx;
    color: #6b7280;
    flex-shrink: 0;
  }

  .color-options {
    display: flex;
    gap: 20rpx;
    flex: 1;
  }

  .color-dot {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    border: 4rpx solid #fff;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s;

    &.active {
      transform: scale(1.15);
      box-shadow: 0 0 0 4rpx #4d7cfe;
    }
  }

  .color-check {
    font-size: 28rpx;
    color: #fff;
    font-weight: bold;
  }
}

.view-toggle {
  padding: 0 32rpx 20rpx;
  display: flex;
  justify-content: flex-end;

  .toggle-btn {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 10rpx 20rpx;
    background: #fff;
    border-radius: 8rpx;
    border: 2rpx solid #e5e7eb;

    &.active {
      background: #eff6ff;
      border-color: #4d7cfe;

      .toggle-icon,
      .toggle-text {
        color: #4d7cfe;
      }
    }

    &:first-child {
      border-radius: 8rpx 0 0 8rpx;
      border-right: none;
    }

    &:last-child {
      border-radius: 0 8rpx 8rpx 0;
    }
  }

  .toggle-icon {
    font-size: 28rpx;
    color: #9ca3af;
  }

  .toggle-text {
    font-size: 26rpx;
    color: #6b7280;
  }
}

.icon-grid {
  flex: 1;
  padding: 0 24rpx 120rpx;

  .grid-inner {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
  }

  .grid-item {
    width: calc((100% - 48rpx) / 4);
    background: #fff;
    border-radius: 16rpx;
    padding: 24rpx 12rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: all 0.15s;

    &:active {
      transform: scale(0.95);
    }
  }

  .grid-icon-wrap {
    width: 120rpx;
    height: 120rpx;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16rpx;
  }

  .grid-name {
    font-size: 26rpx;
    color: #374151;
    font-weight: 500;
    text-align: center;
  }

  .grid-subname {
    font-size: 20rpx;
    color: #9ca3af;
    margin-top: 4rpx;
    text-align: center;
  }
}

.icon-list {
  flex: 1;
  padding: 0 24rpx 120rpx;

  .list-inner {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
  }

  .list-item {
    display: flex;
    align-items: center;
    background: #fff;
    border-radius: 16rpx;
    padding: 24rpx;
    gap: 20rpx;
    transition: all 0.15s;

    &:active {
      transform: scale(0.98);
    }
  }

  .list-icon-wrap {
    width: 96rpx;
    height: 96rpx;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .list-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
  }

  .list-name {
    font-size: 30rpx;
    color: #374151;
    font-weight: 500;
  }

  .list-subname {
    font-size: 24rpx;
    color: #9ca3af;
  }

  .list-category {
    flex-shrink: 0;
    padding: 8rpx 16rpx;
    border-radius: 8rpx;

    &.cat-quote {
      background: #fef2f2;
      .cat-text { color: #dc2626; }
    }
    &.cat-action {
      background: #eff6ff;
      .cat-text { color: #2563eb; }
    }
    &.cat-alert {
      background: #fffbeb;
      .cat-text { color: #d97706; }
    }
    &.cat-nav {
      background: #f0fdf4;
      .cat-text { color: #16a34a; }
    }
    &.cat-analysis {
      background: #faf5ff;
      .cat-text { color: #9333ea; }
    }
  }

  .cat-text {
    font-size: 22rpx;
    font-weight: 500;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;

  .empty-icon {
    font-size: 80rpx;
    margin-bottom: 24rpx;
  }

  .empty-text {
    font-size: 32rpx;
    color: #374151;
    font-weight: 500;
    margin-bottom: 12rpx;
  }

  .empty-hint {
    font-size: 26rpx;
    color: #9ca3af;
  }
}

.footer-tip {
  position: fixed;
  bottom: 40rpx;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  padding: 16rpx 32rpx;
  border-radius: 40rpx;

  .tip-text {
    font-size: 26rpx;
    color: #fff;
  }
}

.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  padding: 24rpx 40rpx;
  border-radius: 16rpx;
  z-index: 999;

  .toast-text {
    font-size: 28rpx;
    color: #fff;
  }
}
</style>