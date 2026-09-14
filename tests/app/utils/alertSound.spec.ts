import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isSoundReady, playPreset, unlockSound } from '~/utils/alertSound.js'

describe('alertSound', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })
  it('sem AudioContext não quebra e não está pronto', () => {
    expect(isSoundReady()).toBe(false)
    expect(() => playPreset('ping')).not.toThrow()
  })
  it('unlock com contexto stub fica pronto e toca', async () => {
    const gainNode = { connect: vi.fn() }
    const osc = { connect: vi.fn(() => gainNode), frequency: { value: 0 }, start: vi.fn(), stop: vi.fn() }
    const gain = { connect: vi.fn(), gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } }
    const ctx = {
      state: 'suspended',
      resume: vi.fn(async () => {
        ctx.state = 'running'
      }),
      createOscillator: () => osc,
      createGain: () => gain,
      currentTime: 0,
      destination: {},
    }
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function () {
        return ctx
      }),
    )
    await unlockSound()
    expect(isSoundReady()).toBe(true)
    playPreset('pop')
    expect(osc.start).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
  it('preset desconhecido cai no ping sem quebrar', () => {
    expect(() => playPreset('ops')).not.toThrow()
  })
})
