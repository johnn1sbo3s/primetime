import { describe, it, expect } from 'vitest'
import {
  isRecentNotification,
  formatUpdatedAgo,
  mergeHistories,
  loadLocalHistory,
  saveLocalHistory,
  pruneLocalHistory,
  formatAlertAgo,
  formatClockTime,
  halfSuffix,
  loadDayEntries,
  mergeDayEntries,
  saveDayEntries,
  findNewEntries,
  entryTitle,
  formatAlertTime,
  loadAlertsSeenAt,
  saveAlertsSeenAt,
  countUnseen,
} from '~/utils/scanner.js'
const AT = '2026-08-07T23:55:03-03:00'
const NOW = Date.parse('2026-08-07T23:59:03-03:00')

describe('isRecentNotification', () => {
  it('true quando a notificação mais recente está dentro de 5 min', () => {
    expect(isRecentNotification([{ at: AT }], NOW)).toBe(true)
  })

  it('false quando está fora da janela', () => {
    expect(isRecentNotification([{ at: '2026-08-07T23:45:03-03:00' }], NOW)).toBe(false)
  })

  it('false sem notificações ou com horário inválido', () => {
    expect(isRecentNotification([], NOW)).toBe(false)
    expect(isRecentNotification([{ at: 'nao-e-data' }], NOW)).toBe(false)
    expect(isRecentNotification(null, NOW)).toBe(false)
  })

  it('usa a primeira notificação (mais recente) do histórico', () => {
    // contrato do backend: histórico vem mais recente primeiro (índice 0)
    const list = [{ at: AT }, { at: '2026-08-07T23:50:03-03:00' }]
    expect(isRecentNotification(list, NOW)).toBe(true)
  })
})

describe('formatUpdatedAgo', () => {
  it('formata mm:ss sempre com segundos à direita', () => {
    expect(formatUpdatedAgo(AT, NOW)).toBe('há 4:00')
    expect(formatUpdatedAgo(AT, NOW - 12_000)).toBe('há 3:48')
    expect(formatUpdatedAgo(AT, Date.parse(AT) + 12_000)).toBe('há 0:12')
    expect(formatUpdatedAgo(AT, Date.parse(AT) + 65_000)).toBe('há 1:05')
  })

  it('retorna vazio sem horário válido', () => {
    expect(formatUpdatedAgo(null, NOW)).toBe('')
    expect(formatUpdatedAgo('x', NOW)).toBe('')
  })
})

describe('mergeHistories', () => {
  it('deduplica por regra+horário e ordena do mais recente', () => {
    const backend = [
      { rule: 'a', at: AT },
      { rule: 'b', at: '2026-08-07T23:50:03-03:00' },
    ]
    const local = [
      { rule: 'a', at: AT },
      { rule: 'c', at: '2026-08-07T23:40:03-03:00' },
    ]
    expect(mergeHistories(backend, local).map((n) => n.rule)).toEqual(['a', 'b', 'c'])
  })

  it('backend vazio usa o cache local', () => {
    const local = [{ rule: 'x', at: AT }]
    expect(mergeHistories([], local)).toHaveLength(1)
  })

  it('limita a 10 eventos', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      rule: `r${i}`,
      at: new Date(Date.now() - i * 60_000).toISOString(),
    }))
    expect(mergeHistories([], many)).toHaveLength(10)
  })
})

describe('pruneLocalHistory', () => {
  it('mantém só os jogos visíveis no snapshot atual', () => {
    const games = [
      { id: 'm1', notifications: [{ rule: 'a', at: AT }] },
      { id: 'm2', notifications: [] },
    ]
    expect(pruneLocalHistory(games)).toEqual({
      m1: [{ rule: 'a', at: AT }],
      m2: [],
    })
  })

  it('sem jogos zera o cache', () => {
    expect(pruneLocalHistory([])).toEqual({})
  })
})

describe('histórico local', () => {
  it('salva e carrega por jogo no localStorage', () => {
    const byGame = { m1: [{ rule: 'a', at: AT }] }
    saveLocalHistory(byGame)
    expect(loadLocalHistory()).toEqual(byGame)
  })
})

describe('formatAlertAgo', () => {
  const now = Date.parse('2026-09-13T14:35:00-03:00')
  it('minutos sem segundos', () => {
    expect(formatAlertAgo('2026-09-13T14:32:00-03:00', now)).toBe('há 3 min')
  })
  it('horas e minutos', () => {
    expect(formatAlertAgo('2026-09-13T13:20:00-03:00', now)).toBe('há 1 h 15')
  })
  it('hora cheia sem minutos', () => {
    expect(formatAlertAgo('2026-09-13T13:35:00-03:00', now)).toBe('há 1 h')
  })
  it('inválido retorna vazio', () => {
    expect(formatAlertAgo('ops', now)).toBe('')
  })
})

describe('entryTag', () => {
  it('mapeia as três regras', () => {
    expect(entryTag('entrada_ltd')).toBe('LTD')
    expect(entryTag('entrada_gol_ht')).toBe('GHT')
    expect(entryTag('entrada_fim_jogo')).toBe('GFJ')
  })
  it('fallback para regra desconhecida', () => {
    expect(entryTag('entrada_x')).toBe('ALR')
  })
})

describe('entryText', () => {
  it('tira o prefixo antes do travessão', () => {
    expect(entryText('LTD — entrada contra o empate')).toBe('entrada contra o empate')
  })
  it('sem travessão devolve o label', () => {
    expect(entryText('Jogo quente')).toBe('Jogo quente')
  })
})

describe('formatClockTime', () => {
  it('HH:MM pt-BR', () => {
    expect(formatClockTime('2026-09-13T14:32:00-03:00')).toBe('14:32')
  })
  it('inválido retorna vazio', () => {
    expect(formatClockTime('ops')).toBe('')
  })
})

describe('halfSuffix', () => {
  it('2 → 2ºT, 1 → 1ºT, ausente → vazio', () => {
    expect(halfSuffix(2)).toBe(' 2ºT')
    expect(halfSuffix(1)).toBe(' 1ºT')
    expect(halfSuffix(undefined)).toBe('')
  })
})

const live = (id: string, finished = false) => ({
  id,
  finished,
  home: 'Casa',
  away: 'Fora',
  league: 'Liga',
  notifications: [
    { rule: 'entrada_ltd', label: 'LTD — x', minute: 52, at: '2026-09-13T14:32:00-03:00', kind: 'entrada', half: 2 },
  ],
})

describe('mergeDayEntries', () => {
  it('anexa entradas de jogos vivos com metadados', () => {
    const out = mergeDayEntries({ date: '2026-09-13', byGame: {} }, [live('m1')])
    expect(out.byGame.m1[0]).toMatchObject({ rule: 'entrada_ltd', home: 'Casa', gameId: 'm1' })
  })
  it('não duplica no re-merge (dedupe rule|at)', () => {
    const once = mergeDayEntries({ date: '2026-09-13', byGame: {} }, [live('m1')])
    const twice = mergeDayEntries(once, [live('m1')])
    expect(twice.byGame.m1).toHaveLength(1)
  })
  it('remove jogos finalizados do guardado', () => {
    const stored = {
      date: '2026-09-13',
      byGame: { m9: [{ rule: 'entrada_ltd', label: 'x', minute: 80, at: '2026-09-13T13:00:00-03:00', gameId: 'm9' }] },
    }
    const out = mergeDayEntries(stored, [live('m9', true)])
    expect(out.byGame.m9).toBeUndefined()
  })
  it('virada do dia zera tudo', () => {
    const out = mergeDayEntries({ date: '2026-09-12', byGame: { m9: [] } }, [], Date.parse('2026-09-13T10:00:00-03:00'))
    expect(out).toEqual({ date: '2026-09-13', byGame: {} })
  })
  it('remove jogos sumidos do snapshot (sem flag finished)', () => {
    const stored = {
      date: '2026-09-13',
      byGame: { m9: [{ rule: 'entrada_ltd', label: 'x', minute: 80, at: '2026-09-13T13:00:00-03:00', gameId: 'm9' }] },
    }
    const out = mergeDayEntries(stored, [live('m1')])
    expect(out.byGame.m9).toBeUndefined()
    expect(out.byGame.m1).toHaveLength(1)
  })
  it('games vazio não apaga nada (ainda carregando)', () => {
    const stored = {
      date: '2026-09-13',
      byGame: { m9: [{ rule: 'entrada_ltd', label: 'x', minute: 80, at: '2026-09-13T13:00:00-03:00', gameId: 'm9' }] },
    }
    const out = mergeDayEntries(stored, [])
    expect(out.byGame.m9).toHaveLength(1)
  })
})

describe('findNewEntries', () => {
  it('retorna entradas ausentes no guardado', () => {
    const added = findNewEntries({}, [live('m1')])
    expect(added).toHaveLength(1)
    expect(added[0]).toMatchObject({ rule: 'entrada_ltd', gameId: 'm1' })
  })
  it('ignora já guardadas e jogos finalizados', () => {
    const prev = { m1: [{ rule: 'entrada_ltd', at: '2026-09-13T14:32:00-03:00' }] }
    expect(findNewEntries(prev, [live('m1')])).toHaveLength(0)
    expect(findNewEntries({}, [live('m9', true)])).toHaveLength(0)
  })
})

describe('entryTitle', () => {
  it('título curto por regra', () => {
    expect(entryTitle('entrada_ltd')).toBe('LTD')
    expect(entryTitle('entrada_gol_ht')).toBe('Gol HT')
    expect(entryTitle('entrada_fim_jogo')).toBe('Gol fim de jogo')
  })
  it('regra desconhecida cai no texto sem prefixo de sigla', () => {
    expect(entryTitle('entrada_x', 'XYZ — algo novo')).toBe('algo novo')
  })
  it('sem regra nem label devolve vazio', () => {
    expect(entryTitle('entrada_x')).toBe('')
  })
})

describe('formatAlertTime', () => {
  const base = Date.parse('2026-09-13T19:00:00-03:00')
  const iso = (ms: number) => new Date(base - ms).toISOString()
  it('menos de 1min mostra agora', () => {
    expect(formatAlertTime(iso(30_000), base)).toBe('agora')
  })
  it('até 10min mostra idade', () => {
    expect(formatAlertTime(iso(3 * 60_000), base)).toBe('há 3 min')
    expect(formatAlertTime(iso(10 * 60_000), base)).toBe('há 10 min')
  })
  it('acima de 10min mostra HH:MM', () => {
    const at = iso(11 * 60_000)
    expect(formatAlertTime(at, base)).toBe(formatClockTime(at))
  })
  it('inválido devolve vazio', () => {
    expect(formatAlertTime('', base)).toBe('')
    expect(formatAlertTime('nada', base)).toBe('')
  })
})

describe('alertsSeenAt', () => {
  const stub = () => {
    const map: Record<string, string> = {}
    return {
      getItem: (k: string) => map[k] ?? null,
      setItem: (k: string, v: string) => {
        map[k] = v
      },
    }
  }
  it('default 0 e roundtrip', () => {
    const s = stub()
    expect(loadAlertsSeenAt(s)).toBe(0)
    saveAlertsSeenAt(123, s)
    expect(loadAlertsSeenAt(s)).toBe(123)
  })
  it('lixo volta a 0', () => {
    const s = stub()
    s.setItem('dataPlay.scanner.alertsSeenAt', 'nada')
    expect(loadAlertsSeenAt(s)).toBe(0)
  })
  it('countUnseen só conta at estritamente maior', () => {
    const items = [{ at: '2026-09-13T19:00:00-03:00' }, { at: '2026-09-13T18:00:00-03:00' }]
    const seen = Date.parse('2026-09-13T19:00:00-03:00')
    expect(countUnseen(items, seen)).toBe(0)
    expect(countUnseen(items, seen - 1)).toBe(1)
    expect(countUnseen(items, 0)).toBe(2)
    expect(countUnseen([], seen)).toBe(0)
  })
})
