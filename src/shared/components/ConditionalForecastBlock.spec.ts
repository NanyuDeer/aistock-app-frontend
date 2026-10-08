import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('./ConditionalForecastBlock.vue', import.meta.url), 'utf8')

test('档位区平铺：期段 Tab（horizonSegments / activeHorizon / watchEffect）已彻底删除', () => {
  // 2026-10-06 三粒度档位行统一（spec §4.8）：Tab 切换改平铺所有档，原「单档守卫」随之作废。
  assert.doesNotMatch(source, /horizonSegments/)
  assert.doesNotMatch(source, /activeHorizon/)
  assert.doesNotMatch(source, /watchEffect/)
  assert.doesNotMatch(source, /as-insight-card__seg/)
})

test('档位区平铺：v-for 渲染 horizon-row，行内字段各自 v-if（含可选 metricProjection）', () => {
  assert.match(source, /v-for="\(h, idx\) in flatHorizons"/)
  assert.match(source, /class="as-insight-card__horizon-row"/)
  assert.match(
    source,
    /const flatHorizons = computed<StructuredHorizon\[\]>\(\(\) => props\.structured\?\.horizons \?\? \[\]\)/
  )
  // StructuredHorizon 可选新字段（板块/大盘共用；缺失即不渲染，不兜底）
  assert.match(source, /metricProjection\?: string/)
  assert.match(source, /v-if="h\.direction"/)
  assert.match(source, /v-if="h\.label"/)
  assert.match(source, /v-if="h\.confidence"/)
  assert.match(source, /v-if="h\.remaining"/)
  assert.match(source, /v-if="h\.metricProjection" class="as-insight-card__horizon-projection"/)
  // 平铺后每行自带档位名（Tab 删除后保留短/中/长语义）
  assert.match(source, /horizonLabel\(h\.horizon\)/)
})

test('结论模式收口：折叠/过滤按本卡条件集合，与（已删的）单档 Tab 无关', () => {
  // 空态文案（B 还原）：sentence 形态恢复改造前原文案「该期暂无细分情景」（tags 形态沿用结论空态文案）
  assert.match(
    source,
    /conditionDisplay === 'sentence' \? '该期暂无细分情景' : '条件未成立 · 暂无已验证结论'/
  )

  // 折叠/过滤判定改为按「本卡有无已成立分支（lit = met===true 分支）」——
  // 真实数据只写 condition_met=true（决策 D1）→ 未触发档没有任何布尔 met，旧口径
  // resolvedDisplayMode 会降级 full 使折叠态不可达；且过滤源必须是 lit 而非「全部条件」。
  assert.match(
    source,
    /const litConditions = computed\(\(\) =>\s+selectVisibleConditions\(allConditions\.value, 'conclusion'\)/
  )
  assert.match(source, /isFoldedUnmet\.value && props\.structured\?\.verification === 'miss'/)
  assert.match(source, /litConditions\.value\.length === 0/)
  assert.match(source, /allConditions\.value\.length > 0/)
  assert.match(source, /if \(!isFoldedUnmet\.value\) return litConditions\.value/)
  // 折叠/过滤不得再依赖降级模式（防折叠态在无 met 数据时不可达的回归）
  assert.doesNotMatch(source, /resolvedDisplayMode/)
  // L2 护栏：App 侧必须 import shared util（防"库→App 整文件复制"把内联灌回导致 utils 变死代码）
  assert.match(source, /from '@\/shared\/utils\/conditionalForecast'/)

  // 未触发折叠态（无已成立分支 → 档位行照常 + 分支区收为一行入口，本地展开后铺开全部）
  assert.match(source, /查看条件化预判/)
  assert.match(source, /收起条件化预判/)
  assert.match(source, /isFoldedUnmet/)
  assert.match(source, /renderedConditions/)
  assert.match(source, /toggleBranches/)
  // sentence 形态不参与折叠：折叠判定必须带 conditionDisplay !== 'sentence' 守卫
  // （canFoldScenario 里同句不满足此连续形态，故该断言只锚定折叠态判定）
  assert.match(source, /conditionDisplay !== 'sentence' &&\s+litConditions\.value\.length === 0/)
  // 到期未触发（卡级聚合 verification=miss）→ 折叠入口旁「未命中」中性标签；
  // 同一折叠态下抑制头部同义 miss pill（否则「验证未中」+「未命中」重复）
  assert.match(source, /props\.structured\?\.verification === 'miss'/)
  assert.match(source, /if \(v === 'miss' && showMissTag\.value\) return ''/)
  // 隐藏分支纯标注（已触发且有隐藏分支时；N = 本卡全部条件 − 已成立分支）
  assert.match(source, /另有 \{\{ hiddenConditionCount \}\} 条条件未成立/)
})
