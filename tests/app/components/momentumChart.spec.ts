// tests/app/components/momentumChart.spec.ts
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import MomentumChart from '~/components/momentumChart.vue'

// Geometria: viewBox 640, GAP=8 entre painéis, STEP=(640-8)/(h1Len+h2Len).
// Caso simétrico 45+45: STEP=632/90≈7.0222, W1=316, P2=324.
const P2_SYMMETRIC = 45 * (632 / 90) + 8 // ≈ 324

describe('MomentumChart', () => {
  it('renderiza uma barra por minuto com dados', async () => {
    const wrapper = await mountSuspended(MomentumChart, {
      props: {
        bars: [
          { minute: 1, home: 0.5, away: 0 },
          { minute: 2, home: 0, away: 0.8 },
        ],
      },
    })
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.findAll('rect.momentum-bar')).toHaveLength(2)
  })

  it('mostra placeholder sem barras', async () => {
    const wrapper = await mountSuspended(MomentumChart, { props: { bars: [] } })
    expect(wrapper.text()).toContain('aguardando dados do gráfico')
    expect(wrapper.find('svg').exists()).toBe(false)
  })

  it('faixa: gol vira bola e chute C2 vira bola numerada', async () => {
    const wrapper = await mountSuspended(MomentumChart, {
      props: {
        bars: [{ minute: 43, home: 0.5, away: 0 }],
        goals: [{ minute: 43, stoppage_time: 0, team: 'home', player: 'x' }],
        shots: [{ minute: 35, team: 'home', tier: 'C2', xg_delta: 0.3, label: 'Boa chance' }],
        notifications: [],
      },
    })
    expect(wrapper.findAll('.lane-shot').length).toBe(1)
    expect(wrapper.find('.lane-shot text').text()).toBe('2')
    expect(wrapper.find('.lane-goal path').exists()).toBe(true)
  })

  it('gol e chute do mesmo minuto vão pra trilhas separadas', async () => {
    const wrapper = await mountSuspended(MomentumChart, {
      props: {
        bars: [{ minute: 43, home: 0.5, away: 0 }],
        goals: [{ minute: 43, stoppage_time: 0, team: 'home', player: 'x' }],
        shots: [{ minute: 43, team: 'home', tier: 'C2', xg_delta: 0.3, label: 'Boa chance' }],
        notifications: [],
      },
    })
    expect(wrapper.find('.lane-goal').exists()).toBe(true)
    expect(wrapper.find('.lane-shot').exists()).toBe(true)
    expect(wrapper.find('.lane-more').exists()).toBe(false)
  })

  it('casa em cima, fora embaixo', async () => {
    const wrapper = await mountSuspended(MomentumChart, {
      props: {
        bars: [{ minute: 10, home: 0.5, away: 0.2 }],
        goals: [],
        shots: [
          { minute: 10, team: 'home', tier: 'C2', xg_delta: 0.3, label: 'Boa chance' },
          { minute: 30, team: 'away', tier: 'C1', xg_delta: 0.6, label: 'Grande chance' },
        ],
        notifications: [],
      },
    })
    const homeCy = Number(wrapper.find('.lane-shot circle[r="10"]').attributes('cy'))
    const awayCy = Number(wrapper.findAll('.lane-shot circle[r="10"]')[1].attributes('cy'))
    expect(homeCy).toBeLessThan(100)
    expect(awayCy).toBeGreaterThan(150)
  })

  it('vizinhos da mesma trilha fundem num marcador só com os dois minutos no popover', async () => {
    const wrapper = await mountSuspended(MomentumChart, {
      props: {
        bars: [
          { minute: 42, home: 0.5, away: 0 },
          { minute: 43, home: 0.6, away: 0 },
        ],
        goals: [],
        shots: [
          { minute: 42, team: 'home', tier: 'C2', xg_delta: 0.3, label: 'Boa chance' },
          { minute: 43, team: 'home', tier: 'C2', xg_delta: 0.3, label: 'Boa chance' },
        ],
        notifications: [],
      },
    })
    expect(wrapper.findAll('.lane-shot')).toHaveLength(1)
    await wrapper.find('.lane-shot').trigger('mouseenter')
    expect(wrapper.find('.lane-pop').text()).toContain("42'")
    expect(wrapper.find('.lane-pop').text()).toContain("43'")
  })

  it('faixa 0.4: tracejados do limiar', async () => {
    const wrapper = await mountSuspended(MomentumChart, {
      props: { bars: [{ minute: 10, home: 0.5, away: 0 }] },
    })
    expect(wrapper.findAll('.lane-threshold')).toHaveLength(2)
  })

  it('posiciona barras do 2º tempo no painel direito (após o gap)', async () => {
    const wrapper = await mountSuspended(MomentumChart, {
      props: {
        bars: [
          { minute: 1, half: 1, home: 0.5, away: 0 },
          { minute: 46, half: 2, home: 0, away: 0.8 },
        ],
      },
    })
    const rects = wrapper.findAll('rect.momentum-bar')
    expect(rects[0].attributes('x')).toBe('0') // 1ºT minuto 1
    expect(Number(rects[1].attributes('x'))).toBeCloseTo(P2_SYMMETRIC, 1) // 2ºT 46' -> rel 1, após W1+gap
  })

  it('barra sem half cai no mapeamento legado', async () => {
    const wrapper = await mountSuspended(MomentumChart, {
      props: { bars: [{ minute: 60, home: 0.5, away: 0 }] },
    })
    // legado: h1Len=50 (clamp), h2Len=45, STEP=632/95≈6.6526
    const x = Number(wrapper.find('rect.momentum-bar').attributes('x'))
    expect(x).toBeCloseTo(59 * (632 / 95), 1) // (60-1)*STEP
  })

  it('ticks 15/30/45 no 1ºT e 60/75/90 no 2ºT', async () => {
    const wrapper = await mountSuspended(MomentumChart, {
      props: { bars: [{ minute: 1, half: 1, home: 0.5, away: 0 }] },
    })
    const labels = wrapper.findAll('text').map((t) => t.text())
    expect(labels).toEqual(["15'", "30'", "45'", "60'", "75'", "90'"])
  })

  it('fundo zinc-800 nos dois painéis, separados pelo gap', async () => {
    const wrapper = await mountSuspended(MomentumChart, {
      props: {
        bars: [
          { minute: 1, half: 1, home: 0.5, away: 0 },
          { minute: 46, half: 2, home: 0, away: 0.8 },
        ],
      },
    })
    const rects = wrapper.findAll('rect')
    // 0 e 1 são os fundos; barras têm class momentum-bar
    expect(rects[0].attributes('fill')).toBe('#27272a')
    expect(rects[0].attributes('x')).toBe('0')
    expect(Number(rects[0].attributes('width'))).toBeCloseTo(45 * (632 / 90), 1) // W1
    expect(rects[1].attributes('fill')).toBe('#27272a')
    expect(Number(rects[1].attributes('x'))).toBeCloseTo(P2_SYMMETRIC, 1) // após o gap
    expect(Number(rects[1].attributes('width'))).toBeCloseTo(45 * (632 / 90), 1) // W2
    expect(wrapper.html()).not.toContain('stroke-dasharray')
  })

  it('painéis flexíveis: 1ºT 47 e 2ºT 50 desloca o gap para ~314', async () => {
    const wrapper = await mountSuspended(MomentumChart, {
      props: {
        bars: [
          { minute: 47, half: 1, home: 0.5, away: 0 },
          { minute: 95, half: 2, home: 0, away: 0.8 },
        ],
      },
    })
    const rects = wrapper.findAll('rect')
    // h1Len=47, h2Len=50, STEP=632/97≈6.5155, W1≈306.23, P2≈314.23
    const p2 = Number(rects[1].attributes('x'))
    expect(p2).toBeCloseTo(47 * (632 / 97) + 8, 1)
    expect(Number(rects[1].attributes('width'))).toBeCloseTo(50 * (632 / 97), 1) // W2
  })

  it('jogo ao vivo no 1ºT (minuto 30): gap fica no meio (mínimo 45)', async () => {
    const wrapper = await mountSuspended(MomentumChart, {
      props: {
        bars: [{ minute: 30, half: 1, home: 0.5, away: 0 }],
      },
    })
    const rects = wrapper.findAll('rect')
    expect(Number(rects[1].attributes('x'))).toBeCloseTo(P2_SYMMETRIC, 1) // h1Len=45, h2Len=45
  })

  it('hover no marcador abre o popover do minuto', async () => {
    const wrapper = await mountSuspended(MomentumChart, {
      props: {
        bars: [{ minute: 35, home: 0.79, away: 0.12 }],
        goals: [],
        shots: [{ minute: 35, team: 'home', tier: 'C2', xg_delta: 0.3, label: 'Boa chance' }],
        notifications: [{ rule: 'r', label: 'Pico do favorito', minute: 35, at: 't' }],
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
      },
    })
    await wrapper.find('.lane-shot').trigger('click')
    expect(wrapper.find('.lane-pop').exists()).toBe(true)
    await wrapper.find('.lane-shot').trigger('click')
    expect(wrapper.find('.lane-pop').exists()).toBe(false)
  })
})
