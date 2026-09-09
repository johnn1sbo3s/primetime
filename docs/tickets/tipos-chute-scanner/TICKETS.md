# Tipos de chute no scanner — Tickets

> Exibir os tipos de chute (C1–C4) detectados pelo backend no card do scanner: contagem por nível nas barras de métricas, marcadores no gráfico de xG e tooltip por minuto com gol + chute + alerta.

Contrato do backend (já em produção): chute = `{minute, team, xg_delta, tier, label}`; tiers C1 grande chance (≥0.50) / C2 boa chance (0.20–0.50) / C3 chance média (0.05–0.20) / C4 sem perigo (<0.05). No ao vivo cada jogo tem `shot_events` (vazio = sem chute novo, normal). No histórico cada ponto tem `minute, xg_home, xg_away, shot_events`. A lista sempre vem, nunca é omitida. Minuto é o do ciclo de detecção, não o segundo exato; primeira leitura nunca gera chute; sem variação de xG não há chute (normal, não bug). Cor é decisão do front.

**Status:** 🟢 Aprovada em 2026-09-07

---

## Ticket 0 — Backend: acumulados de chutes no snapshot (momentum-scanner)

**Status:** 🟢 Completo em 2026-09-07

### Objetivo
Incluir no snapshot (`live.json`, por jogo) os totais acumulados de chutes por nível e time, para que as barras do card (Ticket 2) tenham de onde tirar totais sem N requisições por jogo.

### Scope
- Campo novo por jogo (ex.: `shot_tiers`: `{C1: {home, away}, C2, C3, C4}`) montado no monitor a partir do histórico do banco (`get_xg_history`, que já une por minuto com dedup) + delta do ciclo atual (ciclos desde o último `save`, senão perde chute recente — atenção ao `SNAPSHOT_DB_INTERVAL`)
- `build_game`/`extract_one` passam a incluir o campo; `build_snapshot` leva por spread, sem mudança no resto do contrato
- Testes backend (store + snapshot)

### Dependencies
Nenhum (base dos demais; implementado no repo momentum-scanner).

### Notes
- Confirmado no código: `build_game` (`momentum/snapshot.py`) é montado sem o SQLite por perto — `shot_events` ali é sempre o delta do ciclo (`classify_shots` em `monitor.py`); o acumulado só existe no `/xg-history` via `get_xg_history` (união por minuto com dedup por `(team, xg_delta)`)
- Formato do chute confirmado: `{minute, team: 'home'|'away', xg_delta, tier: C1–C4, label}`; `team` segue o precedente de `goals[].team`
- Tier desconhecido (ex.: C5 um dia): ignorar silenciosamente, sem bucket fantasma

---

## Ticket 1 — Base: ler shot_events + contadores por nível

**Status:** 🟢 Completo em 2026-09-08

### Objetivo
Parsear `shot_events` no front, agregar contagem por nível (C1–C4) por time, e expor nomes em português para os níveis.

### Scope
- Agregação pura (ex.: `countShotsByTier`) sobre `game.shot_events` (ao vivo) e pontos do histórico — seguir o padrão das funções puras e testadas de `app/utils/scannerPressure.js`
- Labels PT-BR dos níveis (padrão `MARKET_LABELS`/helper com fallback em `app/utils/enums.js`); o `label` do backend tem precedência quando presente
- Conserto do merge ao vivo: o ponto ao vivo (`{minute, xg_home, xg_away}` montado em `scannerCard.vue`) substitui o ponto do histórico no mesmo minuto e apagaria os chutes — carregar `game.shot_events` junto ou preservar os existentes
- Testes unitários da agregação e do merge

### Dependencies
Ticket 0 (totais `shot_tiers` para as barras; a agregação deste ticket serve o modal/gráfico sobre histórico + delta).

### Notes
- Schemas Zod (`scannerSnapshot`, `scannerXgHistory`) são passthrough: `shot_events` já flui sem tocar composable/schema; nada no front lê hoje (zero matches de `shot_events`/`xg_delta` em `app/` e `tests/`)
- Formatação do `xg_delta` via `fmtRaw`/`formatNumber(v,2)` (valor absoluto, não taxa); minuto como `` `${m}'` `` com fallback `--`, padrão `goalsText`
- Não criar variantes custom em `app.config.ts` (NuxtUI v4 ignora); cores da paleta existente
- `scannerCard.spec.ts` tem asserts de contagem exata de UBadge — novas badges quebram esses asserts (atualizar no ticket 2)
- Barras (Ticket 2) consomem `shot_tiers` do Ticket 0 quando presente; agregação deste ticket serve o modal/gráfico (histórico + delta do ciclo com dedup)

---

## Ticket 2 — Barras do card: chutes agrupados C1–C2 e C3

**Status:** 🟢 Completo em 2026-09-08

### Objetivo
Exibir nas barras de métricas do card os chutes com perigo **agrupados**: 1 linha "CHUTES C1–C2" (soma dos níveis C1+C2, casa × fora) e 1 linha "C3" (chance média). **Sem C4** (chute sem perigo) — decisão do usuário: não faz sentido exibir. Cada linha leva hint explicando o nível.

### Scope
- **2 linhas novas** em `statRows` (`scannerCard.vue`), **posição: logo após XG** (aprovado): `XG → CHUTES C1–C2 → C3 → FINALIZAÇÕES → CHANCES CLARAS → TOQUES NA ÁREA`
- Layout dual casa/fora reaproveitado (`bg-teal-400` casa / `bg-blue-500` fora / trilho `bg-zinc-800`), formatação inteira `formatNumber(v, 0)`
- Fonte: `shot_tiers` do Ticket 0 (`game.shot_tiers`), **não** a agregação do Ticket 1 (que serve modal/gráfico)
- Hint em cada linha nova com ícone `i-lucide-circle-help` (mesmo padrão dos hints CONTROLE/C10/PICO do card — aprovado), tooltip **por nível com faixa de xG**: C1–C2 → "Grande chance (xG ≥ 0,50) + Boa chance (xG 0,20–0,50)"; C3 → "Chance média (xG 0,05–0,20)"
- Atualizar `scannerCard.spec.ts`: fixture `game()` passa a aceitar `shot_tiers`; novo assert de ícones de ajuda (2 novas linhas com hint); casos de ausência/zeros

### Dependencies
Ticket 0 (`shot_tiers` no live.json). Ticket 1 **não** é fonte das barras (só do modal/gráfico).

### Notes
- **Exibição quando sem dados = política FINALIZAÇÕES** (aprovada): `shot_tiers` presente com zeros → "0" com trilho vazio (fundo `bg-zinc-800` aparece); campo ausente (fixture antiga/preview) → "—" sem barra preenchida; **nunca esconder a linha** por falta de dado
- **Agrupamento é só decisão de exibição do card**: o dado `shot_tiers` por tier permanece intacto; Tickets 3/4 usam `shot_events` por chute individual no gráfico (C1–C4), não afetados por este agrupamento
- Novo bloco entra no skeleton existente, nunca spinner
- Sem colisão de cor nova: teal = casa, blue = fora, âmbar pulsante = alerta recente — a escala por nível **não** usa cor no card (só nas linhas agrupadas), cor/símbolo por nível fica para os marcadores do gráfico (Ticket 3)

---

## Ticket 3 — Marcadores de chute no gráfico xG

**Status:** 🔴 Não iniciado

### Objetivo
Marcar no gráfico de xG (`xgLineChart.vue`) os minutos com chute, com cor/símbolo por nível.

### Scope
- Dataset extra (scatter) ou `pointRadius`/`pointBackgroundColor` por índice — sem plugin novo (annotation/zoom já registrados globalmente, mas o xG não usa; seguir o padrão do gráfico)
- Não re-registrar Chart.js (singleton `ensureChartSetup`); tooltip custom via `callbacks` em options (será o primeiro do repo — implementar em `xgLineChart.vue` ou nova factory espelhando `usePerformanceChartOptions`)
- Fonte de dados: `merged` (history + liveSamples) com `shot_events` por ponto (Ticket 1)
- Histórico é ~90–100 pontos: mapeamento por minuto é barato, mas memoizar junto ao `merged` para não rebuildar a cada tick do long-poll
- Visual (cor/símbolo por nível) decidido no ticket via visual companion

### Dependencies
Ticket 1.

### Notes
- `chartOptions` hoje é estático com `interaction: {mode:'index', intersect:false}` e tooltip só com styling dark — base pronta para o hover por minuto
- `test.setup.ts` moca `vue-chart-3` como stub: lógica de `chartData`/tooltip se testa via computed/função pura, nunca via canvas; não existe `xgLineChart.spec` hoje

---

## Ticket 4 — Tooltip por minuto (gol + chute + alerta)

**Status:** 🔴 Não iniciado

### Objetivo
Hover em cada linha de minuto do gráfico xG abre tooltip mostrando o que aconteceu naquele minuto: gol, chute(s) e notificação/alerta.

### Scope
- Enriquecer `plugins.tooltip.callbacks` cruzando o ponto por minuto com `game.goals`, `game.notifications` e `shot_events` (conteúdo do verso do card: label + minuto + hora — reaproveitar)
- Conteúdo em PT-BR reaproveitando padrões (`push(label,hv,av,fmt)`, `'—'` para null)
- Mobile: tap dispara hover no Chart.js (sem fallback próprio hoje no repo); se tooltip rico exigir overlay DOM, seguir o padrão canônico (trigger nativo + `@click.stop`, pois o card tem flip no `@click` do root)

### Dependencies
Ticket 3 (marcadores e callbacks base); usa dados do Ticket 1.

### Notes
- Hoje o gráfico xG não marca nenhum evento (só tooltip default com os 2 valores de xG); gols só existem no MomentumChart SVG (`<circle>` + `<title>` nativo); notificações só no bell/verso do card
- `shot_events` vazio = normal (sem retry/erro, como o empty state `aguardando dados de xG`)
