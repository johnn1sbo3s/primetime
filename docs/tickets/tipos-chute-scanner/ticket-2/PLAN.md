# Ticket 2 (Barras do card: chutes agrupados C1–C2 e C3) Implementation Plan

> **For agentic workers:** implement this plan task-by-task with a fresh subagent per task (or `unlazy` gates for critical work). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir nas barras de métricas do card do scanner 2 linhas novas de chute — "CHUTES C1–C2" (soma C1+C2 por lado) e "C3" — posicionadas **logo após XG**, cada uma com valor casa × fora, barra dual casa/fora e hint `circle-help`. C4 (sem perigo) não é exibido. Fonte: `game.shot_tiers` (Ticket 0). Sem dados = política FINALIZAÇÕES (linha sempre visível: zeros → "0" + trilho vazio; campo ausente → "—").

**Architecture:** Helper puro novo `sumTiers(shotTiers, tierKeys)` em `app/utils/scannerShots.js` (append — módulo do Ticket 1); 2 constantes `SHOT_*_HINT` + rows novas em `statRows` de `scannerCard.vue` reusando o shape `{label, home, away, pctHome, hint}` existente — **sem mudança de template**. Fonte das barras é `shot_tiers` (backend), **não** `countShotsByTier` (Ticket 1, serve modal/gráfico).

**Tech Stack:** Vue 3 `<script setup>` plain JS, Vitest 4 + happy-dom (spec puro sem `// @vitest-environment nuxt` para `sumTiers`; spec de componente com `mountSuspended`), pnpm. Repo alvo: `/Users/jone/Projetos/jonebet-frontend`.

## Global Constraints

- Comandos sempre via `pnpm` a partir de `/Users/jone/Projetos/jonebet-frontend`.
- JS puro em source (sem TypeScript); Prettier sem ponto-e-vírgula, aspas simples, 120 col, 2 espaços, tailwindcss plugin.
- Comentários/docstrings pt-BR; nomes de função/variável em inglês.
- Funções puras e tolerantes: guards `typeof === 'object'`/`Number.isFinite`-style, null/undefined → zeros, nunca throw.
- Shape do row NÃO muda: `{label, home: string, away: string, pctHome: number|null, hint: string|null}` — o template (`scannerCard.vue:169-196`) já renderiza hint via `UPopover` + `i-lucide-circle-help` quando `row.hint` existe.
- NÃO tocar: template do card, `schemas.js`, `useModelApi.js`, `useXgHistory.js`, polling, `xgLineChart.vue`, `MomentumChart`, verso do card.
- NÃO mudar asserts de UBadge (`scannerCard.spec.ts:172/179/201`) — rows novas não usam UBadge.
- Atualizar o assert de ícones `circle-help` (`scannerCard.spec.ts:227`): 3 → 5 (2 hints novos).
- Não rodar suite completa nem lint/format durante as tasks (só comandos focados); suite completa só na Task 4.
- Commits somente com consentimento do usuário (combinado na discussão de branch/worktree antes da Task 1).
- Nunca mutar props reativas: `sumTiers` só lê `shotTiers`.

---

### Task 1: `sumTiers` em `scannerShots.js` — soma de tiers por lado (TDD)

**Files:**
- Modify: `app/utils/scannerShots.js` (append ao fim)
- Test: `tests/app/utils/scannerShots.spec.ts` (append)

**Interfaces:**
- Consumes: shape `shot_tiers` do backend (Ticket 0): `{C1:{home,away}, C2:{…}, C3:{…}, C4:{…}}` — inteiros.
- Produces: `sumTiers(shotTiers, tierKeys) -> {home: number, away: number}` — soma os totais dos tiers listados por lado (Task 2 consome para as linhas "CHUTES C1–C2" e "C3").

- [ ] **Step 1: Write the failing test** (append ao fim do spec; atualizar o import do topo)

```js
import { collectShots, countShotsByTier, emptyShotTotals, mergeXgSeries, sumTiers } from '~/utils/scannerShots'
```

```js
describe('sumTiers', () => {
  it('soma os tiers listados por lado (C1+C2 → linha CHUTES C1–C2)', () => {
    const totals = { C1: { home: 4, away: 2 }, C2: { home: 3, away: 0 }, C3: { home: 1, away: 6 } }
    expect(sumTiers(totals, ['C1', 'C2'])).toEqual({ home: 7, away: 2 })
  })

  it('soma um tier só quando a lista tem 1 item (linha C3)', () => {
    const totals = { C1: { home: 4, away: 2 }, C3: { home: 1, away: 6 } }
    expect(sumTiers(totals, ['C3'])).toEqual({ home: 1, away: 6 })
  })

  it('shotTiers ausente/null/lixo → zeros, sem throw', () => {
    expect(sumTiers(undefined, ['C1', 'C2'])).toEqual({ home: 0, away: 0 })
    expect(sumTiers(null, ['C1'])).toEqual({ home: 0, away: 0 })
    expect(sumTiers('x', ['C1'])).toEqual({ home: 0, away: 0 })
    expect(sumTiers([], ['C1'])).toEqual({ home: 0, away: 0 })
  })

  it('tier ausente ou não-objeto → contribui zero, sem throw', () => {
    expect(sumTiers({ C2: { home: 3, away: 0 } }, ['C1', 'C2'])).toEqual({ home: 3, away: 0 })
    expect(sumTiers({ C1: null, C2: 'x' }, ['C1', 'C2'])).toEqual({ home: 0, away: 0 })
  })

  it('valor por lado ausente ou não-numérico → conta como 0', () => {
    const totals = { C1: { home: null, away: 'x' }, C2: { home: 3 } }
    expect(sumTiers(totals, ['C1', 'C2'])).toEqual({ home: 3, away: 0 })
  })

  it('tier fora da lista (C4) não entra na soma', () => {
    const totals = { C1: { home: 4, away: 2 }, C4: { home: 9, away: 8 } }
    expect(sumTiers(totals, ['C1', 'C2'])).toEqual({ home: 4, away: 2 })
  })

  it('não muta a entrada', () => {
    const totals = { C1: { home: 4, away: 2 }, C2: { home: 3, away: 0 } }
    sumTiers(totals, ['C1', 'C2'])
    expect(totals).toEqual({ C1: { home: 4, away: 2 }, C2: { home: 3, away: 0 } })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/app/utils/scannerShots.spec.ts`
Expected: FAIL (erro de carga do módulo/export — o spec inteiro falha em 0 pass até `sumTiers` existir)

- [ ] **Step 3: Write minimal implementation** (append ao fim de `scannerShots.js`)

```js
// Soma totais de tiers do shot_tiers do backend (Ticket 0) por lado.
// Ex.: sumTiers(game.shot_tiers, ['C1','C2']) → {home, away} — a linha
// "CHUTES C1–C2" do card. Totals ausente/nulo → zeros; valor por tier/lado
// ausente ou não-numérico → 0 (nunca quebra). C4 (sem perigo) fica de fora
// das listas chamadas — decisão de exibição do card, dado intacto no payload.
export function sumTiers(shotTiers, tierKeys) {
  const out = { home: 0, away: 0 }
  const t = shotTiers && typeof shotTiers === 'object' ? shotTiers : {}
  for (const key of tierKeys) {
    const pair = t[key]
    if (!pair || typeof pair !== 'object') continue
    out.home += Number(pair.home) || 0
    out.away += Number(pair.away) || 0
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/app/utils/scannerShots.spec.ts`
Expected: PASS (33 passed — 26 existentes + 7 de sumTiers)

- [ ] **Step 5: Commit** (somente após consentimento do usuário)

```bash
git add app/utils/scannerShots.js tests/app/utils/scannerShots.spec.ts
git commit -m "feat: sumTiers soma totais de tiers por lado (barras do Ticket 2)"
```

---

### Task 2: Rows novas em `scannerCard.vue` (após XG, com hints)

**Files:**
- Modify: `app/components/scannerCard.vue` — import de `sumTiers`; 2 constantes `SHOT_*_HINT`; refactor mínimo de `statRows` para inserir as rows de chute **entre XG e FINALIZAÇÕES**

**Interfaces:**
- Consumes: `props.game.shot_tiers` (campo do live.json — passthrough do schema já entrega; ausente em fixtures antigas/preview → `undefined`); `sumTiers` (Task 1); `formatNumber` (já importado, linha 373).
- Produces: 2 rows novas no shape existente — nenhuma mudança de template.

- [ ] **Step 1: Confirmar o ponto de inserção no código atual**

`statRows` (`scannerCard.vue:568-583`) = `[...derivedRows.value, ...STAT_LABELS.map(...)]` e `STAT_LABELS` (`465-470`) começa com `['xg','XG',2,'']`. A linha XG é a primeira renderizada do bloco de stats; FINALIZAÇÕES vem em seguida. Ordem alvo (aprovada): `XG → CHUTES C1–C2 → C3 → FINALIZAÇÕES → CHANCES CLARAS → TOQUES NA ÁREA`.

- [ ] **Step 2: Aplicar a mudança (script setup)**

Import do topo (`scannerCard.vue:375`) — adicionar `sumTiers` ao import já existente de `scannerShots`:

```js
import { mergeXgSeries, sumTiers } from '~/utils/scannerShots'
```

Constantes de hint (junto de `CONTROL_HINT`/`C10_HINT`/`PICO_HINT`, ~`scannerCard.vue:472-476`):

```js
const SHOT_C12_HINT = 'Grande chance (xG ≥ 0,50) + Boa chance (xG 0,20–0,50)'
const SHOT_C3_HINT = 'Chance média (xG 0,05–0,20)'
```

`STAT_LABELS` (`465-470`) — tirar `xg` do array (passa a ser montado à parte, para as linhas de chute entrarem logo depois):

```js
const STAT_LABELS = [
  ['shots', 'FINALIZAÇÕES', 0, ''],
  ['big_chances', 'CHANCES CLARAS', 0, ''],
  ['box_touches', 'TOQUES NA ÁREA', 0, ''],
]
```

Extrair o builder de row de stat (hoje inline no `.map` de `statRows`) como função pura local + acrescentar o builder das linhas de chute (entre `fmtRaw`/`derivedRows` e `statRows`, ex.: logo após `derivedRows`, ~`scannerCard.vue:543`):

```js
// Constrói a row de uma stat do Flashscore (mesmo shape de antes — extraído
// para reordenar com as linhas de chute sem duplicar a lógica).
const statRow = ([key, label, dec, suffix]) => {
  const pair = props.game.stats?.[key] || {}
  const home = pair.home
  const away = pair.away
  const total = (Number(home) || 0) + (Number(away) || 0)
  return {
    label,
    home: home != null ? `${formatNumber(home, dec)}${suffix}` : '—',
    away: away != null ? `${formatNumber(away, dec)}${suffix}` : '—',
    pctHome: total > 0 ? ((Number(home) || 0) / total) * 100 : null,
    hint: null,
  }
}

// Linhas de chute com perigo: "CHUTES C1–C2" (soma C1+C2 por lado) e "C3"
// (chance média). C4 (sem perigo) não é exibido — decisão do usuário.
// Fonte: shot_tiers do Ticket 0 (acumulado por jogo). Campo ausente (fixture
// antiga/preview) → "—"; zeros → "0" com trilho vazio — política FINALIZAÇÕES:
// a linha nunca some por falta de dado.
const shotTierRows = computed(() => {
  const tiers = props.game.shot_tiers
  const present = tiers != null
  const make = (label, tierKeys, hint) => {
    const pair = sumTiers(tiers, tierKeys)
    const total = pair.home + pair.away
    return {
      label,
      home: present ? `${formatNumber(pair.home, 0)}` : '—',
      away: present ? `${formatNumber(pair.away, 0)}` : '—',
      pctHome: present && total > 0 ? (pair.home / total) * 100 : null,
      hint,
    }
  }
  return [
    make('CHUTES C1–C2', ['C1', 'C2'], SHOT_C12_HINT),
    make('C3', ['C3'], SHOT_C3_HINT),
  ]
})
```

`statRows` (`568-583`) passa a intercalar na ordem aprovada (XG primeiro, depois as 2 de chute, depois o resto das stats):

```js
const statRows = computed(() => [
  ...derivedRows.value,
  statRow(['xg', 'XG', 2, '']),
  ...shotTierRows.value,
  ...STAT_LABELS.map(statRow),
])
```

Nenhuma mudança no template (`169-196`): rows novas usam `{label, home, away, pctHome, hint}` — barra e `UPopover`/`circle-help` já renderizam.

- [ ] **Step 3: Verificar sem regressão nos specs existentes (fora do assert previsto)**

Run: `pnpm exec vitest run tests/app/utils/scannerShots.spec.ts tests/app/components/scannerCard.spec.ts`
Expected: os 33 de scannerShots PASS; scannerCard.spec: **1 falha esperada** — `scannerCard.spec.ts:227` (`circle-help` 3 → 5). Nenhum outro assert quebra (UBadge/ordem/`'—'` seguem válidos).

- [ ] **Step 4: Commit** (somente após consentimento do usuário)

```bash
git add app/components/scannerCard.vue
git commit -m "feat: linhas CHUTES C1–C2 e C3 no card após XG (Ticket 2)"
```

---

### Task 3: `scannerCard.spec.ts` — fixture com `shot_tiers` + asserts novos

**Files:**
- Modify: `tests/app/components/scannerCard.spec.ts`

**Interfaces:**
- Consumes: `ScannerCard` com `props.game` — fixture `game()` ganha variante com `shot_tiers`.
- Produces: cobertura dos casos do Ticket 2 (soma, zeros, campo ausente, ordem, ícones).

- [ ] **Step 1: Adicionar helpers + variantes de fixture** (junto da função `game()`, ~linha 48)

```js
// game com shot_tiers não-nulos (Ticket 0): C1 4×2 + C2 3×0 → CHUTES C1–C2 = 7×2; C3 = 1×6
function gameWithShots() {
  return {
    ...game(),
    shot_tiers: { C1: { home: 4, away: 2 }, C2: { home: 3, away: 0 }, C3: { home: 1, away: 6 }, C4: { home: 9, away: 8 } },
  }
}

// Texto dos valores de uma row de stat pelo label central (row = div
// .flex.items-baseline.justify-between; filhos diretos: [home, container label, away])
const rowValues = (wrapper, label) => {
  const labelEl = wrapper.findAll('span').find((s) => s.text() === label)
  const row = labelEl.element.parentElement.parentElement
  const children = Array.from(row.children)
  return { home: children[0].textContent.trim(), away: children[2].textContent.trim() }
}
```

- [ ] **Step 2: Atualizar o assert de ícones de ajuda (3 → 5)**

`scannerCard.spec.ts:224-228` — texto e valor:

```js
  it('tem ícone de ajuda (?) nas linhas PICO, CONTROLE, C10 e nas 2 de chute', async () => {
    const wrapper = await mountCard(ScannerCard, { props: { game: game() } })
    // classe real do @nuxt/icon em modo CSS: i-lucide:circle-help (dois-pontos)
    expect(wrapper.findAll('.i-lucide\\:circle-help').length).toBe(5)
  })
```

- [ ] **Step 3: Escrever os testes novos** (append dentro do describe principal, antes do bloco `preGameScenario`)

```js
  it('exibe CHUTES C1–C2 (soma C1+C2) e C3 após XG quando shot_tiers presente', async () => {
    const wrapper = await mountCard(ScannerCard, { props: { game: gameWithShots() } })
    expect(rowValues(wrapper, 'CHUTES C1–C2')).toEqual({ home: '7', away: '2' })
    expect(rowValues(wrapper, 'C3')).toEqual({ home: '1', away: '6' })
    // C4 não vira linha própria
    expect(wrapper.text()).not.toContain('SEM PERIGO')
  })

  it('linhas de chute ficam após XG e antes de FINALIZAÇÕES', async () => {
    const wrapper = await mountCard(ScannerCard, { props: { game: gameWithShots() } })
    const text = wrapper.text()
    expect(text.indexOf('XG')).toBeGreaterThan(-1)
    expect(text.indexOf('CHUTES C1–C2')).toBeGreaterThan(text.indexOf('XG'))
    expect(text.indexOf('C3')).toBeGreaterThan(text.indexOf('CHUTES C1–C2'))
    expect(text.indexOf('FINALIZAÇÕES')).toBeGreaterThan(text.indexOf('C3'))
  })

  it('shot_tiers com zeros → "0" com trilho vazio (política FINALIZAÇÕES)', async () => {
    const wrapper = await mountCard(ScannerCard, {
      props: {
        game: {
          ...game(),
          shot_tiers: { C1: { home: 0, away: 0 }, C2: { home: 0, away: 0 }, C3: { home: 0, away: 0 }, C4: { home: 0, away: 0 } },
        },
      },
    })
    expect(rowValues(wrapper, 'CHUTES C1–C2')).toEqual({ home: '0', away: '0' })
    expect(rowValues(wrapper, 'C3')).toEqual({ home: '0', away: '0' })
    expect(wrapper.text()).toContain('CHUTES C1–C2') // linha visível mesmo sem chutes
  })

  it('shot_tiers ausente (fixture antiga/preview) → "—" nas linhas de chute', async () => {
    const wrapper = await mountCard(ScannerCard, { props: { game: game() } })
    expect(rowValues(wrapper, 'CHUTES C1–C2')).toEqual({ home: '—', away: '—' })
    expect(rowValues(wrapper, 'C3')).toEqual({ home: '—', away: '—' })
  })
```

Atenção ao teste de ordem: `text.indexOf('C3')` — garanta que a fixture não tenha outro "C3" solto no texto (labels `C10`/`PICO 10'`/`PRESSÃO 10'` não colidem com a substring `C3`). Se um refactor futuro quebrar a ordem, este teste falha por design.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/app/components/scannerCard.spec.ts`
Expected: PASS (todos, incluindo os novos e o assert atualizado de 5 ícones)

- [ ] **Step 5: Commit** (somente após consentimento do usuário)

```bash
git add tests/app/components/scannerCard.spec.ts
git commit -m "test: barras de chutes C1–C2 e C3 no scannerCard (Ticket 2)"
```

---

### Task 4: Verificação final + status no TICKETS.md

**Files:**
- Modify: `docs/tickets/tipos-chute-scanner/TICKETS.md` (status do Ticket 2: `🟡 Spec aprovada em 2026-09-08` → `🟢 Completo em 2026-09-08`)

- [ ] **Step 1: Suite focada nova**

Run: `pnpm exec vitest run tests/app/utils/scannerShots.spec.ts tests/app/components/scannerCard.spec.ts`
Expected: PASS (33 + todos de scannerCard)

- [ ] **Step 2: Suite completa**

Run: `pnpm test:unit`
Expected: PASS (todos os specs existentes + novos — nenhum assert fora dos previstos quebra; UBadge/verso/momentum intactos por desenho)

- [ ] **Step 3: Sanity check visual (opcional)**

Run: `pnpm run dev` → abrir o scanner com um jogo ao vivo/encerrado e conferir: ordem XG → CHUTES C1–C2 → C3 → FINALIZAÇÕES; hints `?` nas 2 novas; barra teal/blue com share; "0"/trilho vazio sem chutes; "—" se o preview não mandar `shot_tiers`.

- [ ] **Step 4: Atualizar status do Ticket 2 no TICKETS.md**

Em `docs/tickets/tipos-chute-scanner/TICKETS.md`, trocar `**Status:** 🟡 Spec aprovada em 2026-09-08` por `**Status:** 🟢 Completo em 2026-09-08`.

- [ ] **Step 5: Commit** (somente após consentimento do usuário)

```bash
git add docs/tickets/tipos-chute-scanner/TICKETS.md
git commit -m "docs: marca Ticket 2 (barras de chutes C1–C2 e C3) como completo"
```
