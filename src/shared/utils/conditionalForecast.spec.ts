import assert from 'node:assert/strict'
import { test } from 'node:test'

import { hasMetData, selectVisibleConditions } from './conditionalForecast'

const conds = [
  { label: 'a', met: true },
  { label: 'b', met: false },
  { label: 'c', met: null },
  { label: 'd' }
]

test('selectVisibleConditions：full 模式原样返回', () => {
  assert.deepEqual(selectVisibleConditions(conds, 'full'), conds)
})

test('selectVisibleConditions：conclusion 模式只保留 met===true 的分支', () => {
  assert.deepEqual(selectVisibleConditions(conds, 'conclusion').map((c) => c.label), ['a'])
})

test('selectVisibleConditions：无已成立分支时返回空数组', () => {
  assert.deepEqual(selectVisibleConditions([{ met: false }, { met: null }], 'conclusion'), [])
})

test('hasMetData：任一分支有布尔 met 即为 true', () => {
  assert.equal(hasMetData([{ met: null }, { met: false }]), true)
})

test('hasMetData：全部 met 缺省/null 时为 false（无从判断已成立）', () => {
  assert.equal(hasMetData([{}, { met: null }]), false)
})
