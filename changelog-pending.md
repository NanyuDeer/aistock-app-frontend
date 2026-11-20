## 2026-11-20 0.1.7 版本升级（待打包发布）

- `src/manifest.json`：`versionName` 0.1.6 → **0.1.7**、`versionCode` 106 → **107**（打包版本号）
- `src/modules/user/pages/profile.vue`：「关于洞见」版本号 0.1.6 → **0.1.7**（App 内部版本说明，需与 manifest 同步）
- `CHANGELOG.md`：新增 0.1.7 版本发布记录（含 App 更新文案 12 条 + 打包基线说明）
- Web 端 `aistock-frontend/public/download/version.json`：同步 0.1.7 / 107 / `aistock-0.1.7.apk` / releaseDate 2026-11-20 / 新更新文案（12 条：事件关注、今日风口榜三档、个股情报筛选、AI帮我选累计涨幅、悬浮卡上滑关闭、异动归因摘要、节奏洞见卡、AI 个性化服务、拼音搜索等）
- 打包基线：0.1.6 发布后共 53 个提交（PR #154–#167）
- **打包后待办**：APK 实测 24211890 字节 = 23.09 MB，version.json `fileSize` 已同步修正为 23.09 MB；部署（上传 APK + web 构建部署 + 线上自检）
