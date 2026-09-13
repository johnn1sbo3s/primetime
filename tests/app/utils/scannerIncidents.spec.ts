import { describe, it, expect } from 'vitest'
import { buildTracks, groupIncidents, sideOf, snapShotsToGoals } from '~/utils/scannerIncidents'

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

  it('inclui C4 e ignora tiers/teams inválidos', () => {
    const groups = groupIncidents({
      shots: [
        { minute: 10, team: 'home', tier: 'C4', xg_delta: 0.01 },
        { minute: 11, team: 'home', tier: 'C9', xg_delta: 0.9 },
        { minute: 12, team: 'mid', tier: 'C1', xg_delta: 0.9 },
      ],
      goals: [],
      notifications: [],
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].shots[0].tier).toBe('C4')
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

describe('sideOf + buildTracks', () => {
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

  it('minuto com chute + alerta vira item shots com +1', () => {
    const tracks = buildTracks(
      {
        shots: [{ minute: 20, team: 'home', tier: 'C2', xg_delta: 0.3, label: 'Boa chance' }],
        goals: [],
        notifications: [{ rule: 'r', label: 'Pico', minute: 20, at: 't' }],
      },
      [{ minute: 20, half: 1, home: 0.8, away: 0.1 }],
      (g) => g.minute * 10,
    )
    expect(tracks).toHaveLength(1)
    expect(tracks[0].kind).toBe('shots')
    expect(tracks[0].team).toBe('home')
    expect(tracks[0].extra).toBe(1)
  })

  it('gol vai pra trilha própria mesmo com chute no minuto', () => {
    const tracks = buildTracks(
      {
        shots: [{ minute: 43, team: 'home', tier: 'C2', xg_delta: 0.3, label: 'Boa chance' }],
        goals: [{ minute: 43, team: 'home', player: 'x' }],
        notifications: [],
      },
      [],
      (g) => g.minute * 10,
    )
    expect(tracks.map((t) => t.kind).sort()).toEqual(['goal', 'shots'])
  })

  it('vizinhos da mesma trilha fundem com popover cobrindo os dois minutos', () => {
    const tracks = buildTracks(
      {
        shots: [
          { minute: 42, team: 'home', tier: 'C2', xg_delta: 0.3, label: 'Boa chance' },
          { minute: 43, team: 'home', tier: 'C3', xg_delta: 0.1, label: 'Chance média' },
        ],
        goals: [],
        notifications: [],
      },
      [],
      (g) => g.minute * 10,
    )
    expect(tracks).toHaveLength(1)
    expect(tracks[0].x).toBe(420)
    expect(tracks[0].groups.map((g) => g.minute)).toEqual([42, 43])
    expect(tracks[0].extra).toBe(1)
  })

  it('snap: chute do mesmo time a 1min do gol assume minuto e half do gol', () => {
    const shots = [
      { minute: 42, half: 1, team: 'home', tier: 'C2', xg_delta: 0.3 },
      { minute: 41, half: 1, team: 'away', tier: 'C2', xg_delta: 0.3 },
      { minute: 40, half: 1, team: 'home', tier: 'C2', xg_delta: 0.3 },
    ]
    const goals = [{ minute: 43, half: 1, team: 'home', player: 'x' }]
    const out = snapShotsToGoals(shots, goals)
    expect(out[0].minute).toBe(43)
    expect(out[0].half).toBe(1)
    expect(out[1].minute).toBe(41)
    expect(out[2].minute).toBe(40)
  })
})
