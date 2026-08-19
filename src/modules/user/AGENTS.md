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
- 登录方式: **H5 优先微信网页授权 OAuth（测试号/服务号 snsapi_userinfo），非微信环境自动降级扫码**（`login.vue` `handleH5Login`，AppID 取 `VITE_WECHAT_H5_APPID`，回调携带 code 回本页经 `POST /api/auth/wx-login` 换 token）
- **App 采用「分享到微信再授权」**（`handleAppOauthShare`）：生成随机 state → 构造带 `mode=app&state=` 的 H5 授权链接（地址取 `VITE_H5_LOGIN_URL`）复制给用户 → 在微信网页授权完成后，H5 经 `POST /api/auth/oauth/store` 把 token 按 state 回传后端 → App 轮询 `GET /api/auth/oauth/result` 领取并登录；未配置 `VITE_H5_LOGIN_URL` 时降级扫码
- **H5 授权落地页识别 `mode=app`**（`handleOAuthCallback`）：授权成功后回传 token 并提示「返回 App」，不调用 goHome；`startOAuthLogin` 用 redirect_uri 承载 mode、用微信 authorize 的 state 回显本次会话 state
- App 不使用原生 uni.login（需开放平台移动应用 AppID），原生拉微信已废弃
- 小程序：uni.login（MP-WEIXIN `handleWxLogin`）
- 401 错误不强制跳转登录页，仅清除 token
