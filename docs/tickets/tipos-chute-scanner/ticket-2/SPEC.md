**Status:** 🟢 Aprovada em 2026-09-08

# Spec: Ticket 2 — Barras do card: chutes agrupados C1–C2 e C3

## Goal

Exibir nas barras de métricas do card do scanner os chutes com perigo **agrupados em 2 linhas** — "CHUTES C1–C2" (soma C1+C2 por lado) e "C3" — cada uma com contagem casa × fora, barra dual casa/fora e hint explicando o nível. **C4 (sem perigo) não é exibido** (decisão do usuário: sem sentido). Posição aprovada: **logo após XG**.

## Context

O backend (Ticket 0, em produção) já injeta `game.shot_tiers` no `live.json`: `{C1:{home,away}, C2:{…}, C3:{…}, C4:{…}}` com totais **acumulados** por jogo, sempre presente (zeros quando sem chutes), nunca omitido. O front hoje não lê o campo (zero matches em `app/`/`tests/` — schema Zod é passthrough, então o campo já flui intacto até `scannerCard.vue`). Níveis: C1 grande chance (≥0.50) / C2 boa chance (0.20–0.50) / C3 chance média (0.05–0.20) / C4 sem perigo (<0.05); nomes PT-BR canônicos em `TIER_LABELS` (Ticket 1).

**Decisões de design aprovadas pelo usuário em 2026-09-08 (via visual companion):**
- **Agrupamento:** linha "CHUTES C1–C2" = soma dos totais C1+C2 por lado; linha "C3" = total C3 por lado. C4 fora (chute sem perigo não faz sentido exibir).
- **Posição:** logo após a linha XG — `XG → CHUTES C1–C2 → C3 → FINALIZAÇÕES → CHANCES CLARAS → TOQUES NA ÁREA`.
- **Ícone do hint:** `i-lucide-circle-help` (mesmo padrão dos hints CONTROLE/C10/PICO já existentes no card).
- **Tooltip por nível com faixa de xG:** C1–C2 → "Grande chance (xG ≥ 0,50) + Boa chance (xG 0,20–0,50)"; C3 → "Chance média (xG 0,05–0,20)".
- **Sem dados = política FINALIZAÇÕES:** linha **sempre renderizada**; `shot_tiers` presente com zeros → "0" com trilho vazio (`bg-zinc-800` aparece, sem preenchimento); campo ausente (fixture antiga/preview) → "—" com trilho vazio.

O card já renderiza linhas de stat com esse shape exato (`scannerCard.vue:169-196`): `{label, home, away, pctHome, hint}`; o hint é `UPopover` com `i-lucide-circle-help` quando `row.hint` existe (padrão CONTROLE/C10/PICO, linhas 176-186). Basta produzir 2 rows novas nesse shape e injetá-las depois de XG em `statRows` — **sem mudança de template**.

## Scope

**In scope:**
1. **2 rows novas** "CHUTES C1–C2" e "C3" em `statRows` (`scannerCard.vue`), **posição: logo após XG** — valor inteiro casa/fora (`formatNumber(v, 0)`), `pctHome` = share quando `home+away > 0` (senão `null` → trilho vazio), hint em cada linha.
2. **Fonte:** `game.shot_tiers` (Ticket 0). Ausente (`null`/`undefined`, fixture antiga) → `home/away = '—'`, `pctHome = null`. Presente com zeros → `'0'`. Tier dentro de C1–C4; valor não-numérico/ausente por tier → tratado como 0 (nunca quebra).
3. **Hint texts** como constantes perto dos outros `*_HINT` do arquivo (`CONTROL_HINT` etc.), com as faixas de xG aprovadas.
4. **Testes** — spec puro do somador + atualização de `scannerCard.spec.ts` (fixture com/sem `shot_tiers`, assert de ícones de ajuda, casos zeros/ausente).

**Out of scope:**
- Marcadores no gráfico (Ticket 3) e tooltip por minuto (Ticket 4) — consomem `shot_events` por chute (Ticket 1), não `shot_tiers`; C1–C4 individualizados ficam para lá.
- Mudanças em schemas/composables/polling (passthrough já entrega `shot_tiers`; scanner não passa por `useModelApi`).
- Variantes de cor custom em `app.config.ts` (NuxtUI v4 ignora): barras usam `bg-teal-400`/`bg-blue-500`/trilho `bg-zinc-800` existentes; cor/símbolo por nível é decisão do Ticket 3.
- Qualquer alteração no verso do card, no `merged`/gráfico ou no comportamento dos Tickets 3/4.

## Technical Approach

### 1. Novo helper puro `sumTiers` em `app/utils/scannerShots.js` (ou função local)

O shape consumido (`shot_tiers` do backend) é irmão do shape já trabalhado em `scannerShots.js` (`emptyShotTotals` devolve o mesmo formato). Adicionar um somador puro tolerante no mesmo módulo, para ser testável sem canvas (padrão do repo):

```js
// Soma totais de tiers do shot_tiers do backend (Ticket 0) por lado.
// Ex.: sumTiers(game.shot_tiers, ['C1', 'C2']) → { home, away } — a linha
// "CHUTES C1–C2" do card. Totals ausente/nulo → zeros; valor por tier/lado
// ausente ou não-numérico → 0 (nunca quebra).
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

### 2. Linhas novas em `scannerCard.vue`

`statRows` hoje (`scannerCard.vue:568-583`) = `[...derivedRows.value, ...STAT_LABELS.map(...)]`, e `STAT_LABELS` começa com `xg`. Inserir as 2 linhas de chute **entre a linha XG e FINALIZAÇÕES**. Caminho mínimo sem reordenar o array por fora: extrair a row de XG do map e compor na ordem certa, ou marcar posição de inserção — a decisão fina de implementação é do PLAN; o **contrato** é: rows XG → CHUTES C1–C2 → C3 → FINALIZAÇÕES → … (assertável por índice/ordem no spec de componente).

Constantes de hint (perto de `CONTROL_HINT`, `scannerCard.vue:472-476`) — texto exato aprovado:

```js
const SHOT_C12_HINT = 'Grande chance (xG ≥ 0,50) + Boa chance (xG 0,20–0,50)'
const SHOT_C3_HINT = 'Chance média (xG 0,05–0,20)'
```

Contrato de cada row nova (shape idêntico ao das linhas atuais — o template **não muda**):

| Campo | CHUTES C1–C2 | C3 |
|---|---|---|
| `label` | `'CHUTES C1–C2'` | `'C3'` |
| `home` | `shot_tiers` ausente → `'—'`; senão `formatNumber(C1.home + C2.home, 0)` | idem com `C3.home` |
| `away` | idem lado away | idem |
| `pctHome` | `null` se `total <= 0` ou campo ausente; senão `home/total*100` | idem |
| `hint` | `SHOT_C12_HINT` | `SHOT_C3_HINT` |

### 3. Casos-limite

- `game.shot_tiers` ausente/undefined/null (fixture antiga, preview sem campo) → `'—'` + trilho vazio, linha visível (nunca esconder; nunca erro).
- `shot_tiers` presente com zeros (jogo sem chute com perigo) → `'0'` + trilho vazio — idêntico a FINALIZAÇÕES com 0.
- Valor por tier/lado não-numérico (`'abc'`, `null`, ausente) → conta como 0 para a soma, sem quebrar.
- `shot_tiers` com apenas C3 (sem C1/C2) → C1–C2 soma 0; linha C3 mostra o valor.
- Chute repetido/dedup: não é caso das barras — `shot_tiers` já é o acumulado deduplicado do backend (Ticket 0); o somador só soma inteiros.
- C4 presente no payload: ignorado pelas linhas (fora de `['C1','C2']` e `['C3']`) — não soma, não quebra.

## Files Affected

- `app/components/scannerCard.vue` — 2 constantes `SHOT_*_HINT`; rows novas em `statRows` após XG (usa `game.shot_tiers` + `sumTiers`); **sem mudança de template**
- `app/utils/scannerShots.js` — `sumTiers` (append; módulo já existe do Ticket 1)
- `tests/app/utils/scannerShots.spec.ts` — spec puro do `sumTiers` (append; arquivo já existe)
- `tests/app/components/scannerCard.spec.ts` — fixture `game()` ganha variante com `shot_tiers`; novo assert de ícones `circle-help` (3 existentes → 5 com as 2 novas); casos: soma exibida, zeros, campo ausente `'—'`, ordem XG → CHUTES C1–C2 → C3
- `docs/tickets/tipos-chute-scanner/TICKETS.md` — já atualizado (design aprovado + status 🟡); marca Spec aprovada quando aprovada

## Testes (TDD)

- Stack: Vitest + happy-dom; specs puros **sem** `// @vitest-environment nuxt` para `sumTiers` (padrão `tests/app/utils/scannerShots.spec.ts`); spec de componente usa `mountSuspended` + stub de `UTooltip` já existente em `scannerCard.spec.ts`.
- Arquivos afetados — **nenhum assert existente quebra fora dos previstos**:
  - `scannerCard.spec.ts:227` (3 ícones `circle-help`) → **vira 5** (2 hints novos) — atualizar no mesmo ticket.
  - `scannerCard.spec.ts:172/179/201` (contagem exata de `UBadge`) — **não muda**: rows novas não usam UBadge.
  - `scannerCard.spec.ts:221` (`'—'` quando sem momentum) — segue válido; novos casos cobrem `'—'` por `shot_tiers` ausente.
- Novos testes:
  - `sumTiers` (spec puro): soma C1+C2 por lado; totals ausente/null/lixo → zeros; tier/lado ausente ou não-numérico → 0; não muta entrada; `['C3']` soma só C3.
  - Componente: fixture com `shot_tiers` não-nulos → textos das somas (ex.: C1 2+3 e C2 1+0 → "CHUTES C1–C2" mostra 5×1) e barras com share; fixture com `shot_tiers` zeros → "0" presente e trilho vazio (nenhum fill); fixture **sem** `shot_tiers` → "CHUTES C1–C2"/"C3" visíveis com "—"; ordem dos labels (índice de XG < índice de CHUTES C1–C2 < C3 < FINALIZAÇÕES no texto/estrutura); ícones `circle-help` = 5.
- Verificação: `pnpm test:unit` completo verde (nenhum outro spec quebra: rows novas não tocam UBadge/momentum/verso).

## Decisions

- **2 linhas agrupadas (C1–C2 soma + C3), sem C4** — aprovado pelo usuário 2026-09-08 (opção 1 do visual): C4 (sem perigo) não faz sentido exibir no card.
- **Posição logo após XG** — aprovado; agrupamento é decisão só de exibição do card, `shot_tiers` por tier intacto para os Tickets 3/4 (que usam `shot_events` individuais, não afetados).
- **Fonte `shot_tiers` (Ticket 0)**, não a agregação do Ticket 1 — barras = acumulado por jogo pronto; `countShotsByTier` (Ticket 1) continua servindo modal/gráfico.
- **Política de ausência = FINALIZAÇÕES:** linha sempre renderizada; zeros → "0" trilho vazio; campo ausente → "—" (nunca esconder, nunca spinner/erro).
- **Ícone do hint `circle-help`** (padrão do card), tooltip por nível com faixa de xG.
- **Sem template novo:** rows reutilizam o shape `{label, home, away, pctHome, hint}` existente.

## Risks

| Risco | Severidade | Mitigação |
|---|---|---|
| `shot_tiers` ausente (jogos antigos/preview) | Baixa | `'—'` + trilho vazio, linha visível — nunca quebra (passthrough já entrega quando existe) |
| Double-count ao somar C1+C2 com dedup | Nula | `shot_tiers` já é acumulado deduplicado do backend (Ticket 0); somador é puro sobre inteiros |
| C4 "sumir" sem explicação | Nula | Decisão explícita do usuário; documentada no TICKETS.md; dado intacto p/ Tickets 3/4 |
| Assert de 3 ícones `circle-help` quebra | Baixa (esperado) | Atualizado no mesmo ticket (3 → 5); nenhum assert de UBadge muda |
| Ordem das linhas regredir em refactor futuro | Baixa | Coberto por assert de ordem no spec de componente |
| Divergência de faixas de xG no hint vs backend | Baixa | Faixas copiadas de `shot_classifier.py` (mesmas do TICKETS.md:5); textos constantes fáceis de ajustar |
