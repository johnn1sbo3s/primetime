# Ticket 1 (shot_events + contadores por nível) Implementation Plan

> **For agentic workers:** implement this plan task-by-task with a fresh subagent per task (or `unlazy` gates for critical work). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parsear `shot_events` no front, agregar contagem por nível (C1–C4) e lado (casa/fora), expor nomes PT-BR dos níveis e corrigir o merge ao vivo que apaga os chutes do minuto corrente.

**Architecture:** Util puro novo `app/utils/scannerShots.js` (`emptyShotTotals`, `collectShots`, `countShotsByTier`, `mergeXgSeries`) espelhando `scannerPressure.js`; `TIER_LABELS` + `tierLabel` em `app/utils/enums.js`; o ponto ao vivo de `scannerCard.vue` passa a carregar `game.shot_events` e o `merged` de `xgLineChart.vue` passa a chamar `mergeXgSeries`. Sem UI nova (barras/marcadores/tooltip são Tickets 2–4).

**Tech Stack:** Vue 3 `<script setup>` plain JS, Vitest 4 + happy-dom (specs puros, sem `// @vitest-environment nuxt`), pnpm. Repo alvo: `/Users/jone/Projetos/jonebet-frontend`.

## Global Constraints

- Comandos sempre via `pnpm` a partir de `/Users/jone/Projetos/jonebet-frontend`.
- JS puro em source (sem TypeScript); Prettier sem ponto-e-vírgula, aspas simples, 120 col, 2 espaços, tailwindcss plugin.
- Comentários/docstrings pt-BR; nomes de função/variável em inglês.
- Funções puras e tolerantes: guards `Array.isArray`, null/undefined → zeros/`[]`, nunca throw.
- Dedup sempre por `(minute, team, xg_delta)` — chave do `event_key` do backend (mais forte que `(team, xg_delta)` do store).
- Tier fora de C1–C4 ou team fora de home/away → ignorado em silêncio, sem bucket fantasma.
- NÃO tocar: `schemas.js`, `useModelApi.js`, `useXgHistory.js`, polling (passthrough já entrega `shot_events`).
- NÃO adicionar badge/row à face do card (Ticket 2); nenhum assert estrito de `scannerCard.spec.ts` deve mudar aqui.
- Não rodar suite completa nem lint/format durante as tasks (só comandos focados); suite completa só na Task 5.
- Commits somente com consentimento do usuário (combinado na discussão de branch/worktree antes da Task 1).
- Nunca mutar props reativas: o merge copia pontos (`{ ...p }`) e arrays de `shot_events`.

---

### Task 1: Agregação pura `scannerShots.js` — `emptyShotTotals`, `collectShots`, `countShotsByTier`

**Files:**
- Create: `app/utils/scannerShots.js`
- Test: `tests/app/utils/scannerShots.spec.ts`

**Interfaces:**
- Consumes: nada (módulo puro novo; vocabulário de tiers espelha o contrato do backend em `TICKETS.md:5`).
- Produces: `emptyShotTotals() -> {C1..C4: {home:0, away:0}}`, `collectShots(points) -> Array`, `countShotsByTier(points) -> totals` — Task 2 reusa o shape/`eventKey` interno; Tasks 3/4 e os Tickets 3/4 consomem.

- [ ] **Step 1: Write the failing test**

```js
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
      point(10, 0.5, 0.2, [
        shot(10, 'home', 'C2', 0.3),
        shot(10, 'away', 'C1', 0.6),
      ]),
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
    const totals = countShotsByTier([
      point(10, 0.5, 0.2, [
        shot(10, 'home', 'C5', 0.9),
        shot(10, 'middle', 'C1', 0.6),
      ]),
    ])
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/app/utils/scannerShots.spec.ts`
Expected: FAIL (ERROR — cannot find module `~/utils/scannerShots`)

- [ ] **Step 3: Write minimal implementation**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/app/utils/scannerShots.spec.ts`
Expected: PASS (8 passed)

- [ ] **Step 5: Commit** (somente após consentimento do usuário)

```bash
git add app/utils/scannerShots.js tests/app/utils/scannerShots.spec.ts
git commit -m "feat: agregação pura de chutes por nível (scannerShots)"
```

---

### Task 2: `mergeXgSeries` — união por minuto com dedup (conserto do merge ao vivo)

**Files:**
- Modify: `app/utils/scannerShots.js` (append — usa `eventKey` interno da Task 1)
- Test: `tests/app/utils/scannerShots.spec.ts` (append)

**Interfaces:**
- Consumes: `eventKey` interno (Task 1); shape do ponto do histórico `{minute, xg_home, xg_away, shot_events}` e do ponto ao vivo `{minute, xg_home, xg_away, shot_events}`.
- Produces: `mergeXgSeries(history: Array, liveSamples: Array) -> Array` (pontos ordenados por minute) — Task 4 (xgLineChart `merged`) consome.

- [ ] **Step 1: Write the failing test** (append ao fim do spec)

```js
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
    const history = [
      point(30, 0.9, 0.5, []),
      point(10, 0.2, 0.1, [shotEv(10, 'home', 'C2', 0.3)]),
    ]
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
      mergeXgSeries(history, [{ minute: 10, xg_home: 0.5, xg_away: 0.2, shot_events: [shotEv(10, 'home', 'C2', 0.3)] }]),
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
```

Não esquecer de adicionar `mergeXgSeries` ao import do topo do spec:

```js
import { collectShots, countShotsByTier, emptyShotTotals, mergeXgSeries } from '~/utils/scannerShots'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/app/utils/scannerShots.spec.ts`
Expected: FAIL (erro de carga do módulo/export — o spec inteiro falha em 0 pass até `mergeXgSeries` existir; depois disso os 14 testes de merge caem)

- [ ] **Step 3: Write minimal implementation** (append ao fim de `scannerShots.js`)

```js
// Une listas de eventos com dedup por eventKey, preservando a ordem (o
// histórico primeiro, depois os novos do delta do ciclo).
function unionEvents(...lists) {
  const seen = new Set()
  const out = []
  for (const list of lists) {
    if (!Array.isArray(list)) continue
    for (const e of list) {
      if (!e || typeof e !== 'object') continue
      const key = eventKey(e)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(e)
    }
  }
  return out
}

// Merge por minuto do gráfico xG: o xg do ponto ao vivo vence quando presente,
// mas os shot_events do minuto = união (histórico + delta do ciclo) com dedup.
// Ordena por minuto; live vazio → histórico inalterado; pontos do live sem par
// no histórico são acrescentados. Nunca muta as entradas (props reativas).
export function mergeXgSeries(history, liveSamples) {
  const hist = Array.isArray(history) ? history : []
  const live = Array.isArray(liveSamples) ? liveSamples : []
  if (!live.length) return hist
  const byMinute = new Map()
  for (const p of hist) {
    if (!p || typeof p !== 'object') continue
    const minute = Number(p.minute)
    if (!Number.isFinite(minute)) continue // minuto sempre inteiro (ciclo de detecção); nunca colapsar em NaN
    // Sempre cópia do array de shot_events (props shallow-readonly): minuto
    // sem par no live também não pode compartilhar referência com o histórico.
    byMinute.set(minute, {
      ...p,
      shot_events: Array.isArray(p.shot_events) ? [...p.shot_events] : p.shot_events,
    })
  }
  for (const p of live) {
    if (!p || typeof p !== 'object') continue
    const minute = Number(p.minute)
    if (!Number.isFinite(minute)) continue
    const prev = byMinute.get(minute)
    if (prev) {
      // xG acumulado nunca regride: lado ausente/null do ao vivo mantém o valor
      // do histórico; lado presente do ao vivo vence (0 conta como presente).
      prev.xg_home = p.xg_home ?? prev.xg_home
      prev.xg_away = p.xg_away ?? prev.xg_away
      prev.shot_events = unionEvents(prev.shot_events, p.shot_events)
    } else {
      const point = { ...p }
      point.shot_events = unionEvents(undefined, p.shot_events)
      byMinute.set(minute, point)
    }
  }
  return [...byMinute.values()].sort((a, b) => a.minute - b.minute)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/app/utils/scannerShots.spec.ts`
Expected: PASS (22 passed — 8 da Task 1 + 14 do merge)

- [ ] **Step 5: Commit** (somente após consentimento do usuário)

```bash
git add app/utils/scannerShots.js tests/app/utils/scannerShots.spec.ts
git commit -m "feat: mergeXgSeries com união por minuto e dedup (conserto do merge ao vivo)"
```

---

### Task 3: `TIER_LABELS` + `tierLabel` em `enums.js`

**Files:**
- Modify: `app/utils/enums.js` (append após `tradingModelLabel`)
- Test: `tests/app/utils/scannerShots.spec.ts` (append)

**Interfaces:**
- Consumes: nada (padrão `MARKET_LABELS`/`tradingModelLabel` já existentes no arquivo).
- Produces: `TIER_LABELS` (Object.freeze C1–C4 → nomes PT-BR) e `tierLabel(tier, backendLabel) -> string` — Tickets 3/4 (tooltip/labels) consomem.

- [ ] **Step 1: Write the failing test** (append ao fim do spec)

```js
describe('TIER_LABELS / tierLabel', () => {
  it('TIER_LABELS espelha os nomes PT-BR do backend (shot_classifier.py)', () => {
    expect(TIER_LABELS).toEqual({
      C1: 'Grande chance',
      C2: 'Boa chance',
      C3: 'Chance média',
      C4: 'Sem perigo',
    })
    expect(Object.isFrozen(TIER_LABELS)).toBe(true) // padrão das tabelas de enums.js
  })

  it('tierLabel: label do backend vence quando presente (inclusive vazio)', () => {
    expect(tierLabel('C1', 'Chance absurda')).toBe('Chance absurda')
    expect(tierLabel('C2', '')).toBe('') // label '' presente → `??` não cai no fallback
  })

  it('tierLabel: fallback da tabela quando não há label do backend', () => {
    expect(tierLabel('C2')).toBe('Boa chance')
    expect(tierLabel('C2', null)).toBe('Boa chance')
    expect(tierLabel('C2', undefined)).toBe('Boa chance')
  })

  it('tierLabel: tier desconhecido (C5) devolve o próprio código — nunca quebra', () => {
    expect(tierLabel('C5')).toBe('C5')
  })
})
```

Atualizar o import do topo do spec:

```js
import { TIER_LABELS, tierLabel } from '~/utils/enums'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/app/utils/scannerShots.spec.ts`
Expected: FAIL (erro de carga do módulo/export — o spec inteiro falha em 0 pass até `TIER_LABELS`/`tierLabel` existirem; depois disso os 4 testes de labels caem)

- [ ] **Step 3: Write minimal implementation** (append ao fim de `app/utils/enums.js`)

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/app/utils/scannerShots.spec.ts`
Expected: PASS (26 passed — 8 da Task 1 + 14 do merge + 4 de labels)

- [ ] **Step 5: Commit** (somente após consentimento do usuário)

```bash
git add app/utils/enums.js tests/app/utils/scannerShots.spec.ts
git commit -m "feat: TIER_LABELS e tierLabel com fallback em enums.js"
```

---

### Task 4: Conserto do merge ao vivo — ponto do `watch` + `merged` do gráfico

**Files:**
- Modify: `app/components/scannerCard.vue` (import de `mergeXgSeries` no topo; bloco do `watch` em `openXgHistory`, ~linhas 425–438 — entry carregando `shot_events` + upsert por minuto via `mergeXgSeries`)
- Modify: `app/components/xgLineChart.vue:66-74` (computed `merged`; import no topo)
- Test: nenhum spec novo NESTE ticket — ver "Cobertura do wiring" abaixo

**Interfaces:**
- Consumes: `mergeXgSeries` (Task 2); `props.game.shot_events` (campo do live.json — passthrough do schema já entrega; ausente em fixtures antigas → `[]`).
- Produces: `xgLineChart.merged` com `shot_events` por ponto (base dos Tickets 3/4); o ponto ao vivo de `scannerCard.vue` carregando o delta do ciclo E acumulando por minuto sem perder ciclos anteriores (relógio parado em 90' + acréscimos).

**Cobertura do wiring (deferral explícito — decidido na revisão do plano):**
O comportamento que este task corrige (preservar `shot_events` do minuto no `merged`) NÃO é observável por spec de componente hoje: nenhum spec monta `XgLineChart` nem abre o overlay de xG, `useXgHistory` não é mockado em `test.setup.ts` (faria `$fetch` real) e `chartData`/render não expõem `shot_events` (só `minute/xg_home/xg_away`). Por isso:
- A lógica do merge é coberta na Task 2 (spec puro de `mergeXgSeries`, incluindo o teste discriminante de mesmo minuto que FALHA com o código antigo e o teste "incremental" que modela o upsert do `watch`).
- A verificação automatizada deste task é **não-regressão**: suite existente verde (Passo 4). Ela NÃO prova o wiring sozinha — mas guarda o wiring em nível de import: `scannerCard.spec.ts` importa estático `ScannerCard`, cujo template importa `XgLineChart`, e `scannerCard.vue`/`xgLineChart.vue` agora têm `import { mergeXgSeries }` no topo — export ausente/renomeado quebra o load de TODOS os testes de `scannerCard.spec.ts` (regressão de ligação pega; regressão de comportamento não — fica para Tickets 3/4).
- O primeiro spec de componente que observa `shot_events` preservado entra nos **Tickets 3/4** (marcadores/tooltip tornam o dado observável), mockando `useXgHistory` no padrão do mock de `usePreGameAnalysis` em `scannerCard.spec.ts:277-298`.
- Verificação manual recomendada: `pnpm run dev` → abrir "Evolução de xG" de um jogo ao vivo com chute no minuto corrente e conferir o ponto mesclado (checagem visual, opcional no Ticket 1).

- [ ] **Step 1: Confirmar o bug no código atual (regressão reprodutível pela Task 2)**

A lógica nova vive em `mergeXgSeries` (testada na Task 2 — os testes "mesmo minuto: xg do ao vivo vence E shot_events preservam" e "incremental (uso real do Task 4)" falhariam com o código antigo). Neste wiring não há função pura nova a testar; o passo "vermelho" é aquele teste da Task 2 contra o código antigo. Documente no código por quê:

- [ ] **Step 2: Aplicar a mudança em `scannerCard.vue`**

Import no topo do `<script setup>` (junto dos imports de `~/utils/...`):

```js
import { mergeXgSeries } from '~/utils/scannerShots'
```

Bloco atual (~linhas 431–435, dentro do `watch` de `props.game.stats?.xg`): além de não carregar `shot_events`, o upsert **substitui o ponto inteiro do minuto** — se o minuto exibido não avançar entre dois ciclos (ex.: 90' + acréscimos, relógio parado), o segundo ciclo descarta o `shot_events` do primeiro ANTES de o `mergeXgSeries` do gráfico rodar, e ele não tem como recuperar (só vê o array ao vivo já encolhido):

```js
      const entry = { minute: Number(minute), xg_home: xg?.home ?? null, xg_away: xg?.away ?? null }
      if (entry.xg_home == null && entry.xg_away == null) return
      const idx = xgLiveSamples.value.findIndex((p) => p.minute === entry.minute)
      if (idx >= 0) xgLiveSamples.value[idx] = entry
      else xgLiveSamples.value.push(entry)
```

Substituir por (o upsert passa a ser a MESMA função pura testada na Task 2 — xg mais novo vence por minuto, `shot_events` dos dois ciclos são unidos com dedup, array segue ordenado):

```js
      const entry = {
        minute: Number(minute),
        xg_home: xg?.home ?? null,
        xg_away: xg?.away ?? null,
        // Delta do ciclo ainda não salvo no histórico: se o ponto ao vivo não
        // carregar os chutes novos, o merge do gráfico apagaria os do minuto.
        // Vazio = sem chute novo, normal (nunca erro/retry).
        shot_events: props.game.shot_events ?? [],
      }
      if (entry.xg_home == null && entry.xg_away == null) return
      // Upsert incremental com a função do gráfico: se o minuto não avançou
      // (ex.: 90' + acréscimos), o ciclo novo NÃO substitui o ponto inteiro —
      // o merge une por minuto (xg novo vence, shot_events dos ciclos se
      // acumulam com dedup). Sem isto, chutes de um ciclo anterior no mesmo
      // minuto seriam perdidos antes de o `merged` rodar.
      xgLiveSamples.value = mergeXgSeries(xgLiveSamples.value, [entry])
```

- [ ] **Step 3: Aplicar a mudança em `xgLineChart.vue`**

Import no topo (junto dos imports de `~/utils/...`):

```js
import { mergeXgSeries } from '~/utils/scannerShots'
```

Computed `merged` atual (linhas 66–74):

```js
const merged = computed(() => {
  const base = Array.isArray(props.history) ? props.history : []
  const live = Array.isArray(props.liveSamples) ? props.liveSamples : []
  if (!live.length) return base
  const byMinute = new Map()
  for (const p of base) byMinute.set(p.minute, p)
  for (const p of live) byMinute.set(p.minute, p)
  return [...byMinute.values()].sort((a, b) => a.minute - b.minute)
})
```

Substituir por:

```js
// União por minuto: xg do ao vivo vence, mas os shot_events do minuto são
// preservados (histórico + delta do ciclo, com dedup) — ver scannerShots.js.
const merged = computed(() => mergeXgSeries(props.history, props.liveSamples))
```

Nenhuma outra mudança no gráfico: `chartData`/`lastHome`/`lastAway`/`diff` consomem só `minute/xg_home/xg_away` via mapeamento explícito — campos extras (`shot_events`) são inertes e seguros.

- [ ] **Step 4: Verificar sem regressão nos specs existentes**

Run: `pnpm exec vitest run tests/app/components/scannerCard.spec.ts tests/app/utils/scannerShots.spec.ts`
Expected: PASS (todos — scannerCard.spec intacto: nenhum assert de UBadge/ícone muda no Ticket 1). Lembrete: isto prova NÃO-regressão, não o wiring em si (ver "Cobertura do wiring").

- [ ] **Step 5: Commit** (somente após consentimento do usuário)

```bash
git add app/components/scannerCard.vue app/components/xgLineChart.vue
git commit -m "fix: ponto ao vivo carrega shot_events e merged do xG une por minuto"
```

---

### Task 5: Verificação final + status no TICKETS.md

**Files:**
- Modify: `docs/tickets/tipos-chute-scanner/TICKETS.md` (status do Ticket 1: `🟡 Spec aprovada` → `🟢 Completo em 2026-09-08` — linha ~35, "Files Affected" da SPEC)

- [ ] **Step 1: Suite focada nova**

Run: `pnpm exec vitest run tests/app/utils/scannerShots.spec.ts`
Expected: PASS (26 passed)

- [ ] **Step 2: Suite completa**

Run: `pnpm test:unit`
Expected: PASS (todos os specs existentes + 26 novos — nenhum assert existente quebra; scannerCard.spec intacto por desenho)

- [ ] **Step 3: Sanity check dos nomes PT-BR**

Run: `pnpm exec vitest run tests/app/utils/scannerShots.spec.ts -t tierLabel`
Expected: PASS (4 passed — labels C1–C4 iguais ao `shot_classifier.py` do backend)

- [ ] **Step 4: Atualizar status do Ticket 1 no TICKETS.md**

Em `docs/tickets/tipos-chute-scanner/TICKETS.md` (~linha 35), trocar `**Status:** 🟡 Spec aprovada` por `**Status:** 🟢 Completo em 2026-09-08` (mesmo formato dos Tickets 0/completos).

- [ ] **Step 5: Commit** (somente após consentimento do usuário)

```bash
git add docs/tickets/tipos-chute-scanner/TICKETS.md
git commit -m "docs: marca Ticket 1 (shot_events + contadores) como completo"
```
