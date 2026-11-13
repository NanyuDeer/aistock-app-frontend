# User 模块 - 用户

## 功能范围
用户模块管理用户登录、个人资料、推送设置和更新日志。

## 页面
- `pages/login.vue` - 登录页（H5 / App 默认进入即密码登录，密码框右下方「去注册/去登录」切换，页面最下方「其他方式登录」点击后整块切换出微信 / 邮箱验证码 / 手机号验证码并可返回密码登录；小程序保持微信一键登录优先；2026-09-27）
- `pages/profile.vue` - 个人中心（菜单顺序：自选股 → 事件关注 → 账号与安全 → 对话引导 → 版本更新 → 关于；对话引导重置先弹确认窗、关于弹版本信息窗，2026-08-26；「事件关注」跳 `modules/chat/pages/event/followed`，数据为 chat 模块本地快照）
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

## 设置页「AI 个性化服务」区（画像自动挖掘一期，2026-11-05）

`pages/profile.vue` 单个 section 内按顺序四块，**改动时保持这个顺序与语义分工**：

| 块 | 职责 | 数据来源 |
|---|---|---|
| 说明文案 | 隐私告知：采集范围（自选股/提问/洞察事件）、用途（个性化回答）、可随时关闭 | 静态 |
| opt-in 开关 | `profileMiningEnabled`，默认**关**（`user_settings` 无 `profile_mining` 行 = 关闭） | `authApi.updateSettings('profile_mining', { enabled })`，乐观更新 + 失败回滚 |
| 推断计数 + 清除 | 「AI 已了解你的 N 个特征」+「清除 AI 推断结果」（`uni.showModal` 二次确认，取消不调接口） | `getInferenceMeta()` / `clearInferences()` |
| 投资偏好 + 风险偏好 | 显式画像编辑（激活 Phase 4-3 空转链路）：标签输入 ≤10 项/每项 ≤20 字；风险三档 `conservative\|balanced\|aggressive` | `updateUserProfile()` |

硬约束：

- **只展示计数，绝不渲染推断内容**（spec §1.2 边界）；dimensions 名称也不上屏
- 关闭开关 ≠ 删除：文案必须点明「关闭只停止分析，不会自动删除已生成结果」
- 风险偏好枚举单一真源在 `@/shared/api/modules/profile`（`RISK_TOLERANCE_VALUES` / `isRiskTolerance`），页面**不要**自定义值域
- 该区 `v-if="isLoggedIn"`；登出时重置开关与计数（防换账号短暂显示上一账号计数）
- 新增 vitest spec 必须注册进 `vitest.config.ts` 的 `include` 白名单，否则静默跳过

