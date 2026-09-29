# User 模块 - 用户

## 功能范围
用户模块管理用户登录、个人资料、推送设置和更新日志。

## 页面
- `pages/login.vue` - 登录页（微信 / 邮箱验证码 / 手机号验证码 / 密码登录·注册；2026-09-26）
- `pages/profile.vue` - 个人中心（菜单顺序：自选股 → 账号与安全 → 对话引导 → 版本更新 → 关于；对话引导重置先弹确认窗、关于弹版本信息窗，2026-08-26）
- `pages/account-security.vue` - 账号与安全（绑定邮箱/微信 + 设置密码，使用 SubPageCard2 白色导航栏容器；2026-09-26 新增设置密码）
- `pages/vip.vue` - 会员中心（SubPageCard2）
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
- `@/shared/components/SubPageCard.vue` / `SubPageCard2.vue` - 子页面容器（profile 用 v1，account-security/vip 用 v2）
- `@/shared/components/SvgIcon.vue` - 图标组件

## 开发注意事项
- 登录方式: 微信扫码（H5）、微信 SDK（小程序）、邮箱验证码、手机号验证码、密码登录（2026-09-26 新增）
- 密码登录/注册（2026-09-26）: 后端 `POST /auth/password/login` 仅**账号维度**节流（同账号 15 分钟内失败达 10 次才 429），429 仅提示「尝试过于频繁，请稍后再试」，**不降级**；注册走 `POST /auth/register`（注册即登录），存量账号（未设密码）也可用此接口**补设密码**，已设密码返回 409 → 引导「去登录」
- 设置密码: 后端仅支持「首次设置密码」（无修改/重置接口）；`/users/me` 返回 `hasPassword`（服务端权威），`userStore.hasPassword` 由 `fetchUserInfo()` 同步；设置入口在 `account-security.vue`（验证码发到已绑定身份，手机号优先）；登录成功且未设密码时会一次性引导
- 401 错误不强制跳转登录页，仅清除 token
