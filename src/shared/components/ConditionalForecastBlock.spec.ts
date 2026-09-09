import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('./ConditionalForecastBlock.vue', import.meta.url), 'utf8')

test('单档守卫：期段 Tab 区仅在 horizonSegments.length>1 渲染（节奏单档不显孤 Tab）', () => {
  assert.match(source, /horizonSegments\.length\s*>\s*1/)
})

test('单档守卫：watchEffect 把 activeHorizon 初始化为唯一档（防 single mid/long 空态）', () => {
  assert.match(source, /watchEffect/)
  assert.match(source, /activeHorizon\.value\s*=/)
  assert.match(source, /segs\.includes\(activeHorizon\.value\)/)
})
