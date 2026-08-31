# changelog-pending.md（待提交修改记录）

# 2026-08-31 登录页恢复「手机号验证码登录」入口（阿里云短信认证）
- `src/modules/user/pages/login.vue`：登录方式增加「手机号验证码登录」入口按钮（`phone-line` 图标）；新增手机号表单（phone + smsCode，`handleSendSms`/`handlePhoneLogin`，手机号格式校验 `^1[3-9]\d{9}$`，60s 倒计时），与邮箱表单共享 `smsCode`/`countdown`；初始登录方式面板新增 `!showSmsForm` 条件。
- `src/shared/store/modules/user.ts`：新增 `smsLogin(phone, code)`（复用 `authApi.smsLogin`，存 token/userInfo 后 `fetchUserInfo`），并导出。
- 仅 App 端（aistock-app-frontend）；Web 端登录方式不变。`vue-tsc --noEmit` 通过。
