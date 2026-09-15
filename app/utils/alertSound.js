// Presets WebAudio p/ alerta novo — oscilador + envelope, sem assets.
// unlockSound() DEVE rodar dentro de um gesto (clique no toggle).
let ctx = null

const VOICES = {
  ping: [{ freq: 880, at: 0, dur: 0.12 }],
  pop: [
    { freq: 520, at: 0, dur: 0.08 },
    { freq: 780, at: 0.09, dur: 0.1 },
  ],
  chime: [
    { freq: 660, at: 0, dur: 0.12 },
    { freq: 880, at: 0.12, dur: 0.12 },
    { freq: 1320, at: 0.24, dur: 0.18 },
  ],
}

export function isSoundReady() {
  return !!ctx && ctx.state === 'running'
}

export async function unlockSound() {
  try {
    const scope = typeof window !== 'undefined' ? window : globalThis
    const AC = scope.AudioContext || scope.webkitAudioContext || globalThis.AudioContext
    if (!AC) return false
    if (!ctx) ctx = new AC()
    if (ctx.state !== 'running') await ctx.resume()
    return isSoundReady()
  } catch {
    return false
  }
}
export function playPreset(id) {
  const voice = VOICES[id] || VOICES.ping
  if (!isSoundReady()) return false
  try {
    for (const { freq, at, dur } of voice) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      const t0 = ctx.currentTime + at
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0)
      osc.stop(t0 + dur + 0.05)
    }
    return true
  } catch {
    return false
  }
}
// Preview p/ clique no preset: desbloqueia (gesto) e toca sempre, mesmo com
// o som master desligado. Sem isso o clique parece "morto" e, com o som
// persistido de outra sessão, o contexto nunca resume (autoplay policy).
export async function previewPreset(id) {
  await unlockSound()
  return playPreset(id)
}
