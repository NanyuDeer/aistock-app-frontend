/**
 * 播报悬浮窗状态管理
 * 跨页面共享播报文本/音频状态：报告页标题右侧播报按钮调用 open()，
 * FloatingPodcast 组件消费本 store 渲染悬浮球/播放条。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { agentApi } from '@/shared/api/modules/agent'

type PodcastStatus = 'idle' | 'loading' | 'ready' | 'error'

/** 播报文本最大长度（约1分钟播报时长），与后端 generate-podcast 校验一致 */
const MAX_PODCAST_TEXT_LENGTH = 250

export const usePodcastStore = defineStore('podcast', () => {
  /** 悬浮球是否显示（页面调用 open() 后显示） */
  const visible = ref(false)
  /** 是否展开为播放条（收起时为右侧悬浮球） */
  const expanded = ref(false)
  const text = ref('')
  const cacheKey = ref('')
  const title = ref('AI 播报')
  const status = ref<PodcastStatus>('idle')
  const audioUrl = ref('')
  const errorMsg = ref('')

  /** 打开播报：注入文本并自动生成/复用音频 */
  async function open(nextText: string, nextKey: string, nextTitle?: string) {
    if (!nextText || !nextKey) return
    // 同一 key 复用：已 ready 直接展开，不重复请求
    if (cacheKey.value === nextKey && status.value === 'ready' && audioUrl.value) {
      visible.value = true
      expanded.value = true
      return
    }
    text.value = nextText
    cacheKey.value = nextKey
    title.value = nextTitle || 'AI 播报'
    status.value = 'idle'
    audioUrl.value = ''
    errorMsg.value = ''
    visible.value = true
    expanded.value = true
    await generate()
  }

  /** 生成播报音频（文本裁剪到 250 字，与后端校验一致） */
  async function generate() {
    if (!text.value || !cacheKey.value) return
    status.value = 'loading'
    errorMsg.value = ''
    try {
      const trimmed = text.value.length > MAX_PODCAST_TEXT_LENGTH
        ? text.value.slice(0, MAX_PODCAST_TEXT_LENGTH)
        : text.value
      const res = await agentApi.generatePodcast(trimmed, cacheKey.value)
      audioUrl.value = res.audio_url
      status.value = 'ready'
    } catch (e: unknown) {
      errorMsg.value = e instanceof Error ? e.message : '播报生成失败，请稍后重试'
      status.value = 'error'
    }
  }

  /** 展开播放条 */
  function expand() {
    expanded.value = true
  }

  /** 收起为悬浮球 */
  function collapse() {
    expanded.value = false
  }

  /** 关闭并清除状态 */
  function close() {
    visible.value = false
    expanded.value = false
    status.value = 'idle'
    audioUrl.value = ''
    errorMsg.value = ''
  }

  return {
    visible,
    expanded,
    text,
    cacheKey,
    title,
    status,
    audioUrl,
    errorMsg,
    open,
    generate,
    expand,
    collapse,
    close,
  }
})
