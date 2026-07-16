/**
 * useAiReasoning — AI 推理流程状态管理 v3
 *
 * 时序：思考(3-4s) → 逐步骤(2-3s processing + 生成) → 总计约30-40s
 */
import { ref, computed } from 'vue'

export type StepStatus = 'pending' | 'processing' | 'generating' | 'completed'
export type ThinkingPhase = 'idle' | 'reading' | 'identifying' | 'analyzing' | 'done'

export interface ReasoningStepConfig { title: string }

export interface ReasoningStepState {
  id: number
  title: string
  status: StepStatus
  content: Record<string, unknown>
}

export interface AnalysisContext {
  eventType?: string
  source?: string
  publishTime?: string
  transferDirection?: string
  transferReason?: string
  persistenceReason?: string
}

export interface ThinkingStatus {
  phase: ThinkingPhase
  label: string
}

export interface CurrentTask { text: string }

// ==================== Composable ====================

export function useAiReasoning(stepConfigs: ReasoningStepConfig[]) {
  const steps = ref<ReasoningStepState[]>(
    stepConfigs.map((cfg, idx) => ({
      id: idx + 1,
      title: cfg.title,
      status: 'pending' as StepStatus,
      content: {} as Record<string, unknown>,
    }))
  )

  const visibleSteps = ref<ReasoningStepState[]>([])
  const currentStep = ref(0)
  const isRunning = ref(false)

  const thinkingStatus = ref<ThinkingStatus>({ phase: 'idle', label: '' })
  const isThinking = computed(() =>
    thinkingStatus.value.phase !== 'idle' && thinkingStatus.value.phase !== 'done'
  )

  const currentTask = ref<CurrentTask>({ text: '' })
  const isAllCompleted = computed(() =>
    visibleSteps.value.length === steps.value.length &&
    visibleSteps.value.every(s => s.status === 'completed')
  )

  // ===== 思考日志 =====
  const thinkingLogs = ref<string[]>(['正在阅读事件信息', '正在识别事件类型', '正在判断影响方向'])

  // ===== 当前步骤标题 =====
  const currentStepTitle = computed(() => {
    if (!isRunning.value && isAllCompleted.value) return '分析完成'
    if (currentStep.value > 0) {
      const s = steps.value.find(s => s.id === currentStep.value)
      return s ? `正在分析：${s.title}` : ''
    }
    return currentTask.value.text || ''
  })

  // ===== 核心方法 =====

  async function startAnalysis(context?: AnalysisContext): Promise<void> {
    if (isRunning.value) return
    isRunning.value = true
    visibleSteps.value = []

    // 阶段 0：思考（3-4s）
    await runThinkingPhase()

    // 阶段 1-6：逐步
    for (let i = 0; i < steps.value.length; i++) {
      const step = steps.value[i]
      visibleSteps.value = [...visibleSteps.value, steps.value[i]]
      currentStep.value = step.id
      currentTask.value = { text: `正在分析：${step.title}` }

      // processing — 2-3s
      step.status = 'processing'
      await delay(800 + Math.random() * 400)

      // generating — 60-120ms/字符
      step.status = 'generating'
      const genText = generateStepText(step.id, context)
      await streamTextFast(step.id, genText)

      // completed
      step.status = 'completed'
      injectStepContent(step, context)
      await delay(800)
    }

    currentTask.value = { text: '分析完成' }
    thinkingStatus.value = { phase: 'done', label: '' }
    isRunning.value = false
  }

  async function runThinkingPhase(): Promise<void> {
    currentTask.value = { text: '正在阅读事件信息' }
    thinkingStatus.value = { phase: 'reading', label: '正在阅读事件信息' }
    await delay(1200)

    currentTask.value = { text: '正在识别事件类型' }
    thinkingStatus.value = { phase: 'identifying', label: '正在识别事件类型' }
    await delay(1200)

    currentTask.value = { text: '正在判断影响方向' }
    thinkingStatus.value = { phase: 'analyzing', label: '正在判断影响方向' }
    await delay(1000)
  }

  async function streamTextFast(stepId: number, fullText: string): Promise<void> {
    const step = steps.value.find(s => s.id === stepId)
    if (!step || !fullText) return
    for (let i = 1; i <= fullText.length; i++) {
      step.content = { ...step.content, text: fullText.slice(0, i) }
      await delay(20 + Math.random() * 30)
    }
  }

  async function streamText(stepId: number, chunk: string): Promise<void> {
    const step = steps.value.find(s => s.id === stepId)
    if (!step) return
    step.content = { ...step.content, text: ((step.content.text as string) || '') + chunk }
  }

  function addVisibleStep(stepId: number): void {
    const step = steps.value.find(s => s.id === stepId)
    if (!step) return
    if (!visibleSteps.value.find(v => v.id === stepId))
      visibleSteps.value = [...visibleSteps.value, step]
  }

  function updateStep(stepId: number, status: StepStatus): void {
    const step = steps.value.find(s => s.id === stepId)
    if (!step) return
    step.status = status
    if (status === 'processing' || status === 'generating') currentStep.value = stepId
  }

  function setStepContent(stepId: number, data: Record<string, unknown>): void {
    const step = steps.value.find(s => s.id === stepId)
    if (!step) return
    step.content = { ...step.content, ...data }
  }

  function setThinking(phase: ThinkingPhase, label: string): void {
    thinkingStatus.value = { phase, label }
  }

  function reset(): void {
    isRunning.value = false; currentStep.value = 0; visibleSteps.value = []
    thinkingStatus.value = { phase: 'idle', label: '' }; currentTask.value = { text: '' }
    steps.value.forEach(s => { s.status = 'pending'; s.content = {} })
  }

  return {
    steps, visibleSteps, currentStep, isRunning,
    thinkingStatus, isThinking, currentTask, isAllCompleted,
    thinkingLogs, currentStepTitle,
    startAnalysis, streamText, addVisibleStep, updateStep, setStepContent, setThinking, reset,
  }
}

// ==================== 模拟文本 ====================

function generateStepText(id: number, ctx?: AnalysisContext): string {
  switch (id) {
    case 1: return `该事件由${ctx?.source || '未知来源'}发布，属于${ctx?.eventType || '市场'}类事件。经AI初步分析，该事件具有显著的市场影响力，预计将通过多个传导路径影响相关行业板块。`
    case 2: return `AI正在推演事件在产业链中的传导路径。传导方向为${ctx?.transferDirection || '上游至下游产业链'}。${ctx?.transferReason || ''}事件影响将从核心节点逐级扩散至上下游产业。`
    case 3: return 'AI正在评估各行业受影响程度。利好行业集中于政策直接受益板块，利空影响向关联度较高的上下游延伸。各行业受影响幅度取决于产业链位置和弹性系数。'
    case 4: return 'AI正在拆解关键影响变量。主要变量包括政策力度、市场流动性、行业基本面、投资者情绪和国际环境。各变量权重通过历史回测和当前市场环境综合评估得出。'
    case 5: return 'AI正在回溯近5年同类型事件演变规律。相似事件在发生后30日内对相关行业产生了显著影响，当前事件的影响路径与历史规律基本一致。'
    case 6: return 'AI正在综合以上分析形成最终投资观点。综合判断整合事件影响方向、产业链传导效应、行业受益受损排序、关键变量权重和历史验证结果。'
    default: return ''
  }
}

function injectStepContent(step: ReasoningStepState, ctx?: AnalysisContext): void {
  if (step.id === 1) {
    step.content = { ...step.content, explanation: ctx?.persistenceReason || `该事件由${ctx?.source || ''}于${ctx?.publishTime?.slice(0,10) || ''}发布。` }
  } else if (step.id === 2) {
    const p = [ctx?.transferDirection, ctx?.transferReason].filter(Boolean)
    step.content = { ...step.content, explanation: p.join('；') || '该事件通过产业链上下游关系传导至相关行业。' }
  }
}

function delay(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)) }
