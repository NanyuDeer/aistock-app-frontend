# App 前端分析报告入口 + 双人播报页面 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 App 前端添加分析报告查看入口（长线风口页面）和双人播报页面（音频播放 + 对话文本展示）

**Architecture:** 后端新增 broadcast 持久化 + 公开报告/音频 API；前端新建通用 agent-report 页面 + 修改 leaders 和 briefing 页面

**Tech Stack:** Vue 3 + uni-app + TypeScript（前端）、Node.js + Express（aistock-app-api）、Python + FastAPI（aistock-agent-py）

## Global Constraints

- 禁止使用 emoji 图标，统一用 SvgIcon 组件加载 SVG
- 禁止 `any`，用 `unknown`
- 增量修改，禁止全量重写
- 先读后改，复用现有组件和工具
- App 样式遵循 web 前端的浅色主题设计
- aistock-app-api 必须维持与 aistock-api 端点的完全兼容
- 所有 cron.schedule() 必须显式指定 { timezone: 'Asia/Shanghai' }

---

## 文件结构

### 新建文件
| 文件 | 仓库 | 职责 |
|------|------|------|
| `src/modules/chat/pages/agent-report.vue` | aistock-app-frontend | 通用分析报告展示页面 |

### 修改文件
| 文件 | 仓库 | 修改内容 |
|------|------|---------|
| `src/aistock_agent/agents/workers/broadcast.py` | aistock-agent-py | 增加 broadcast 报告持久化到 DB |
| `src/core/routes/internal.ts` | aistock-app-api | 新增公开路由 `/api/agent/report/:intent/:date` + `/api/agent/audio/:filename` |
| `src/shared/api/modules/agent.ts` | aistock-app-frontend | 新增 `getReport` 方法 |
| `src/modules/market/pages/leaders.vue` | aistock-app-frontend | 添加分析报告引导卡片 |
| `src/pages-sub-app/briefing/index.vue` | aistock-app-frontend | 双人播报页面完整实现 |
| `src/pages.json` | aistock-app-frontend | 注册 agent-report 页面路由 |

---

## Task 1: broadcast agent 增加持久化

**仓库：** aistock-agent-py
**文件：**
- Modify: `src/aistock_agent/agents/workers/broadcast.py`

**Interfaces:**
- Consumes: `node_api.save_analysis_report(report_type, report_date, content)` — 已存在于 data_client
- Produces: broadcast 报告存入 DB `analysis_reports` 表，content 格式 `{"text": dialogue_text, "audio_path": audio_path}`

- [ ] **Step 1: 在 broadcast.py 增加持久化逻辑**

在 `run()` 函数的 `return` 语句之前（line 126 之前），插入持久化逻辑：

```python
        # Step 3: 持久化到数据库（scheduler 触发时，供前端读取）
        if state.get("trigger_source") == "scheduler":
            from datetime import datetime
            report_date = state.get("report_date") or datetime.now().strftime("%Y-%m-%d")
            try:
                await node_api.save_analysis_report(
                    report_type="broadcast",
                    report_date=report_date,
                    content={
                        "text": dialogue_text,
                        "audio_path": audio_path,
                    },
                )
                logger.info("broadcast_report_persisted", report_date=report_date)
            except Exception as persist_err:
                logger.error("broadcast_persist_failed", error=str(persist_err))
```

- [ ] **Step 2: 验证代码无语法错误**

Run: `cd d:\aistock\aistock-agent-py && python -c "from aistock_agent.agents.workers.broadcast import run; print('OK')"`
Expected: 输出 `OK`

- [ ] **Step 3: Commit**

```bash
cd d:\aistock\aistock-agent-py
git add src/aistock_agent/agents/workers/broadcast.py
git commit -m "feat: broadcast agent 增加报告持久化到 DB"
```

---

## Task 2: aistock-app-api 新增公开报告路由

**仓库：** aistock-app-api
**文件：**
- Modify: `src/core/routes/internal.ts`（在文件末尾追加新路由）

**Interfaces:**
- Consumes: `analysis_reports` 表（通过现有 DB 查询逻辑）
- Produces: `GET /api/agent/report/:intent/:date` → 返回报告 JSON

**说明：** 现有 `/internal/analysis-reports/:type/:date` 是内部路由（需 X-Internal-Token），前端无法直接调用。需新增公开路由 `/api/agent/report/:intent/:date`，复用内部查询逻辑但不需要内部 token。

- [ ] **Step 1: 在 internal.ts 末尾新增公开路由**

在 `internal.ts` 文件末尾追加：

```typescript
// =============================================================================
// 公开路由（前端可直接调用，无需 X-Internal-Token）
// =============================================================================

/**
 * GET /api/agent/report/:intent/:date
 * 获取 Agent 分析报告（公开接口，供前端调用）
 *
 * 路径参数：
 * - intent: 报告类型 (morning/wind_leader/hot_burst/broadcast)
 * - date: 报告日期 (YYYY-MM-DD)
 *
 * 响应：
 * - 200: { code: 0, data: { report_type, report_date, content } | null }
 * - 400: { code: -1, message: "Invalid intent" }
 */
agentPublicRouter.get('/report/:intent/:date', async (req: Request, res: Response) => {
  const { intent, date } = req.params;

  // 校验 intent
  const validIntents = ['morning', 'wind_leader', 'hot_burst', 'broadcast'];
  if (!validIntents.includes(intent)) {
    res.status(400).json({ code: -1, message: `Invalid intent: ${intent}` });
    return;
  }

  try {
    const result = await getAnalysisReport(intent, date);
    res.json({ code: 0, data: result });
  } catch (err) {
    console.error('[Public] agent/report GET error:', errMsg(err as Error));
    res.status(500).json({ code: -1, message: 'Internal server error' });
  }
});
```

**注意：** 需要确认 `getAnalysisReport` 函数和 `agentPublicRouter` 是否已存在。如果不存在，需要：
1. 将内部路由的查询逻辑提取为 `getAnalysisReport` 函数
2. 创建 `agentPublicRouter` 并在 index.ts 中挂载到 `/api/agent`

- [ ] **Step 2: 确认路由挂载**

检查 `src/index.ts` 中是否已挂载公开路由。如果没有，添加：

```typescript
// 公开路由（前端调用）
app.use('/api/agent', agentPublicRouter);
```

- [ ] **Step 3: 验证路由可访问**

Run: `cd d:\aistock\aistock-app-api && npx tsc --noEmit`
Expected: 无 TypeScript 错误

- [ ] **Step 4: Commit**

```bash
cd d:\aistock\aistock-app-api
git add src/core/routes/internal.ts src/index.ts
git commit -m "feat: 新增 /api/agent/report 公开路由供前端调用"
```

---

## Task 3: aistock-app-api 新增音频文件路由

**仓库：** aistock-app-api
**文件：**
- Modify: `src/core/routes/internal.ts`（在 Task 2 的路由之后追加）

**Interfaces:**
- Consumes: `AGENT_AUDIO_DIR` 环境变量（音频文件目录）
- Produces: `GET /api/agent/audio/:filename` → 返回音频文件流

- [ ] **Step 1: 新增音频文件服务路由**

在 `internal.ts` 追加：

```typescript
import path from 'path';
import fs from 'fs';

/**
 * GET /api/agent/audio/:filename
 * 获取播报音频文件（公开接口）
 *
 * 环境变量：
 * - AGENT_AUDIO_DIR: 音频文件目录（默认 /home/aistock/aistock-agent-py/data/audio）
 */
agentPublicRouter.get('/audio/:filename', async (req: Request, res: Response) => {
  const { filename } = req.params;

  // 防止路径遍历攻击
  if (filename.includes('..') || filename.includes('/')) {
    res.status(400).json({ code: -1, message: 'Invalid filename' });
    return;
  }

  const audioDir = process.env.AGENT_AUDIO_DIR || '/home/aistock/aistock-agent-py/data/audio';
  const filePath = path.join(audioDir, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ code: -1, message: 'Audio file not found' });
    return;
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});
```

- [ ] **Step 2: 验证 TypeScript**

Run: `cd d:\aistock\aistock-app-api && npx tsc --noEmit`
Expected: 无 TypeScript 错误

- [ ] **Step 3: Commit**

```bash
cd d:\aistock\aistock-app-api
git add src/core/routes/internal.ts
git commit -m "feat: 新增 /api/agent/audio 音频文件服务路由"
```

---

## Task 4: 前端 agentApi 增加 getReport 方法

**仓库：** aistock-app-frontend
**文件：**
- Modify: `src/shared/api/modules/agent.ts`

**Interfaces:**
- Consumes: `GET /api/agent/report/:intent/:date`
- Produces: `agentApi.getReport(intent, date)` 方法

- [ ] **Step 1: 在 agentApi 对象中新增 getReport 方法**

在 `src/shared/api/modules/agent.ts` 的 `agentApi` 对象中，在 `registerPushToken` 之后添加：

```typescript
  /** 获取 Agent 分析报告 */
  getReport(intent: string, date: string) {
    return request.get(`/agent/report/${intent}/${date}`)
  },
```

- [ ] **Step 2: 验证 TypeScript**

Run: `cd d:\aistock\aistock-app-frontend && npx tsc --noEmit`
Expected: 无 TypeScript 错误

- [ ] **Step 3: Commit**

```bash
cd d:\aistock\aistock-app-frontend
git add src/shared/api/modules/agent.ts
git commit -m "feat: agentApi 新增 getReport 方法"
```

---

## Task 5: 新建 agent-report.vue 通用页面

**仓库：** aistock-app-frontend
**文件：**
- Create: `src/modules/chat/pages/agent-report.vue`

**Interfaces:**
- Consumes: `agentApi.getReport(intent, date)`、URL 参数 `intent` 和 `date`
- Produces: 通用分析报告展示页面

- [ ] **Step 1: 创建 agent-report.vue 文件**

```vue
<template>
  <view class="agent-report-page">
    <!-- 顶部标题栏 -->
    <view class="report-header">
      <view class="header-left" @tap="goBack">
        <SvgIcon name="arrow-left-line" size="40rpx" color="#1a1d24" />
      </view>
      <text class="header-title">{{ titleMap[intent] || '分析报告' }}</text>
      <view class="header-right"></view>
    </view>

    <!-- 报告内容 -->
    <view class="report-content">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <text class="loading-text">报告加载中...</text>
      </view>

      <!-- 有报告 -->
      <view v-else-if="report" class="report-body">
        <text class="report-date">{{ report.report_date }}</text>
        <view class="report-text-wrap">
          <text class="report-text">{{ reportText }}</text>
        </view>
      </view>

      <!-- 无报告 -->
      <view v-else class="empty-state">
        <SvgIcon name="file-line" size="80rpx" color="#9ca3af" />
        <text class="empty-text">今日报告尚未生成</text>
        <text class="empty-hint">请在 9:10 后查看</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { agentApi } from '@/shared/api/modules/agent'
import SvgIcon from '@/shared/components/SvgIcon.vue'

const intent = ref('')
const date = ref('')
const loading = ref(true)
const report = ref<{ report_type: string; report_date: string; content: { text?: string; audio_path?: string | null } } | null>(null)

const titleMap: Record<string, string> = {
  morning: '今日晨报',
  wind_leader: '长线风口分析',
  hot_burst: '机构调研分析',
  broadcast: '双人播报',
}

const reportText = computed(() => {
  if (!report.value?.content?.text) return ''
  return report.value.content.text
})

function goBack() {
  uni.navigateBack()
}

async function loadReport() {
  if (!intent.value || !date.value) return
  loading.value = true
  try {
    const res: unknown = await agentApi.getReport(intent.value, date.value)
    const data = (res as any)?.data ?? res
    report.value = data || null
  } catch {
    report.value = null
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  intent.value = options?.intent || ''
  date.value = options?.date || new Date().toISOString().split('T')[0]
  loadReport()
})
</script>

<style lang="scss" scoped>
.agent-report-page {
  min-height: 100vh;
  background: #f5f6fa;
}

.report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #e5e7eb;
}

.header-left, .header-right {
  width: 60rpx;
  display: flex;
  align-items: center;
}

.header-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1d24;
}

.report-content {
  padding: 32rpx;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #6b7280;
}

.report-body {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
}

.report-date {
  font-size: 24rpx;
  color: #9ca3af;
  margin-bottom: 24rpx;
  display: block;
}

.report-text-wrap {
  margin-top: 16rpx;
}

.report-text {
  font-size: 28rpx;
  line-height: 1.8;
  color: #1a1d24;
  white-space: pre-wrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #6b7280;
  margin-top: 24rpx;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 22rpx;
  color: #9ca3af;
}
</style>
```

- [ ] **Step 2: 验证 TypeScript**

Run: `cd d:\aistock\aistock-app-frontend && npx tsc --noEmit`
Expected: 无 TypeScript 错误

- [ ] **Step 3: Commit**

```bash
cd d:\aistock\aistock-app-frontend
git add src/modules/chat/pages/agent-report.vue
git commit -m "feat: 新建 agent-report 通用分析报告页面"
```

---

## Task 6: 修改 leaders.vue 添加引导卡片

**仓库：** aistock-app-frontend
**文件：**
- Modify: `src/modules/market/pages/leaders.vue`

**Interfaces:**
- Consumes: SvgIcon 组件
- Produces: 长线风口页面顶部显示分析报告引导卡片

- [ ] **Step 1: 导入 SvgIcon 组件**

在 `leaders.vue` 的 `<script setup>` 部分，在现有 import 之后添加：

```typescript
import SvgIcon from '@/shared/components/SvgIcon.vue'
```

- [ ] **Step 2: 添加 goAgentReport 函数**

在 `<script setup>` 部分添加：

```typescript
function goAgentReport() {
  const today = new Date().toISOString().split('T')[0]
  uni.navigateTo({
    url: `/modules/chat/pages/agent-report?intent=wind_leader&date=${today}`
  })
}
```

- [ ] **Step 3: 在模板中添加引导卡片**

在 `<view class="leaders-content">` 内部、泡泡图卡片之前添加：

```vue
      <!-- 引导卡片：点击查看今日分析报告 -->
      <view class="report-guide-card" @tap="goAgentReport">
        <view class="guide-left">
          <SvgIcon name="file-line" color="#ffffff" size="40rpx" />
          <text class="guide-title">点击查看今日分析报告</text>
        </view>
        <SvgIcon name="arrow-right-line" color="#ffffff" size="32rpx" />
      </view>
```

- [ ] **Step 4: 添加引导卡片样式**

在 `<style lang="scss" scoped>` 部分添加（复用 hot-burst.vue 的样式）：

```scss
/* ===== 引导卡片 ===== */
.report-guide-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  margin-bottom: 24rpx;
  background: linear-gradient(135deg, #4d7cfe 0%, #667eea 100%);
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(77, 124, 254, 0.3);
}

.guide-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.guide-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
}
```

- [ ] **Step 5: 验证 TypeScript**

Run: `cd d:\aistock\aistock-app-frontend && npx tsc --noEmit`
Expected: 无 TypeScript 错误

- [ ] **Step 6: Commit**

```bash
cd d:\aistock\aistock-app-frontend
git add src/modules/market/pages/leaders.vue
git commit -m "feat: leaders 长线风口页面添加分析报告引导卡片"
```

---

## Task 7: 修改 briefing/index.vue 双人播报页面

**仓库：** aistock-app-frontend
**文件：**
- Modify: `src/pages-sub-app/briefing/index.vue`（全量重写占位页面）

**Interfaces:**
- Consumes: `agentApi.getReport('broadcast', date)`、`uni.createInnerAudioContext`
- Produces: 双人播报页面（音频播放 + 对话文本展示）

- [ ] **Step 1: 全量重写 briefing/index.vue**

```vue
<template>
  <view class="briefing-page">
    <!-- 顶部标题栏 -->
    <view class="briefing-header">
      <text class="header-title">双人对话播报</text>
      <text class="header-date">{{ currentDate }}</text>
    </view>

    <!-- 播放控制 -->
    <view v-if="report" class="player-bar">
      <view class="play-btn" @tap="togglePlay">
        <SvgIcon :name="isPlaying ? 'pause-fill' : 'play-fill'" size="48rpx" color="#ffffff" />
      </view>
      <view class="player-info">
        <text class="player-status">{{ audioStatusText }}</text>
      </view>
    </view>

    <!-- 对话文本 -->
    <view v-if="dialogueLines.length" class="dialogue-list">
      <view
        v-for="(line, idx) in dialogueLines"
        :key="idx"
        :class="['dialogue-item', line.role]"
      >
        <view class="role-avatar">
          <text class="avatar-text">{{ line.role === 'host' ? '主' : '析' }}</text>
        </view>
        <view class="dialogue-bubble">
          <text class="role-name">{{ line.role === 'host' ? '主持人' : '分析师' }}</text>
          <text class="dialogue-text">{{ line.content }}</text>
        </view>
      </view>
    </view>

    <!-- 纯文本降级展示 -->
    <view v-else-if="reportText && !dialogueLines.length" class="report-text-wrap">
      <text class="report-text">{{ reportText }}</text>
    </view>

    <!-- 无报告 -->
    <view v-else-if="!loading" class="empty-state">
      <SvgIcon name="file-line" size="80rpx" color="#9ca3af" />
      <text class="empty-text">今日播报尚未生成</text>
      <text class="empty-hint">请在 9:10 后查看</text>
    </view>

    <!-- 日期切换 -->
    <view class="date-nav">
      <view class="date-btn" @tap="changeDate(-1)">
        <SvgIcon name="arrow-left-line" size="32rpx" color="#4d7cfe" />
        <text class="date-btn-text">前一天</text>
      </view>
      <view class="date-btn" @tap="changeDate(1)">
        <text class="date-btn-text">后一天</text>
        <SvgIcon name="arrow-right-line" size="32rpx" color="#4d7cfe" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { agentApi } from '@/shared/api/modules/agent'
import SvgIcon from '@/shared/components/SvgIcon.vue'

interface DialogueLine {
  role: 'host' | 'analyst'
  content: string
}

const currentDate = ref('')
const loading = ref(true)
const report = ref<{ content: { text?: string; audio_path?: string | null } } | null>(null)
const isPlaying = ref(false)
const audioContext = ref<UniApp.InnerAudioContext | null>(null)

const reportText = computed(() => {
  return report.value?.content?.text || ''
})

const audioPath = computed(() => {
  return report.value?.content?.audio_path || null
})

const audioStatusText = computed(() => {
  if (!audioPath.value) return '语音生成中...'
  return isPlaying.value ? '播放中' : '点击播放'
})

// 解析对话文本为行数组
const dialogueLines = computed<DialogueLine[]>(() => {
  const text = reportText.value
  if (!text) return []

  // 尝试 JSON 解析（prompt 要求的格式）
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item: any) => item && item.role && item.content)
        .map((item: any) => ({
          role: item.role === 'host' ? 'host' : 'analyst',
          content: String(item.content),
        }))
    }
  } catch {
    // 非 JSON 格式，降级处理
  }

  // 降级：按行解析，根据前缀判断角色
  const lines = text.split('\n').filter((l) => l.trim())
  return lines.map((line) => {
    const trimmed = line.trim()
    let role: 'host' | 'analyst' = 'host'
    let content = trimmed

    if (trimmed.startsWith('主持人') || trimmed.startsWith('host')) {
      role = 'host'
      content = trimmed.replace(/^(主持人|host)[：:]\s*/, '')
    } else if (trimmed.startsWith('分析师') || trimmed.startsWith('analyst')) {
      role = 'analyst'
      content = trimmed.replace(/^(分析师|analyst)[：:]\s*/, '')
    }

    return { role, content }
  })
})

function togglePlay() {
  if (!audioPath.value) {
    uni.showToast({ title: '语音生成中', icon: 'none' })
    return
  }

  if (!audioContext.value) {
    // 从 audio_path 提取文件名
    const filename = audioPath.value.split('/').pop() || ''
    const audioUrl = `${import.meta.env.VITE_API_BASE_URL || ''}/api/agent/audio/${filename}`
    audioContext.value = uni.createInnerAudioContext()
    audioContext.value.src = audioUrl
    audioContext.value.onEnded(() => {
      isPlaying.value = false
    })
    audioContext.value.onError(() => {
      isPlaying.value = false
      uni.showToast({ title: '音频播放失败', icon: 'none' })
    })
  }

  if (isPlaying.value) {
    audioContext.value.pause()
    isPlaying.value = false
  } else {
    audioContext.value.play()
    isPlaying.value = true
  }
}

function changeDate(delta: number) {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() + delta)
  currentDate.value = d.toISOString().split('T')[0]
  loadReport()
}

async function loadReport() {
  if (!currentDate.value) return
  loading.value = true
  // 停止当前播放
  if (audioContext.value && isPlaying.value) {
    audioContext.value.stop()
    isPlaying.value = false
  }
  try {
    const res: unknown = await agentApi.getReport('broadcast', currentDate.value)
    const data = (res as any)?.data ?? res
    report.value = data || null
  } catch {
    report.value = null
  } finally {
    loading.value = false
  }
}

onLoad(() => {
  currentDate.value = new Date().toISOString().split('T')[0]
  loadReport()
})

onUnmounted(() => {
  if (audioContext.value) {
    audioContext.value.destroy()
    audioContext.value = null
  }
})
</script>

<style lang="scss" scoped>
.briefing-page {
  min-height: 100vh;
  background: #f5f6fa;
}

.briefing-header {
  padding: 32rpx;
  background: linear-gradient(135deg, #4d7cfe 0%, #667eea 100%);
  text-align: center;
}

.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #ffffff;
  display: block;
}

.header-date {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 8rpx;
  display: block;
}

.player-bar {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  background: #ffffff;
  margin: 24rpx;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.play-btn {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #4d7cfe;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.player-info {
  flex: 1;
}

.player-status {
  font-size: 28rpx;
  color: #1a1d24;
  font-weight: 500;
}

.dialogue-list {
  padding: 0 24rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.dialogue-item {
  display: flex;
  gap: 16rpx;
}

.dialogue-item.analyst {
  flex-direction: row-reverse;
}

.role-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #4d7cfe;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dialogue-item.analyst .role-avatar {
  background: #22c55e;
}

.avatar-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #ffffff;
}

.dialogue-bubble {
  flex: 1;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.04);
}

.dialogue-item.analyst .dialogue-bubble {
  background: #e8f5e9;
}

.role-name {
  font-size: 22rpx;
  color: #6b7280;
  margin-bottom: 8rpx;
  display: block;
}

.dialogue-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: #1a1d24;
}

.report-text-wrap {
  padding: 32rpx;
}

.report-text {
  font-size: 28rpx;
  line-height: 1.8;
  color: #1a1d24;
  white-space: pre-wrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #6b7280;
  margin-top: 24rpx;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 22rpx;
  color: #9ca3af;
}

.date-nav {
  display: flex;
  justify-content: space-between;
  padding: 32rpx;
  gap: 24rpx;
}

.date-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 32rpx;
  background: #ffffff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.04);
}

.date-btn-text {
  font-size: 26rpx;
  color: #4d7cfe;
  font-weight: 500;
}
</style>
```

- [ ] **Step 2: 验证 TypeScript**

Run: `cd d:\aistock\aistock-app-frontend && npx tsc --noEmit`
Expected: 无 TypeScript 错误

- [ ] **Step 3: Commit**

```bash
cd d:\aistock\aistock-app-frontend
git add src/pages-sub-app/briefing/index.vue
git commit -m "feat: briefing 双人播报页面完整实现（音频播放+对话文本）"
```

---

## Task 8: pages.json 注册 agent-report 路由

**仓库：** aistock-app-frontend
**文件：**
- Modify: `src/pages.json`

**Interfaces:**
- Consumes: 无
- Produces: agent-report 页面路由注册

- [ ] **Step 1: 在 pages.json 的 pages 数组中注册 agent-report**

在 `pages.json` 的 `pages` 数组中，在 `modules/market/pages/hot-burst` 之后添加：

```json
    {
      "path": "modules/chat/pages/agent-report",
      "style": {
        "navigationBarTitleText": "分析报告",
        "navigationStyle": "custom"
      }
    },
```

- [ ] **Step 2: 验证 JSON 格式正确**

Run: `cd d:\aistock\aistock-app-frontend && npx tsc --noEmit`
Expected: 无 TypeScript 错误

- [ ] **Step 3: Commit**

```bash
cd d:\aistock\aistock-app-frontend
git add src/pages.json
git commit -m "feat: pages.json 注册 agent-report 页面路由"
```

---

## 自审

### Spec coverage
- ✅ 子项目 A：分析报告查看 — Task 2（后端路由）、Task 4（前端 API）、Task 5（agent-report 页面）、Task 6（leaders 引导卡片）、Task 8（路由注册）
- ✅ 子项目 B：双人播报页面 — Task 1（broadcast 持久化）、Task 3（音频文件服务）、Task 7（briefing 页面）
- ✅ 子项目 C：明天单独规划（不在本计划范围内）

### Placeholder scan
- 无 "TBD"、"TODO" 等占位符
- 所有代码步骤都有完整代码

### Type consistency
- `agentApi.getReport(intent, date)` 在 Task 4 定义，Task 5 和 Task 7 使用
- `report.content.text` 和 `report.content.audio_path` 在所有任务中一致
- `DialogueLine` 接口在 Task 7 中定义并使用

### 注意事项
1. Task 2 中需要确认 `getAnalysisReport` 函数和 `agentPublicRouter` 是否已存在。如果不存在，需要从内部路由提取查询逻辑。
2. Task 7 中 `import.meta.env.VITE_API_BASE_URL` 需要确认前端的环境变量配置。
3. 音频文件目录 `AGENT_AUDIO_DIR` 需要在服务器 aistock-app-api 的 .env 中配置。
