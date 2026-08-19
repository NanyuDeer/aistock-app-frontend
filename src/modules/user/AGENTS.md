# User 模块 - 用户

## 功能范围
用户模块管理用户登录、个人资料、推送设置和更新日志。

## 页面
- `pages/login.vue` - 登录页
- `pages/profile.vue` - 个人中心
- `pages/update-logs.vue` - 更新日志

## 组件
（暂无模块专属组件）

## Hooks
（暂无模块专属 hooks，使用 shared/utils 中的 useAuth 等）

## 对外暴露的接口
- 其他模块通过 navigateTo 跳转到登录页

## 依赖的 shared/ 中的类型
- `@/shared/store/modules/user` - 用户状态管理
- `@/shared/api/modules/auth` - 认证 API 及 UserInfo/UserSettings 类型
- `@/shared/components/SubPageCard.vue` - 子页面容器
- `@/shared/components/SvgIcon.vue` - 图标组件

## 开发注意事项
- 登录方式: 微信扫码（H5）、微信 SDK（小程序）
- 401 错误不强制跳转登录页，仅清除 token
