<template>
  <div
    v-if="open"
    ref="rootEl"
    key="alerts-open"
    class="flex h-full w-72 shrink-0 flex-col overflow-hidden border-l border-zinc-700 bg-zinc-900"
  >
    <header class="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5">
      <span class="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
        <UIcon name="i-lucide-bell" class="h-3.5 w-3.5 text-zinc-400" />
        Alertas
      </span>

      <span class="flex items-center gap-2">
        <UBadge v-if="unseen > 0" data-testid="unseen-badge" color="primary" variant="solid" size="xs">{{
          unseen
        }}</UBadge>

        <UButton
          data-testid="panel-toggle"
          :icon="toggleIcon || 'i-lucide-panel-right-close'"
          :aria-label="toggleLabel || 'Recolher painel'"
          color="neutral"
          variant="ghost"
          size="xs"
          @click.stop="onToggle"
        />
      </span>
    </header>

    <div v-if="items.length === 0" class="px-3 py-8 text-center text-xs text-zinc-500">
      Nenhum alerta de entrada hoje
    </div>

    <ul v-else class="panel-list flex max-h-[55vh] min-h-0 flex-1 flex-col overflow-y-auto xl:max-h-none">
      <li v-for="(a, i) in items" :key="`${a.gameId}|${a.rule}|${a.at}`">
        <button
          :data-testid="`alert-${a.gameId}-${i}`"
          :aria-label="`${a.home} x ${a.away}: ${entryTitle(a.rule, a.label)}`"
          class="flex w-full flex-col gap-0.5 border-b border-zinc-800/60 px-3 py-2 text-left hover:bg-zinc-800/40"
          :class="{ 'bg-teal-400/10': isUnseen(a.at) }"
          @click="$emit('select', a.gameId)"
        >
          <span class="flex items-center justify-between gap-2">
            <span class="flex min-w-0 items-center gap-1.5">
              <span class="shrink-0 rounded bg-teal-400 px-1 py-px text-xs font-extrabold text-zinc-950">{{
                entryTag(a.rule)
              }}</span>

              <span class="truncate text-xs font-bold text-zinc-100">{{ entryTitle(a.rule, a.label) }}</span>
            </span>

            <span class="shrink-0 text-xs" :class="isFresh(a.at) ? 'font-bold text-teal-400' : 'text-zinc-500'">{{
              formatAlertTime(a.at, now)
            }}</span>
          </span>

          <span class="truncate text-xs text-zinc-400">{{ a.home }} x {{ a.away }}</span>

          <span v-if="a.minute != null" class="flex items-center gap-1.5 text-xs text-zinc-500">
            <span class="rounded-full border border-zinc-700 px-1.5"
              >{{ a.minute }}&prime;{{ halfSuffix(a.half) }}</span
            >
          </span>
        </button>
      </li>
    </ul>
  </div>

  <div
    v-else
    ref="rootEl"
    key="alerts-rail"
    class="flex h-full w-11 shrink-0 cursor-pointer flex-col items-center gap-2 overflow-hidden border-l border-zinc-700 bg-zinc-900 py-3"
  >
    <UIcon name="i-lucide-bell" class="h-4 w-4 shrink-0 text-zinc-400" />

    <UBadge v-if="unseen > 0" data-testid="unseen-badge" color="primary" variant="solid" size="xs">{{ unseen }}</UBadge>

    <UButton
      data-testid="panel-toggle"
      :icon="toggleIcon || 'i-lucide-panel-right-open'"
      :aria-label="toggleLabel || 'Expandir painel'"
      color="neutral"
      variant="ghost"
      size="xs"
      @click.stop="onToggle"
    />

    <div class="h-px w-6 shrink-0 bg-zinc-800" />

    <div class="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto">
      <button
        v-for="(a, i) in items"
        :key="`${a.gameId}|${a.rule}|${a.at}`"
        :data-testid="`alert-${a.gameId}-${i}`"
        :aria-label="`${a.home} x ${a.away}: ${entryTitle(a.rule, a.label)}`"
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-xs font-extrabold text-teal-400"
        :class="{ 'border-amber-400/80': isNew(a.at) }"
        @click.stop="onRailSelect(a.gameId)"
      >
        {{ entryTag(a.rule) }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  countUnseen,
  entryTag,
  entryTitle,
  formatAlertTime,
  halfSuffix,
  isRecentNotification,
  loadAlertsSeenAt,
  saveAlertsSeenAt,
} from '~/utils/scanner'

const props = defineProps({
  items: { type: Array, default: () => [] },
  open: { type: Boolean, default: true },
  toggleIcon: { type: String, default: '' },
  toggleLabel: { type: String, default: '' },
  collapseOnOutside: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle', 'select', 'collapse'])

const now = ref(Date.now())
const seenAt = ref(loadAlertsSeenAt())
const unseen = computed(() => countUnseen(props.items, seenAt.value))
const rootEl = ref(null)
let timer = null
// Um único listener no documento (só com collapseOnOutside, i.e. barra fixa
// do desktop): cliques reais no corpo da rail não chegam ao @click do Vue,
// mas borbulham até o documento. Fechada + clique DENTRO → expande;
// aberta + clique FORA → colapsa. O mesmo clique nunca faz os dois: a
// decisão usa o estado no momento do evento.
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 30_000)
  if (props.open) markSeen()
  if (props.collapseOnOutside) document.addEventListener('click', onDocClick)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  document.removeEventListener('click', onDocClick)
})
// Abrir zera o badge: tudo até agora passa a visto.
function markSeen() {
  seenAt.value = Date.now()
  saveAlertsSeenAt(seenAt.value)
}
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) markSeen()
  },
)

function onToggle() {
  emit('toggle')
  nextTick(() => {
    document.querySelector('[data-testid="panel-toggle"]')?.focus({ preventScroll: true })
  })
}
// Sigla na rail: seleciona o jogo E abre a barra.
function onRailSelect(gameId) {
  emit('select', gameId)
  emit('toggle')
}
function isUnseen(at) {
  const t = Date.parse(at)
  return Number.isFinite(t) && t > seenAt.value
}
function isNew(at) {
  return isRecentNotification([{ at }], Date.now(), 5)
}
function isFresh(at) {
  return isRecentNotification([{ at }], now.value, 10)
}
// Só a barra fixa do desktop usa a prop (drawer não): dentro com ela
// FECHADA → expande; fora com ela ABERTA → colapsa. Toggle e siglas têm
// handlers próprios com .stop e retornam antes.
function onDocClick(e) {
  if (e.target?.closest?.('[data-testid="panel-toggle"]')) return
  if (rootEl.value?.contains(e.target)) {
    if (!props.open) emit('toggle')
    return
  }
  if (props.open) emit('collapse')
}
</script>
