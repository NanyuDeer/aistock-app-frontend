/**
 * 播报悬浮窗状态管理（含全局互斥 + 连续播放排队）
 * 跨页面共享播报文本/音频状态：报告页标题右侧播报按钮调用 open()，
 * FloatingPodcast 组件消费本 store 渲染悬浮球/播放条；
 * briefing 等页面内音频经 acquireExternal/releaseExternal 注册，纳入全局互斥。
 */
import { defineStore } from 'pinia'
import { ref, nextTick } from 'vue'
import { agentApi } from '@/shared/api/modules/agent'
import { storage, STORAGE_KEYS } from '@/shared/utils/storage'

type PodcastStatus = 'idle' | 'loading' | 'ready' | 'error'

/** 播报文本最大长度（约1分钟播报时长），与后端 generate-podcast 校验一致 */
const MAX_PODCAST_TEXT_LENGTH = 250
/** 连续播放排队上限 */
const MAX_QUEUE = 10

/** 排队项（连续模式） */
interface QueuedItem {
  key: string
  title: string
  url: string
}

/** 播放会话（统一播放入口载荷） */
interface PlaySession {
  key: string
  title: string
  url: string
  autoplay?: boolean
  startTime?: number
}

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
  /** 直接播放模式：悬浮窗挂载后自动播放（用于早报/晚报退出页面后续播） */
  const autoplay = ref(false)
  /** 直接播放模式的续播起点（秒），配合 autoplay 从上次进度继续 */
  const startTime = ref(0)
  /** 当前是否正在播放（由 FloatingPodcast 同步，用于悬浮球旋转等 UI） */
  const playing = ref(false)
  /** 未消费的跨页续播点：播放中切页时 AudioPlayer 卸载上报，返回后重建自动续播 */
  const resumePending = ref(false)
  /** 续播起点（秒） */
  const playbackTime = ref(0)

  /** FloatingPodcast 的 AudioPlayer 控制句柄（供页面播放按钮暂停/继续悬浮窗播放） */
  interface PlayerControls {
    pause(): void
    play(): void
    togglePlay(): void
    /** 跳转进度（秒）：跨页续播用；可选，兼容无 seek 能力的控制对象 */
    seekTo?(t: number): void
  }
  const playerControls = ref<PlayerControls | null>(null)
  /** 控制句柄的注册实例 id：注销时校验归属，防止失活实例误清新实例的注册 */
  const playerOwnerId = ref<string | null>(null)

  /** FloatingPodcast 挂载时注册播放器控制（携带实例 id 归属）；卸载时注销 */
  function registerPlayer(id: string, controls: PlayerControls) {
    playerOwnerId.value = id
    playerControls.value = controls
  }
  function unregisterPlayer(id: string) {
    if (playerOwnerId.value !== id) return
    playerOwnerId.value = null
    playerControls.value = null
  }

  /** 暂停悬浮窗播放（无挂载播放器时静默，播放态同步关闭） */
  function pause() {
    playerControls.value?.pause()
    playing.value = false
  }

  /** 继续悬浮窗播放（AudioPlayer play 事件会再次同步 playing） */
  function resume() {
    playerControls.value?.play()
  }

  /** 播放/暂停切换：转发给悬浮窗 AudioPlayer（暂停后再次调用即续播，不会重置 src） */
  function togglePlay() {
    playerControls.value?.togglePlay()
  }

  /**
   * AudioPlayer 卸载上报：仅播放中记录续播点（跨页返回后重建自动续播）。
   * suspendingId 为卸载实例 id：若当前注册的播放器属于「其他实例」（多实例切换时序中
   * 新页播放器先挂载、旧页后卸载），直接把续播点消费到新播放器，避免播报停止；
   * 非播放实例卸载（playing=false）不得覆盖真实进度。
   */
  function suspendPlayback(
    state: { playing: boolean; currentTime: number },
    suspendingId = '',
  ) {
    if (!state.playing) return
    playbackTime.value = state.currentTime
    const ctrl = playerOwnerId.value && playerOwnerId.value !== suspendingId
      ? playerControls.value
      : null
    if (ctrl) {
      // 新页面播放器已就绪：nextTick 延迟一拍续播，保证同轮刷新中旧引擎销毁完成后再启动，避免双音
      const t = state.currentTime
      resumePending.value = false
      playbackTime.value = 0
      void nextTick(() => {
        if (t > 0) ctrl.seekTo?.(t)
        ctrl.play()
      })
    } else {
      resumePending.value = true
    }
  }

  /** 消费续播点（FloatingPodcast 重建 AudioPlayer 并续播后调用） */
  function consumeResume() {
    resumePending.value = false
    playbackTime.value = 0
  }

  // ===== FloatingPodcast 渲染权：当前前台页面唯一渲染 =====
  // uni-h5 所有页面被 KeepAlive 缓存（切换不卸载），首页 tab 页常驻 + 子页面实例并存；
  // 渲染权必须跟随「页面可见性」。注意：uni-app 的 onShow/onHide 是页面实例级钩子
  // （uni-h5 只在页面实例的 onBeforeActivate/onBeforeDeactivate 中调用），子组件注册的
  // onShow/onHide 永不触发，必须由页面容器改用 Vue 的 onActivated/onDeactivated 维护。
  const activePage = ref('')
  function setActivePage(key: string) {
    activePage.value = key
  }
  /** 页面失活（onHide/onDeactivated）：仅当本页仍持有渲染权时清空，
   *  防止旧页失活事件晚于新页激活事件时把新页渲染权一并抹掉 */
  function clearActivePage(key: string) {
    if (activePage.value === key) activePage.value = ''
  }

  // ===== 8.10 新增：全局互斥 + 连续播放排队 =====
  /** 连续播放开关（持久化；关=互斥默认，开=排队顺序播放） */
  const continuousPlay = ref<boolean>(storage.get(STORAGE_KEYS.PODCAST_CONTINUOUS) === true)
  /** 排队队列（连续模式下使用） */
  const queue = ref<QueuedItem[]>([])
  /** 外部注册的音频（如 briefing 页面 innerAudioContext） */
  const externalActive = ref<{ key: string; stop: () => void } | null>(null)
  /** 挂起的外部音频（连续模式且悬浮窗占用时暂存，空闲后按请求先后激活） */
  const pendingExternal = ref<{ key: string; play: () => void; stop: () => void } | null>(null)

  /** 同步播放状态（FloatingPodcast 的 AudioPlayer play/pause/ended 事件驱动） */
  function setPlaying(value: boolean) {
    playing.value = value
  }

  /** 切换连续播放开关并持久化 */
  function toggleContinuous() {
    continuousPlay.value = !continuousPlay.value
    if (!continuousPlay.value) {
      // 切回互斥模式（不排队）：清空残留队列与挂起外部音频，
      // 避免 releaseExternal 消费残留队列抢占已就绪播报
      queue.value = []
      pendingExternal.value = null
    }
    storage.set(STORAGE_KEYS.PODCAST_CONTINUOUS, continuousPlay.value)
  }

  /** 当前是否被音频占用（播放中或已就绪待播） */
  function isBusy(): boolean {
    return playing.value || (status.value === 'ready' && !!audioUrl.value)
  }

  /** 停止外部注册音频（互斥语义） */
  function stopExternal() {
    if (externalActive.value) {
      try {
        externalActive.value.stop()
      } catch {
        // 忽略外部 stop 异常
      }
    }
  }

  /** 复位悬浮窗播放器（用于外部音频抢占时让 AudioPlayer 卸载/停止） */
  function resetPlayer() {
    status.value = 'idle'
    audioUrl.value = ''
    errorMsg.value = ''
    playing.value = false
    autoplay.value = false
    startTime.value = 0
    expanded.value = false
  }

  /** 加载并播放一个会话（直接替换当前播放器内容）；默认收起为悬浮球，不展开播放条 */
  function startPlayback(session: PlaySession) {
    stopExternal()
    // 新会话开始：清掉未消费的跨页续播点（防止旧音频续播残留）
    resumePending.value = false
    playbackTime.value = 0
    text.value = ''
    cacheKey.value = session.key
    title.value = session.title || 'AI 播报'
    status.value = 'ready'
    audioUrl.value = session.url
    errorMsg.value = ''
    visible.value = true
    expanded.value = false
    autoplay.value = session.autoplay ?? true
    startTime.value = Math.max(0, session.startTime ?? 0)
  }

  /** 统一播放入口：互斥模式停止旧音频立即播；连续模式当前占用则入队 */
  function requestPlay(session: PlaySession) {
    if (!session.url || !session.key) return
    if (continuousPlay.value && isBusy()) {
      if (queue.value.length >= MAX_QUEUE) {
        uni.showToast({ title: '播报队列已满', icon: 'none' })
        return
      }
      queue.value.push({ key: session.key, title: session.title, url: session.url })
      // 保证悬浮球/播放条可见，展示队列等待态（球不旋转）
      visible.value = true
      expanded.value = false
      uni.showToast({ title: '已加入播报队列', icon: 'none' })
      return
    }
    startPlayback(session)
  }

  /**
   * 外部页面音频注册（晚报/早报等页面内 innerAudioContext 播放前调用）
   * 互斥模式：停止悬浮窗当前播放后立即 play()。
   * 连续模式：悬浮窗占用时挂起（pendingExternal，不立即播，避免叠音），
   *           由 onAudioEnded/释放时在播报队列之前优先激活。
   * @returns release 函数（音频结束/页面卸载时调用）
   */
  function acquireExternal(key: string, play: () => void, stop: () => void): () => void {
    if (continuousPlay.value && isBusy()) {
      pendingExternal.value = { key, play, stop }
      return () => {
        if (pendingExternal.value?.key === key) pendingExternal.value = null
        releaseExternal(key)
      }
    }
    if (!continuousPlay.value) {
      resetPlayer()
    }
    externalActive.value = { key, stop }
    play()
    return () => releaseExternal(key)
  }

  /** 外部音频注销 */
  function releaseExternal(key: string) {
    // 先清理同名挂起注册：页面卸载/用户取消时，挂起项一并取消，避免 onAudioEnded 激活残留 play()
    if (pendingExternal.value?.key === key) pendingExternal.value = null
    if (externalActive.value?.key !== key) return
    externalActive.value = null
    // 外部音频结束：消费播报队列下一项（若有）
    const next = queue.value.shift()
    if (next) {
      startPlayback({ key: next.key, title: next.title, url: next.url })
    }
  }

  /** FloatingPodcast AudioPlayer ended：消费队列下一项 */
  function onAudioEnded() {
    playing.value = false
    // 连续模式：先激活挂起的外部音频（按请求先后），再消费播报队列
    if (pendingExternal.value) {
      const p = pendingExternal.value
      pendingExternal.value = null
      externalActive.value = { key: p.key, stop: p.stop }
      p.play()
      return
    }
    const next = queue.value.shift()
    if (next) {
      startPlayback({ key: next.key, title: next.title, url: next.url })
    }
  }

  /** 打开播报：注入文本并自动生成/复用音频 */
  async function open(nextText: string, nextKey: string, nextTitle?: string) {
    if (!nextText || !nextKey) return
    // 同一 key 复用：已 ready 直接显示（保持收起/展开现状），不重复请求
    if (cacheKey.value === nextKey && status.value === 'ready' && audioUrl.value) {
      visible.value = true
      return
    }
    // 连续模式：当前被音频占用 → 后台生成并入队，不触碰当前播放状态
    if (continuousPlay.value && isBusy()) {
      void buildAndEnqueue(nextText, nextKey, nextTitle || 'AI 播报')
      return
    }
    // 互斥模式：新播报请求即停止外部音频，避免生成期间叠音
    stopExternal()
    text.value = nextText
    cacheKey.value = nextKey
    title.value = nextTitle || 'AI 播报'
    status.value = 'loading'
    audioUrl.value = ''
    errorMsg.value = ''
    visible.value = true
    expanded.value = false
    await generate()
  }

  /** 连续模式后台生成：完成拿到 url 后入队（不写共享播放状态，避免打断当前音频） */
  async function buildAndEnqueue(text: string, key: string, title: string) {
    try {
      const trimmed = text.length > MAX_PODCAST_TEXT_LENGTH
        ? text.slice(0, MAX_PODCAST_TEXT_LENGTH)
        : text
      const res = await agentApi.generatePodcast(trimmed, key)
      if (queue.value.length >= MAX_QUEUE) {
        uni.showToast({ title: '播报队列已满', icon: 'none' })
        return
      }
      queue.value.push({ key, title, url: res.audio_url })
      visible.value = true
      uni.showToast({ title: '已加入播报队列', icon: 'none' })
    } catch {
      uni.showToast({ title: '播报生成失败', icon: 'none' })
    }
  }

  /**
   * 直接播放已有音频（跳过文本合成）：用于早报/晚报等页面退出时把播放移交悬浮窗。
   * 挂载后自动播放，并从 resumeAt 处续播；默认收起为悬浮球（不展开播放条）。
   */
  function playDirect(url: string, nextKey: string, nextTitle: string, resumeAt = 0) {
    if (!url || !nextKey) return
    requestPlay({ key: nextKey, title: nextTitle, url, autoplay: true, startTime: resumeAt })
  }

  /** 自动播放消费完成后复位（由 AudioPlayer 首次 play 事件触发，避免收起再展开时重复自动播放） */
  function consumeAutoplay() {
    autoplay.value = false
  }

  /** 生成播报音频（文本裁剪到 250 字，与后端校验一致）；互斥模式下 open 已先行 stopExternal */
  async function generate() {
    if (!text.value || !cacheKey.value) return
    status.value = 'loading'
    errorMsg.value = ''
    const key = cacheKey.value // 生成期间可能被新请求覆盖，用于丢弃迟到结果
    try {
      const trimmed = text.value.length > MAX_PODCAST_TEXT_LENGTH
        ? text.value.slice(0, MAX_PODCAST_TEXT_LENGTH)
        : text.value
      const res = await agentApi.generatePodcast(trimmed, key)
      if (cacheKey.value !== key) return // 迟到结果：key 已被新请求占用，丢弃
      audioUrl.value = res.audio_url
      status.value = 'ready'
    } catch (e: unknown) {
      if (cacheKey.value !== key) return
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
    playerControls.value?.pause()
    resumePending.value = false
    playbackTime.value = 0
    queue.value = []
    externalActive.value = null
    pendingExternal.value = null
    visible.value = false
    expanded.value = false
    status.value = 'idle'
    audioUrl.value = ''
    errorMsg.value = ''
    autoplay.value = false
    startTime.value = 0
    playing.value = false
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
    autoplay,
    startTime,
    playing,
    continuousPlay,
    queue,
    pendingExternal,
    open,
    playDirect,
    consumeAutoplay,
    setPlaying,
    registerPlayer,
    unregisterPlayer,
    pause,
    resume,
    togglePlay,
    suspendPlayback,
    consumeResume,
    resumePending,
    playbackTime,
    activePage,
    setActivePage,
    clearActivePage,
    generate,
    expand,
    collapse,
    close,
    toggleContinuous,
    acquireExternal,
    releaseExternal,
    onAudioEnded,
  }
})
