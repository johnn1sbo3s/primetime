// app/utils/scannerShots.js
// Tipos de chute (C1–C4) do scanner: contagem por nível × lado e merge do
// gráfico de xG. Contrato do backend (momentum-scanner, TICKETS.md:5):
// chute = {minute, team: 'home'|'away', xg_delta, tier: 'C1'..'C4', label};
// C1 grande chance (>=0.50) / C2 boa chance (0.20–0.50) / C3 chance média
// (0.05–0.20) / C4 sem perigo (<0.05). No live, game.shot_events é o delta
// do ciclo (vazio = normal); no histórico, cada ponto carrega shot_events.
// Funções puras — mesmo estilo de scannerPressure.js (guards Array.isArray,
// tolerantes a null/undefined, sem efeitos colaterais).

const TIERS = ['C1', 'C2', 'C3', 'C4']

// Chave de dedup: (minute, team, xg_delta) — mais forte que a do store
// (team, xg_delta) e idêntica à do shot_totals do backend (event_key).
// Paridade: o dedup roda aqui ANTES do filtro de tier (backend filtra
// primeiro), mas a divergência é impossível — o tier é função determinística
// do xg_delta, então a mesma chave nunca carrega tiers diferentes. O template
// de string preserva a precisão do double vinda do backend (mesmo pipeline).
const eventKey = (e) => `${e?.minute}|${e?.team}|${e?.xg_delta}`

export function emptyShotTotals() {
  return {
    C1: { home: 0, away: 0 },
    C2: { home: 0, away: 0 },
    C3: { home: 0, away: 0 },
    C4: { home: 0, away: 0 },
  }
}

// Achata os shot_events dos pontos xG (histórico/merged) em 1 lista, com
// dedup por (minute, team, xg_delta). Pontos sem shot_events, null ou
// não-lista → ignorados; eventos não-objeto → ignorados.
export function collectShots(points) {
  const out = []
  const seen = new Set()
  for (const p of Array.isArray(points) ? points : []) {
    if (!Array.isArray(p?.shot_events)) continue
    for (const e of p.shot_events) {
      if (!e || typeof e !== 'object') continue
      const key = eventKey(e)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(e)
    }
  }
  return out
}

// Conta chutes por nível × lado sobre os pontos xG (histórico/merged), no
// shape do shot_tiers do backend (C1..C4 × home/away), sempre presente com
// zeros quando vazio. Tier fora de C1-C4 ou team fora de home/away →
// ignorado em silêncio (sem bucket fantasma, sem throw).
export function countShotsByTier(points) {
  const totals = emptyShotTotals()
  for (const e of collectShots(points)) {
    if (!TIERS.includes(e.tier) || (e.team !== 'home' && e.team !== 'away')) continue
    totals[e.tier][e.team] += 1
  }
  return totals
}
