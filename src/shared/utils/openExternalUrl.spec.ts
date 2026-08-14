import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isHttpUrl } from './openExternalUrl'

test('isHttpUrl 接受 http/https 外链', () => {
  assert.equal(isHttpUrl('https://www.cls.cn/detail/2454130'), true)
  assert.equal(isHttpUrl('http://example.com'), true)
  assert.equal(isHttpUrl('  https://www.cls.cn/detail/1  '), true)
})

test('isHttpUrl 拒绝空值 / undefined / 非法 URL', () => {
  assert.equal(isHttpUrl(''), false)
  assert.equal(isHttpUrl('   '), false)
  assert.equal(isHttpUrl(undefined), false)
  assert.equal(isHttpUrl(null), false)
  assert.equal(isHttpUrl('abc'), false)
  assert.equal(isHttpUrl('ftp://x.com'), false)
  assert.equal(isHttpUrl('javascript:alert(1)'), false)
})
