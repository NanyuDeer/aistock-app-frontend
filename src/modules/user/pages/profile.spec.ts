/**
 * profile.vue 「投资偏好 / 风险偏好」编辑入口（用户画像自动挖掘一期 Task 8）
 *
 * 手法说明：本页为 600+ 行 uni-app 页面，整页挂载需串联 Pinia / 页面生命周期 / 容器组件
 * 等大量桩件，且 plan Task 8 Step 1 明确要求「页面源码断言」。因此本 spec 锁定：
 *  1. 两个编辑入口真实存在于模板；
 *  2. 投资偏好为标签输入，前端同步校验 ≤10 项、每项 ≤20 字、去重；
 *  3. 风险偏好为三档选择器，三档提交值均来自 API 层枚举，且提交前必须过 `isRiskTolerance` 守卫；
 *  4. 保存走 `updateUserProfile` 的部分更新字段。
 *
 * 运行期契约（URL / 载荷 / 枚举）由 `src/shared/api/modules/profile.spec.ts` 覆盖。
 * 采用 vitest 风格并注册进 vitest.config.ts 白名单（否则 `npm test` 静默跳过）。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// 归一化换行：仓库未提交 .gitattributes，Windows 工作区为 CRLF、CI 为 LF，
// 不归一化会让跨行正则出现「本地失败 / CI 通过」的口径分裂（先例见 rhythm/pages/index.spec.ts）。
// 用 cwd 拼路径而非 new URL(import.meta.url)：vitest 运行环境对 URL 形态的 fs 入参有代理层限制。
const source = readFileSync(resolve(process.cwd(), 'src/modules/user/pages/profile.vue'), 'utf8').replace(/\r\n/g, '\n')

/** 取源码中从首个匹配到「行首闭合大括号」的代码块（用于把断言限定在单个函数内） */
function functionBlock(pattern: RegExp): string {
  return source.match(pattern)?.[0] ?? ''
}

const addPreferenceBlock = functionBlock(/function addInvestmentPreference\(\)[\s\S]*?\n\}/)
const persistPreferenceBlock = functionBlock(/async function persistInvestmentPreferences\([\s\S]*?\n\}/)
const riskChangeBlock = functionBlock(/async function onRiskToleranceChange\([\s\S]*?\n\}/)
const applyProfileBlock = functionBlock(/function applyProfilePreferences\([\s\S]*?\n\}/)
const riskItemsBlock = functionBlock(/const RISK_TOLERANCE_ITEMS[\s\S]*?\]/)

describe('投资偏好 / 风险偏好入口', () => {
  it('设置页渲染两个编辑入口', () => {
    expect(source).toContain('投资偏好')
    expect(source).toContain('风险偏好')
  })

  it('投资偏好为标签输入（已选标签 + 输入框 + 添加 / 移除）', () => {
    expect(source).toMatch(/v-for="item in investmentPreferences"/)
    expect(source).toMatch(/v-model="preferenceDraft"/)
    expect(source).toMatch(/@click="addInvestmentPreference"/)
    expect(source).toMatch(/@tap="removeInvestmentPreference\(item\)"/)
  })

  it('投资偏好前端同步校验：≤10 项、每项 ≤20 字', () => {
    expect(source).toMatch(/const MAX_PREFERENCE_COUNT = 10\b/)
    expect(source).toMatch(/const MAX_PREFERENCE_LENGTH = 20\b/)
    expect(addPreferenceBlock).toBeTruthy()
    expect(addPreferenceBlock).toContain('value.length > MAX_PREFERENCE_LENGTH')
    expect(addPreferenceBlock).toContain('investmentPreferences.value.length >= MAX_PREFERENCE_COUNT')
  })

  it('投资偏好添加前 trim、去重，且空值不提交', () => {
    expect(addPreferenceBlock).toContain('.trim()')
    expect(addPreferenceBlock).toContain('investmentPreferences.value.includes(value)')
  })

  it('投资偏好保存走 updateUserProfile({ investment_preferences }) 部分更新', () => {
    expect(persistPreferenceBlock).toBeTruthy()
    expect(persistPreferenceBlock).toContain('updateUserProfile({ investment_preferences: next })')
  })

  it('风险偏好为三档选择器，三档值与 API 层枚举一致', () => {
    expect(source).toMatch(/<Segmented[\s\S]*?:items="RISK_TOLERANCE_ITEMS"[\s\S]*?@change="onRiskToleranceChange"/)
    expect(riskItemsBlock).toBeTruthy()
    // 枚举守卫与类型都来自 API 层（单一真源），页面不自定义值域
    expect(source).toContain("from '@/shared/api/modules/profile'")
    expect(source).toContain('isRiskTolerance')
    for (const value of ['conservative', 'balanced', 'aggressive']) {
      expect(riskItemsBlock).toContain(`value: '${value}'`)
    }
    // 恰为三档（只数字面量 value: '...'，排除类型注解里的 value: RiskTolerance）
    expect(riskItemsBlock.match(/value: '/g)?.length).toBe(3)
  })

  it('风险偏好提交值必须过枚举守卫，且守卫在提交之前', () => {
    expect(riskChangeBlock).toBeTruthy()
    expect(riskChangeBlock).toContain('if (!isRiskTolerance(value)) return')
    expect(riskChangeBlock).toContain('updateUserProfile({ risk_tolerance: value })')
    expect(riskChangeBlock.indexOf('isRiskTolerance(value)')).toBeLessThan(
      riskChangeBlock.indexOf('updateUserProfile('),
    )
  })

  it('三档采用中文标签（保守型 / 平衡型 / 积极型）', () => {
    expect(riskItemsBlock).toContain('保守型')
    expect(riskItemsBlock).toContain('平衡型')
    expect(riskItemsBlock).toContain('积极型')
  })

  it('读取画像时回填偏好（复用 loadNickname 的同一次 getUserProfile 响应）', () => {
    expect(applyProfileBlock).toBeTruthy()
    expect(applyProfileBlock).toContain('investment_preferences')
    expect(applyProfileBlock).toContain('isRiskTolerance')
    expect(functionBlock(/async function loadNickname\(\)[\s\S]*?\n\}/)).toContain(
      'applyProfilePreferences(profile)',
    )
  })
})
