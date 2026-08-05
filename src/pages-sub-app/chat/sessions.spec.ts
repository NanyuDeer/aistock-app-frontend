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
