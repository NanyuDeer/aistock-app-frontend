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

test('单档守卫：v-if 精确落在 __seg 容器上（非注释/非其他节点）', () => {
  assert.match(source, /<view v-if="horizonSegments\.length > 1" class="as-insight-card__seg">/)
  assert.match(source, /条件未成立 · 暂无已验证结论/)
  assert.match(source, /resolvedDisplayMode === 'conclusion' && !activeConditions\.length/)
  // 过滤必须走 resolvedDisplayMode（防误用 props.displayMode 造成无 met 时全空态回归）
  assert.match(source, /selectVisibleConditions\(inHorizonConditions\.value,\s*resolvedDisplayMode\.value\)/)
  // L2 护栏：App 侧必须 import shared util（防"库→App 整文件复制"把内联灌回导致 utils 变死代码）
  assert.match(source, /from '@\/shared\/utils\/conditionalForecast'/)

  // 未触发折叠态（无 met===true 分支 → 基准行照常 + 分支区收为一行入口，本地展开后铺开全部）
  assert.match(source, /查看条件化预判/)
  assert.match(source, /收起条件化预判/)
  assert.match(source, /isFoldedUnmet/)
  assert.match(source, /renderedConditions/)
  assert.match(source, /toggleBranches/)
  // sentence 形态不参与折叠：折叠判定必须带 conditionDisplay !== 'sentence' 守卫
  // （canFoldScenario 里同句不满足此连续形态，故该断言只锚定折叠态判定）
  assert.match(source, /conditionDisplay !== 'sentence' &&\s+resolvedDisplayMode\.value === 'conclusion'/)
  // 到期未触发（卡级聚合 verification=miss）→ 折叠入口旁「未命中」中性标签
  assert.match(source, /props\.structured\?\.verification === 'miss'/)
  // 隐藏分支纯标注（conclusion 生效且有已成立分支时；N = 该档全部条件 − 已成立分支）
  assert.match(source, /另有 \{\{ hiddenConditionCount \}\} 条条件未成立/)
})
