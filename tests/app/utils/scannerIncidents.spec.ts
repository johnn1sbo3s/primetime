import { describe, it, expect } from 'vitest'
import { groupIncidents, layoutLane } from '~/utils/scannerIncidents'

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

describe('layoutLane', () => {
  it('sem colisão, x = trueX e sem líder', () => {
    const groups = groupIncidents({
      shots: [{ minute: 10, team: 'home', tier: 'C2', xg_delta: 0.3 }],
      goals: [],
      notifications: [],
    })
    const placed = layoutLane(groups, (g) => g.minute * 10)
    expect(placed[0].x).toBe(100)
    expect(placed[0].leaderTo).toBeNull()
  })

  it('gol ancora e chute cascateia pra esquerda com líder', () => {
    const groups = groupIncidents({
      shots: [{ minute: 42, team: 'home', tier: 'C2', xg_delta: 0.3 }],
      goals: [{ minute: 43, team: 'home', player: 'x' }],
      notifications: [],
    })
    const placed = layoutLane(groups, (g) => g.minute * 10, 30)
    const goal = placed.find((p) => p.group.winner === 'goal')
    const shot = placed.find((p) => p.group.winner === 'shot')
    expect(goal.x).toBe(430)
    expect(shot.x).toBe(400)
    expect(shot.leaderTo).toBe(420)
  })
})
