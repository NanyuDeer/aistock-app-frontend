import assert from 'node:assert/strict'
import { test } from 'node:test'
import { rpxToPx, rpxToVw } from './rpx'

test('rpxToPx 按 390px 设计基准换算（1rpx = 0.52px）', () => {
  assert.equal(rpxToPx('18rpx'), '9.3600px')
  assert.equal(rpxToPx('80rpx'), '41.6000px')
  assert.equal(rpxToPx('32rpx'), '16.6400px')
})

test('rpxToPx 非 rpx 值原样返回（如容器百分比宽度）', () => {
  assert.equal(rpxToPx('100%'), '100%')
  assert.equal(rpxToPx(''), '')
})

test('rpxToVw 行为保持不变（响应式场景仍使用视口基准）', () => {
  assert.equal(rpxToVw('36rpx'), '4.8000vw')
  assert.equal(rpxToVw('100%'), '100%')
})
