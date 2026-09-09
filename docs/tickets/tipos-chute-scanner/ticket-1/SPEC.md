**Status:** 🟢 Aprovada em 2026-09-08

# Spec: Ticket 1 — Base: ler shot_events + contadores por nível

## Goal

Parsear `shot_events` no front, agregar a contagem por nível (C1–C4) e lado (casa/fora) sobre os pontos de xG mesclados (histórico + delta ao vivo), expor nomes PT-BR dos níveis e corrigir o merge ao vivo que hoje apaga os chutes do minuto corrente.

## Context

Contrato do backend (produção, ver `docs/tickets/tipos-chute-scanner/TICKETS.md:5` e ticket-0/SPEC.md): chute = `{minute, team: 'home'|'away', xg_delta, tier: 'C1'..'C4', label}`. Tier C1 grande chance (≥0.50) / C2 boa chance (0.20–0.50) / C3 chance média (0.05–0.20) / C4 sem perigo (<0.05). Os nomes canônicos PT-BR estão em `momentum/shot_classifier.py` (`TIER_LABELS`): C1 "Grande chance", C2 "Boa chance", C3 "Chance média", C4 "Sem perigo" — o campo `label` de cada chute já é esse texto.

- **Ao vivo** (`live.json`, jogo): `game.shot_events` é o **delta do ciclo atual** (chutes detectados desde a última leitura — `monitor._prev_xg` → `classify_shots`); lista vazia = sem chute novo, normal. Nunca omitida.
- **Histórico** (`/xg-history`): série de pontos `{minute, xg_home, xg_away, shot_events}` com os eventos acumulados por minuto (dedup do store por `(team, xg_delta)` por minuto; TTL 180s + cache de 5 min no front).
- **Schemas Zod** (`app/utils/schemas.js:51-58`): `scannerSnapshot` e `scannerXgHistory` são passthrough — `shot_events` já flui intacto até os componentes; zero leituras hoje (grep confirmou nenhum match em `app/` e `tests/`).

**Bug do merge ao vivo:** ao abrir "Evolução de xG", o card (`scannerCard.vue:416-439`) carrega o histórico e um `watch` em `props.game.stats?.xg` (425-438) monta um ponto "ao vivo" por ciclo com **só** `{minute, xg_home, xg_away}` (linha 431). No `xgLineChart.vue` o computed `merged` (66-74) faz um `Map` por minuto onde o ponto ao vivo **substitui o ponto inteiro do histórico no mesmo minuto** → os `shot_events` daquele minuto somem do `merged`. Como os dois dados se complementam (histórico = chutes salvos do minuto; `game.shot_events` = delta do ciclo atual ainda não salvo), só anexar o delta não basta — é preciso união por minuto com dedup.

## Scope

**In scope (Ticket 1 é a base de dados — sem UI nova; barras são Ticket 2, marcadores/tooltip Tickets 3/4):**

1. **Agregação pura** — `countShotsByTier(points)` em util novo estilo `scannerPressure.js`: recebe os pontos xG (histórico/`merged`, cada um com `shot_events` opcional), achata os eventos, dedup por `(minute, team, xg_delta)`, ignora tier/team desconhecido em silêncio, e devolve totais por nível e lado **no mesmo shape do backend** (`shot_tiers` do Ticket 0: `{C1:{home,away}, C2:{…}, C3:{…}, C4:{…}}`), sempre presente, zeros quando vazio.
2. **Nomes PT-BR dos níveis** — tabela congelada `TIER_LABELS` (C1–C4 → nomes completos do backend) + helper de resolução com fallback em `app/utils/enums.js` (padrão `MARKET_LABELS`/`tradingModelLabel`); precedência do `label` do backend quando presente; tier desconhecido → retorna o próprio código (nunca quebra).
3. **Conserto do merge ao vivo** — o ponto ao vivo passa a carregar `game.shot_events` (delta do ciclo) e o `merged` do gráfico deixa de substituir o ponto do histórico: faz **união por minuto** (xg do ao vivo vence para o par de valores; `shot_events` = união histórico + delta com dedup). Merge extraído como função pura para ser testável sem canvas.
4. **Testes unitários** da agregação e do merge (specs puros em `tests/app/utils/`, padrão `scannerPressure.spec.ts` / `scanner.spec.ts`).

**Out of scope:**
- Barras do card C1–C4 (Ticket 2, consomem `shot_tiers` do Ticket 0), marcadores no gráfico (Ticket 3), tooltip por minuto (Ticket 4).
- `shot_tiers` (campo do backend; não é lido aqui).
- Mudanças em schemas/composables/polling (passthrough já entrega os dados; scanner não passa por `useModelApi`).
- Formatação `xg_delta`/minuto como UI (`formatNumber(Math.abs(v),2)`, `` `${m}'` ``): consumida só a partir dos Tickets 3/4.
- Variantes de cor custom em `app.config.ts` (NuxtUI v4 ignora; palette existente).

## Technical Approach

### 1. Novo `app/utils/scannerShots.js` (puro, sem estado)

Espelha o estilo de `scannerPressure.js` (named exports, guards `Array.isArray`, tolerante a null/undefined, sem efeitos colaterais):

```js
// Chave de dedup: (minute, team, xg_delta) — mais forte que a do store
// (team, xg_delta) e idêntica à do shot_totals do Ticket 0 (event_key).
const eventKey = (e) => `${e.minute}|${e.team}|${e.xg_delta}`

// Totais no shape do backend shot_tiers — sempre presentes, zeros default.
export function emptyShotTotals() {
  return { C1: { home: 0, away: 0 }, C2: { home: 0, away: 0 }, C3: { home: 0, away: 0 }, C4: { home: 0, away: 0 } }
}

// Achata os shot_events de pontos xG (histórico/merged) em 1 lista, com dedup.
// Pontos sem shot_events, undefined/null ou não-lista → ignorados.
export function collectShots(points) { ... }

// Conta eventos chutes por nível × lado. Tier fora de C1-C4 ou team fora de
// home/away → ignorado em silêncio (sem bucket fantasma, sem throw).
// Uso previsto (Tickets 3/4): countShotsByTier(merged) sobre o gráfico/modal.
export function countShotsByTier(points) { ... }

// Merge por minuto do gráfico xG: xg do ao vivo vence, mas shot_events do
// minuto = união (histórico + delta do ciclo) com dedup por eventKey.
// Ordena por minuto; live vazio → histórico inalterado; pontos do live sem
// par no histórico são acrescentados.
export function mergeXgSeries(history, liveSamples) { ... }
```

Formato de retorno de `countShotsByTier`:
```js
{ C1: { home: 2, away: 0 }, C2: { home: 5, away: 3 }, C3: { home: 8, away: 6 }, C4: { home: 12, away: 9 } }
```

### 2. `app/utils/enums.js` — TIER_LABELS + helper com fallback

```js
// Níveis de chute (tipos de chute do scanner) → nomes PT-BR. Espelha o
// TIER_LABELS do backend (momentum/shot_classifier.py). O campo `label` do
// evento tem precedência quando presente; esta tabela é o fallback.
export const TIER_LABELS = Object.freeze({
  C1: 'Grande chance',
  C2: 'Boa chance',
  C3: 'Chance média',
  C4: 'Sem perigo',
})

// Display de nível: label do backend vence; senão tabela; senão o próprio
// código (C5 etc. nunca quebra).
export function tierLabel(tier, backendLabel) {
  return backendLabel ?? TIER_LABELS[tier] ?? tier
}
```

### 3. Conserto do merge — dois pontos coordenados

- **`scannerCard.vue` (~431):** o ponto ao vivo montado no `watch` passa a carregar o delta do ciclo: `shot_events: props.game.shot_events ?? []` (o jogo ao vivo já traz o campo; vazio é normal e vira `[]`). O upsert por minuto (433-435) permanece determinístico.
- **`xgLineChart.vue` (`merged`, 66-74):** o computed passa a chamar `mergeXgSeries(props.history, props.liveSamples)` do novo util, em vez do `Map` que sobrescreve o ponto por inteiro. Nenhuma outra mudança no gráfico (chartData/options consomem só `minute/xg_home/xg_away` via mapeamento explícito — campos extras são inertes hoje e seguros).

### 4. Casos-limite

- `game.shot_events` ausente/undefined (fixture antiga, jogos sem o campo): `[]`, normal — sem erro, sem retry.
- Ponto do histórico sem `shot_events`: contribui zero; não quebra.
- Chute repetido (mesmo `minute/team/xg_delta` no histórico E no delta ao vivo): conta 1× (dedup por `eventKey`).
- Tier C5 (futuro) ou `team` estranho: ignorado em silêncio na agregação; `tierLabel` devolve o código.
- Merge com histórico vazio: só os pontos ao vivo, ordenados.
- TTL/cache: nada muda — o `merged` continua sendo o ponto único de composição (histórico 5 min + deltas ao vivo por ciclo).

## Files Affected

- **Novo** `app/utils/scannerShots.js` — `emptyShotTotals`, `collectShots`, `countShotsByTier`, `mergeXgSeries`
- `app/utils/enums.js` — `TIER_LABELS` + `tierLabel`
- `app/components/scannerCard.vue` — ponto ao vivo do `watch` (~linha 431) ganha `shot_events: game.shot_events ?? []`
- `app/components/xgLineChart.vue` — `merged` (66-74) chama `mergeXgSeries`
- **Novo** `tests/app/utils/scannerShots.spec.ts` — agregação + merge + labels (pode cobrir `tierLabel`/`TIER_LABELS` junto ou em spec própria de enums)
- `docs/tickets/tipos-chute-scanner/TICKETS.md` — status do Ticket 1 (🟡 Em planejamento)

## Testes (TDD)

- Stack: [Vitest + happy-dom + @nuxt/test-utils] — specs puros **sem** `// @vitest-environment nuxt` (padrão `tests/app/utils/scannerPressure.spec.ts`: import direto `~/utils/...`, factories locais, `toBeCloseTo`/`toEqual`, nomes PT-BR).
- Padrões: [agregação espelha `scannerPressure.spec.ts`; merge espelha `scanner.spec.ts` (`mergeHistories`: dedup/ordem/cap); enums espelham `trading-models-enums.spec.ts`]
- Arquivos afetados: [nenhum spec existente quebra — pesquisa de impacto confirmou: asserts estritos de `UBadge` (scannerCard.spec.ts:172/179/201-203) e de ícones de ajuda (:227) só mudam no Ticket 2; Ticket 1 não adiciona badge/row à face do card]
- Novos testes necessários:
  - `countShotsByTier`: contagem exata por nível×lado; dedup (repetido conta 1×); tier/team desconhecido ignorado; `shot_events` ausente/null/não-lista → zeros sem throw; vazio → todos zeros; shape idêntico ao do backend (`C1..C4` × `home/away`).
  - `mergeXgSeries`: mesmo minuto → xg do ao vivo vence E `shot_events` preservam os do histórico; delta do ciclo se soma ao histórico no minuto corrente; sem par no histórico → acrescenta; ordenação por minuto; live vazio → igual ao histórico; dedup sem double-count.
  - `TIER_LABELS`/`tierLabel`: `label` do backend vence; fallback da tabela; código desconhecido (C5) devolve o próprio código.
  - Verificação: `pnpm test:unit`.

## Decisions

- **Merge ao vivo:** opção A aprovada — merge **puro extraído** (`mergeXgSeries`) com união por minuto + dedup; ponto ao vivo carrega `game.shot_events`; `xgLineChart.merged` passa a usar o util. (Feito: problema 1, opção A.)
- **Agregação:** `countShotsByTier(points)` achata por dentro (points com `shot_events` opcional), dedup por `(minute, team, xg_delta)`, shape **igual ao `shot_tiers` do backend** com zeros sempre presentes. (Feito: problema 2, opção A.)
- **Labels:** `TIER_LABELS` em `enums.js` espelhando os nomes completos do backend; `tierLabel(tier, backendLabel)` = `backendLabel ?? TIER_LABELS[tier] ?? tier`. (Feito: problema 3, opção A.)
- **Sem UI no Ticket 1:** agregação serve o modal/gráfico (Tickets 3/4); barras consomem `shot_tiers` (Ticket 2). Nenhum badge/row novo na face do card → nenhum assert estrito de `scannerCard.spec.ts` muda aqui.
- **Descoberta de arquitetura:** scanner **não** passa por `useModelApi.js` (sem composables de scanner lá); o fluxo é page `$fetch` + `safeParse('scannerSnapshot')` e `useXgHistory.js` — nada a mexer nesses caminhos.

## Risks

| Risco | Severidade | Mitigação |
|---|---|---|
| Double-count ao mesclar histórico + delta do mesmo chute | Baixa | Dedup por `(minute, team, xg_delta)` em `mergeXgSeries` e `countShotsByTier` |
| `game.shot_events` ausente (fixtures/jogos antigos) | Baixa | Guard para `[]`; vazio = normal, nunca erro |
| Util novo sem consumidor visual até Tickets 3/4 | Nula (por desenho) | Ticket 1 é a base de dados; coberto por specs puros |
| Teste do merge exigir canvas | Nula | Merge extraído como função pura; spec sem `vue-chart-3` |
| Asserts estritos de UBadge quebrarem | Nula no Ticket 1 | Nenhum badge/row novo aqui; quebra só no Ticket 2 (já previsto em TICKETS.md:69) |
| `TIER_LABELS` divergir do backend | Baixa | Nomes copiados de `shot_classifier.py`; `label` do backend tem precedência quando chega |
