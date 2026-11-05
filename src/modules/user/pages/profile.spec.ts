/**
 * profile.vue 「AI 个性化服务」区（用户画像自动挖掘一期 Task 8 / Task 9）
 *
 * 覆盖两层：
 *  A. 源码断言（Task 8）：投资偏好 / 风险偏好的入口、校验与提交值枚举；
 *  B. 组件挂载（Task 9）：opt-in 开关默认关闭且切换调用 updateSettings('profile_mining')、
 *     推断计数与 getInferenceMeta 一致、清除前必须二次确认（取消不调接口）、未登录不渲染该区。
 *
 * 手法：整页挂载需串联 Pinia / 页面生命周期 / 容器组件，此处按页面 spec 先例
 * （favorites/pages/insight.mount.spec.ts）全部打桩；`onShow` 桩同步触发回调。
 *
 * 采用 vitest 风格并注册进 vitest.config.ts 白名单（否则 `npm test` 静默跳过）。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// 归一化换行：仓库未提交 .gitattributes，Windows 工作区为 CRLF、CI 为 LF，
// 不归一化会让跨行正则出现「本地失败 / CI 通过」的口径分裂（先例见 rhythm/pages/index.spec.ts）。
// 用 cwd 拼路径而非 new URL(import.meta.url)：vitest 运行环境对 URL 形态的 fs 入参有代理层限制。
const source = readFileSync(resolve(process.cwd(), 'src/modules/user/pages/profile.vue'), 'utf8').replace(/\r\n/g, '\n')

/** 页面级桩件与被测状态 */
const h = vi.hoisted(() => ({
  /** onShow 生命周期回调（桩内同步触发一次，同时登记供用例手动重放） */
  onShowCbs: [] as Array<() => unknown>,
  /** 登录态开关（未登录不渲染 AI 个性化服务区） */
  loggedIn: true,
  /** uni.showModal 桩实现写回（供用例断言确认框并模拟取消/确认） */
  modalOptions: null as null | { content?: string; success?: (res: { confirm: boolean; cancel: boolean }) => void },
}))

const authApiMock = vi.hoisted(() => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}))

const profileApiMock = vi.hoisted(() => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  deleteUserProfile: vi.fn(),
  getInferenceMeta: vi.fn(),
  clearInferences: vi.fn(),
}))

vi.mock('@/shared/store/modules/user', () => ({
  useUserStore: () => ({
    isLoggedIn: () => h.loggedIn,
    userInfo: { id: 1, openid: 'o_test', nickname: '测试用户' },
    logout: vi.fn(),
  }),
}))

vi.mock('@/shared/store/modules/favorites', () => ({
  useFavoritesStore: () => ({ stocks: [], fetchFavorites: vi.fn().mockResolvedValue(undefined) }),
}))

vi.mock('@/shared/api/modules/auth', () => ({ authApi: authApiMock }))

// 真实模块只保留枚举守卫（isRiskTolerance），数据方法全部打桩
vi.mock('@/shared/api/modules/profile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/modules/profile')>()
  return { ...actual, ...profileApiMock }
})

vi.mock('@/shared/utils/useAppUpdate', () => ({ checkAppUpdate: vi.fn() }))

// 容器桩：避免 GlobalChatBar / FloatingPodcast 等副作用
vi.mock('@/shared/components/SubPageCard.vue', () => ({
  default: { name: 'SubPageCard', props: ['title'], template: '<view class="subpage-stub"><slot /></view>' },
}))
vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name', 'size', 'color'], template: '<view class="svg-stub" />' },
}))

// barrel 桩：只保留页面用到的组件，Switch 桩点一下即 emit change（与真实组件一致）
vi.mock('@/shared/components', () => ({
  Switch: {
    name: 'Switch',
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
    template: `<view class="switch-stub" :class="{ 'is-on': modelValue }" @click="$emit('change', !modelValue)" />`,
  },
  ListCell: {
    name: 'ListCell',
    props: ['title', 'description', 'border', 'clickable', 'showArrow'],
    template: `<view class="listcell-stub"><text>{{ title }}</text><slot name="value" /></view>`,
  },
  Card: { name: 'Card', props: ['flush', 'flat'], template: '<view class="card-stub"><slot /></view>' },
  Tag: { name: 'Tag', props: ['type', 'size'], template: '<view class="tag-stub"><slot /></view>' },
  Button: {
    name: 'Button',
    props: ['type', 'size', 'block', 'disabled'],
    emits: ['click'],
    template: `<button class="btn-stub" @click="$emit('click', $event)"><slot /></button>`,
  },
  UpdateModal: { name: 'UpdateModal', template: '<view class="update-modal-stub" />' },
  ConfirmModal: {
    name: 'ConfirmModal',
    props: ['visible', 'title', 'content', 'confirmText', 'cancelText', 'showCancel', 'danger'],
    template: '<view class="confirm-modal-stub" />',
  },
  Input: {
    name: 'Input',
    props: ['modelValue', 'placeholder', 'maxlength', 'type', 'disabled', 'clearable', 'searchIcon'],
    emits: ['update:modelValue'],
    template: `<input class="input-stub" :value="modelValue" />`,
  },
  Segmented: {
    name: 'Segmented',
    props: ['items', 'modelValue', 'fullWidth'],
    emits: ['update:modelValue', 'change'],
    template: `<view class="segmented-stub"><view v-for="item in items" :key="item.value" class="seg-item" @click="$emit('change', item.value)">{{ item.label }}</view></view>`,
  },
}))

vi.mock('@dcloudio/uni-app', () => ({
  onShow: (cb: () => unknown) => {
    h.onShowCbs.push(cb)
    cb()
  },
}))

vi.stubGlobal('uni', {
  showToast: vi.fn(),
  showModal: vi.fn((options: NonNullable<typeof h.modalOptions>) => {
    h.modalOptions = options
  }),
  navigateTo: vi.fn(),
  redirectTo: vi.fn(),
  getStorageSync: vi.fn(() => ''),
  setStorageSync: vi.fn(),
  removeStorageSync: vi.fn(),
})

import profilePage from './profile.vue'

/** 取源码中从首个匹配到「行首闭合大括号」的代码块（用于把断言限定在单个函数内） */
function functionBlock(pattern: RegExp): string {
  return source.match(pattern)?.[0] ?? ''
}

const addPreferenceBlock = functionBlock(/function addInvestmentPreference\(\)[\s\S]*?\n\}/)
const persistPreferenceBlock = functionBlock(/async function persistInvestmentPreferences\([\s\S]*?\n\}/)
const riskChangeBlock = functionBlock(/async function onRiskToleranceChange\([\s\S]*?\n\}/)
const applyProfileBlock = functionBlock(/function applyProfilePreferences\([\s\S]*?\n\}/)
const riskItemsBlock = functionBlock(/const RISK_TOLERANCE_ITEMS[\s\S]*?\]/)

describe('投资偏好 / 风险偏好入口（Task 8）', () => {
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

describe('AI 个性化服务 · opt-in 开关与推断清除（Task 9）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.loggedIn = true
    h.onShowCbs.length = 0
    h.modalOptions = null
    authApiMock.getSettings.mockResolvedValue({ settings: [] })
    authApiMock.updateSettings.mockResolvedValue({})
    profileApiMock.getUserProfile.mockResolvedValue({
      nickname: '测试用户',
      investment_preferences: [],
      risk_tolerance: null,
    })
    profileApiMock.updateUserProfile.mockResolvedValue(null)
    profileApiMock.deleteUserProfile.mockResolvedValue({ deleted: true })
    profileApiMock.getInferenceMeta.mockResolvedValue({
      count: 3,
      dimensions: ['preferred_sectors', 'question_topics', 'active_hours'],
      updated_at: '2026-11-05T00:30:00.000Z',
    })
    profileApiMock.clearInferences.mockResolvedValue({ deleted: 3 })
  })

  it('默认关闭：settings 无 profile_mining 行时开关为 false', async () => {
    const wrapper = mount(profilePage)
    await flushPromises()
    const miningSwitch = wrapper.find('.profile-mining-switch')
    expect(miningSwitch.exists()).toBe(true)
    expect(miningSwitch.classes()).not.toContain('is-on')
    expect(authApiMock.updateSettings).not.toHaveBeenCalled()
  })

  it('切换开关调用 updateSettings(profile_mining, { enabled })', async () => {
    const wrapper = mount(profilePage)
    await flushPromises()
    await wrapper.find('.profile-mining-switch').trigger('click')
    await flushPromises()
    expect(authApiMock.updateSettings).toHaveBeenCalledWith('profile_mining', { enabled: true })
  })

  it('切换失败时回滚为关闭状态（不影响页面其它功能）', async () => {
    authApiMock.updateSettings.mockRejectedValue(new Error('network'))
    const wrapper = mount(profilePage)
    await flushPromises()
    await wrapper.find('.profile-mining-switch').trigger('click')
    await flushPromises()
    expect(wrapper.find('.profile-mining-switch').classes()).not.toContain('is-on')
  })

  it('计数展示与 getInferenceMeta().count 一致，且不渲染推断内容', async () => {
    const wrapper = mount(profilePage)
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('AI 已了解你的 3 个特征')
    // spec §1.2：只展示计数，绝不展示推断维度/内容
    expect(text).not.toContain('preferred_sectors')
    expect(text).not.toContain('question_topics')
  })

  it('清除前弹二次确认，取消时 clearInferences 不被调用', async () => {
    const wrapper = mount(profilePage)
    await flushPromises()
    await wrapper.find('.pref-clear').trigger('tap')
    expect(uni.showModal).toHaveBeenCalledTimes(1)
    expect(h.modalOptions?.content || '').toContain('不可恢复')
    expect(profileApiMock.clearInferences).not.toHaveBeenCalled()

    h.modalOptions?.success?.({ confirm: false, cancel: true })
    await flushPromises()
    expect(profileApiMock.clearInferences).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('AI 已了解你的 3 个特征')
  })

  it('确认清除后调用 clearInferences，计数归零', async () => {
    const wrapper = mount(profilePage)
    await flushPromises()
    await wrapper.find('.pref-clear').trigger('tap')
    h.modalOptions?.success?.({ confirm: true, cancel: false })
    await flushPromises()
    expect(profileApiMock.clearInferences).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('AI 已了解你的 0 个特征')
  })

  it('说明文案包含采集范围 / 用途 / 关闭与不自动删除', async () => {
    const wrapper = mount(profilePage)
    await flushPromises()
    const text = wrapper.text()
    for (const keyword of ['自选股', '提问', '洞察事件', '个性化回答', '关闭', '不会自动删除']) {
      expect(text).toContain(keyword)
    }
  })

  it('未登录不渲染 AI 个性化服务区，且不请求推断元信息', async () => {
    h.loggedIn = false
    const wrapper = mount(profilePage)
    await flushPromises()
    expect(wrapper.text()).not.toContain('AI 个性化服务')
    expect(wrapper.find('.profile-mining-switch').exists()).toBe(false)
    expect(profileApiMock.getInferenceMeta).not.toHaveBeenCalled()
  })
})
