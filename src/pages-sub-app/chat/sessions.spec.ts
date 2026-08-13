import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const pageSource = readFileSync(new URL('./sessions.vue', import.meta.url), 'utf8')

test('会话列表页具备列表渲染（title + 相对时间 + 当前高亮）', () => {
  assert.match(pageSource, /chatStore\.sessions/)
  assert.match(pageSource, /session-title/)
  assert.match(pageSource, /formatTime\(/)
  assert.match(pageSource, /session-badge/)
})

test('新建会话入口：add-line 图标 + createSession + 返回聊天页', () => {
  assert.match(pageSource, /name="add-line"/)
  assert.match(pageSource, /chatStore\.createSession\(\)/)
  assert.match(pageSource, /uni\.navigateBack\(\{ delta: 1 \}\)/)
})

test('点击行切换会话：switchSession + navigateBack', () => {
  assert.match(pageSource, /onTapSession/)
  assert.match(pageSource, /chatStore\.switchSession\(/)
})

test('删除会话：delete-bin-line 图标 + deleteSession + 冒泡阻止', () => {
  assert.match(pageSource, /name="delete-bin-line"/)
  assert.match(pageSource, /onDeleteSession/)
  assert.match(pageSource, /chatStore\.deleteSession\(/)
  assert.match(pageSource, /@tap\.stop/)
})

test('onShow 登录时同步 server 会话列表（syncSessionsFromServer）', () => {
  assert.match(pageSource, /onShow/)
  assert.match(pageSource, /userStore\.isLoggedIn\(\)/)
  assert.match(pageSource, /chatStore\.syncSessionsFromServer\(\)/)
})

test('空态提示存在', () => {
  assert.match(pageSource, /session-empty/)
  assert.match(pageSource, /暂无会话/)
})

// ── P10 线 6：会话维度用量展示（串行依赖线 4 + 线 5） ──

test('P10 线 6：登录时拉取会话用量并按 session_id 合并', () => {
  assert.match(pageSource, /getChatSessionUsage\(\)/)
  assert.match(pageSource, /usageBySession/)
  assert.match(pageSource, /session-usage/)
})

test('P10 线 6：未登录不请求用量（isLoggedIn 守卫）', () => {
  assert.match(pageSource, /userStore\.isLoggedIn\(\)/)
  // loadSessionUsage 调用必须位于登录分支内层（与 syncSessionsFromServer 并列）
  assert.match(pageSource, /if \(userStore\.isLoggedIn\(\)\)[\s\S]{0,200}loadSessionUsage\(\)/)
})

test('P10 线 6：无用量不显示徽标（v-if 条件）', () => {
  assert.match(pageSource, /v-if="usageBySession\[s\.session_id\]"/)
})
