// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ScannerAlertsPanel from '~/components/scannerAlertsPanel.vue'
import { formatClockTime } from '~/utils/scanner.js'

const SEEN_KEY = 'dataPlay.scanner.alertsSeenAt'
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString()

const items = [
  {
    gameId: 'm1',
    rule: 'entrada_ltd',
    label: 'LTD — entrada contra o empate',
    minute: 52,
    half: 2,
    at: '2026-09-13T14:32:00-03:00',
    home: 'Universitario',
    away: 'Ind. Petrolero',
    league: 'Bolívia División',
  },
]

it('aberto: renderiza sigla, texto, minuto, horário e idade', async () => {
  const w = await mountSuspended(ScannerAlertsPanel, { props: { items, open: true } })
  const t = w.text()
  expect(t).toContain('LTD')
  expect(t).not.toContain('🎯')
  expect(t).toContain('52')
  expect(t).toContain('2ºT')
})

it('fechado: rail só com siglas', async () => {
  const w = await mountSuspended(ScannerAlertsPanel, { props: { items, open: false } })
  expect(w.text()).toContain('LTD')
  expect(w.find('.panel-list').exists()).toBe(false)
})

it('clique no item emite select com gameId', async () => {
  const w = await mountSuspended(ScannerAlertsPanel, { props: { items, open: true } })
  await w.find('[data-testid="alert-m1-0"]').trigger('click')
  expect(w.emitted('select')).toEqual([['m1']])
})

it('botão emite toggle', async () => {
  const w = await mountSuspended(ScannerAlertsPanel, { props: { items, open: true } })
  await w.find('[data-testid="panel-toggle"]').trigger('click')
  expect(w.emitted('toggle')).toHaveLength(1)
})

it('rail tem aria-labels com jogo e toggle nomeado', async () => {
  const w = await mountSuspended(ScannerAlertsPanel, { props: { items, open: false } })
  expect(w.find('[data-testid="alert-m1-0"]').attributes('aria-label')).toContain('Universitario')
  expect(w.find('[data-testid="panel-toggle"]').attributes('aria-label')).toBeTruthy()
})

it('half ausente não chuta 1ºT', async () => {
  const noHalf = [{ ...items[0], half: undefined, minute: undefined }]
  const w = await mountSuspended(ScannerAlertsPanel, { props: { items: noHalf, open: true } })
  expect(w.text()).not.toContain('1ºT')
  expect(w.text()).not.toContain('undefined')
})

const waveItems = () => [
  {
    gameId: 'm1',
    rule: 'entrada_gol_ht',
    label: 'GHT — gol no primeiro tempo',
    minute: 43,
    half: 1,
    at: ago(3),
    home: 'Famalicão',
    away: 'Sporting',
    league: 'Portugal Liga',
  },
  {
    gameId: 'm2',
    rule: 'entrada_fim_jogo',
    label: 'GFJ — gol no fim do jogo',
    minute: 88,
    half: 2,
    at: ago(40),
    home: 'Arsenal',
    away: 'Chelsea',
    league: 'Inglaterra Premier',
  },
]

it('linha 1: título curto + tempo à direita (recente há x min, velho HH:MM)', async () => {
  localStorage.removeItem(SEEN_KEY)
  const itemList = waveItems()
  const w = await mountSuspended(ScannerAlertsPanel, { props: { items: itemList, open: true } })
  const t = w.text()
  expect(t).toContain('Gol HT')
  expect(t).toContain('Gol fim de jogo')
  expect(t).toMatch(/há \d+ min/)
  expect(t).toContain(formatClockTime(itemList[1].at))
  w.unmount()
})

it('rail mostra badge de não-vistos; abrir zera', async () => {
  localStorage.removeItem(SEEN_KEY)
  const w = await mountSuspended(ScannerAlertsPanel, { props: { items: waveItems(), open: false } })
  expect(w.find('[data-testid="unseen-badge"]').text()).toBe('2')
  await w.setProps({ open: true })
  await w.vm.$nextTick()
  expect(w.find('[data-testid="unseen-badge"]').exists()).toBe(false)
  w.unmount()
})

it('clique fora emite collapse só com collapseOnOutside; toggle não colapsa', async () => {
  localStorage.removeItem(SEEN_KEY)
  const w = await mountSuspended(ScannerAlertsPanel, {
    props: { items: waveItems(), open: true, collapseOnOutside: true },
  })
  await w.find('[data-testid="panel-toggle"]').trigger('click')
  expect(w.emitted('toggle')).toHaveLength(1)
  expect(w.emitted('collapse')).toBeUndefined()
  document.body.click()
  expect(w.emitted('collapse')).toHaveLength(1)
  w.unmount()
})

it('sem collapseOnOutside o clique fora não emite (drawer)', async () => {
  localStorage.removeItem(SEEN_KEY)
  const w = await mountSuspended(ScannerAlertsPanel, { props: { items: waveItems(), open: true } })
  document.body.click()
  expect(w.emitted('collapse')).toBeUndefined()
  w.unmount()
})

it('item não-visto tem fundo distinto; item visto não', async () => {
  localStorage.removeItem(SEEN_KEY)
  const old = {
    gameId: 'm2',
    rule: 'entrada_fim_jogo',
    label: 'GFJ — gol no fim do jogo',
    minute: 88,
    half: 2,
    at: ago(40),
    home: 'Arsenal',
    away: 'Chelsea',
    league: 'Inglaterra Premier',
  }
  const w = await mountSuspended(ScannerAlertsPanel, { props: { items: [old], open: true } })
  // Abrir marca tudo como visto: item antigo segue sem destaque…
  expect(w.find('[data-testid="alert-m2-0"]').classes()).not.toContain('bg-teal-400/10')
  // …mas alerta nascido depois (at > seenAt) entra com o fundo.
  const fresh = {
    gameId: 'm1',
    rule: 'entrada_gol_ht',
    label: 'GHT — gol no primeiro tempo',
    minute: 43,
    half: 1,
    at: new Date(Date.now() + 60_000).toISOString(),
    home: 'Famalicão',
    away: 'Sporting',
    league: 'Portugal Liga',
  }
  await w.setProps({ items: [fresh, old] })
  expect(w.find('[data-testid="alert-m1-0"]').classes()).toContain('bg-teal-400/10')
  expect(w.find('[data-testid="alert-m2-1"]').classes()).not.toContain('bg-teal-400/10')
  w.unmount()
})

it('clique no corpo da rail expande (via document)', async () => {
  const w = await mountSuspended(ScannerAlertsPanel, {
    props: { items: waveItems(), open: false, collapseOnOutside: true },
    attachTo: document.body,
  })
  w.find('div.w-11').element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(w.emitted('toggle')).toHaveLength(1)
  w.unmount()
})

it('sigla na rail seleciona e expande', async () => {
  const w = await mountSuspended(ScannerAlertsPanel, { props: { items: waveItems(), open: false } })
  await w.find('[data-testid="alert-m1-0"]').trigger('click')
  expect(w.emitted('select')).toEqual([['m1']])
  expect(w.emitted('toggle')).toHaveLength(1)
  w.unmount()
})
