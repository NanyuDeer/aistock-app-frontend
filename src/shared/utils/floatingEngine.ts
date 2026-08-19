/**
 * 悬浮播报全局音频引擎单例
 *
 * 目的：实现「播报全局持续播放」。早报↔主页等页面切换时，页面实例的 FloatingPodcast/
 * AudioPlayer 会随渲染权（renderAllowed）挂载/卸载。若音频引擎是页面实例私有的，
 * 卸载时销毁引擎会让音频重新缓冲/重新播放（App 表现为"切页重播"、H5 表现为"卡顿"）。
 *
 * 本模块把悬浮播报的底层音频引擎提升为模块级单例：
 *  - attachPersistent(src, events)：页面播放器挂载时"附着"。同 src 复用已持续播放的引擎
 *    （reused=true），换 src 才销毁旧引擎新建。
 *  - detachPersistent()：页面播放器卸载时"脱离"。引擎保持播放（音频在后台持续），
 *    仅解除事件订阅（不再驱动旧页面的 UI 状态）。
 *  - destroyPersistent()：彻底停止并释放引擎（用户关闭播报、外部音频抢占、新会话开始时）。
 *
 * 平台分流与 AudioPlayer 一致：H5/浏览器用 HTMLAudioElement，App/小程序用
 * uni.createInnerAudioContext()；对运行时应探测（typeof Audio / globalThis.uni）。
 */
export interface FloatingEvents {
  /** 播放进度更新（由全局引擎转发，UI 侧据此刷新进度条） */
  onTimeUpdate: (currentTime: number, duration: number) => void
  onPlay: () => void
  onPause: () => void
  onEnded: () => void
}

/** 全局引擎句柄（供 AudioPlayer persist 模式持有并暴露控制） */
export interface PersistentEngine {
  readonly src: string
  readonly currentTime: number
  readonly duration: number
  /** 是否处于播放态；附着复用时用于同步 UI playing 状态 */
  readonly isPlaying: boolean
  play(): void
  pause(): void
  seek(t: number): void
}

export interface AttachResult {
  engine: PersistentEngine
  /** 是否复用了已存在且持续播放中的引擎（同 src 续播），而非新建 */
  reused: boolean
}

/** uni InnerAudioContext 最小可用接口（与 AudioPlayer 保持一致） */
interface InnerAudioLike {
  src: string
  currentTime: number
  duration: number
  paused: boolean
  play(): void
  pause(): void
  seek(t: number): void
  onTimeUpdate(cb: () => void): void
  onCanplay(cb: () => void): void
  onPlay(cb: () => void): void
  onPause(cb: () => void): void
  onEnded(cb: () => void): void
  stop(): void
  destroy(): void
}

/* ===== 事件订阅盒：native 监听始终挂在引擎上，读最新的 events（附着/脱离替换） ===== */
const noop: FloatingEvents = {
  onTimeUpdate: () => {},
  onPlay: () => {},
  onPause: () => {},
  onEnded: () => {},
}

const eventsBox: { current: FloatingEvents } = { current: noop }

interface Holder {
  src: string
  engine: PersistentEngine
  /** 彻底停机（App 用 ctx.stop/destroy，H5 暂停并清空 src） */
  stop(): void
}

let holder: Holder | null = null

/** 转发 native 事件到当前的 events 订阅（脱离后为空实现，UI 不再被驱动，但引擎继续响） */
function fire(key: keyof FloatingEvents, ...args: unknown[]): void {
  const fn = eventsBox.current[key]
  if (typeof fn === 'function') (fn as (...a: unknown[]) => void).apply(null, args)
}

function createH5(src: string): { engine: PersistentEngine; stop(): void } {
  const audio = new Audio()
  audio.src = src
  audio.preload = 'metadata'
  // canplay 前 seek 可能无效：暂存目标进度，载入后补应用（跨页续播场景）
  let pendingSeek: number | null = null

  audio.addEventListener('timeupdate', () => fire('onTimeUpdate', audio.currentTime, audio.duration || 0))
  audio.addEventListener('play', () => fire('onPlay'))
  audio.addEventListener('pause', () => fire('onPause'))
  audio.addEventListener('ended', () => fire('onEnded'))
  audio.addEventListener('loadedmetadata', () => {
    if (pendingSeek != null) {
      try { audio.currentTime = pendingSeek } catch { /* 忽略 */ }
      pendingSeek = null
    }
  })

  const engine: PersistentEngine = {
    src,
    get currentTime() { return audio.currentTime },
    get duration() { return isFinite(audio.duration) ? audio.duration : 0 },
    get isPlaying() { return !audio.paused && !audio.ended },
    play: () => { void audio.play().catch(() => { /* 自动播放被拦截，静默 */ }) },
    pause: () => audio.pause(),
    seek: (t) => {
      try {
        if (audio.readyState >= 1) audio.currentTime = t
        else pendingSeek = t
      } catch { /* 无 src 时设置可能失败，忽略 */ }
    },
  }
  return {
    engine,
    stop: () => { audio.pause(); audio.removeAttribute('src'); audio.load() },
  }
}

function createUni(src: string): { engine: PersistentEngine; stop(): void } {
  const u = getUni()
  if (!u) throw new Error('floatingEngine: uni.createInnerAudioContext unavailable')
  const ctx = u.createInnerAudioContext()
  ctx.src = src
  let pendingSeek: number | null = null

  ctx.onTimeUpdate(() => fire('onTimeUpdate', ctx.currentTime, ctx.duration || 0))
  ctx.onPlay(() => fire('onPlay'))
  ctx.onPause(() => fire('onPause'))
  ctx.onEnded(() => fire('onEnded'))
  ctx.onCanplay(() => {
    if (pendingSeek != null) {
      try { ctx.seek(pendingSeek) } catch { /* 忽略 */ }
      pendingSeek = null
    }
  })

  const engine: PersistentEngine = {
    src,
    get currentTime() { return ctx.currentTime },
    get duration() { return isFinite(ctx.duration) ? ctx.duration : 0 },
    get isPlaying() { return !ctx.paused },
    play: () => ctx.play(),
    pause: () => ctx.pause(),
    seek: (t) => {
      try { ctx.seek(t) } catch { /* 忽略 */ }
    },
  }
  return {
    engine,
    stop: () => { ctx.stop(); ctx.destroy() },
  }
}

/** 运行时获取 uni 全局对象（不存在则为 undefined） */
function getUni(): { createInnerAudioContext(): InnerAudioLike } | undefined {
  return (globalThis as unknown as { uni?: { createInnerAudioContext(): InnerAudioLike } }).uni
}

function hasH5Audio(): boolean {
  return typeof Audio !== 'undefined'
}

/**
 * 附着全局引擎（页面播放器挂载时调用）。
 * 同 src：复用持续播放中的引擎（不改动播放状态），仅替换事件订阅 → 切页无缝续播。
 * 不同 src：销毁旧引擎真正停机后新建。
 */
export function attachPersistent(src: string, events: FloatingEvents): AttachResult {
  if (holder && holder.src === src) {
    eventsBox.current = events
    return { engine: holder.engine, reused: true }
  }
  if (holder) {
    holder.stop()
    holder = null
  }
  const { engine, stop } = hasH5Audio() ? createH5(src) : createUni(src)
  holder = { src, engine, stop }
  eventsBox.current = events
  return { engine, reused: false }
}

/**
 * 脱离全局引擎（页面播放器卸载时调用）。
 * 引擎继续播放（音频保持后台持续），仅解除事件订阅，避免驱动已销毁页面的 UI。
 */
export function detachPersistent(): void {
  eventsBox.current = noop
}

/** 彻底停止并释放全局引擎（用户关闭播报 / 外部音频抢占 / 新会话开始时调用） */
export function destroyPersistent(): void {
  if (holder) {
    holder.stop()
    holder = null
  }
  eventsBox.current = noop
}