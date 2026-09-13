# Scanner momentum chart redesign Implementation Plan

> **For agentic workers:** implement this plan task-by-task with a fresh subagent per task (or `unlazy` gates for critical work). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faixa de incidentes no gráfico de momentum do scanner (chutes numerados, gol bola Packball, cascata + popover por minuto, faixa 0.4, linha ao vivo).

**Architecture:** Util puro novo (`scannerIncidents.js`) agrupa incidentes por minuto e resolve prioridade/cascata; `momentumChart.vue` ganha a faixa e consome o util; `scannerCard.vue` alimenta o gráfico com a série xG merged que já existe. Zero mudança de backend.

**Tech Stack:** Nuxt 4 / Vue 3 `<script setup>` plain JS, SVG, Vitest + `@nuxt/test-utils` (`mountSuspended`).

## Global Constraints

- Sem TypeScript, sem semicolons, aspas simples, trailing commas, 120 cols (Prettier do repo).
- Testes: `pnpm test:unit` (Vitest single run).
- `formatPercent` NÃO escala ×100 (irrelevante aqui, só pra não quebrar nada por perto).
- Convenção de teste: `// @vitest-environment nuxt`, `mountSuspended()`.
- Commits em pt-BR, um por task.
- **Implementers: SKIP all gates (lint, prettier, full test suite, build).** Orchestrator runs verification once after all tasks.

---

## File Structure

- `app/utils/scannerIncidents.js` (NEW) — `BALL_PATH`, `groupIncidents`, `layoutLane`. Puro, sem Vue.
- `tests/app/utils/scannerIncidents.spec.ts` (NEW) — unidade do util.
- `app/components/momentumChart.vue` (MODIFY) — faixa, marcadores, cascata, guias, popover. Novas props `shots`, `notifications`, `minute`.
- `tests/app/components/momentumChart.spec.ts` (MODIFY) — troca testes dos círculos de gol antigos pelos da faixa.
- `app/components/scannerCard.vue` (MODIFY) — 5 linhas: load eager + watch sempre ativo + computed + 3 props.
- `tests/app/components/scannerCard.spec.ts` (MODIFY) — props repassadas + load no mount.

**Interfaces:**
- `groupIncidents({ shots, goals, notifications })` → `[{ minute, half, shots[], goal, alerts[], winner, extra }]` ordenado por (half, minute). `shots[]` ordenado por perigo (C1 primeiro). `winner`: `'goal' | 'shot' | 'alert'`. `extra` = incidentes escondidos atrás do `+N`.
- `layoutLane(groups, xOf, gap = 30)` → `[{ group, trueX, x, leaderTo }]`; `leaderTo` null quando `x === trueX`.
- Chart consome: `buildLane()` interno = `layoutLane(groupIncidents({shots, goals, notifications}), g => barX({minute: g.minute, half: g.half}))`.

---

### Task 1: Util puro de incidentes por minuto

**Files:**
- Create: `app/utils/scannerIncidents.js`
- Test: `tests/app/utils/scannerIncidents.spec.ts`

**Interfaces:**
- Consumes: nada (funções puras; shapes do payload descritos na spec de design).
- Produces: `BALL_PATH: string`, `groupIncidents(input) -> groups[]`, `layoutLane(groups, xOf, gap?) -> placed[]` (consumidos pela Task 2).

- [ ] **Step 1: Write the failing test**

```ts
// tests/app/utils/scannerIncidents.spec.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/app/utils/scannerIncidents.spec.ts`
Expected: FAIL — cannot find module `~/utils/scannerIncidents.js`

- [ ] **Step 3: Write minimal implementation**

```js
// app/utils/scannerIncidents.js
// Incidentes por minuto da faixa do gráfico de momentum.
// Entrada: shapes do live.json (shots = série xG merged por minuto,
// goals/notifications do game). C4 fica de fora (sem perigo).
// half ausente = 1 (mapeamento legado, igual ao momentumChart).

// Bola do Packball (viewBox 512) para o marcador de gol — disco branco
// embaixo + este path na cor do time por cima.
export const BALL_PATH = 'M256 48C141.1 48 48 141.1 48 256c0 114.7 93.3 208 208 208 114.9 0 208-93.1 208-208 0-114.7-93.3-208-208-208zm127.3 80.7c8.5 8.5 16.1 17.7 22.6 27.5.7 1 .9 2.4.4 3.5L391.9 201c-.4 1-1.1 1.9-2.1 2.3l-57.5 26.2c-1.4.6-3 .4-4.2-.6l-56.6-47.6a4.1 4.1 0 0 1-1.4-3.1v-63.1c0-1.3.7-2.6 1.8-3.3l38.4-26.1c1-.7 2.3-.9 3.5-.5 25.8 8.9 49.6 23.6 69.5 43.5zm-73.9 297.6c-.4 1.2-1.4 2.1-2.6 2.4-16.3 4.8-33.4 7.2-50.8 7.2-17.5 0-34.5-2.5-50.8-7.2-1.2-.4-2.2-1.3-2.6-2.4l-16.4-43c-.4-1.1-.3-2.3.2-3.3l22.3-42.3c.7-1.3 2.1-2.1 3.5-2.1h87.5c1.5 0 2.8.8 3.5 2.1l22.3 42.3c.5 1 .6 2.2.2 3.3l-16.3 43zm-67.4-311v63.1c0 1.2-.5 2.3-1.4 3.1L183.9 229c-1.2 1-2.8 1.2-4.2.6l-57.5-26.2c-1-.5-1.8-1.3-2.1-2.3l-14.4-41.2c-.4-1.2-.3-2.5.4-3.5 6.5-9.8 14.1-19 22.6-27.5 19.9-19.9 43.7-34.6 69.6-43.3 1.2-.4 2.5-.2 3.5.5l38.4 26.1c1.1.5 1.8 1.7 1.8 3.1zM77.7 264.1l36.1-31.2c1.2-1 2.9-1.3 4.3-.6l52.4 23.8c1.1.5 1.9 1.5 2.2 2.7l14.6 57.3c.2 1 .1 2-.3 2.9l-23.2 43.9c-.7 1.3-2.1 2.2-3.6 2.1l-46-.6c-1.2 0-2.4-.6-3.2-1.6-20.5-27.7-32.5-60.6-34.7-95.4 0-1.3.5-2.5 1.4-3.3zm270.4 98.7L325 319c-.5-.9-.6-1.9-.3-2.9l14.6-57.3c.3-1.2 1.1-2.2 2.2-2.7l52.4-23.8c1.4-.6 3.1-.4 4.3.6l36.1 31.2c.9.8 1.5 2 1.4 3.3-2.1 34.8-14.2 67.6-34.7 95.4-.7 1-1.9 1.6-3.2 1.6l-46.1.6c-1.5-.1-2.9-.9-3.6-2.2z'
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

export function layoutLane(groups, xOf, gap = 30) {
  const items = groups.map((g) => ({ group: g, trueX: xOf(g), x: 0, leaderTo: null }))
  const ordered = [...items].sort((a, b) => b.trueX - a.trueX)
  let cursor = 640
  for (const it of ordered) {
    if (it.group.winner === 'goal') {
      it.x = it.trueX
      cursor = Math.min(cursor, it.trueX - gap)
    } else {
      it.x = Math.min(it.trueX, cursor)
      cursor = it.x - gap
    }
  }
  if (items.length > 0 && Math.min(...items.map((i) => i.x)) < 0) {
    const goal = items.find((i) => i.group.winner === 'goal')
    if (goal) {
      const rest = items.filter((i) => i !== goal).sort((a, b) => a.trueX - b.trueX)
      let cx = goal.x + gap
      for (const it of rest) {
        it.x = Math.max(it.trueX, cx)
        cx = it.x + gap
      }
    } else {
      const min = Math.min(...items.map((i) => i.x))
      for (const it of items) it.x -= min
    }
  }
  for (const it of items) it.leaderTo = it.x === it.trueX ? null : it.trueX
  return items
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/app/utils/scannerIncidents.spec.ts`
Expected: PASS (5 testes)

- [ ] **Step 5: Commit**

```bash
git add app/utils/scannerIncidents.js tests/app/utils/scannerIncidents.spec.ts
git commit -m "feat: util de incidentes por minuto do gráfico (prioridade + cascata)"
```

---

### Task 2: Faixa de incidentes no momentumChart

**Files:**
- Modify: `app/components/momentumChart.vue`
- Test: `tests/app/components/momentumChart.spec.ts`

**Interfaces:**
- Consumes: `BALL_PATH, groupIncidents, layoutLane` da Task 1; `barX` existente para o x verdadeiro.
- Produces: props novas `shots`, `notifications`, `minute`; computed `laneItems` usado pela Task 3 (popover).

Truque geométrico: embrulhar o desenho atual (painéis, barras, gols antigos, ticks) num `<g :transform="translate(0 56)">` — a faixa mora em `y 0..56`, o resto desce junto sem recalcular nada. viewBox vira `0 0 640 214`. Os círculos de gol antigos (cy 9/101) SOMEM — os testes deles são substituídos abaixo, não adaptados.

- [ ] **Step 1: Write the failing test** (substituir os 4 testes que prendem os círculos de gol antigos por estes; manter todo o resto do spec)

```ts
it('faixa: gol vira bola e chute C2 vira bola numerada', async () => {
  const wrapper = await mountSuspended(MomentumChart, {
    props: {
      bars: [{ minute: 43, home: 0.5, away: 0 }],
      goals: [{ minute: 43, stoppage_time: 0, team: 'home', player: 'x' }],
      shots: [{ minute: 35, team: 'home', tier: 'C2', xg_delta: 0.3, label: 'Boa chance' }],
      notifications: [],
      minute: 45,
    },
  })
  expect(wrapper.findAll('.lane-shot').length).toBe(1)
  expect(wrapper.find('.lane-shot text').text()).toBe('2')
  expect(wrapper.find('.lane-goal path').exists()).toBe(true)
})

it('colisão: +N e linha-guia', async () => {
  const wrapper = await mountSuspended(MomentumChart, {
    props: {
      bars: [{ minute: 43, home: 0.5, away: 0 }],
      goals: [{ minute: 43, stoppage_time: 0, team: 'home', player: 'x' }],
      shots: [{ minute: 43, team: 'home', tier: 'C2', xg_delta: 0.3, label: 'Boa chance' }],
      notifications: [],
      minute: 45,
    },
  })
  expect(wrapper.find('.lane-more').exists()).toBe(true)
  expect(wrapper.find('.lane-more text').text()).toBe('+1')
})

it('linha ao vivo no minuto atual', async () => {
  const wrapper = await mountSuspended(MomentumChart, {
    props: { bars: [{ minute: 45, home: 0.5, away: 0 }], minute: 45 },
  })
  expect(wrapper.find('.lane-live').exists()).toBe(true)
})

it('faixa 0.4: tracejados do limiar', async () => {
  const wrapper = await mountSuspended(MomentumChart, {
    props: { bars: [{ minute: 10, home: 0.5, away: 0 }] },
  })
  expect(wrapper.findAll('.lane-threshold')).toHaveLength(2)
})
```

Remover: `renderiza marcadores de gol`, `sem gols, sem marcadores`, `gol do 2º tempo posiciona no painel direito`, `clampa gol além do painel (90+6')` (todos prendem os círculos antigos).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/app/components/momentumChart.spec.ts`
Expected: FAIL — `findAll('.lane-shot')` vazio / classes inexistentes

- [ ] **Step 3: Write minimal implementation**

Em `app/components/momentumChart.vue`:

1. Props: acrescentar `shots: { type: Array, default: () => [] }`, `notifications: { type: Array, default: () => [] }`, `minute: { type: Number, default: null }`.
2. Importar `{ BALL_PATH, groupIncidents, layoutLane }` de `~/utils/scannerIncidents`.
3. viewBox `0 0 640 214`; embrulhar TODO o conteúdo atual do `<svg>` (painéis, linha central, barras, gols antigos, ticks) em `<g transform="translate(0 56)">` e APAGAR os `<circle>` de gol antigos.
4. Linha central: `stroke="#52525b" stroke-width="1.5"`.
5. Faixa 0.4 dentro do grupo (coordenadas locais, centro 55): dois `<line class="lane-threshold">` em `y=33` e `y=77` (55 ± 22) tracejados + dois `<rect>` tint `#fafafa` opacity 0.05 acima/abaixo.
6. Faixa (fora do grupo, `y 0..56`): divisor `<line y1=56>`, e por item de `laneItems`:
   - `laneItems = computed(() => layoutLane(groupIncidents({ shots: props.shots, goals: props.goals, notifications: props.notifications }), (g) => barX({ minute: g.minute, half: g.half })))`
   - balão: `<rect>` 26×30 centralizado no x, `y=11`, `rx=8`, fill `#27272a`.
   - winner shot: `<g class="lane-shot">` círculo `r=10` fill `#27272a` stroke time (`#2dd4bf`/`#3b82f6`) 2.5 + `<text>` número do tier (`shots[0].tier.slice(1)`) branco bold.
   - winner goal: `<g class="lane-goal">` disco branco `r=10` + `<path :d="BALL_PATH">` na cor do time com `transform=translate(x-256*s, 26-256*s) scale(s)`, `s = 17/416`.
   - winner alert: losango âmbar outline (`<path>` diamante, stroke `#fbbf24`, sem fill).
   - `extra > 0`: `<g class="lane-more">` círculo `r=9` fill `#52525b` em `(x+19, 14)` + texto `+N` branco.
   - `leaderTo != null`: `<line>` 1.2px `#a1a1aa` de `(x, 40)` até `(leaderTo, 57)`.
7. Linha ao vivo (`v-if="minute != null"`, classe `lane-live`): x via `barX({ minute, half: minute > 45 ? 2 : 1 })`, 2px `#ef4444` tracejada do topo da faixa ao fim das barras + dot `r=6` no topo.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/app/components/momentumChart.spec.ts`
Expected: PASS (testes novos + antigos de barra/painel/ticks intactos)

- [ ] **Step 5: Commit**

```bash
git add app/components/momentumChart.vue tests/app/components/momentumChart.spec.ts
git commit -m "feat: faixa de incidentes no gráfico de momentum"
```

---

### Task 3: Popover do minuto

**Files:**
- Modify: `app/components/momentumChart.vue`
- Test: `tests/app/components/momentumChart.spec.ts` (append)

**Interfaces:**
- Consumes: `laneItems` da Task 2 (grupos têm tudo: shots, goal, alerts + pressão via `bars`).
- Produces: popover funcional (consumido só pelo template; Task 4 não depende dele).

- [ ] **Step 1: Write the failing test**

```ts
it('hover no marcador abre o popover do minuto', async () => {
  const wrapper = await mountSuspended(MomentumChart, {
    props: {
      bars: [{ minute: 35, home: 0.79, away: 0.12 }],
      goals: [],
      shots: [{ minute: 35, team: 'home', tier: 'C2', xg_delta: 0.3, label: 'Boa chance' }],
      notifications: [{ rule: 'r', label: 'Pico do favorito', minute: 35, at: 't' }],
      minute: 40,
    },
  })
  expect(wrapper.find('.lane-pop').exists()).toBe(false)
  await wrapper.find('.lane-shot').trigger('mouseenter')
  expect(wrapper.find('.lane-pop').exists()).toBe(true)
  expect(wrapper.find('.lane-pop').text()).toContain("35'")
  expect(wrapper.find('.lane-pop').text()).toContain('Pico do favorito')
  await wrapper.find('.lane-shot').trigger('mouseleave')
  expect(wrapper.find('.lane-pop').exists()).toBe(false)
})

it('toque no marcador alterna o popover sem propagar o clique', async () => {
  const wrapper = await mountSuspended(MomentumChart, {
    props: {
      bars: [{ minute: 35, home: 0.79, away: 0.12 }],
      goals: [],
      shots: [{ minute: 35, team: 'home', tier: 'C2', xg_delta: 0.3, label: 'Boa chance' }],
      notifications: [],
      minute: 40,
    },
  })
  await wrapper.find('.lane-shot').trigger('click')
  expect(wrapper.find('.lane-pop').exists()).toBe(true)
  await wrapper.find('.lane-shot').trigger('click')
  expect(wrapper.find('.lane-pop').exists()).toBe(false)
})
```
- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/app/components/momentumChart.spec.ts`
Expected: FAIL — `.lane-pop` nunca existe

- [ ] **Step 3: Write minimal implementation**

No `<script setup>`: `const activeKey = ref(null)` + `const minKey = (g) => g.half + ':' + g.minute`. Nos `<g>` dos marcadores: `tabindex="0"`, `@mouseenter="activeKey = minKey(item.group)"`, `@mouseleave="activeKey = null"`, `@focus` igual ao enter, `@blur` igual ao leave, `@click.stop="activeKey = activeKey === minKey(item.group) ? null : minKey(item.group)"`. O `.stop` impede o flip do card no mobile.


### Task 4: Ligar o card no gráfico novo

**Files:**
- Modify: `app/components/scannerCard.vue`
- Test: `tests/app/components/scannerCard.spec.ts`

**Interfaces:**
- Consumes: `collectShots, mergeXgSeries` (scannerShots), `useXgHistory` (já usado), props novas da Task 2.
- Produces: gráfico alimentado; nada abaixo depende.

Contexto: hoje o histórico xG só carrega ao abrir o modal (`openXgHistory`) e o watch de live samples só acumula com o modal aberto. O gráfico precisa da série completa desde o mount. `useXgHistory` tem cache por jogo (5 min) + dedup — carregar no mount custa 1 request por jogo.

- [ ] **Step 1: Write the failing test**

```ts
it('repassa shots/notifications/minute ao MomentumChart', async () => {
  const wrapper = await mountCard(ScannerCard, {
    props: {
      game: {
        ...game(),
        minute: 35,
        momentum: [{ minute: 35, half: 1, home: 0.79, away: 0.12 }],
        shot_events: [{ minute: 35, team: 'home', xg_delta: 0.3, tier: 'C2', label: 'Boa chance' }],
        notifications: [{ rule: 'r', label: 'Pico', minute: 35, at: 't' }],
      },
    },
  })
  const chart = wrapper.findComponent(MomentumChart)
  expect(chart.props('minute')).toBe(35)
  expect(chart.props('notifications')).toHaveLength(1)
  expect(chart.props('shots')).toEqual([
    { minute: 35, team: 'home', xg_delta: 0.3, tier: 'C2', label: 'Boa chance' },
  ])
})
```

Acrescentar no topo do spec (`vi` e `mountCard` já existem no arquivo; sem histórico, `shots` = só o delta do ciclo — comportamento degradado correto; o load no mount não pode bater na rede):

```ts
vi.mock('~/composables/useXgHistory', () => ({
  useXgHistory: () => ({
    get: () => ({ status: 'done', response: { series: [] }, fetchedAt: Date.now(), error: null }),
    load: vi.fn().mockResolvedValue({ series: [] }),
  }),
}))

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/app/components/scannerCard.spec.ts`
Expected: FAIL — `chart.props('shots')` undefined (props ainda não repassadas)

- [ ] **Step 3: Write minimal implementation**

Em `app/components/scannerCard.vue`, 4 mudanças:

1. Imports: `import { computed, ref, watch } from 'vue'` (linha 370) vira
   `import { computed, onMounted, ref, watch } from 'vue'`; e
   `import { mergeXgSeries, sumTiers } from '~/utils/scannerShots'` (linha 375)
   vira `import { collectShots, mergeXgSeries, sumTiers } from '~/utils/scannerShots'`.
2. No `openXgHistory`, remover a guarda `if (!xgOpen.value) return` do watch (acumula sempre) — o reset `xgLiveSamples.value = []` continua só ao abrir o modal.
3. Acrescentar após as declarações do `useXgHistory` (perto da linha 409):

```js
onMounted(() => {
  loadXgHistory(props.game.id).catch(() => {})
})
```

(Erro silencioso = gráfico degrada pro delta do ciclo.)

4. Computed + template (linha 166):

```js
const chartShots = computed(() => collectShots(mergeXgSeries(xgHistory.value, xgLiveSamples.value)))
```

```vue
<MomentumChart
  :bars="game.momentum"
  :goals="game.goals"
  :shots="chartShots"
  :notifications="game.notifications ?? []"
  :minute="game.minute"
  class="mb-3"
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/app/components/scannerCard.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/components/scannerCard.vue tests/app/components/scannerCard.spec.ts
git commit -m "feat: alimenta faixa de incidentes do gráfico"
```

---

## Pós-plano (orquestrador, fora das tasks)

1. `pnpm test:unit` completo verde.
2. Smoke no navegador real (dev 3001 + snapshot real): carga, faixa renderiza, cluster legível, popover hover + toque, minuto atualiza no long-polling.
3. **Calibragem com o usuário**: r bola (10–12), respiro 30, altura da faixa — critério: cluster 42'/43' legível no card de 400px.

---

### Task 5 (pós-smoke): faixas por lado + empilhamento, sem linhas-guia

Motivo: no navegador real, a faixa única com cascata empilhou (badge estourava o vizinho; cascata só ia pra esquerda) e o usuário lembrou o combinado original (fora embaixo) e pediu a remoção das linhas-guia.

Mudanças (já implementadas em `9d82a26`):
- `app/utils/scannerIncidents.js`: `layoutLane` removido; `sideOf(group, bars)` (gol/chute herdam o time, alerta segue a pressão do minuto) + `stackRows(entries, pitch=26)` (x nunca muda; fileira 1 em colisão; 3º funde `extra` no vizinho).
- `app/components/momentumChart.vue`: `lanes` (top rows `[23,43]`, bot rows `[212,234]`), viewBox `640x252`, sem líderes, sem balões (hit circle r14 transparente), linha ao vivo até `y=196`.
- Specs atualizados; suíte 338 verde.
