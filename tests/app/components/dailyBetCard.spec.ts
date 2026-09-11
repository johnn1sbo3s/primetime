// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DailyBetCard from '~/components/dailyBetCard.vue'

describe('DailyBetCard', () => {
  const bet = {
    Date: '2026-06-21',
    Time: '16:00',
    Home: 'Flamengo',
    Away: 'Palmeiras',
    FT_Odds_H: '2.10',
    FT_Odds_D: '3.40',
    FT_Odds_A: '3.25',
    Modelo: 'Lay favorite home',
  }

  it('does not render a date badge', async () => {
    const wrapper = await mountSuspended(DailyBetCard, { props: { bet } })
    expect(wrapper.text()).not.toContain('Jun')
  })

  it('renders the model on the header line, without the time prefix', async () => {
    const wrapper = await mountSuspended(DailyBetCard, { props: { bet } })
    const text = wrapper.text()
    expect(text).not.toContain('16:00')
    expect(text).toContain('Lay favorite home')
  })

  it('renders the model from the lowercase model key when Modelo is absent', async () => {
    const wrapper = await mountSuspended(DailyBetCard, {
      props: { bet: { ...bet, Modelo: undefined, model: 'Lay under 25' } },
    })
    expect(wrapper.text()).toContain('Lay under 25')
  })

  it('renders the match with Home and Away stacked, without Casa/Fora labels', async () => {
    const wrapper = await mountSuspended(DailyBetCard, { props: { bet } })
    const text = wrapper.text()
    expect(text).toContain('Flamengo')
    expect(text).toContain('Palmeiras')
    expect(text).not.toContain('Casa')
    expect(text).not.toContain('Fora')
  })

  it('renders the three odds cells with H/D/A labels and values', async () => {
    const wrapper = await mountSuspended(DailyBetCard, { props: { bet } })
    const text = wrapper.text()
    expect(text).toContain('H')
    expect(text).toContain('D')
    expect(text).toContain('A')
    expect(text).toContain('2.10')
    expect(text).toContain('3.40')
    expect(text).toContain('3.25')
  })

  it('applies the card container classes (rounded-2xl, zinc surface)', async () => {
    const wrapper = await mountSuspended(DailyBetCard, { props: { bet } })
    const root = wrapper.element
    expect(root.className).toContain('rounded-2xl')
    expect(root.className).toContain('border')
    expect(root.className).toContain('border-zinc-800')
    expect(root.className).toContain('bg-zinc-900')
  })

  describe('model market odd box', () => {
    const betWithOdd = {
      Date: '2026-06-21',
      Time: '16:00',
      Home: 'Flamengo',
      Away: 'Palmeiras',
      FT_Odds_H: '2.10',
      FT_Odds_D: '3.40',
      FT_Odds_A: '3.25',
      Modelo: 'Lay favorite home',
      Odd: '12',
      Market: '2x0',
    }

    it('renders the model market odd (Market label + value) when Odd is present', async () => {
      const wrapper = await mountSuspended(DailyBetCard, { props: { bet: betWithOdd } })
      const text = wrapper.text()
      expect(text).toContain('2x0')
      expect(text).toContain('12')
    })

    it('does not render the model market odd box when Odd is null', async () => {
      const wrapper = await mountSuspended(DailyBetCard, {
        props: { bet: { ...betWithOdd, Odd: null, Market: null } },
      })
      const text = wrapper.text()
      expect(text).not.toContain('2x0')
    })
  })
})
