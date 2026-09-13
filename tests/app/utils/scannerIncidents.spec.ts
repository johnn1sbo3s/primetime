import { describe, it, expect } from 'vitest'
import { groupIncidents, sideOf, stackRows } from '~/utils/scannerIncidents'

describe('groupIncidents', () => {
  it('agrupa chute+gol+alerta do mesmo minuto com prioridade do gol', () => {
    const groups = groupIncidents({
      shots: [{ minute: 43, half: 1, team: 'home', tier: 'C2', xg_delta: 0.3, label: 'Boa chance' }],
      goals: [{ minute: 43, half: 1, stoppage_time: 0, team: 'home', player: 'x' }],
      notifications: [{ rule: 'r', label: 'Pico', minute: 43, at: 't' }],
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].winner).toBe('goal')
    expect(groups[0].extra).toBe(2)
  })

  it('ignora C4 e tiers/teams inválidos', () => {
    const groups = groupIncidents({
      shots: [
        { minute: 10, team: 'home', tier: 'C4', xg_delta: 0.01 },
        { minute: 11, team: 'home', tier: 'C9', xg_delta: 0.9 },
        { minute: 12, team: 'mid', tier: 'C1', xg_delta: 0.9 },
      ],
      goals: [],
      notifications: [],
    })
    expect(groups).toHaveLength(0)
  })

  it('minuto só com alerta vira winner alert', () => {
    const groups = groupIncidents({
      shots: [],
      goals: [],
      notifications: [{ rule: 'r', label: 'Pico', minute: 35, at: 't' }],
    })
    expect(groups[0].winner).toBe('alert')
    expect(groups[0].extra).toBe(0)
  })
})

describe('sideOf + stackRows', () => {
  it('gol e chute herdam o lado do time; alerta segue a pressão do minuto', () => {
    const bars = [
      { minute: 35, half: 1, home: 0.8, away: 0.1 },
      { minute: 36, half: 1, home: 0.1, away: 0.7 },
    ]
    const groups = groupIncidents({
      shots: [{ minute: 35, team: 'away', tier: 'C2', xg_delta: 0.3 }],
      goals: [{ minute: 36, team: 'away', player: 'x' }],
      notifications: [],
    })
    expect(sideOf(groups[0], bars)).toBe('away')
    expect(sideOf(groups[1], bars)).toBe('away')
    const alertHome = groupIncidents({
      shots: [],
      goals: [],
      notifications: [{ rule: 'r', label: 'P', minute: 35, at: 't' }],
    })[0]
    const alertAway = groupIncidents({
      shots: [],
      goals: [],
      notifications: [{ rule: 'r', label: 'P', minute: 36, at: 't' }],
    })[0]
    expect(sideOf(alertHome, bars)).toBe('home')
    expect(sideOf(alertAway, bars)).toBe('away')
    expect(sideOf(alertHome, [])).toBe('home')
  })

  it('sem colisão, tudo na fileira 0 com x exato', () => {
    const placed = stackRows([
      { group: { minute: 10 }, x: 100 },
      { group: { minute: 20 }, x: 200 },
    ])
    expect(placed).toHaveLength(2)
    expect(placed.every((p) => p.row === 0)).toBe(true)
    expect(placed.map((p) => p.x).sort((a, b) => a - b)).toEqual([100, 200])
  })

  it('vizinhos colidem: segunda fileira, x intacto', () => {
    const placed = stackRows([
      { group: { minute: 42 }, x: 280 },
      { group: { minute: 43 }, x: 287 },
    ])
    expect(placed.map((p) => p.row).sort()).toEqual([0, 1])
    expect(placed.map((p) => p.x).sort((a, b) => a - b)).toEqual([280, 287])
  })

  it('terceiro no mesmo ponto funde o extra no vizinho', () => {
    const placed = stackRows([
      { group: { minute: 42, extra: 0 }, x: 280 },
      { group: { minute: 43, extra: 0 }, x: 287 },
      { group: { minute: 44, extra: 2 }, x: 290 },
    ])
    expect(placed).toHaveLength(2)
    const keeper = placed.find((p) => p.group.minute === 43)
    expect(keeper.group.extra).toBe(3)
  })
})
