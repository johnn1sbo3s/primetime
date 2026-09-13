<template>
  <div ref="outer" class="rz-breakout">
    <div ref="box" data-testid="rz-box" class="relative mx-auto" :style="boxStyle">
      <slot />

      <div
        data-testid="rz-grip"
        title="Arrastar para ajustar a largura"
        class="absolute top-0 -right-2 hidden h-full w-4 cursor-ew-resize items-center justify-center opacity-0 transition-opacity hover:opacity-100 lg:flex"
        @mousedown="onDown"
      >
        <span class="h-16 w-1 rounded-full bg-zinc-700" />
      </div>
    </div>
  </div>
</template>

<script setup>
// Container com largura ajustável por arrasto (só desktop): usado na página
// do scanner. Mínimo = largura natural (a de hoje); cresce simétrico até a
// viewport. Largura persiste em localStorage. Sem CSS `resize` de propósito:
// ele exige overflow não-visible, que cortaria os popovers dos cards.
const props = defineProps({
  storageKey: { type: String, required: true },
})

const outer = ref(null)
const box = ref(null)
const widthPx = ref(null)
const desktop = ref(false)
let naturalPx = 0
let dragging = null
let mql = null

const boxStyle = computed(() => {
  if (!desktop.value || widthPx.value == null) return {}
  return { width: widthPx.value + 'px' }
})

function viewportW() {
  return document.documentElement.clientWidth || window.innerWidth || 0
}

function maxPx() {
  const vw = viewportW()
  if (vw <= 0) return Infinity
  return Math.max(naturalPx, vw - 32)
}

function onDown(e) {
  if (!desktop.value || !box.value) return
  e.preventDefault()
  dragging = { startX: e.clientX, startW: widthPx.value ?? naturalPx }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp, { once: true })
}

function onMove(e) {
  if (!dragging || !desktop.value) return
  const next = dragging.startW + 2 * (e.clientX - dragging.startX)
  widthPx.value = next <= naturalPx ? null : Math.min(Math.round(next), maxPx())
}

function onUp() {
  document.removeEventListener('mousemove', onMove)
  if (!dragging) return
  dragging = null
  try {
    if (widthPx.value == null) localStorage.removeItem(props.storageKey)
    else localStorage.setItem(props.storageKey, String(widthPx.value))
  } catch {
    // storage indisponível (privado): só não persiste
  }
}

function syncDesktop(e) {
  desktop.value = e.matches
  if (!e.matches) widthPx.value = null
}

onMounted(() => {
  mql = window.matchMedia('(min-width: 1024px)')
  desktop.value = mql.matches
  mql.addEventListener('change', syncDesktop)
  // outer é bloco full do UContainer: a largura dele É a natural (a de hoje)
  naturalPx = outer.value?.getBoundingClientRect().width || 0
  if (desktop.value) {
    // inner começa exatamente na natural (mesma renderização de hoje)
    widthPx.value = naturalPx || null
    try {
      const saved = Number(localStorage.getItem(props.storageKey))
      if (Number.isFinite(saved) && saved > naturalPx) widthPx.value = Math.round(saved)
    } catch {
      // sem storage: segue natural
    }
  }
})

onUnmounted(() => {
  mql?.removeEventListener('change', syncDesktop)
  document.removeEventListener('mousemove', onMove)
})
</script>

<style scoped>
/* Sai do UContainer pra poder crescer além da largura de hoje (só desktop) */
@media (min-width: 1024px) {
  .rz-breakout {
    width: 100vw;
    max-width: none;
    margin-left: calc(-50vw + 50%);
  }
}
</style>
