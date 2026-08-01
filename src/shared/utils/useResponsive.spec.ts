import assert from 'node:assert/strict'
import { test } from 'node:test'

test('getWindowWidthBreakpoint 根据 windowWidth 返回 sm/md/lg', async () => {
  const { getWindowWidthBreakpoint } = await import('./useResponsive')
  assert.equal(getWindowWidthBreakpoint(375), 'sm')
  assert.equal(getWindowWidthBreakpoint(414), 'sm')
  assert.equal(getWindowWidthBreakpoint(479), 'sm')
  assert.equal(getWindowWidthBreakpoint(480), 'md')
  assert.equal(getWindowWidthBreakpoint(600), 'md')
  assert.equal(getWindowWidthBreakpoint(767), 'md')
  assert.equal(getWindowWidthBreakpoint(768), 'lg')
  assert.equal(getWindowWidthBreakpoint(820), 'lg')
  assert.equal(getWindowWidthBreakpoint(1024), 'lg')
  assert.equal(getWindowWidthBreakpoint(1500), 'lg')
})

test('getWindowWidthBreakpoint 对 0 或负数返回 sm 作为兜底', async () => {
  const { getWindowWidthBreakpoint } = await import('./useResponsive')
  assert.equal(getWindowWidthBreakpoint(0), 'sm')
  assert.equal(getWindowWidthBreakpoint(-1), 'sm')
})
