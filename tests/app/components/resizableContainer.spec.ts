// tests/app/components/resizableContainer.spec.ts
// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ResizableContainer from '~/components/resizableContainer.vue'

const KEY = 'dataplaybets:scanner-width'

function stubDesktop() {
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
}

function mountBox(saved) {
  if (saved != null) localStorage.setItem(KEY, saved)
  return mountSuspended(ResizableContainer, {
    props: { storageKey: KEY },
    slots: { default: '<p>conteúdo</p>' },
  })
}

async function drag(wrapper, fromX, toX) {
  await wrapper.find('[data-testid="rz-grip"]').trigger('mousedown', { clientX: fromX })
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: toX }))
  document.dispatchEvent(new MouseEvent('mouseup'))
}

describe('ResizableContainer', () => {
  beforeEach(() => {
    localStorage.clear()
    stubDesktop()
  })

  it('restaura a largura salva', async () => {
    const wrapper = await mountBox('1200')
    expect(wrapper.find('[data-testid="rz-box"]').element.style.width).toBe('1200px')
  })

  it('arrasto aumenta a largura e persiste', async () => {
    const wrapper = await mountBox('800')
    await drag(wrapper, 100, 150)
    const box = wrapper.find('[data-testid="rz-box"]').element
    expect(box.style.width).toBe('900px')
    expect(localStorage.getItem(KEY)).toBe('900')
  })

  it('encolher até o mínimo volta ao natural e limpa o salvo', async () => {
    const wrapper = await mountBox('800')
    await drag(wrapper, 500, -500)
    const box = wrapper.find('[data-testid="rz-box"]').element
    expect(box.style.width).toBe('')
    expect(localStorage.getItem(KEY)).toBeNull()
  })
})
