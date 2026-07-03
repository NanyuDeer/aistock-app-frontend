# Home 模块 - 首页

## 功能范围
首页模块是用户进入应用后的第一个页面，展示今日专属晨报/晚报入口、长线风口预览、异动捕手预览和重磅事件跟踪。

## 页面
- `pages/index.vue` - 首页主页面

## 组件
- `components/DualHostPlayer.vue` - 双人对话播报播放器
- `components/MorningCard.vue` - 晨报卡片

## Hooks
（暂无模块专属 hooks）

## 对外暴露的接口
- 无直接对外暴露的接口，首页为入口页面

## 依赖的 shared/ 中的类型
- `@/shared/components/PageCard.vue` - 页面布局容器
- `@/shared/components/AppBottomBar.vue` - 底部导航栏
- `@/shared/components/SvgIcon.vue` - 图标组件

## 开发注意事项
- 首页数据目前使用 mock，后续需接入 API
- 导航跳转路径已更新为模块化路径
