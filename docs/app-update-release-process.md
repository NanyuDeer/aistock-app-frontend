# App 新版本发布流程（应用内自动更新）

> 目标：发一个新版本时，让**已安装的用户打开 App 后自动弹出更新提示**，点击「立即更新」即可下载安装新 APK。本文档是完整操作手册，按步骤执行即可。

---

## 1. 更新机制原理（先看懂，避免踩坑）

App（仅 **Android** 端）每次启动时，由 [useAppUpdate.ts](file:///d:/aistock/aistock-app-frontend/src/shared/utils/useAppUpdate.ts) 触发检查：

```
启动 → 拉取 https://gupiao.yaozhineng.com/download/version.json
     → 读出 versionCode（线上）
     → 与本机已安装 versionCode 对比（plus.android 读取）
     → 线上 > 本机  → 弹更新框（可「立即更新」/「永久关闭」/叉掉）
     → 否则         → 不提示
```

关键字段（来自 [version.json](file:///d:/aistock/aistock-frontend/public/download/version.json)，Web 前端仓库托管）：

| 字段 | 作用 |
|------|------|
| `versionName` | 展示版本号（如 `0.1.1`），仅展示用 |
| `versionCode` | **核心**，更新对比用的是它，**必须严格递增** |
| `downloadUrl` | 相对 `…/download/` 的 APK 文件名 |
| `description` / `features` | 弹窗里显示的更新文案 |

### ⚠️ 最重要的一条铁律：`versionCode` 必须严格递增

更新判断只看 `versionCode`：
- 线上 `versionCode` **大于** 本机已装的 `versionCode` → 才弹更新。
- 若是 **等于或小于** 已装版本 → **不会弹更新**（App 认为已是最新）。
- `versionName`（如 0.1.1）与 `versionCode` 相互独立，不改 `versionCode` 只改 `versionName` 无法触发更新。

> 本次示例：修复「0.1.1 打不开」的正式版仍叫 `0.1.1`、`versionCode` 仍为 `101`。
> **注意**：若存量用户已装上故障的 `versionCode=101`，线上也是 `101`，则这些用户**不会收到 App 内更新提示**，需直接重新安装 APK。要让这类用户也能自动更新，应把本次 `versionCode` 升到 `102` 及以上。

---

## 2. 发布前准备（改版本号 + 更新文案）

### 2.1 修改 `src/manifest.json`（App 端打包依据）

文件：[src/manifest.json](file:///d:/aistock/aistock-app-frontend/src/manifest.json)

```jsonc
{ 
  "name": "洞见",
  "versionName": "0.1.1",   // 新版本号，展示用
  "versionCode": 101        // 必须大于已发布版本（升级的关键）
}
```

### 2.2 更新文案写法（重点：只写「本次更新了什么」，不写 App 介绍）

文案文件：[aistock-frontend/public/download/version.json](file:///d:/aistock/aistock-frontend/public/download/version.json)

**写法规范**：
- `description`：一句话讲清本次改了什么 / 修了什么（不要写「这是一款 AI 股票 App」这类介绍）。
- `features`：逐条列出本次具体改动，用户看得懂、能感知的功能点即可。

示例：

```json
{
  "appName": "洞见",
  "versionName": "0.1.1",
  "versionCode": 101,
  "downloadUrl": "aistock-0.1.1.apk",
  "fileSize": "22.9 MB",
  "releaseDate": "2026-08-24",
  "minSystem": "Android 5.0 及以上",
  "description": "本版修复 APP 启动白屏、无法进入应用的问题。",
  "features": [
    "修复部分设备 APP 启动白屏/闪退（兼容老旧 Android WebView）",
    "修复 K 线图加载异常导致的页面空白",
    "优化 APP 首屏启动稳定性"
  ]
}
```

> 本次 `versionCode`、`downloadUrl`、`description`、`features` 均需随版本更新保持一致。

---

## 3. 打包 APK（HBuilderX）

1. 打开本项目 `aistock-app-frontend`（确保 HBuilderX 是 **App 开发版**）。
2. 顶部菜单：**发行 → 原生 App-云打包 → Android**，选择证书、填写后点击打包。
3. 打包完成产物位于：`dist/release/apk/__UNI__73E911F__*.apk`。
4. **重命名**为 `aistock-<versionName>.apk`（如 `aistock-0.1.1.apk`），与 `version.json` 中 `downloadUrl` 一致。

---

## 4. 将安装包放到服务器

安装包最终由 Web 前端静态目录下发，下载根地址为：

```
https://gupiao.yaozhineng.com/download/
```

即服务器 `/var/www/aistock/download/` 目录。

**放置**（把本地 `aistock-0.1.1.apk` 上传到该目录）：

```bash
scp dist/release/apk/aistock-0.1.1.apk aistock@121.37.46.229:/var/www/aistock/download/
```

> 上线后 App 更新的下载地址即：`https://gupiao.yaozhineng.com/download/aistock-0.1.1.apk`。

⚠️ **注意**：服务器 Web 重新部署时若执行 `rm -rf /var/www/aistock/*`，会**连带删除 APK**。若重新构建前端，**必须在上传产物后重新 scp APK**，或在部署命令中保留 `download` 目录。

---

## 5. 部署 Web 前端（让 version.json 对新版本生效）

更新文案及下载信息都在 Web 前端静态资源里，需要构建部署一次：

```bash
# 1) 拉代码
ssh aistock@121.37.46.229
cd /home/aistock/aistock-frontend
git pull origin main

# 2) 构建并部署到 Web 根目录
npm run build && rm -rf /var/www/aistock/* && cp -r dist/* /var/www/aistock/

# 3) 重要：部署完重新上传 APK（见第 4 节，避免被清掉）
scp dist/release/apk/aistock-0.1.1.apk aistock@121.37.46.229:/var/www/aistock/download/
```

> 后端（aistock-app-api）仅在本次有后端代码改动时才需要同步部署；**只发 App 新版本、纯文案/APK 变更时无需动后端**。

---

## 6. 发版前自检清单

- [ ] `manifest.json` 的 `versionCode` **大于**线上已发布版本
- [ ] `manifest.json` 与 `version.json` 的 `versionName` / `versionCode` **一致**
- [ ] `version.json` 的 `downloadUrl` 与服务器上 APK **文件名一致**
- [ ] APK 已上传到 `/var/www/aistock/download/` 且大小非 0
- [ ] 文案 `description`/`features` 写的是「本次更新内容」，非 App 介绍
- [ ] Web 前端已重新构建部署，`version.json` 已更新到线上
- [ ] 真机（Android）装旧版后打开，能正常弹更新、能下载成功

---

## 7. 完整发布流程速览（9 步）

```
① 改 src/manifest.json        → versionName / versionCode
② 改 public/download/version.json → 文案 + versionCode + downloadUrl
③ HBuilderX 云打包            → 产出 dist/release/apk/*.apk
④ 重命名 APK                  → aistock-<版本号>.apk
⑤ 提交并推送代码（app + web 两仓库）
    git add … && git commit && git push
⑥ 上传 APK 到服务器            → /var/www/aistock/download/
⑦ 部署 Web 前端                → 见第 5 节（部署后重新上传 APK）
⑧ （可选）部署后端              → 仅当后端有改动
⑨ 自检 + 真机验证              → 见第 6 节
```

---

## 8. 常见问题

| 现象 | 原因 / 处理 |
|------|-------------|
| 用户打开不弹更新 | 线上 `versionCode ≤` 已装版本 → 必须把 `versionCode` 加 1 再发 |
| 在线 `0.1.1` 用户收不到本次 `0.1.1` | 同 `versionCode` 不触发；需把 `versionCode` 升到 `102+` 才能让他们自动更新 |
| 手机不提示下载 | Android 需允许安装未知应用（弹窗内已给引导） |
| iOS / H5 / 小程序 | 该机制仅 Android App 端生效，其他端需另走应用商店更新 |
| 网页 `/download` 打不开 | 服务器 Caddy 需保证 `try_files {path} /index.html`（含 `download` 目录下的 APK 静态资源） |