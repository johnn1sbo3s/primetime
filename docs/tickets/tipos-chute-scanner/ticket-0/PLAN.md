# Ticket 0 (shot_tiers no snapshot) Implementation Plan

> **For agentic workers:** implement this plan task-by-task with a fresh subagent per task (or `unlazy` gates for critical work). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada jogo do `/live.json` traz `shot_tiers` com totais acumulados por nível e lado.

**Architecture:** Módulo puro novo `momentum/shot_totals.py` (zeros + soma com dedup) + acumulador em memória no monitor hidratado 1× do SQLite, injetado pós-`build_snapshot` no `main()` espelhando `attach_team_history`. Sem migration, sem SELECT por ciclo.

**Tech Stack:** Python 3.10, pytest 9.1.1 via `uv run pytest`, SQLite stdlib. Repo alvo: `/Users/jone/Projetos/momentum-scanner` (este PLAN vive no frontend ao lado do SPEC).

## Global Constraints

- Comandos sempre via `uv run ...` a partir de `/Users/jone/Projetos/momentum-scanner`; nunca `pip` direto.
- Python >=3.10,<3.11; type hints PEP 604 (`dict[str, ...]`, `X | None`).
- Docstrings/comentários/logs em pt-BR; nomes de teste/funções/variáveis em inglês.
- Falha-tolerante: `except Exception` amplo com `logging`, nunca silencioso; erro retorna `[]`/zeros em vez de levantar no caminho do ciclo.
- `ENTRYPOINT ["uv","run","python","-m","momentum.monitor"]` intocado; sem `CMD`.
- Sem `push`/deploy na VPS sem aprovação explícita do usuário; recreate preserva `--memory 4g` + bind mount `/opt/scanner-data/data:/app/data`.
- Nunca remover a pausa de 1s entre jogos do `FlashscoreClient`.
- Não rodar suite completa nem lint/format durante as tasks (só os comandos focados de cada task); suite completa só na Task 4.

---

### Task 1: Agregação pura `momentum/shot_totals.py`

**Files:**
- Create: `/Users/jone/Projetos/momentum-scanner/momentum/shot_totals.py`
- Test: `/Users/jone/Projetos/momentum-scanner/tests/momentum/test_shot_totals.py`

**Interfaces:**
- Consumes: nada (módulo puro novo; vocabulário de tiers espelha `momentum/shot_classifier.py`).
- Produces: `empty_totals() -> dict`, `event_key(event) -> tuple`, `add_events(totals, seen, events) -> dict` — a Task 2 importa `empty_totals` e `add_events`.

- [ ] **Step 1: Write the failing test**

```python
"""Testes do agregador puro de totais por nível (placar corrido em memória)."""
from momentum.shot_totals import add_events, empty_totals, event_key


def _shot(minute, team, tier, delta=0.30):
    return {"minute": minute, "team": team, "xg_delta": delta,
            "tier": tier, "label": "x"}


def test_empty_totals_returns_zeros_for_all_tiers_and_sides():
    """Zeros para todos os níveis e lados, nunca campo omitido."""
    assert empty_totals() == {
        "C1": {"home": 0, "away": 0},
        "C2": {"home": 0, "away": 0},
        "C3": {"home": 0, "away": 0},
        "C4": {"home": 0, "away": 0},
    }


def test_add_events_counts_by_tier_and_side():
    """Soma por nível e lado."""
    totals = add_events(empty_totals(), set(), [
        _shot(10, "home", "C2"), _shot(11, "away", "C1"),
        _shot(12, "home", "C2"),
    ])
    assert totals["C2"] == {"home": 2, "away": 0}
    assert totals["C1"] == {"home": 0, "away": 1}


def test_add_events_ignores_unknown_tier_and_team():
    """Tier C5 e team estranho são ignorados em silêncio, sem bucket fantasma."""
    totals = add_events(empty_totals(), set(), [
        _shot(10, "home", "C5"), _shot(11, "midfield", "C1"),
    ])
    assert totals == empty_totals()


def test_add_events_dedupes_repeated_event():
    """Evento repetido (mesmo minuto/time/delta) conta uma vez."""
    seen = set()
    totals = empty_totals()
    add_events(totals, seen, [_shot(10, "home", "C2", delta=0.30)])
    add_events(totals, seen, [_shot(10, "home", "C2", delta=0.30)])
    assert totals["C2"]["home"] == 1


def test_add_events_tolerates_none_and_garbage():
    """None, não-lista e não-dicts não levantam e não contam."""
    totals = add_events(empty_totals(), set(), None)
    assert totals == empty_totals()
    totals = add_events(empty_totals(), set(), ["x", 42, None])
    assert totals == empty_totals()


def test_event_key_includes_minute():
    """Dedup distingue o mesmo delta em minutos distintos."""
    assert event_key(_shot(10, "home", "C2", 0.30)) == (10, "home", 0.30)
    assert event_key(_shot(10, "home", "C2", 0.30)) != event_key(_shot(11, "home", "C2", 0.30))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/jone/Projetos/momentum-scanner && uv run pytest tests/momentum/test_shot_totals.py -v`
Expected: FAIL (ERROR — `momentum/shot_totals.py` não existe)

- [ ] **Step 3: Write minimal implementation**

```python
"""Totais acumulados de chutes por nível (placar corrido em memória).

Definição canônica do evento: momentum/shot_classifier.py `classify_shots`
(derivação por delta de xG, tiers C1–C4). Aqui só agregamos eventos já
classificados sobre (histórico do banco + delta do ciclo).
"""

TIERS = ("C1", "C2", "C3", "C4")
TEAMS = ("home", "away")


def empty_totals() -> dict:
    """Totais zerados: {'C1': {'home': 0, 'away': 0}, ...}."""
    return {t: {"home": 0, "away": 0} for t in TIERS}


def event_key(event: dict) -> tuple:
    """Chave de dedup: (minute, team, xg_delta). Mais forte que a do store,
    que usa só (team, xg_delta) e colidiria em minutos distintos."""
    return (event.get("minute"), event.get("team"), event.get("xg_delta"))


def add_events(totals: dict, seen: set, events: list | None) -> dict:
    """Soma eventos aos totais, pulando os já vistos e os inválidos.

    Tier fora de C1–C4 ou team fora de home/away → ignorado em silêncio.
    Nunca levanta: None/não-lista/não-dicts são tolerados.
    """
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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/jone/Projetos/momentum-scanner && uv run pytest tests/momentum/test_shot_totals.py -v`
Expected: PASS (6 passed)

- [ ] **Step 5: Commit**

```bash
git -C /Users/jone/Projetos/momentum-scanner add momentum/shot_totals.py tests/momentum/test_shot_totals.py
git -C /Users/jone/Projetos/momentum-scanner commit -m "feat: agregador puro de totais de chutes por nível"
```

---

### Task 2: Acumulador + `attach_shot_tiers` no monitor

**Files:**
- Modify: `/Users/jone/Projetos/momentum-scanner/momentum/monitor.py:32` (import), `:70-71` (estado `_shot_tiers` após `_prev_xg`), nova função `attach_shot_tiers` (após `attach` vizinho/`_prev_xg`), `:1047` (1 chamada no `main()` após `attach_team_history`)
- Test: `/Users/jone/Projetos/momentum-scanner/tests/momentum/test_monitor_cycle.py` (append, não alterar testes existentes)

**Interfaces:**
- Consumes: `empty_totals`, `add_events` da Task 1; `db_store.get_xg_history(mid)` (lê `snapshot_store.py`, sem modificá-lo).
- Produces: `monitor.attach_shot_tiers(games, db_store=None)` + `game["shot_tiers"]` em cada jogo do snapshot — Tasks 3–4 e o front consomem o campo.

- [ ] **Step 1: Write the failing test** (append ao fim de `test_monitor_cycle.py`)

```python
def test_attach_shot_tiers_accumulates_history_plus_delta():
    """Acumulado = histórico do banco + delta do ciclo, sem duplicar no re-attach."""
    old = dict(monitor._shot_tiers)
    monitor._shot_tiers.clear()
    try:
        class FakeDB:
            def get_xg_history(self, mid):
                assert mid == "m-tier"
                return [{"minute": 10, "xg_home": 0.3, "xg_away": 0.0,
                         "shot_events": [{"minute": 10, "team": "home",
                                           "xg_delta": 0.30, "tier": "C2",
                                           "label": "Boa chance"}]}]

        games = [{"id": "m-tier",
                  "shot_events": [{"minute": 20, "team": "away",
                                    "xg_delta": 0.55, "tier": "C1",
                                    "label": "Grande chance"}]}]
        monitor.attach_shot_tiers(games, FakeDB())
        assert games[0]["shot_tiers"] == {
            "C1": {"home": 0, "away": 1},
            "C2": {"home": 1, "away": 0},
            "C3": {"home": 0, "away": 0},
            "C4": {"home": 0, "away": 0},
        }
        # Re-attach do mesmo ciclo (ex.: leitura colapsada mantém o dict):
        # seen impede double-count.
        monitor.attach_shot_tiers(games, FakeDB())
        assert games[0]["shot_tiers"]["C1"]["away"] == 1
        assert games[0]["shot_tiers"]["C2"]["home"] == 1
    finally:
        monitor._shot_tiers.clear()
        monitor._shot_tiers.update(old)


def test_attach_shot_tiers_degrades_without_db():
    """Sem db_store (falha ao abrir DB): zeros + delta do ciclo, nunca throw."""
    old = dict(monitor._shot_tiers)
    monitor._shot_tiers.clear()
    try:
        games = [{"id": "m-nodb"}]
        monitor.attach_shot_tiers(games, None)
        assert games[0]["shot_tiers"] == {
            "C1": {"home": 0, "away": 0},
            "C2": {"home": 0, "away": 0},
            "C3": {"home": 0, "away": 0},
            "C4": {"home": 0, "away": 0},
        }
    finally:
        monitor._shot_tiers.clear()
        monitor._shot_tiers.update(old)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/jone/Projetos/momentum-scanner && uv run pytest tests/momentum/test_monitor_cycle.py -q -k shot_tiers`
Expected: FAIL (ERROR — `monitor.attach_shot_tiers` não existe)

- [ ] **Step 3: Write minimal implementation**

3a. Import (junto aos imports de `momentum.*`, após a linha 32 `from momentum.shot_classifier import classify_shots`):

```python
from momentum.shot_totals import add_events, empty_totals
```

3b. Estado + função (após o bloco `_prev_xg`, linhas 70–71):

```python
# Totais acumulados de chutes por match_id (placar corrido em memória).
# Hidratado 1x do banco ao ver o jogo (cobre restart); depois só soma o
# delta de cada ciclo. 8 inteiros por jogo — memória irrelevante.
_shot_tiers: dict[str, dict] = {}


def attach_shot_tiers(games: list[dict], db_store=None) -> None:
    """Preenche game['shot_tiers'] com os acumulados por nível e lado.

    Chamado no main() após build_snapshot, antes do json.dumps — mesmo
    ponto de attach_team_history. Jogos sem chute recebem zeros
    (campo sempre presente, nunca omitido). Degrada sem quebrar:
    hidratação com try/except, db_store None e shot_events ausente
    resultam em zeros + deltas.
    """
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

3c. Chamada no `main()` (após `attach_team_history(snapshot["games"], features)`):

```python
attach_shot_tiers(snapshot["games"], db_store)
```

NÃO tocar nos 2 ramos de `extract_one`, em `build_game`/`build_snapshot`, no segundo `build_snapshot` do `db_store.save()` (fica sem o campo de propósito) nem em `snapshot_store.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/jone/Projetos/momentum-scanner && uv run pytest tests/momentum/test_monitor_cycle.py -q`
Expected: PASS (todos os 16 existentes + 2 novos)

- [ ] **Step 5: Commit**

```bash
git -C /Users/jone/Projetos/momentum-scanner add momentum/monitor.py tests/momentum/test_monitor_cycle.py
git -C /Users/jone/Projetos/momentum-scanner commit -m "feat: shot_tiers acumulados no snapshot via attach pós-build"
```

---

### Task 3: Paridade no `preview_server.py` + passthrough no snapshot

**Files:**
- Modify: `/Users/jone/Projetos/momentum-scanner/momentum/preview_server.py:24` (import), `:48-49` (injetar zeros após `build_game`)
- Test: `/Users/jone/Projetos/momentum-scanner/tests/momentum/test_snapshot.py` (append de 1 teste; não alterar existentes)

**Interfaces:**
- Consumes: `empty_totals` da Task 1; `build_snapshot` (spread `{**g}` leva o campo sozinho).
- Produces: contrato documentado — campo aditivo atravessa `build_snapshot`; front pode tratar como opcional.

- [ ] **Step 1: Write the failing test** (append ao fim de `test_snapshot.py`; usa os helpers `_data()`/`_match()` existentes do arquivo)

```python
def test_build_snapshot_preserves_shot_tiers():
    """Campo aditivo atravessa build_snapshot por spread (contrato do front)."""
    from datetime import datetime
    data, match = _data(), _match()
    game = build_game(data, match, 65)
    game["shot_tiers"] = {"C1": {"home": 1, "away": 0},
                          "C2": {"home": 0, "away": 0},
                          "C3": {"home": 0, "away": 0},
                          "C4": {"home": 2, "away": 1}}
    snap = build_snapshot([game], {}, datetime.now(), version=1)
    assert snap["games"][0]["shot_tiers"]["C1"] == {"home": 1, "away": 0}
    assert snap["games"][0]["shot_tiers"]["C4"] == {"home": 2, "away": 1}
```

Se `_data()`/`_match()` do arquivo tiverem outra assinatura, adaptar a chamada ao padrão dos testes vizinhos (mesmo shape, só o essencial).

- [ ] **Step 2: Run test to verify it passes**

Run: `cd /Users/jone/Projetos/momentum-scanner && uv run pytest tests/momentum/test_snapshot.py -q -k shot_tiers`
Expected: PASS já de primeira (spread leva o campo sem mudança de código — teste documenta o contrato, vermelho só se alguém quebrar o spread)

- [ ] **Step 3: Preview parity** (sem teste dedicado — dev-only; front trata o campo como opcional)

```python
from momentum.shot_totals import empty_totals
```

```python
game = build_game(data, m, st["minute"])
game["shot_tiers"] = empty_totals()
```

- [ ] **Step 4: Run focused tests**

Run: `cd /Users/jone/Projetos/momentum-scanner && uv run pytest tests/momentum/test_snapshot.py tests/momentum/test_snapshot_store.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/jone/Projetos/momentum-scanner add momentum/preview_server.py tests/momentum/test_snapshot.py
git -C /Users/jone/Projetos/momentum-scanner commit -m "feat: shot_tiers no preview server + teste de passthrough"
```

---

### Task 4: Verificação final

**Files:** nenhum (só comandos).

- [ ] **Step 1: Suite focada**

Run: `cd /Users/jone/Projetos/momentum-scanner && uv run pytest tests/momentum/test_shot_totals.py tests/momentum/test_snapshot.py tests/momentum/test_monitor_cycle.py tests/momentum/test_snapshot_store.py tests/momentum/test_goal_silence.py tests/momentum/test_shot_classifier.py -q`
Expected: PASS

- [ ] **Step 2: Suite completa**

Run: `cd /Users/jone/Projetos/momentum-scanner && uv run pytest -q`
Expected: PASS (~280 + 9 novos)

- [ ] **Step 3: Smoke do contrato** (payload carrega o campo sem quebrar serialização)

Run: `cd /Users/jone/Projetos/momentum-scanner && uv run python -c "
from momentum.shot_totals import empty_totals, add_events
import json
t = add_events(empty_totals(), set(), [{'minute': 10, 'team': 'home', 'xg_delta': 0.3, 'tier': 'C2', 'label': 'Boa chance'}])
print(json.dumps({'id': 'x', 'shot_tiers': t}, ensure_ascii=False))"`
Expected: `{"id": "x", "shot_tiers": {"C1": ..., "C2": {"home": 1, ...}, ...}}` sem erro
