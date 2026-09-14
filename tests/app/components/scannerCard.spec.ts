// tests/app/components/scannerCard.spec.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ScannerCard from '~/components/scannerCard.vue'
import MomentumChart from '~/components/momentumChart.vue'
import { useFavorites } from '~/composables/useFavorites'

vi.mock('~/composables/useXgHistory', () => ({
  useXgHistory: () => ({
    get: () => ({ status: 'done', response: { series: [] }, fetchedAt: Date.now(), error: null }),
    load: vi.fn().mockResolvedValue({ series: [] }),
  }),
}))

// O UTooltip (Nuxt UI v4) depende do TooltipProvider do reka-ui, que no app
// real vem do UApp (app.vue) — ausente no mountSuspended isolado (o reka-ui
// é externalizado e não pode ser interceptado por vi.mock). Stubamos o
// UTooltip com um pass-through: o slot renderiza o conteúdo real (nome
// truncado / ícone de tendência) e o prop `text` fica acessível para assert.
const mountCard = (component, options) =>
  mountSuspended(component, {
    ...options,
    global: {
      ...options?.global,
      stubs: {
        ...options?.global?.stubs,
        UTooltip: { name: 'UTooltip', props: ['text'], template: '<span><slot /></span>' },
      },
    },
  })

// Relativo ao relógio real: sempre "recente" (1 min atrás) em qualquer horário.
const RECENT = new Date(Date.now() - 60_000).toISOString()

function game(notifications = [], momentum = [{ minute: 1, home: 0.5, away: 0 }]) {
  return {
    id: 'abc123',
    flashscore_url: 'https://www.flashscore.com/match/abc123/',
    league: 'Brasileirão',
    home: 'Palmeiras',
    away: 'Flamengo',
    score: { home: 2, away: 1 },
    minute: 65,
    status: "65'",
    momentum,
    stats: {
      xg: { home: 1.8, away: 1.2 },
      possession: { home: 58, away: 42 },
      shots: { home: 14, away: 9 },
      big_chances: { home: 3, away: 2 },
      box_touches: { home: 11, away: 7 },
    },
    notifications,
  }
}

// game com shot_tiers não-nulos (Ticket 0): C1 4×2 + C2 3×0 → CHUTES C1–C2 = 7×2; C3 = 1×6
function gameWithShots() {
  return {
    ...game(),
    shot_tiers: {
      C1: { home: 4, away: 2 },
      C2: { home: 3, away: 0 },
      C3: { home: 1, away: 6 },
      C4: { home: 9, away: 8 },
    },
  }
}

// Texto dos valores de uma row de stat pelo label central. A row é a div
// .flex.items-baseline.justify-between com filhos diretos [home, container
// label, away]; o label é o span-folha .uppercase dentro do container central.
const rowValues = (wrapper, label) => {
  const labelEl = wrapper.findAll('span.uppercase').find((s) => s.text() === label)
  const row = labelEl.element.parentElement.parentElement
  const children = Array.from(row.children)
  return { home: children[0].textContent.trim(), away: children[2].textContent.trim() }
}

describe('ScannerCard', () => {
  it('renderiza times, placar, minuto e stats', async () => {
    const wrapper = await mountCard(ScannerCard, { props: { game: game() } })
    expect(wrapper.text()).toContain('Palmeiras')
    expect(wrapper.text()).toContain('Flamengo')
    expect(wrapper.text()).toContain('2 x 1')
    expect(wrapper.text()).toContain("65'")
    expect(wrapper.text()).toContain('POSSE')
  })

  it('aplica contorno âmbar + selo Alerta quando a notificação é recente', async () => {
    const wrapper = await mountCard(ScannerCard, {
      props: {
        game: game([{ rule: 'regra_jogo_quente', label: 'Jogo quente', minute: 62, at: RECENT }]),
      },
    })
    expect(wrapper.find('.alert-recent').exists()).toBe(true)
    expect(wrapper.find('.alert-tag').text()).toBe('Alerta')
  })

  it('esconde o selo Alerta ao virar o card (verso)', async () => {
    const wrapper = await mountCard(ScannerCard, {
      props: {
        game: game([{ rule: 'regra_jogo_quente', label: 'Jogo quente', minute: 62, at: RECENT }]),
      },
    })
    expect(wrapper.find('.alert-tag').exists()).toBe(true)
    await wrapper.find('.perspective-distant').trigger('click')
    expect(wrapper.find('.alert-tag').exists()).toBe(false)
  })

  it('verso mostra título curto (entryTitle), não o label longo do backend', async () => {
    const wrapper = await mountCard(ScannerCard, {
      props: {
        game: game([
          { rule: 'entrada_gol_ht', label: 'Gol HT — entrada pra gol antes do intervalo', minute: 43, at: RECENT },
        ]),
      },
    })
    await wrapper.find('.perspective-distant').trigger('click')
    expect(wrapper.text()).toContain('Gol HT')
    expect(wrapper.text()).not.toContain('antes do intervalo')
  })

  it('aplica luz viajante (hl-travel) quando highlighted (clique do Telegram)', async () => {
    const wrapper = await mountCard(ScannerCard, {
      props: { game: game([]), highlighted: true },
    })
    expect(wrapper.find('.hl-travel').exists()).toBe(true)
  })

  it('sem hl-travel quando highlighted é false', async () => {
    const wrapper = await mountCard(ScannerCard, {
      props: { game: game([]), highlighted: false },
    })
    expect(wrapper.find('.hl-travel').exists()).toBe(false)
  })

  it('mostra badge Encerrado para jogo finalizado', async () => {
    const wrapper = await mountCard(ScannerCard, {
      props: { game: { ...game(), finished: true } },
    })
    expect(wrapper.text()).toContain('Encerrado')
  })

  it('mantém a estrela visível em jogo encerrado que foi favoritado (pra poder desfavoritar)', async () => {
    const { toggleFavorite } = useFavorites()
    toggleFavorite('abc123')
    const wrapper = await mountCard(ScannerCard, {
      props: { game: { ...game(), finished: true } },
    })
    expect(wrapper.find('button[aria-label="Remover dos favoritos"]').exists()).toBe(true)
    toggleFavorite('abc123') // limpa: não vaza pro resto do arquivo
  })

  it.each(['HALF TIME', 'Half time', 'HT', 'Halftime', 'Intervalo', ' half-time '])(
    'mostra badge Intervalo em vez do minuto no halftime (status=%s)',
    async (status) => {
      const wrapper = await mountCard(ScannerCard, {
        props: { game: { ...game(), status } },
      })
      expect(wrapper.text()).toContain('Intervalo')
      expect(wrapper.text()).not.toContain("65'")
    },
  )

  it.each(['1ST HALF', '2nd Half', '2ND HALF'])('mantém o minuto em %s (não é intervalo)', async (status) => {
    const wrapper = await mountCard(ScannerCard, {
      props: { game: { ...game(), status } },
    })
    expect(wrapper.text()).toContain("65'")
    expect(wrapper.text()).not.toContain('Intervalo')
  })

  it('precedência: Encerrado ganha do Intervalo; status vazio mostra o minuto', async () => {
    const finished = await mountCard(ScannerCard, {
      props: { game: { ...game(), finished: true, status: 'Half time' } },
    })
    expect(finished.text()).toContain('Encerrado')
    expect(finished.text()).not.toContain('Intervalo')

    const noStatus = await mountCard(ScannerCard, {
      props: { game: { ...game(), status: undefined } },
    })
    expect(noStatus.text()).toContain("65'")
  })

  it('sem alerta e com verso vazio quando não há notificações', async () => {
    const wrapper = await mountCard(ScannerCard, { props: { game: game([]) } })
    expect(wrapper.find('.alert-recent').exists()).toBe(false)
    expect(wrapper.find('.alert-tag').exists()).toBe(false)
    expect(wrapper.text()).toContain('Sem notificações neste jogo ainda')
  })

  it('renderiza odds pré-live com labels em todas as colunas', async () => {
    const wrapper = await mountCard(ScannerCard, {
      props: {
        game: {
          ...game(),
          odds: {
            prematch: { home: 1.67, draw: 4.4, away: 5.5, over25: 2.18, btts: 1.83 },
          },
        },
      },
    })
    expect(wrapper.text()).toContain('1.67')
    expect(wrapper.text()).toContain('2.18')
    expect(wrapper.text()).toContain('1.83')
    expect(wrapper.text()).toContain('Casa')
    expect(wrapper.text()).toContain('Empate')
    expect(wrapper.text()).toContain('Fora')
    expect(wrapper.text()).toContain('O2.5')
    expect(wrapper.text()).toContain('BTTS')
    // 6 = 5 colunas de odds + badge de minuto (também UBadge)
    const badges = wrapper.findAllComponents({ name: 'UBadge' })
    expect(badges).toHaveLength(6)
  })

  it('sem odds não renderiza a seção', async () => {
    const wrapper = await mountCard(ScannerCard, { props: { game: game() } })
    expect(wrapper.find('.grid.grid-cols-\\[1fr_1fr_1fr_0\\.85fr_0\\.85fr\\]').exists()).toBe(false)
    // só a badge de minuto — as de odds não existem sem dados
    expect(wrapper.findAllComponents({ name: 'UBadge' })).toHaveLength(1)
  })

  it('sem secundários mostra O2.5/BTTS com "-" nas colunas fixas', async () => {
    const wrapper = await mountCard(ScannerCard, {
      props: {
        game: {
          ...game(),
          odds: {
            prematch: { home: 1.67, draw: 4.4, away: 5.5, over25: null, btts: null },
          },
        },
      },
    })
    expect(wrapper.text()).toContain('1.67')
    expect(wrapper.text()).toContain('Casa')
    expect(wrapper.text()).toContain('Empate')
    expect(wrapper.text()).toContain('Fora')
    expect(wrapper.text()).toContain('O2.5')
    expect(wrapper.text()).toContain('BTTS')
    // 6 = 5 colunas de odds + badge de minuto; O2.5/BTTS são as 2 últimas
    const badges = wrapper.findAllComponents({ name: 'UBadge' })
    expect(badges).toHaveLength(6)
    expect(badges[4].text()).toBe('-')
    expect(badges[5].text()).toBe('-')
  })

  it('renderiza as novas métricas de momentum (pressão, pico, controle, C10)', async () => {
    const wrapper = await mountCard(ScannerCard, { props: { game: game() } })
    expect(wrapper.text()).toContain("PRESSÃO 5'")
    expect(wrapper.text()).toContain("PRESSÃO 10'")
    expect(wrapper.text()).toContain("PICO 10'")
    expect(wrapper.text()).toContain('CONTROLE')
    expect(wrapper.text()).toContain('C10')
    // 1 barra, casa vence: controle 100% x 0%
    expect(wrapper.text()).toContain('100%')
  })

  it('mostra "—" e sem barra quando não há momentum', async () => {
    const wrapper = await mountCard(ScannerCard, { props: { game: { ...game(), momentum: [] } } })
    expect(wrapper.text()).toContain("PRESSÃO 5'")
    // valores ausentes: "—" (e nenhuma barra preenchida)
    expect(wrapper.text()).toContain('—')
  })

  it('tem ícone de ajuda (?) nas linhas PICO, CONTROLE, C10 e nas 2 de chute', async () => {
    const wrapper = await mountCard(ScannerCard, { props: { game: game() } })
    // classe real do @nuxt/icon em modo CSS: i-lucide:circle-help (dois-pontos)
    expect(wrapper.findAll('.i-lucide\\:circle-help').length).toBe(5)
  })

  it("mostra chip de tendência ▲ quando os últimos 5' superam a média do jogo", async () => {
    const momentum = Array.from({ length: 15 }, (_, i) => ({
      minute: i + 1,
      home: i < 10 ? 0.1 : 0.9, // casa esquentou no fim
      away: 0,
    }))
    const wrapper = await mountCard(ScannerCard, { props: { game: { ...game(), momentum } } })
    // mean5.home 0.9 >> meanTotal.home 0.3667 → trending-up visível
    // (classe real do @nuxt/icon em modo CSS: i-lucide:trending-up)
    expect(wrapper.findAll('.i-lucide\\:trending-up').length).toBeGreaterThan(0)
  })

  it('tooltip de tendência mostra pressão no formato bruto 0..1 (não %) como nas métricas', async () => {
    const momentum = Array.from({ length: 15 }, (_, i) => ({
      minute: i + 1,
      home: i < 10 ? 0.1 : 0.9, // casa esquentou no fim
      away: 0,
    }))
    const wrapper = await mountCard(ScannerCard, { props: { game: { ...game(), momentum } } })
    const trendTooltip = wrapper
      .findAllComponents({ name: 'UTooltip' })
      .find((t) => t.props('text').startsWith('Pressão'))
    expect(trendTooltip).toBeTruthy()
    // mean5.home 0.90 / meanTotal.home 0.37 — mesmo formato das linhas PRESSÃO
    expect(trendTooltip.props('text')).toContain("últimos 5' (0.90)")
    expect(trendTooltip.props('text')).toContain('média do jogo (0.37)')
    expect(trendTooltip.props('text')).not.toContain('%')
  })

  it('nome longo fica em 1 linha (truncate) com nome completo no tooltip', async () => {
    const wrapper = await mountCard(ScannerCard, {
      props: { game: { ...game(), home: 'Estudiantes (ARG)', away: 'Universidad Católica (CHI)' } },
    })
    const awayName = wrapper
      .findAll('span')
      .find((s) => s.classes().includes('truncate') && s.text().includes('Universidad'))
    expect(awayName).toBeTruthy()
    const nameTooltip = wrapper
      .findAllComponents({ name: 'UTooltip' })
      .find((t) => t.props('text') === 'Universidad Católica (CHI)')
    expect(nameTooltip).toBeTruthy()
  })

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
          shot_tiers: {
            C1: { home: 0, away: 0 },
            C2: { home: 0, away: 0 },
            C3: { home: 0, away: 0 },
            C4: { home: 0, away: 0 },
          },
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

  it('repassa shots/notifications ao MomentumChart', async () => {
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
    expect(chart.props('notifications')).toHaveLength(1)
    expect(chart.props('shots')).toEqual([{ minute: 35, team: 'home', xg_delta: 0.3, tier: 'C2', label: 'Boa chance' }])
  })
})
// Cenário mutável para o mock do composable de pré-jogo (vi.mock é hoisted —
// não pode referenciar variáveis do escopo; vi.hoisted resolve isso).
const preGameScenario = vi.hoisted(() => ({ response: null, error: null }))

vi.mock('~/composables/usePreGameAnalysis', async () => {
  const { reactive } = await import('vue')
  return {
    usePreGameAnalysis: () => {
      const state = reactive({ status: 'idle', response: null, fetchedAt: 0, error: null })
      return {
        get: () => state,
        load: vi.fn(async () => {
          state.error = null
          if (preGameScenario.error) {
            state.status = 'error'
            state.error = new Error(preGameScenario.error)
            throw state.error
          }
          state.status = 'done'
          state.response = preGameScenario.response
          return state.response
        }),
      }
    },
  }
})

describe('ScannerCard análise pré-jogo', () => {
  it('mostra o botão Análise pré-jogo apenas em jogos ao vivo', async () => {
    const live = await mountCard(ScannerCard, { props: { game: game() } })
    expect(live.text()).toContain('Análise pré-jogo')
    const fin = await mountCard(ScannerCard, { props: { game: { ...game(), finished: true } } })
    expect(fin.text()).not.toContain('Análise pré-jogo')
  })

  it('abre o modal com a análise pré-jogo ao clicar', async () => {
    preGameScenario.response = {
      time: '16:30',
      leitura_geral: 'Jogo equilibrado, poucos gols esperados.',
      estrategias: [
        { estrategia: 'lay_1x0', recomendacao: 'entrar', confianca: 78, analise: '1-0 é raridade no histórico' },
      ],
    }
    const w = await mountCard(ScannerCard, { props: { game: game() } })
    const btn = w.findAll('button').find((b) => b.text().includes('Análise pré-jogo'))!
    await btn.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(w.text()).toContain('Análise pré-jogo · 16:30')
    expect(w.text()).toContain('Jogo equilibrado, poucos gols esperados.')
    expect(w.text()).toContain('Lay 1x0')
    expect(w.text()).toContain('entrar · 78%')
  })

  it('fecha o modal pelo botão ✕', async () => {
    preGameScenario.response = { time: '16:30', leitura_geral: 'Conteúdo X', estrategias: [] }
    const w = await mountCard(ScannerCard, { props: { game: game() } })
    const btn = w.findAll('button').find((b) => b.text().includes('Análise pré-jogo'))!
    await btn.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(w.text()).toContain('Conteúdo X')
    const close = w.findAll('button').find((b) => b.text() === '✕')!
    await close.trigger('click')
    expect(w.text()).not.toContain('Conteúdo X')
  })

  it('mostra estado vazio quando o jogo não tem análise pré-jogo', async () => {
    preGameScenario.response = null
    const w = await mountCard(ScannerCard, { props: { game: game() } })
    const btn = w.findAll('button').find((b) => b.text().includes('Análise pré-jogo'))!
    await btn.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(w.text()).toContain('Sem análise pré-jogo para este jogo.')
  })

  it('mostra erro com Tentar de novo; retry carrega a análise', async () => {
    preGameScenario.response = null
    preGameScenario.error = 'offline'
    const w = await mountCard(ScannerCard, { props: { game: game() } })
    const btn = w.findAll('button').find((b) => b.text().includes('Análise pré-jogo'))!
    await btn.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(w.text()).toContain('Não foi possível carregar a análise pré-jogo.')

    preGameScenario.error = null
    preGameScenario.response = { time: '16:30', leitura_geral: 'Recuperou', estrategias: [] }
    const retry = w.findAll('button').find((b) => b.text().includes('Tentar de novo'))!
    await retry.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(w.text()).toContain('Recuperou')
  })
})
