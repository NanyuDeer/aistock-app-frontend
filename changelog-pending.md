## 2026-10-07 0.1.5 版本升级（待打包发布）

- `src/manifest.json`：`versionName` 0.1.4 → **0.1.5**、`versionCode` 104 → **105**（打包版本号）
- `src/modules/user/pages/profile.vue`：「关于洞见」版本号 0.1.4 → **0.1.5**（App 内部版本说明，需与 manifest 同步）
- `CHANGELOG.md`：新增 0.1.5 版本发布记录（含 App 更新文案 10 条）
- 更新文案已并入 PR #145/#146 合并内容（自选股两周窗口 + 翻页、AI 异动解读推理面板、财报披露行、财务指标气泡等，合并时间早于打包）
- Web 端 `aistock-frontend/public/download/version.json`：同步 0.1.5 / 105 / `aistock-0.1.5.apk` / releaseDate 2026-10-07 / 新更新文案（10 条）
- **打包后待办**：APK 实测 24100840 字节 = 22.98 MB，`fileSize` 无需修正；commit+push 两仓库后按 release 流程部署（上传 APK + web 构建部署 + 线上自检）
