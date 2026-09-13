// Incidentes por minuto da faixa do gráfico de momentum.
// Entrada: shapes do live.json (shots = série xG merged por minuto,
// goals/notifications do game). C4 fica de fora (sem perigo).
// half ausente = 1 (mapeamento legado, igual ao momentumChart).

// Bola do Packball (viewBox 512) para o marcador de gol — disco branco
// embaixo + este path na cor do time por cima.
export const BALL_PATH =
  'M256 48C141.1 48 48 141.1 48 256c0 114.7 93.3 208 208 208 114.9 0 208-93.1 208-208 0-114.7-93.3-208-208-208zm127.3 80.7c8.5 8.5 16.1 17.7 22.6 27.5.7 1 .9 2.4.4 3.5L391.9 201c-.4 1-1.1 1.9-2.1 2.3l-57.5 26.2c-1.4.6-3 .4-4.2-.6l-56.6-47.6a4.1 4.1 0 0 1-1.4-3.1v-63.1c0-1.3.7-2.6 1.8-3.3l38.4-26.1c1-.7 2.3-.9 3.5-.5 25.8 8.9 49.6 23.6 69.5 43.5zm-73.9 297.6c-.4 1.2-1.4 2.1-2.6 2.4-16.3 4.8-33.4 7.2-50.8 7.2-17.5 0-34.5-2.5-50.8-7.2-1.2-.4-2.2-1.3-2.6-2.4l-16.4-43c-.4-1.1-.3-2.3.2-3.3l22.3-42.3c.7-1.3 2.1-2.1 3.5-2.1h87.5c1.5 0 2.8.8 3.5 2.1l22.3 42.3c.5 1 .6 2.2.2 3.3l-16.3 43zm-67.4-311v63.1c0 1.2-.5 2.3-1.4 3.1L183.9 229c-1.2 1-2.8 1.2-4.2.6l-57.5-26.2c-1-.5-1.8-1.3-2.1-2.3l-14.4-41.2c-.4-1.2-.3-2.5.4-3.5 6.5-9.8 14.1-19 22.6-27.5 19.9-19.9 43.7-34.6 69.6-43.3 1.2-.4 2.5-.2 3.5.5l38.4 26.1c1.1.5 1.8 1.7 1.8 3.1zM77.7 264.1l36.1-31.2c1.2-1 2.9-1.3 4.3-.6l52.4 23.8c1.1.5 1.9 1.5 2.2 2.7l14.6 57.3c.2 1 .1 2-.3 2.9l-23.2 43.9c-.7 1.3-2.1 2.2-3.6 2.1l-46-.6c-1.2 0-2.4-.6-3.2-1.6-20.5-27.7-32.5-60.6-34.7-95.4 0-1.3.5-2.5 1.4-3.3zm270.4 98.7L325 319c-.5-.9-.6-1.9-.3-2.9l14.6-57.3c.3-1.2 1.1-2.2 2.2-2.7l52.4-23.8c1.4-.6 3.1-.4 4.3.6l36.1 31.2c.9.8 1.5 2 1.4 3.3-2.1 34.8-14.2 67.6-34.7 95.4-.7 1-1.9 1.6-3.2 1.6l-46.1.6c-1.5-.1-2.9-.9-3.6-2.2z'

const DANGER = { C1: 0, C2: 1, C3: 2 }

function halfOf(item) {
  return Number(item?.half) === 2 ? 2 : 1
}

export function groupIncidents({ shots = [], goals = [], notifications = [] } = {}) {
  const byKey = new Map()
  const at = (minute, half) => {
    const key = half + ':' + minute
    if (!byKey.has(key)) byKey.set(key, { minute, half, shots: [], goal: null, alerts: [] })
    return byKey.get(key)
  }
  for (const s of shots) {
    if (!s || typeof s !== 'object') continue
    if (!['C1', 'C2', 'C3'].includes(s.tier)) continue
    if (s.team !== 'home' && s.team !== 'away') continue
    const minute = Number(s.minute)
    if (!Number.isFinite(minute)) continue
    at(minute, halfOf(s)).shots.push(s)
  }
  for (const g of goals) {
    if (!g || typeof g !== 'object') continue
    const minute = Number(g.minute)
    if (!Number.isFinite(minute)) continue
    const grp = at(minute, halfOf(g))
    if (!grp.goal) grp.goal = g
  }
  for (const n of notifications) {
    if (!n || typeof n !== 'object') continue
    const minute = Number(n.minute)
    if (!Number.isFinite(minute)) continue
    at(minute, 1).alerts.push(n)
  }
  const groups = [...byKey.values()].filter((g) => g.goal || g.shots.length > 0 || g.alerts.length > 0)
  for (const g of groups) {
    g.shots.sort((a, b) => DANGER[a.tier] - DANGER[b.tier])
    const total = g.shots.length + (g.goal ? 1 : 0) + g.alerts.length
    g.winner = g.goal ? 'goal' : g.shots.length > 0 ? 'shot' : 'alert'
    g.extra = total - 1
  }
  groups.sort((a, b) => a.half - b.half || a.minute - b.minute)
  return groups
}

// Lado da faixa: gol e chute herdam o time; alerta (sem time) vai pro lado
// que pressionava no minuto (barra com maior valor; empate ou sem barra = casa).
export function pressureSide(minute, half, bars) {
  const list = Array.isArray(bars) ? bars : []
  const h = Number(half) === 2 ? 2 : 1
  const bar =
    list.find((b) => Number(b?.minute) === Number(minute) && halfOf(b) === h) ??
    list.find((b) => Number(b?.minute) === Number(minute))
  const home = Number(bar?.home) || 0
  const away = Number(bar?.away) || 0
  return away > home ? 'away' : 'home'
}

export function sideOf(group, bars) {
  if (group?.goal) return group.goal.team === 'away' ? 'away' : 'home'
  if (group?.shots?.length > 0) return group.shots[0].team === 'away' ? 'away' : 'home'
  return pressureSide(group?.minute, group?.half, bars)
}

// Trilhas por time e tipo: gol vai pra trilha de gols, chutes+alertas pra
// trilha de chutes (alerta segue a pressão do minuto). x exato via xOf;
// vizinhos da mesma trilha a menos de pitch fundem no mais antigo (o popover
// lista todos os minutos fundidos). Sem linhas-guia.
export function buildTracks({ shots = [], goals = [], notifications = [] } = {}, bars = [], xOf = () => 0, pitch = 20) {
  const groups = groupIncidents({ shots, goals, notifications })
  const items = []
  for (const g of groups) {
    const x = xOf(g)
    if (g.goal) {
      items.push({
        kind: 'goal',
        minute: g.minute,
        half: g.half,
        team: g.goal.team,
        x,
        groups: [{ ...g, shots: [], alerts: [] }],
      })
    }
    for (const team of ['home', 'away']) {
      const teamShots = g.shots.filter((s) => s.team === team)
      const teamAlerts = g.alerts.filter(() => pressureSide(g.minute, g.half, bars) === team)
      if (teamShots.length === 0 && teamAlerts.length === 0) continue
      const all = [...teamShots].sort((a, b) => DANGER[a.tier] - DANGER[b.tier])
      items.push({
        kind: 'shots',
        minute: g.minute,
        half: g.half,
        team,
        x,
        groups: [{ ...g, shots: all, alerts: teamAlerts }],
      })
    }
  }
  const byTrack = new Map()
  for (const it of items) {
    const key = it.team + ':' + it.kind
    if (!byTrack.has(key)) byTrack.set(key, [])
    byTrack.get(key).push(it)
  }
  const out = []
  for (const list of byTrack.values()) {
    list.sort((a, b) => a.x - b.x)
    let keeper = null
    for (const it of list) {
      if (keeper && it.x - keeper.x < pitch) {
        keeper.groups.push(...it.groups)
        continue
      }
      keeper = it
      out.push(keeper)
    }
  }
  for (const it of out) {
    const shots = it.groups.flatMap((g) => g.shots).sort((a, b) => DANGER[a.tier] - DANGER[b.tier])
    const alerts = it.groups.flatMap((g) => g.alerts)
    const total = shots.length + alerts.length + (it.kind === 'goal' ? it.groups.length : 0)
    it.shownShot = shots[0] ?? null
    it.extra = total - 1
  }

  out.sort((a, b) => a.half - b.half || a.minute - b.minute)
  return out
}

// O xG amostra a cada ~60s e o gol tem minuto próprio: o chute que gerou o
// gol costuma cair 1' antes/depois. Chute C1–C3 do mesmo time a ≤1min de um
// gol assume minuto+half do gol (cópia, nunca muta a entrada).
export function snapShotsToGoals(shots, goals) {
  const list = Array.isArray(shots) ? shots : []
  const gs = (Array.isArray(goals) ? goals : []).filter((g) => g && Number.isFinite(Number(g.minute)))
  return list.map((s) => {
    if (!s || typeof s !== 'object') return s
    const m = Number(s.minute)
    if (!Number.isFinite(m)) return s
    let best = null
    let bestDist = 1
    for (const g of gs) {
      if ((g.team ?? null) !== (s.team ?? null) || g.team == null) continue
      const d = Math.abs(Number(g.minute) - m)
      if (d <= bestDist) {
        bestDist = d
        best = g
      }
    }
    if (!best) return s
    return { ...s, minute: Number(best.minute), half: halfOf(best) }
  })
}
