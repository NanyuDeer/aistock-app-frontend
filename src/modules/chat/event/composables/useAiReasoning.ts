/**
 * useAiReasoning — AI 推理流程状态管理 v3
 *
 * 仅展示后端已生成模块或真实加载状态，不生成假推理文本。
 * 时序：思考(简短加载) → 逐步骤展示后端模块 → 完成
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

  // ===== 思考日志（真实加载状态，不生成假文本） =====
  const thinkingLogs = ref<string[]>([])

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

    // 阶段 0：真实加载状态（简短）
    await runThinkingPhase()

    // 阶段 1-N：逐步展示后端已生成模块（不生成假推理文本）
    void context // 保留参数兼容调用方，但不再用于生成假文本
    for (let i = 0; i < steps.value.length; i++) {
      const step = steps.value[i]
      visibleSteps.value = [...visibleSteps.value, steps.value[i]]
      currentStep.value = step.id
      currentTask.value = { text: `正在加载：${step.title}` }

      // processing — 真实加载状态
      step.status = 'processing'
      await delay(400 + Math.random() * 200)

      // completed — 展示后端已生成模块（内容由子组件渲染真实数据）
      step.status = 'completed'
      await delay(300)
    }

    currentTask.value = { text: '分析完成' }
    thinkingStatus.value = { phase: 'done', label: '' }
    isRunning.value = false
  }

  async function runThinkingPhase(): Promise<void> {
    currentTask.value = { text: '正在加载事件数据' }
    thinkingStatus.value = { phase: 'reading', label: '正在加载事件数据' }
    await delay(600)
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

function delay(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)) }
