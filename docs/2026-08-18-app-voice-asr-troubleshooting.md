# App 端语音输入（ASR）真机排查经验记录

> 目的：沉淀 App 端语音「录音/读文件/识别」反复失败的排查链，防止回退重踩。更新于 2026-08-18。

## 现象
App 云打包真机（权限已允许、换机复现）：「按住说话」与右侧「点击麦克风」均失败，toast 先是「录音失败，请重试」，经诊断透出后定位为：

```
读取录音文件失败：ReferenceError: nativeFileManager is not defined
```

## 失败轮次（按时间）
| # | 尝试 | 结果 | 教训 |
|---|---|---|---|
| 1 | 把 `appRecognize` 的 start/readFile 两处失败「吞掉真实异常」改为透出真实原因（`录音启动失败：<err>` / `读取录音文件失败：<err>`）+ `console.error('[asr] …')` | ✅ 定位到 readFile，非 start | **错误必须先透出再谈定位**，固定文案会掩盖根因 |
| 2 | 以为「缺 FileSystem 模块」→ `manifest.json` `app-plus.modules` 补 `"FileSystem": {}` | ❌ 真机重打包仍报 `nativeFileManager is not defined` | **`uni.getFileSystemManager().readFile` 在 App 引擎下引用 `nativeFileManager` 属框架缺陷，补模块声明治不了** |
| 3 | 换录音格式（历史已试 mp3→wav→amr 三轮） | ❌ 与根因无关 | 录音格式轮换是「症状级猜测」，不解决 readFile |
| 4 | 用 H5 验证（用户建议"若 H5 能用真机大概率也能用"） | ⚠️ Chrome 报 `network`，Edge 可识别 | **H5 走 Web Speech API，与 App 的 `plus 录音 + readFile + 后端火山 ASR` 是两条完全独立的链路**；H5 正常不代表 App 正常 |
| 5 | 改用 `plus.io` 读取，但用了标准 Web `FileReader.readAsArrayBuffer` | ❌ 真机报 `FileReader is not defined` | **App 端无标准 Web `FileReader`**；HTML5+ `plus.io.FileReader` 仅支持 `readAsDataURL`/`readAsText`（不支持 readAsArrayBuffer），须 `readAsDataURL` + 剥 base64 前缀转 ArrayBuffer（抽为 `dataUrlToArrayBuffer` 纯函数，有单测） |

## 关键结论与硬约束
1. **App 端不要用 `uni.getFileSystemManager().readFile` 读录音临时文件**——会触发框架缺陷 `nativeFileManager is not defined`。改用 HTML5+ 原生 `plus.io`（`resolveLocalFileSystemURL` + `entry.file` + `plus.io.FileReader.readAsDataURL`）读取。**注意：App 端没有标准 Web `FileReader`**，且 `plus.io.FileReader` 不支持 `readAsArrayBuffer`，必须用 `readAsDataURL`（返回 base64 DataURL）剥前缀转 ArrayBuffer。
2. **H5 非 App 语音验证手段**：Chrome Web Speech 识别需上传 Google 云端（`SpeechRecognition.error==='network'` = 连不上 Google，国内被墙必然报错）；Edge 走微软服务可识别。H5 只验证前端 UI/入口，**不经过 App 的 readFile**。
3. 保留 `appRecognize` 的两处错误透出 + `console.error('[asr] …')`，真机再出问题能立刻看到具体错误，避免再盲目猜。
4. 录音格式保持 `amr + 8kHz`（与后端火山 ASR `audio.format='amr', rate=8000` 对齐），V2 协议免转码。

## 当前对策（进行中）
- `readFileAsArrayBuffer` 在 App-PLUS 注入 `plus.io` 读取实现，上传链路（`uni.request` raw/amr）不变、后端不改。
- 改造后仍需**重新云打包真机验证**一次；若仍有新报错，凭透出信息再迭代。

## 排查口径（防重蹈）
- 先拿真实错误 → 再下结论；禁止在未透出错误时猜方案。
- 换格式/加 modules 这类「试一下」若未基于真实错误，一律视为症状修复。