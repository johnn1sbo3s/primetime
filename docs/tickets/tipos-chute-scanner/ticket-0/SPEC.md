**Status:** 🟢 Aprovada em 2026-09-07

# Spec: Backend — acumulados de chutes no snapshot (Ticket 0)

## Goal

Cada jogo do `/live.json` passa a trazer `shot_tiers` com os totais acumulados de chutes por nível (C1–C4) e lado (casa/fora), para que as barras do card no front tenham totais prontos sem baixar histórico jogo a jogo.

## Context

O `shot_events` que o snapshot carrega hoje é sempre o delta do ciclo corrente: `extract_state` compara o xG atual com o anterior (`_prev_xg`) e emite só os chutes novos, quase sempre lista vazia. O acumulado só existe no `/xg-history`, que lê do SQLite (`get_xg_history` une eventos por minuto com dedup). O front precisa de totais no snapshot porque as barras do card renderizam para todos os jogos a cada ciclo — baixar `/xg-history` por jogo seria N requisições.

Decisão de desenho (aprovada): placar corrido em memória em vez de somar do banco a cada ciclo. São 8 inteiros por jogo (4 níveis × 2 lados), no máximo ~30 jogos simultâneos — irrelevante perto do gráfico de momentum que já vive em memória. Relêr a série inteira do SQLite por jogo por ciclo seria O(N × duração do jogo) a cada ~30–60s, dividindo uma conexão única com as workers, para recalcular 8 números que quase nunca mudam.

## Scope

**In scope:**
- Novo módulo puro `momentum/shot_totals.py` com a agregação (zeros, soma com dedup, ignora tier/time desconhecido)
- Acumulador em memória no monitor (`dict` por `match_id`, espelhando `_prev_xg`), hidratado 1× do banco ao ver jogo novo (cobre restart), somando só o delta de cada ciclo
- Injeção de `game["shot_tiers"]` pós-`build_snapshot` no `main()`, espelhando `attach_team_history` (cobre ao vivo + encerrado + colapsado sem tocar nos 2 ramos de `extract_one`)
- Paridade no `preview_server.py` (dev-only)
- Testes: novo `test_shot_totals.py` + teste de ciclo com DB fake + passthrough no snapshot

**Out of scope:**
- `/xg-history`, TTL de 180s e `snapshot_store.py`: intocados (só leitura via `get_xg_history`)
- Migration de schema: nenhuma (derivado em memória)
- Front (tickets 1–4 consomem o campo)
- Regras de Telegram/notificações: consomem `state`, não o dict do jogo

## Technical Approach

### 1. Novo `momentum/shot_totals.py` (puro, sem estado)

```python
TIERS = ("C1", "C2", "C3", "C4")
TEAMS = ("home", "away")

def empty_totals():
    """{'C1': {'home': 0, 'away': 0}, ...} — sempre presente, nunca omitido."""
    return {t: {"home": 0, "away": 0} for t in TIERS}

def event_key(event):
    """Chave de dedup: (minute, team, xg_delta). Mais forte que a do store,
    que usa só (team, xg_delta) e colidiria em minutos distintos."""
    return (event.get("minute"), event.get("team"), event.get("xg_delta"))

def add_events(totals, seen, events):
    """Soma eventos aos totais, pulando os já vistos e os inválidos.
    Tier fora de C1–C4 ou team fora de home/away → ignorado em silêncio."""
    for e in events or []:
        if not isinstance(e, dict):
            continue
        tier, team = e.get("tier"), e.get("team")
        if tier not in TIERS or team not in TEAMS:
            continue
        key = event_key(e)
        if key in seen:
            continue
        seen.add(key)
        totals[tier][team] += 1
    return totals
```

Segue o padrão de `shot_classifier.py`: módulo puro novo em vez de engordar `monitor.py` (1072 linhas, só orquestração).

### 2. Acumulador + attach no `monitor.py`

```python
_shot_tiers: dict[str, dict] = {}  # mid -> {"totals": ..., "seen": set(), "hydrated": bool}

def attach_shot_tiers(games, db_store=None):
    """Preenche game['shot_tiers'] com os acumulados. Chamado no main()
    após build_snapshot, antes do json.dumps — mesmo ponto de
    attach_team_history. Jogos sem chute recebem zeros."""
    for game in games:
        mid = game.get("id", "")
        entry = _shot_tiers.setdefault(
            mid, {"totals": empty_totals(), "seen": set(), "hydrated": False})
        if not entry["hydrated"]:
            entry["hydrated"] = True  # marca mesmo em falha: degrada, nunca quebra
            if db_store is not None:
                try:
                    for point in db_store.get_xg_history(mid):
                        add_events(entry["totals"], entry["seen"],
                                   point.get("shot_events", []))
                except Exception:  # noqa: BLE001 — DB não pode derrubar o ciclo
                    logger.warning("shot_tiers: hidratação falhou para %s", mid)
        add_events(entry["totals"], entry["seen"], game.get("shot_events", []))
        game["shot_tiers"] = entry["totals"]
```

No `main()`, 1 chamada após `attach_team_history(...)` (linha ~1047):

```python
attach_shot_tiers(snapshot["games"], db_store)
```

Por que aqui e não em `extract_one`:
- `extract_one`/`cycle` não recebem o `db_store` (só existe no `main()`); furar o parâmetro pelas workers do pool seria invasivo e poria SELECTs concorrentes numa conexão SQLite única.
- Os 2 ramos de montagem (encerrado ~l.755, ao vivo ~l.821) passam ambos por `store` → `build_snapshot`, então o attach pós-snapshot cobre os dois + jogos colapsados (que mantêm o dict anterior) sem tocar em nenhum ramo.
- O segundo `build_snapshot` (para `db_store.save()`) fica sem o campo de propósito: `save()` lê chaves conhecidas via `.get`, chaves extras/ausentes não afetam nada.

Contrato do campo:

```python
"shot_tiers": {
    "C1": {"home": 2, "away": 0},
    "C2": {"home": 5, "away": 3},
    "C3": {"home": 8, "away": 6},
    "C4": {"home": 12, "away": 9},
}
```

Sempre presente (zeros quando sem chutes), nunca omitido. `build_snapshot` leva por spread `{**g}` sem mudança.

### 3. `preview_server.py` (paridade dev)

Injetar `game["shot_tiers"] = empty_totals()` após `build_game` — pipeline dev paralelo que monta snapshot sem passar pelo monitor; sem isso o front em dev nunca veria o campo (front trata como opcional de qualquer forma).

### 4. Casos-limite

- **Restart do container:** `_prev_xg` zera → 1º ciclo emite delta vazio; hidratação 1× repõe todo o passado. Perde-se no máximo o salto do downtime (1–2 eventos).
- **Colapsado (leitura sem gráfico):** game mantém `shot_events` do ciclo anterior, mas o `seen` já contém esses eventos → re-attach não conta 2×.
- **Double-count history+delta:** impossível por construção — hidratação roda 1× e o `seen` dedupa qualquer evento que apareça nos dois.
- **`SNAPSHOT_DB_INTERVAL > 1` no futuro:** acumulador continua correto (soma deltas todo ciclo, independente de `save()`).
- **`db_store` None (falha ao abrir DB):** zeros + deltas do ciclo em diante.
- **Jogo encerrado:** sai do radar após `FINISHED_HOLD_MIN`; entrada do acumulador pode ficar (memória irrelevante, mesmo padrão de `_prev_xg`).

## Files Affected

- **Novo** `momentum/shot_totals.py` — `empty_totals`, `event_key`, `add_events`
- `momentum/monitor.py` — `_shot_tiers`, `attach_shot_tiers`, 1 chamada no `main()` após `attach_team_history`
- `momentum/preview_server.py` — injetar zeros (paridade dev)
- **Novo** `tests/momentum/test_shot_totals.py` — agregação pura
- `tests/momentum/test_monitor_cycle.py` — 1 teste de ciclo com DB fake (padrão `_run_extract_one`)
- `tests/momentum/test_snapshot.py` — 1 assert de passthrough do campo por spread (opcional, documenta contrato)

## Testes (TDD)

- Stack: `uv run pytest` (testpaths=`tests/`); nomes em inglês, docstrings pt-BR; sem fixtures conftest; mock via monkeypatch em `monitor.api_extract_all`; DB real em `tmp_path` com `interval=1` explícito (default 2 pularia o 2º `save` e teste de merge passaria por vacuidade).
- Padrões: `_make_game`/`_make_snapshot` em `test_snapshot_store.py`; teste de delta em 2 leituras em `test_goal_silence.py:433` (backup/restore de `monitor._prev_xg` — o teste novo do acumulador segue o mesmo cuidado com `_shot_tiers`).
- Novos testes necessários:
  - `test_shot_totals.py`: soma por tier×lado; tier desconhecido (C5) ignorado; team desconhecido ignorado; evento repetido conta 1×; `None`/não-lista vira zeros sem throw.
  - `test_monitor_cycle.py`: 2 ciclos com xG crescente + DB com histórico → `shot_tiers` soma history + delta sem duplicar; jogo encerrado carrega o campo; colapsado mantém sem double-count.
  - `test_snapshot.py`: game com `shot_tiers` atravessa `build_snapshot` por spread.
- Verificação: `uv run pytest tests/momentum/test_shot_totals.py tests/momentum/test_snapshot.py tests/momentum/test_monitor_cycle.py tests/momentum/test_snapshot_store.py -q`, depois `uv run pytest -q` completo.
- Nenhum teste existente quebra: `test_snapshot.py` asserta campo a campo (zero asserts de igualdade total do game); campo aditivo flui por spread como `team_history`.

## Decisions

- **Placar corrido em memória** (opção A) em vez de SELECT por jogo por ciclo — aprovado pelo usuário em 2026-09-07; 8 inteiros/jogo não pesam.
- **Attach pós-`build_snapshot`** espelhando `attach_team_history`, não injeção em `extract_one` — cobre live/encerrado/colapsado uniforme e evita furar `db_store` pelas workers.
- **Dedup por `(minute, team, xg_delta)`** — mais forte que a do store `(team, xg_delta)`.
- **Tier/team desconhecido: ignorar em silêncio**, sem bucket fantasma, sem throw.
- **Degradar nunca quebrar:** hidratação com `try/except`, `db_store` None, `shot_events` ausente → zeros + deltas.
- **Front trata `shot_tiers` como opcional** (jogos antigos, preview sem campo).

## Risks

| Risco | Severidade | Mitigação |
|---|---|---|
| Chutes do downtime perdidos no restart | Baixa (1–2 eventos) | Hidratação 1× repõe o resto; comportamento igual ao delta atual |
| Double-count em re-attach do mesmo ciclo | Baixa | `seen` por match impede |
| `preview_server` divergir do prod | Baixa | Zeros injetados + front opcional |
| Deploy sem aprovação / sem `--memory 4g` | Média (processo) | Regra do repo: deploy VPS só com aprovação; recreate com bind mount preservando `scanner.db` |
| Front esperando campo antes do deploy | Baixa | Front trata como opcional; coordenar deploy antes dos tickets 1–2 |
