## [master] 2026-08-24 — 应用内版本更新弹窗：叉掉下次仍提示 + 可选永久关闭

**开发者**: Aria

### 改进
- `useAppUpdate.ts`：移除启动自动检查的 24h 节流，改为写入全局响应式状态 `updatePromptState`；新增「永久关闭」版本标记（`app_update_never_v{versionCode}`），命中则该版本不再弹窗；新增 `neverUpdateStorageKey`/`isNeverUpdate`/`downloadAndInstall`。
- 新增 `src/shared/components/UpdateModal.vue`：复用 `Modal` + `Button` 的自定义更新弹窗，三个语义：
  - 「立即更新」→ `downloadAndInstall` 下载安装；
  - 「永久关闭」→ 记录该版本不再提示并关闭；
  - 叉掉 / 点遮罩 → 不记录，下次进入应用仍提示。
- `MainTabs.vue`（首页容器，覆盖启动自动检查）与 `profile.vue`（手动「版本更新」）挂载 `<UpdateModal />`，仅前台页面可见。