// tests/app/utils/scannerShots.spec.ts
import { describe, it, expect } from 'vitest'
import { collectShots, countShotsByTier, emptyShotTotals, mergeXgSeries } from '~/utils/scannerShots'

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

describe('mergeXgSeries', () => {
  const shotEv = (minute, team, tier, delta) => ({
    minute,
    team,
    xg_delta: delta,
    tier,
    label: `${tier}@${minute}`,
  })

  it('mesmo minuto: xg do ao vivo vence E shot_events preservam os do histórico + delta', () => {
    const history = [point(10, 0.2, 0.1, [shotEv(10, 'home', 'C2', 0.3)])]
    const live = [{ minute: 10, xg_home: 0.5, xg_away: 0.2, shot_events: [shotEv(10, 'away', 'C1', 0.55)] }]
    const merged = mergeXgSeries(history, live)
    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({ minute: 10, xg_home: 0.5, xg_away: 0.2 })
    expect(merged[0].shot_events).toHaveLength(2)
    expect(merged[0].shot_events).toContainEqual(shotEv(10, 'home', 'C2', 0.3))
    expect(merged[0].shot_events).toContainEqual(shotEv(10, 'away', 'C1', 0.55))
  })

  it('chute repetido entre histórico e delta conta 1× no minuto', () => {
    const history = [point(10, 0.2, 0.1, [shotEv(10, 'home', 'C2', 0.3)])]
    const live = [{ minute: 10, xg_home: 0.5, xg_away: 0.1, shot_events: [shotEv(10, 'home', 'C2', 0.3)] }]
    const merged = mergeXgSeries(history, live)
    expect(merged[0].shot_events).toEqual([shotEv(10, 'home', 'C2', 0.3)])
  })

  it('ponto ao vivo sem par no histórico é acrescentado e tudo ordena por minuto', () => {
    const history = [point(30, 0.9, 0.5, []), point(10, 0.2, 0.1, [shotEv(10, 'home', 'C2', 0.3)])]
    const live = [{ minute: 20, xg_home: 0.4, xg_away: 0.2, shot_events: [shotEv(20, 'away', 'C3', 0.12)] }]
    const merged = mergeXgSeries(history, live)
    expect(merged.map((p) => p.minute)).toEqual([10, 20, 30])
    expect(merged[1].shot_events).toHaveLength(1)
  })

  it('live vazio → histórico inalterado (mesma referência)', () => {
    const history = [point(10, 0.2, 0.1, [shotEv(10, 'home', 'C2', 0.3)])]
    expect(mergeXgSeries(history, [])).toBe(history)
    expect(mergeXgSeries(history, undefined)).toEqual(history)
  })

  it('histórico vazio → só os pontos ao vivo, ordenados', () => {
    const live = [
      { minute: 30, xg_home: 0.9, xg_away: 0.5, shot_events: [] },
      { minute: 20, xg_home: 0.4, xg_away: 0.2, shot_events: [shotEv(20, 'away', 'C3', 0.12)] },
    ]
    const merged = mergeXgSeries([], live)
    expect(merged.map((p) => p.minute)).toEqual([20, 30])
    expect(merged[0].shot_events).toHaveLength(1)
  })

  it('não muta as entradas (props reativas): copia pontos e arrays, inclusive minuto sem par no live', () => {
    const hShots = [shotEv(10, 'home', 'C2', 0.3)]
    const hShots30 = [shotEv(30, 'away', 'C4', 0.02)]
    const lShots = [shotEv(10, 'away', 'C1', 0.55)]
    const history = [point(10, 0.2, 0.1, hShots), point(30, 0.9, 0.5, hShots30)]
    const live = [{ minute: 10, xg_home: 0.5, xg_away: 0.2, shot_events: lShots }]
    const merged = mergeXgSeries(history, live)
    expect(merged[0]).not.toBe(history[0])
    expect(history[0].shot_events).toEqual(hShots)
    expect(history[0].shot_events).toHaveLength(1)
    expect(live[0].shot_events).toEqual(lShots)
    expect(history[0].xg_home).toBe(0.2)
    // minuto 30 não tem par no live: ponto copiado E array de shot_events
    // também copiado — mutar merged[i].shot_events (Tickets 3/4) jamais atinge
    // o store dos props (shallow-readonly)
    expect(merged[1]).not.toBe(history[1])
    expect(merged[1].shot_events).not.toBe(hShots30)
    expect(merged[1].shot_events).toEqual(hShots30)
    expect(history[1].shot_events).toBe(hShots30)
    expect(history[1].xg_home).toBe(0.9)
  })

  it('pipeline composta (uso real dos Tickets 3/4): countShotsByTier(mergeXgSeries(...)) sem double-count', () => {
    const history = [point(10, 0.2, 0.1, [shotEv(10, 'home', 'C2', 0.3)])]
    const live = [{ minute: 10, xg_home: 0.5, xg_away: 0.2, shot_events: [shotEv(10, 'away', 'C1', 0.55)] }]
    const totals = countShotsByTier(mergeXgSeries(history, live))
    expect(totals.C1).toEqual({ home: 0, away: 1 })
    expect(totals.C2).toEqual({ home: 1, away: 0 })
    // chute repetido entre histórico e delta atravessa o merge → conta 1×
    const dup = countShotsByTier(
      mergeXgSeries(history, [
        { minute: 10, xg_home: 0.5, xg_away: 0.2, shot_events: [shotEv(10, 'home', 'C2', 0.3)] },
      ]),
    )
    expect(dup.C2).toEqual({ home: 1, away: 0 })
  })

  it('minuto como string e como número colidem no mesmo ponto (chaves normalizadas)', () => {
    const history = [{ minute: '10', xg_home: 0.2, xg_away: 0.1, shot_events: [shotEv(10, 'home', 'C2', 0.3)] }]
    const live = [{ minute: 10, xg_home: 0.5, xg_away: 0.2, shot_events: [shotEv(10, 'away', 'C1', 0.55)] }]
    const merged = mergeXgSeries(history, live)
    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({ xg_home: 0.5, xg_away: 0.2 })
    expect(merged[0].shot_events).toHaveLength(2)
  })

  it('lado ausente/null no ponto ao vivo mantém o valor do histórico (xG não regride)', () => {
    const history = [point(10, 0.2, 0.1, [shotEv(10, 'home', 'C2', 0.3)])]
    // live só atualiza o xg_home; xg_away ausente → histórico preservado
    const live = [{ minute: 10, xg_home: 0.5, shot_events: [] }]
    const merged = mergeXgSeries(history, live)
    expect(merged[0]).toMatchObject({ xg_home: 0.5, xg_away: 0.1 })
  })

  it('entradas-lixo dentro de history/live (null, não-objeto) são ignoradas, sem throw', () => {
    const history = [null, 'x', point(10, 0.2, 0.1, [shotEv(10, 'home', 'C2', 0.3)])]
    const live = [42, { minute: 20, xg_home: 0.4, xg_away: 0.2, shot_events: [shotEv(20, 'away', 'C3', 0.12)] }]
    const merged = mergeXgSeries(history, live)
    expect(merged.map((p) => p.minute)).toEqual([10, 20])
    expect(merged[0].shot_events).toHaveLength(1)
  })

  it('incremental (uso real do Task 4): 2 ciclos no mesmo minuto sem avanço de relógio preservam os 2 chutes', () => {
    // O watch do scannerCard chama mergeXgSeries(amostras, [entry]) a cada poll.
    // Se o minuto exibido não avançar (90' + acréscimos), o ciclo B não pode
    // apagar o chute do ciclo A — o merge é associativo por minuto.
    const history = [point(10, 0.2, 0.1, [shotEv(10, 'home', 'C2', 0.3)])]
    const cycleA = [{ minute: 10, xg_home: 0.5, xg_away: 0.2, shot_events: [shotEv(10, 'away', 'C1', 0.55)] }]
    const cycleB = [{ minute: 10, xg_home: 0.6, xg_away: 0.25, shot_events: [shotEv(10, 'away', 'C3', 0.12)] }]
    const afterA = mergeXgSeries(history, cycleA)
    const afterB = mergeXgSeries(afterA, cycleB)
    expect(afterB).toHaveLength(1)
    expect(afterB[0]).toMatchObject({ xg_home: 0.6, xg_away: 0.25 }) // xg mais novo vence
    expect(afterB[0].shot_events).toHaveLength(3) // 1 do histórico + 1 do ciclo A + 1 do ciclo B
  })

  it('ponto do histórico SEM a chave shot_events + delta do ao vivo no mesmo minuto (unionEvents com undefined)', () => {
    const history = [{ minute: 10, xg_home: 0.2, xg_away: 0.1 }] // sem shot_events
    const live = [{ minute: 10, xg_home: 0.5, xg_away: 0.2, shot_events: [shotEv(10, 'away', 'C1', 0.55)] }]
    const merged = mergeXgSeries(history, live)
    expect(merged[0].shot_events).toEqual([shotEv(10, 'away', 'C1', 0.55)])
  })

  it('xg do ao vivo = 0 conta como presente e vence o histórico (0 não é nullish)', () => {
    const history = [point(10, 0.2, 0.1, [shotEv(10, 'home', 'C2', 0.3)])]
    const merged = mergeXgSeries(history, [{ minute: 10, xg_home: 0, xg_away: 0.3, shot_events: [] }])
    expect(merged[0]).toMatchObject({ xg_home: 0, xg_away: 0.3 })
    expect(merged[0].shot_events).toHaveLength(1) // histórico preservado no minuto
  })

  it('minuto não-numérico (ex.: "90+1") não colapsa em bucket NaN — é ignorado', () => {
    const history = [
      { minute: '90+1', xg_home: 0.9, xg_away: 0.5, shot_events: [shotEv(90, 'home', 'C1', 0.6)] },
      point(10, 0.2, 0.1, []),
    ]
    const merged = mergeXgSeries(history, [{ minute: 20, xg_home: 0.4, xg_away: 0.2, shot_events: [] }])
    expect(merged.map((p) => p.minute)).toEqual([10, 20]) // '90+1' descartado, não vira NaN
  })
})
