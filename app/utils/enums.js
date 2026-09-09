// Frozen enum tables — kill magic strings. Use these everywhere instead
// of string literals like 'exchange', 'green', 'daily', etc.

export const SOURCE = Object.freeze({
  EXCHANGE: 'exchange',
  BOOKIE: 'bookie',
})

export const RESULT = Object.freeze({
  GREEN: 'green',
  RED: 'red',
})

export const GROUP_BY = Object.freeze({
  DAY: 'day',
  BET: 'bet',
})

export const PERIOD = Object.freeze({
  DAILY: 'daily',
  MONTHLY: 'monthly',
})

// Annualization factor for Sharpe ratio of daily strategies.
export const TRADING_DAYS_PER_YEAR = 252

// API market names → display labels. Add long/awkward names here instead of
// special-casing in components. Currently empty (was 'Goleada Casa' → 'Golea. H').
export const MARKET_LABELS = Object.freeze({})

// Trading model badge colors, keyed by full API model names (lay_0x1_*).
export const TRADING_MODEL_BADGE = Object.freeze({
  lay_0x1_donkey: 'bg-blue-500/20 text-blue-400',
  lay_0x1_luigi: 'bg-green-500/20 text-green-400',
  lay_0x1_crash: 'bg-red-500/20 text-red-400',
  lay_0x1_pacman: 'bg-purple-500/20 text-purple-400',
  lay_0x1_scorpion: 'bg-amber-500/20 text-amber-400',
})

export const TRADING_MODEL_RESULT = Object.freeze({
  GREEN: 'text-green-400',
  RED_LIGHT: 'text-amber-400',
  RED: 'text-red-400',
  PENDING: 'text-zinc-400',
})

// Display label: 'lay_0x1_scorpion' -> 'Scorpion'; unknown names use the API model_label.
export function tradingModelLabel(model, fallback) {
  if (typeof model === 'string' && model.startsWith('lay_0x1_')) {
    const suffix = model.slice('lay_0x1_'.length)
    if (suffix) return suffix.charAt(0).toUpperCase() + suffix.slice(1)
  }
  return fallback ?? model
}

// Níveis de chute do scanner (tipos de chute C1–C4) → nomes PT-BR.
// Espelha o TIER_LABELS do backend (momentum/shot_classifier.py). O campo
// `label` de cada evento tem precedência quando presente; esta tabela é o
// fallback (padrão MARKET_LABELS / tradingModelLabel).
export const TIER_LABELS = Object.freeze({
  C1: 'Grande chance',
  C2: 'Boa chance',
  C3: 'Chance média',
  C4: 'Sem perigo',
})

// Display de nível: label do backend vence; senão a tabela; senão o próprio
// código (C5 etc. nunca quebra).
export function tierLabel(tier, backendLabel) {
  return backendLabel ?? TIER_LABELS[tier] ?? tier
}
