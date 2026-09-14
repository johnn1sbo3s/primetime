<template>
  <div
    v-if="open"
    ref="rootEl"
    key="alerts-open"
    class="flex h-full w-72 shrink-0 flex-col overflow-hidden border-l border-zinc-700 bg-zinc-900"
  >
    <header class="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5">
      <span class="relative flex items-center gap-1.5 text-xs font-bold text-zinc-200">
        <UIcon name="i-lucide-bell" class="h-3.5 w-3.5 text-zinc-400" />
        Alertas

        <span
          v-if="unseen > 0"
          data-testid="unseen-badge"
          class="text-2xs absolute -top-1.5 -right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-bold text-white"
          >{{ unseen > 9 ? '9+' : unseen }}</span
        >
      </span>

      <span class="flex items-center gap-2">
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

    <div v-if="loading" class="panel-skeleton flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3 xl:max-h-none">
      <div v-for="i in 4" :key="i" class="flex flex-col gap-1.5 border-b border-zinc-800/60 pb-2">
        <div class="flex items-center justify-between gap-2">
          <USkeleton class="h-4 w-24" />

          <USkeleton class="h-3 w-10" />
        </div>

        <USkeleton class="h-3 w-3/4" />

        <USkeleton class="h-4 w-12" />
      </div>
    </div>

    <div
      v-else-if="items.length === 0"
      class="flex min-h-0 flex-1 flex-col px-3 py-8 text-center text-xs text-zinc-500"
    >
      Nenhum alerta de entrada hoje
      <span class="flex-1" />
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

    <footer class="flex shrink-0 items-center justify-between gap-2 border-t border-zinc-800 px-3 py-2">
      <UButton
        data-testid="sound-toggle"
        :icon="soundEnabled ? 'i-lucide-volume-2' : 'i-lucide-volume-x'"
        :aria-label="soundEnabled ? 'Desativar som de alerta' : 'Ativar som de alerta'"
        color="neutral"
        variant="ghost"
        size="xs"
        @click.stop="$emit('sound-toggle')"
      />

      <div class="flex items-center gap-1">
        <UButton
          v-for="p in SOUND_PRESETS"
          :key="p.id"
          :data-testid="`sound-preset-${p.id}`"
          :label="p.label"
          :variant="soundPreset === p.id ? 'solid' : 'ghost'"
          :aria-pressed="soundPreset === p.id"
          color="neutral"
          size="xs"
          @click.stop="$emit('sound-pick', p.id)"
        />
      </div>
    </footer>
  </div>

  <div
    v-else
    ref="rootEl"
    key="alerts-rail"
    class="flex h-full w-11 shrink-0 cursor-pointer flex-col items-center gap-2 overflow-hidden border-l border-zinc-700 bg-zinc-900 py-3"
  >
    <span class="relative shrink-0">
      <UIcon name="i-lucide-bell" class="h-4 w-4 text-zinc-400" />

      <span
        v-if="unseen > 0"
        data-testid="unseen-badge"
        class="text-2xs absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-bold text-white"
        >{{ unseen > 9 ? '9+' : unseen }}</span
      >
    </span>

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

    <div class="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto px-1 py-0.5">
      <div v-if="unreadItems.length" class="flex flex-col items-center gap-2">
        <button
          v-for="a in unreadItems"
          :key="`${a.gameId}|${a.rule}|${a.at}`"
          :data-testid="`alert-${a.gameId}-${items.indexOf(a)}`"
          :aria-label="`${a.home} x ${a.away}: ${entryTitle(a.rule, a.label)}`"
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-teal-400 bg-teal-400 p-0.5 text-2xs leading-none font-extrabold text-zinc-950"
          @click.stop="onRailSelect(a.gameId)"
        >
          {{ entryTag(a.rule) }}
        </button>
      </div>

      <div
        v-if="unreadItems.length && readItems.length"
        data-testid="rail-unread-divider"
        class="h-px w-6 shrink-0 bg-zinc-700"
      />

      <div class="flex flex-col items-center gap-2">
        <button
          v-for="a in readItems"
          :key="`${a.gameId}|${a.rule}|${a.at}`"
          :data-testid="`alert-${a.gameId}-${items.indexOf(a)}`"
          :aria-label="`${a.home} x ${a.away}: ${entryTitle(a.rule, a.label)}`"
          class="text-2xs flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 p-0.5 leading-none font-extrabold text-teal-400"
          :class="{ 'border-amber-400/80': isNew(a.at) }"
          @click.stop="onRailSelect(a.gameId)"
        >
          {{ entryTag(a.rule) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  SOUND_PRESETS,
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
  loading: { type: Boolean, default: false },
  toggleIcon: { type: String, default: '' },
  toggleLabel: { type: String, default: '' },
  collapseOnOutside: { type: Boolean, default: false },
  soundEnabled: { type: Boolean, default: false },
  soundPreset: { type: String, default: 'ping' },
})

const now = ref(Date.now())
const seenAt = ref(loadAlertsSeenAt())
// Congelado no mount: fundo mostra quem era novo ANTES de abrir; o badge
// (seenAt) zera na abertura mas o fundo não apaga junto. Nada visto ainda
// (seenAt=0) → marco 0, tudo com at válido destaca.
const highlightSince = ref(seenAt.value)
const unseen = computed(() => countUnseen(props.items, seenAt.value))
const unreadItems = computed(() => props.items.filter((n) => (Date.parse(n?.at) || 0) > seenAt.value))
const readItems = computed(() => props.items.filter((n) => (Date.parse(n?.at) || 0) <= seenAt.value))
const rootEl = ref(null)
let timer = null
const emit = defineEmits(['toggle', 'select', 'collapse', 'sound-toggle', 'sound-pick'])
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
  if (props.collapseOnOutside) {
    document.addEventListener('click', onDocClick, true)
    document.addEventListener('keydown', onKeyDown)
  }
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  document.removeEventListener('click', onDocClick, true)
  document.removeEventListener('keydown', onKeyDown)
})
// Abrir zera o badge, mas o FUNDO congela no valor anterior (senão apagava
// junto e não servia de nada).
function markSeen() {
  highlightSince.value = seenAt.value
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
function onRailSelect(gameId) {
  emit('select', gameId)
  emit('toggle')
}
function isNew(at) {
  return isRecentNotification([{ at }], Date.now(), 5)
}
function isFresh(at) {
  return isRecentNotification([{ at }], now.value, 10)
}
function isUnseen(at) {
  const t = Date.parse(at)
  return Number.isFinite(t) && t > highlightSince.value
}
// Só a barra fixa do desktop colapsa no clique fora (drawer não usa a prop):
// dentro com ela FECHADA → expande; fora com ela ABERTA → colapsa. Toggle e
// siglas têm handlers próprios com .stop e retornam antes. Capture: o card
// tem flip no clique — o colapso consome o evento antes dele girar.
function onDocClick(e) {
  if (e.target?.closest?.('[data-testid="panel-toggle"]')) return
  if (rootEl.value?.contains(e.target)) {
    if (!props.open) {
      e.stopPropagation()
      emit('toggle')
    }
    return
  }
  if (props.open) {
    e.stopPropagation()
    emit('collapse')
  }
}
// ESC fecha a barra aberta.
function onKeyDown(e) {
  if (e.key === 'Escape' && props.open) emit('collapse')
}
</script>
