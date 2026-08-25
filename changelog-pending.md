## [待提交] 2026-08-24 — 版本号回退为 0.1.1/101 + 新增《App 新版本发布流程》文档

**开发者**: Aria

### 变更
- `d:\aistock\aistock-app-frontend\src\manifest.json`：`versionName` 0.1.2→0.1.1，`versionCode` 102→101（保持本次正式版为 0.1.1）
- `d:\aistock\aistock-frontend\public\download\version.json`：`versionName` 0.1.2→0.1.1、`versionCode` 102→101、`downloadUrl` 指向 `aistock-0.1.1.apk`，文案保持「本次更新内容」
- `d:\aistock\aistock-app-frontend\CHANGELOG.md`：顶部 0.1.2 记录改为 0.1.1（修复开发版 bug，正式版仍为 0.1.1）

### 新增
- `d:\aistock\aistock-app-frontend\docs\app-update-release-process.md`：完整编写「新版本发布 → 应用内自动更新」流程（更新机制原理、versionCode 必须递增铁律、文案写法、APK 放置位置、Web 部署、自检清单、常见问题）