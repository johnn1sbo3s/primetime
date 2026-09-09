// tests/app/utils/scannerShots.spec.ts
import { describe, it, expect } from 'vitest'
import { collectShots, countShotsByTier, emptyShotTotals } from '~/utils/scannerShots'

// chute no shape do contrato do backend: {minute, team, xg_delta, tier, label}
const shot = (minute, team, tier, delta, label) => ({
  minute,
  team,
  xg_delta: delta,
  tier,
  ...(label ? { label } : {}),
})

// ponto xG do histórico/merged: {minute, xg_home, xg_away, shot_events}
const point = (minute, xgHome, xgAway, shotEvents = []) => ({
  minute,
  xg_home: xgHome,
  xg_away: xgAway,
  shot_events: shotEvents,
})

const ZEROS = {
  C1: { home: 0, away: 0 },
  C2: { home: 0, away: 0 },
  C3: { home: 0, away: 0 },
  C4: { home: 0, away: 0 },
}

describe('emptyShotTotals', () => {
  it('devolve o shape do backend (shot_tiers) com zeros, sempre presente', () => {
    expect(emptyShotTotals()).toEqual(ZEROS)
  })
})

describe('countShotsByTier', () => {
  it('conta por nível × lado sobre os shot_events dos pontos', () => {
    const totals = countShotsByTier([
      point(10, 0.5, 0.2, [shot(10, 'home', 'C2', 0.3), shot(10, 'away', 'C1', 0.6)]),
      point(20, 0.8, 0.3, [shot(20, 'home', 'C2', 0.25)]),
      point(30, 0.9, 0.5, [shot(30, 'away', 'C4', 0.04)]),
    ])
    expect(totals).toEqual({
      C1: { home: 0, away: 1 },
      C2: { home: 2, away: 0 },
      C3: { home: 0, away: 0 },
      C4: { home: 0, away: 1 },
    })
  })

  it('chute repetido (mesmo minute/team/xg_delta) conta 1×', () => {
    // histórico e delta do ciclo trazem o mesmo chute do minuto 10
    const totals = countShotsByTier([
      point(10, 0.5, 0.2, [shot(10, 'home', 'C2', 0.3)]),
      point(10, 0.55, 0.2, [shot(10, 'home', 'C2', 0.3)]),
    ])
    expect(totals.C2).toEqual({ home: 1, away: 0 })
  })

  it('mesmo delta em minutos distintos conta separado', () => {
    const totals = countShotsByTier([
      point(10, 0.5, 0.2, [shot(10, 'home', 'C2', 0.3)]),
      point(70, 1.2, 0.3, [shot(70, 'home', 'C2', 0.3)]),
    ])
    expect(totals.C2).toEqual({ home: 2, away: 0 })
  })

  it('tier C5 e team desconhecido são ignorados em silêncio (sem bucket fantasma)', () => {
    const totals = countShotsByTier([point(10, 0.5, 0.2, [shot(10, 'home', 'C5', 0.9), shot(10, 'middle', 'C1', 0.6)])])
    expect(totals).toEqual(ZEROS)
  })

  it('pontos sem shot_events, null, não-lista e lixo não quebram → zeros', () => {
    expect(countShotsByTier([])).toEqual(ZEROS)
    expect(countShotsByTier(undefined)).toEqual(ZEROS)
    expect(countShotsByTier(null)).toEqual(ZEROS)
    expect(countShotsByTier([{ minute: 1, xg_home: 0.1, xg_away: 0 }])).toEqual(ZEROS)
    expect(countShotsByTier([{ shot_events: null }])).toEqual(ZEROS)
    expect(countShotsByTier([{ shot_events: 'x' }])).toEqual(ZEROS)
    expect(countShotsByTier([{ shot_events: [42, 'x', null] }])).toEqual(ZEROS)
  })
})

describe('collectShots', () => {
  it('achata os shot_events dos pontos em 1 lista, com dedup', () => {
    const a = shot(10, 'home', 'C2', 0.3)
    const b = shot(20, 'away', 'C1', 0.55)
    const list = collectShots([
      point(10, 0.5, 0.2, [a]),
      point(20, 0.8, 0.3, [b]),
      point(10, 0.55, 0.2, [a]), // repetido
    ])
    expect(list).toEqual([a, b])
  })

  it('ignora pontos sem shot_events e eventos não-objeto', () => {
    expect(collectShots([{ minute: 1 }])).toEqual([])
    expect(collectShots([])).toEqual([])
    expect(collectShots([{ shot_events: [42, null, 'x'] }])).toEqual([])
  })
})
