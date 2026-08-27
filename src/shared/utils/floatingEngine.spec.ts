import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  attachPersistent,
  detachPersistent,
  destroyPersistent,
} from './floatingEngine'

/** 制造一个模拟 uni InnerAudioContext（uni 运行时无 Audio，故走 uni 路径） */
function makeFakeContext() {
  const ctx = {
    src: '',
    currentTime: 0,
    duration: 0,
    paused: true,
    play: vi.fn(function (this: { paused: boolean }) { this.paused = false }),
    pause: vi.fn(function (this: { paused: boolean }) { this.paused = true }),
    seek: vi.fn(function (this: { currentTime: number }, t: number) { this.currentTime = t }),
    onTimeUpdate: vi.fn(),
    onCanplay: vi.fn(),
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onEnded: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn(),
  }
  return ctx
}

interface Ctx {
  src: string
  currentTime: number
  duration: number
  paused: boolean
  play: ReturnType<typeof vi.fn>
  pause: ReturnType<typeof vi.fn>
  seek: ReturnType<typeof vi.fn>
  onTimeUpdate: ReturnType<typeof vi.fn>
  onCanplay: ReturnType<typeof vi.fn>
  onPlay: ReturnType<typeof vi.fn>
  onPause: ReturnType<typeof vi.fn>
  onEnded: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
}

let createCtx: ReturnType<typeof vi.fn>

function stubUniRuntime() {
  const ctx = makeFakeContext()
  createCtx = vi.fn(() => ctx)
  vi.stubGlobal('uni', { createInnerAudioContext: createCtx })
  vi.stubGlobal('Audio', undefined) // 确保走 uni 引擎路径
  return ctx
}

const events = () => ({
  onTimeUpdate: vi.fn(),
  onPlay: vi.fn(),
  onPause: vi.fn(),
  onEnded: vi.fn(),
})

describe('floatingEngine 全局持续播放引擎', () => {
  let ctx: Ctx

  beforeEach(() => {
    ctx = stubUniRuntime()
  })

  afterEach(() => {
    destroyPersistent()
    vi.unstubAllGlobals()
  })

  it('同 src 二次附着复用同一引擎（不重建），且非新建', () => {
    const first = attachPersistent('/a.mp3', events())
    const second = attachPersistent('/a.mp3', events())
    expect(createCtx).toHaveBeenCalledTimes(1) // 未新建引擎
    expect(second.engine).toBe(first.engine)
    expect(second.reused).toBe(true)
  })

  it('换 src 时销毁旧引擎并新建（旧 ctx.stop/destroy 被调用）', () => {
    attachPersistent('/a.mp3', events())
    const beforeStop = ctx.stop
    attachPersistent('/b.mp3', events())
    expect(beforeStop).toHaveBeenCalledTimes(1)
    expect(createCtx).toHaveBeenCalledTimes(2) // 新建
  })

  it('脱离（detach）不销毁引擎：音频保持播放，引擎仍可继续复用', () => {
    attachPersistent('/a.mp3', events())
    detachPersistent()
    expect(ctx.stop).not.toHaveBeenCalled()
    // 脱离后再次附着，仍复用同一引擎（createInnerAudioContext 仍只调用一次）
    const r = attachPersistent('/a.mp3', events())
    expect(r.reused).toBe(true)
    expect(createCtx).toHaveBeenCalledTimes(1)
  })

  it('彻底销毁（destroyPersistent）停止引擎（ctx.stop + ctx.destroy 被调用）', () => {
    attachPersistent('/a.mp3', events())
    destroyPersistent()
    expect(ctx.stop).toHaveBeenCalledTimes(1)
    expect(ctx.destroy).toHaveBeenCalledTimes(1)
  })
})