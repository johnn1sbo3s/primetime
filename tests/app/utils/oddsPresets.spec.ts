// tests/app/utils/oddsPresets.spec.ts
import { describe, it, expect } from 'vitest'
import { ODDS_PRESET_OPTIONS, matchesOddsPreset, minTeamOdd } from '~/utils/oddsPresets.js'

describe('minTeamOdd', () => {
  it('retorna a menor odd dos dois lados', () => {
    expect(minTeamOdd({ home: 1.83, away: 3.78 })).toBe(1.83)
  })

  it('lado único decide a faixa', () => {
    expect(minTeamOdd({ home: 1.75 })).toBe(1.75)
    expect(minTeamOdd({ away: 2.4 })).toBe(2.4)
  })

  it('null/undefined/objeto vazio → null', () => {
    expect(minTeamOdd(undefined)).toBeNull()
    expect(minTeamOdd(null)).toBeNull()
    expect(minTeamOdd({})).toBeNull()
  })

  it('0, negativo e não-numérico são tratados como ausentes', () => {
    expect(minTeamOdd({ home: 0, away: 2.2 })).toBe(2.2)
    expect(minTeamOdd({ home: -3, away: 2.2 })).toBe(2.2)
    expect(minTeamOdd({ home: 'abc', away: 2.2 })).toBe(2.2)
  })
})

describe('matchesOddsPreset', () => {
  it('1.40 e 1.41 agora são ambos Favorito', () => {
    expect(matchesOddsPreset('favorito', { home: 1.4, away: 3 })).toBe(true)
    expect(matchesOddsPreset('favorito', { home: 1.41, away: 3 })).toBe(true)
    expect(matchesOddsPreset('parelho', { home: 1.4, away: 3 })).toBe(false)
  })

  it('fronteira 2.05/2.06: 2.05 é Favorito, 2.06 é Parelho', () => {
    expect(matchesOddsPreset('favorito', { home: 2.05, away: 3 })).toBe(true)
    expect(matchesOddsPreset('parelho', { home: 2.05, away: 3 })).toBe(false)
    expect(matchesOddsPreset('parelho', { home: 2.06, away: 3 })).toBe(true)
    expect(matchesOddsPreset('favorito', { home: 2.06, away: 3 })).toBe(false)
  })

  it('qualquer lado pode ser o favorito (min decide)', () => {
    expect(matchesOddsPreset('favorito', { home: 2.4, away: 1.55 })).toBe(true)
    expect(matchesOddsPreset('favorito', { home: 1.55, away: 2.4 })).toBe(true)
  })

  it('sem odd em nenhum lado → false para preset ativo', () => {
    expect(matchesOddsPreset('favorito', {})).toBe(false)
    expect(matchesOddsPreset('favorito', undefined)).toBe(false)
    expect(matchesOddsPreset('favorito', null)).toBe(false)
  })

  it("'todos' sempre passa, mesmo sem odds", () => {
    expect(matchesOddsPreset('todos', undefined)).toBe(true)
    expect(matchesOddsPreset('todos', {})).toBe(true)
  })

  it('chaves antigas morrem', () => {
    expect(matchesOddsPreset('super', { home: 1.3, away: 4 })).toBe(false)
    expect(matchesOddsPreset('favoritos', { home: 1.8, away: 3 })).toBe(false)
    expect(matchesOddsPreset('fav_por_odd', { home: 2.5, away: 2.6 })).toBe(false)
  })

  it('preset desconhecido → false', () => {
    expect(matchesOddsPreset('inexistente', { home: 1.5, away: 2 })).toBe(false)
    expect(matchesOddsPreset('toString', { home: 1.5, away: 2 })).toBe(false)
  })
})

describe('config de presets', () => {
  it('faixas contíguas e mutuamente exclusivas (odds 1.00–3.00, 2 casas)', () => {
    for (let i = 100; i <= 300; i++) {
      const odd = i / 100
      const active = Object.keys({
        todos: null,
        favorito: { max: 2.05 },
        parelho: { min: 2.06 },
      }).filter((k) => k !== 'todos' && matchesOddsPreset(k, { home: odd, away: odd }))
      expect(active).toHaveLength(1)
    }
  })

  it('options expõem value/label e title só onde há explicação', () => {
    expect(ODDS_PRESET_OPTIONS.map((o) => o.value)).toEqual(['todos', 'favorito', 'parelho'])
    expect(ODDS_PRESET_OPTIONS.find((o) => o.value === 'favorito').label).toBe('Favorito')
    expect(ODDS_PRESET_OPTIONS.find((o) => o.value === 'parelho').label).toBe('Parelho')
    expect(ODDS_PRESET_OPTIONS.find((o) => o.value === 'parelho').title).toContain('2.05')
    expect(ODDS_PRESET_OPTIONS.find((o) => o.value === 'todos').title).toBeUndefined()
  })
})
