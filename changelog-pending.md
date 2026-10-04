# changelog-pending — AI Stock app 前端（aistock-app-frontend）

## 2026-10-03 0.1.4 版本升级（待打包发布）

- `src/manifest.json`：`versionName` 0.1.3 → **0.1.4**、`versionCode` 103 → **104**（打包版本号）
- `CHANGELOG.md`：新增 0.1.4 版本发布记录（含 App 更新文案）
- Web 端 `aistock-frontend/public/download/version.json`：同步 0.1.4 / 104 / `aistock-0.1.4.apk` / releaseDate 2026-10-03 / 新更新文案（8 条 features：事件时间线、洞察报告流式化、密码登录、首页洞见横条、详情分块加载、节奏大师改版、恐贪页优化、原因链三段）
- **打包后待办**：按实测 APK 大小修正 version.json 的 `fileSize`，commit+push 两仓库后按 release 流程部署

## 2026-09-27 登录页改造（H5 / App 默认密码登录 + 其他方式登录整块切换）

- `src/modules/user/pages/login.vue`：登录页交互改造
  - 默认视图改为密码登录：新增 `showPasswordForm = ref(!isMp)`、`showOtherMethods = ref(isMp)`，H5 / App 进入即密码登录，小程序保持微信一键登录优先
  - 密码框右下方新增 `.form-assist` 右对齐链接「还没有账号？去注册」/「已有账号？去登录」，切换 `passwordMode`（替换原 `.form-switch` 与 `.form-back`）
  - 页面最下方新增 `.other-login-entry`「其他方式登录」入口（`margin-top: auto` 推到登录区底部，仅在密码登录视图展示），点击 `openOtherMethods` 整块切换出微信 / 邮箱验证码 / 手机号验证码方式列表
  - 方式列表新增「返回密码登录」（`closeOtherMethods`，`#ifndef MP-WEIXIN`）；「密码登录 / 注册」按钮收敛到 `#ifdef MP-WEIXIN`
  - 邮箱 / 手机号表单返回文案由「返回微信登录」改为「返回其他方式登录」
  - 顶部 `.login-top` 上移（padding-top 120rpx → 48rpx、padding-bottom 80rpx → 40rpx），密码登录 / 注册态下方更宽裕
  - 删除死代码：`closePasswordForm` 函数与 `.form-switch` 样式
- `src/modules/user/AGENTS.md`：同步 `pages/login.vue` 描述为新交互（2026-09-27）

## 2026-09-27 洞见横条改版（方案 B：模块 Tab + 图文摘要列表）

- `src/modules/home/components/TimeSlotInsightBar.vue`：洞见横条改版
  - 移除「洞见」标题与盘前/盘中/盘后交互 Tab；时段改为后台自动，右上角徽标仅展示
  - Tab 改为模块切换：风口 / 消息 / 市场 / 节奏
  - 风口：序号 + 板块名 + 涨跌标签 + 一句话预判副行；消息：时间 chip + 两行标题；市场：日期 chip + 两行结论；节奏：日期 chip + 档位 + 档位短码色标
  - 日期/时间 chip 改静尘蓝（与四网格日期 Tag 一致）；节奏行右对齐档位色标（复用 rhythmColors 色板/短码）
  - 卡片改白底，与下方风口洞见/消息洞见卡片视觉一致
  - 空态按模块显示提示文案；行点击 navigate 分发到既有跳转
- `src/modules/home/components/MorningContent.vue`：风口预览取数补充一句话预判（ai_analysis 的 short_reason → long_reason → persistence_reason）；首页卡片顺序调整为：功能 2x2 网格 → 重磅事件跟踪 → 洞见横条；`.feature-card.as-card` 加 `min-width: 0`，防止超长内容（市场洞见溯源结论）把网格横向撑宽；四网格卡片顺序调整为：市场洞见 / 消息洞见 / 风口洞见 / 节奏洞见
- `src/modules/home/components/TimeSlotInsightBar.mount.spec.ts`：按新交互重写 7 个用例（模块 Tab 渲染/切换/跳转/空态/预判副行）
