<template>
  <div class="flex min-w-0 flex-col gap-5">
    <div class="min-w-0">
      <PageHeader title="Scanner ao vivo">
        <template #title>
          Scanner ao vivo
          <span
            class="ml-2 inline-block rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 align-middle text-xs font-semibold whitespace-nowrap text-zinc-400"
          >
            {{ games.length }} {{ games.length === 1 ? 'jogo' : 'jogos' }}
          </span>
        </template>

        <template #right>
          <div
            class="flex w-full items-center justify-between gap-3 text-xs text-zinc-400 sm:ml-auto sm:w-auto sm:justify-end"
          >
            <UButton to="/daily-report" target="_blank" color="primary" variant="soft" size="xs">
              Relatório do dia
            </UButton>

            <UButton
              v-if="hasTomorrowReport"
              :to="`/daily-report?date=${tomorrowIso}`"
              target="_blank"
              color="primary"
              variant="outline"
              size="xs"
            >
              Relatório de amanhã
            </UButton>

            <span class="flex items-center gap-2">
              <span class="relative flex h-2 w-2">
                <span
                  class="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75"
                ></span>

                <span class="relative inline-flex h-2 w-2 rounded-full bg-teal-400"></span>
              </span>

              <USkeleton v-if="loading && !snapshot" class="h-3 w-28" />

              <span v-else-if="updatedAgo">Atualizado {{ updatedAgo }}</span>

              <span v-if="offline" class="text-zinc-600">· sem conexão</span>
            </span>
          </div>
        </template>
      </PageHeader>

      <ScannerSkeleton v-if="loading && !snapshot" />

      <div
        v-else-if="fetchError && !snapshot"
        class="rounded-2xl border border-zinc-800 bg-zinc-900 py-16 text-center text-sm text-zinc-500"
      >
        Não foi possível carregar os jogos ao vivo. Tente novamente em instantes.
      </div>

      <div v-else-if="games.length === 0" class="py-16 text-center text-sm text-zinc-500">
        Nenhum jogo ao vivo agora
      </div>

      <div v-else class="flex flex-col gap-4">
        <template v-if="favoriteGames.length">
          <section class="rounded-2xl bg-amber-400/10 p-4">
            <header
              role="button"
              tabindex="0"
              class="flex cursor-pointer flex-wrap items-center justify-between gap-2 select-none"
              :aria-expanded="!favoritesCollapsed"
              aria-controls="favorites-collapse"
              @click="toggleFavoritesCollapsed"
              @keydown.enter.prevent="toggleFavoritesCollapsed"
              @keydown.space.prevent="toggleFavoritesCollapsed"
            >
              <h2 class="flex items-center gap-1.5 text-sm font-bold text-zinc-100">
                <UIcon name="i-lucide-star" mode="svg" class="star-fill size-4 text-amber-400" />

                Jogos favoritos
                <span
                  class="text-2xs rounded-full border border-teal-500/30 bg-zinc-950 px-2.5 py-0.5 font-semibold whitespace-nowrap text-zinc-400"
                >
                  {{ favoriteGames.length }} {{ favoriteGames.length === 1 ? 'jogo' : 'jogos' }}
                </span>
              </h2>

              <span class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-chevron-down"
                  mode="svg"
                  class="size-4 text-zinc-500 transition-transform duration-250 ease-in-out"
                  :class="{ 'rotate-180': favoritesCollapsed }"
                />
              </span>
            </header>

            <Transition :duration="250" @enter="onCollapseEnter" @leave="onCollapseLeave">
              <div v-show="!favoritesCollapsed" id="favorites-collapse" class="mt-3">
                <TransitionGroup
                  tag="div"
                  name="fav"
                  appear
                  class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
                >
                  <ScannerCard
                    v-for="game in favoriteGames"
                    :id="`game-${game.id}`"
                    :key="game.id"
                    :game="game"
                    :highlighted="game.id === activeHighlight"
                    :pre-live-bets="preLiveBetsByGame[game.id] || []"
                  />
                </TransitionGroup>
              </div>
            </Transition>
          </section>

          <USeparator />
        </template>

        <div class="flex flex-col gap-1.5">
          <span class="text-2xs font-semibold tracking-wide text-zinc-500 uppercase">Filtros</span>

          <div class="flex w-full flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <UInput v-model="query" icon="i-lucide-search" placeholder="Buscar time ou liga…" class="w-full md:w-72" />

            <SegmentedControl v-model="oddsPreset" :options="oddsPresetOptions" full-width />

            <div class="flex flex-wrap items-center justify-end gap-4 md:ml-auto">
              <div class="flex items-center gap-2">
                <USwitch
                  v-model="onlyNotified"
                  size="md"
                  checked-icon="i-lucide-check"
                  unchecked-icon="i-lucide-x"
                  aria-labelledby="only-notified-label"
                  title="jogos que já tiveram algum alerta"
                />

                <span id="only-notified-label" class="text-xs font-medium whitespace-nowrap text-zinc-400"
                  >Só notificados</span
                >
              </div>

              <div class="flex items-center gap-2">
                <USwitch
                  v-model="onlyPreLive"
                  size="md"
                  checked-icon="i-lucide-check"
                  unchecked-icon="i-lucide-x"
                  aria-labelledby="only-pre-live-label"
                  title="jogos com aposta de modelo pré-live"
                />

                <span id="only-pre-live-label" class="text-xs font-medium whitespace-nowrap text-zinc-400"
                  >Só com pré-live</span
                >
              </div>
            </div>
          </div>
        </div>

        <div v-if="otherGames.length" class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <ScannerCard
            v-for="game in otherGames"
            :id="`game-${game.id}`"
            :key="game.id"
            :game="game"
            :highlighted="game.id === activeHighlight"
            :pre-live-bets="preLiveBetsByGame[game.id] || []"
          />
        </div>

        <div
          v-else-if="filtersActive"
          class="rounded-2xl border border-zinc-800 bg-zinc-900 py-14 text-center text-sm text-zinc-500"
        >
          Nenhum jogo corresponde ao filtro.
        </div>
      </div>
    </div>

    <aside class="fixed top-16 right-0 bottom-0 z-30 hidden xl:block">
      <ScannerAlertsPanel
        :items="panelItems"
        :open="!alertsCollapsed"
        :loading="loading && !snapshot"
        :sound-enabled="soundEnabled"
        :sound-preset="soundPreset"
        collapse-on-outside
        @toggle="toggleAlertsCollapsed"
        @select="highlightGame"
        @collapse="collapseAlertsPanel"
        @sound-toggle="toggleSound"
        @sound-pick="pickSound"
      />
    </aside>

    <UButton
      v-if="canOpenDrawer && panelItems.length"
      class="fixed right-5 bottom-5 z-40 xl:hidden"
      icon="i-lucide-bell"
      color="primary"
      variant="solid"
      @click="alertsDrawer = true"
    >
      {{ panelItems.length }}
    </UButton>

    <UDrawer v-model:open="alertsDrawer" :ui="{ content: 'bg-zinc-900' }">
      <template #content>
        <div class="flex flex-col gap-3 p-5">
          <ScannerAlertsPanel
            :items="panelItems"
            :open="true"
            :sound-enabled="soundEnabled"
            :sound-preset="soundPreset"
            toggle-icon="i-lucide-x"
            toggle-label="Fechar"
            @toggle="alertsDrawer = false"
            @sound-toggle="toggleSound"
            @sound-pick="pickSound"
            @select="
              (id) => {
                alertsDrawer = false
                highlightGame(id)
              }
            "
          />
        </div>
      </template>
    </UDrawer>
  </div>
</template>

<script setup>
import { DateTime } from 'luxon'
import { useFavorites } from '~/composables/useFavorites'
import { filterBetsForGame } from '~/utils/preLiveBets'
import { ODDS_PRESET_OPTIONS } from '~/utils/oddsPresets'
import { SP_TZ } from '~/utils/timezone'
import { isAgeGateDismissed } from '~/utils/pwaInstall'
import {
  SOUND_PRESETS,
  entryTag,
  entryTitle,
  formatAlertTime,
  loadSoundEnabled,
  loadSoundPreset,
  saveSoundEnabled,
  saveSoundPreset,
} from '~/utils/scanner'
import { playPreset, previewPreset, unlockSound } from '~/utils/alertSound'

const config = useRuntimeConfig()
const route = useRoute()
const router = useRouter()

// Relatório de amanhã: disponível depois das 23h (scanner já gerou os dados).
const now = DateTime.now().setZone(SP_TZ)
const hasTomorrowReport = now.hour >= 23
const tomorrowIso = now.plus({ days: 1 }).toFormat('yyyy-MM-dd')

const snapshot = ref(null)
const loading = ref(true)
const fetchError = ref(false)
const offline = ref(false)
const updatedAgo = ref('')

// Filtros client-side (busca + só notificados + preset de odds + só com pré-live) — estado
// transitório de exploração, não persiste entre visitas. Favoritos seguem SEM filtro.
const query = ref('')
const onlyNotified = ref(false)
const onlyPreLive = ref(false)
const oddsPreset = ref('todos')
const oddsPresetOptions = ODDS_PRESET_OPTIONS
const filtersActive = computed(
  () =>
    onlyNotified.value || oddsPreset.value !== 'todos' || normalizeSearchText(query.value) !== '' || onlyPreLive.value,
)

// Favoritos colapsados — preferência de view persistida. Default expandido.
const favoritesCollapsed = ref(false)
let favoritesCollapsedReady = false // evita persistir o valor default antes da leitura do storage

onMounted(() => {
  favoritesCollapsed.value = localStorage.getItem('dataPlay.scanner.favoritesCollapsed') === '1'
  favoritesCollapsedReady = true
})

function toggleFavoritesCollapsed() {
  favoritesCollapsed.value = !favoritesCollapsed.value
  if (!favoritesCollapsedReady) return // nunca acontece via clique (pós-mount), só guard
  localStorage.setItem('dataPlay.scanner.favoritesCollapsed', favoritesCollapsed.value ? '1' : '0')
}

// Painel de alertas — estado transitório da sessão, sem persistência.
// Default colapsado no desktop; toggle continua valendo na sessão.
// alertsDrawer: drawer mobile (xl:hidden); canOpenDrawer: mobile só mostra o
// botão após dismiss do age gate (avaliado no tick).
const alertsCollapsed = ref(true)
const alertsDrawer = ref(false)
const canOpenDrawer = ref(false)
function toggleAlertsCollapsed() {
  alertsCollapsed.value = !alertsCollapsed.value
}
// Clique fora da barra fixa (só desktop — o drawer não emite collapse).
function collapseAlertsPanel() {
  alertsCollapsed.value = true
}

// Histórico do dia (reativo p/ o painel; gancho do ticket 3).
const dayEntries = ref({ date: '', byGame: {} })
const newEntries = ref([]) // diff p/ o ticket 3 (gancho): alertas nascidos neste snapshot
const panelItems = computed(() =>
  Object.values(dayEntries.value.byGame || {})
    .flat()
    .filter((n) => n.kind === 'entrada' || String(n.rule || '').startsWith('entrada_'))
    .sort((a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0)),
)

// Som de alerta novo — opt-in persistido; desbloqueio no gesto do toggle.
const toast = useToast()
const soundEnabled = ref(false)
const soundPreset = ref('ping')
const hadSnapshot = ref(false) // guard do 1º snapshot: dia inteiro não é "novo"
onMounted(() => {
  soundEnabled.value = loadSoundEnabled()
  soundPreset.value = loadSoundPreset()
  // Som persistido ligado de outra sessão: o contexto nasce suspenso
  // (autoplay policy) e o play do watch sai mudo até o 1º gesto — o
  // primeiro clique/tecla em qualquer lugar resume.
  const gestureUnlock = () => {
    if (soundEnabled.value) unlockSound()
  }
  window.addEventListener('pointerdown', gestureUnlock)
  window.addEventListener('keydown', gestureUnlock)
})
async function toggleSound() {
  const next = !soundEnabled.value
  soundEnabled.value = next
  saveSoundEnabled(next)
  if (next) {
    await unlockSound() // gesto → AudioContext resume
    playPreset(soundPreset.value) // confirmação audível de que o som saiu do mudo
  }
}
async function pickSound(id) {
  soundPreset.value = SOUND_PRESETS.some((p) => p.id === id) ? id : 'ping'
  saveSoundPreset(soundPreset.value)
  await previewPreset(soundPreset.value) // preview sempre, mesmo com master off; o gesto desbloqueia o contexto
}

// Toast + som agregados: SÓ painel fechado (desktop E drawer), nunca no
// primeiro snapshot (dia inteiro pareceria "novo"). Watch raso!
watch(newEntries, (entries) => {
  if (!entries?.length || !hadSnapshot.value) return
  if (!alertsCollapsed.value || alertsDrawer.value) return
  const first = entries[0]
  const title =
    entries.length === 1
      ? `${entryTitle(first.rule, first.label)} · ${first.home} x ${first.away}`
      : `${entries.length} novos alertas`
  toast.add({
    title,
    description:
      entries.length === 1
        ? `${formatAlertTime(first.at, Date.now())} · ${first.league || ''}`.trim()
        : `${entryTag(first.rule)} · ${first.home} x ${first.away} (+${entries.length - 1})`,
    color: 'primary',
    onClick: () => {
      alertsCollapsed.value = false
      highlightGame(first.gameId)
    },
  })
  if (soundEnabled.value) playPreset(soundPreset.value)
})

// Destaque reutilizável: Telegram (?game=) e clique do painel usam o mesmo caminho.
function highlightGame(id, list = games.value) {
  const game = list.find((g) => String(g.id) === String(id))
  if (!game || game.finished) return
  const autoExpanded = favoritesCollapsed.value && isFavorite(game.id)
  if (autoExpanded) favoritesCollapsed.value = false
  activeHighlight.value = String(id)
  const scroll = () => document.getElementById(`game-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  if (autoExpanded) setTimeout(scroll, 300)
  else nextTick(scroll)
  clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => {
    activeHighlight.value = null
  }, 12_000)
}

// Destaque vindo do Telegram (?game=<id>): id ainda não encontrado no
// snapshot (highlightId) vs. id atualmente destacado (activeHighlight).
const highlightId = ref(route.query.game ? String(route.query.game) : null)
const activeHighlight = ref(null)
let highlightTimer

let tickTimer
let pollActive = true
let pollController = null
let lastVersion = null

const games = computed(() => snapshot.value?.games || [])

// Favoritos no topo (só ao vivo — jogo finalizado sai da seção e volta pro
// grid normal até sair do snapshot). O resto segue no grid principal.
const { isFavorite } = useFavorites()

// Daily-bets para indicador pré-live: busca os bets do dia dos jogos ao vivo
// (não do default "dia seguinte" da API, que quebra o cruzamento após a virada de dia).
const preLiveDate = computed(() => {
  const gen = snapshot.value?.generated_at
  const base = gen ? DateTime.fromISO(gen).setZone(SP_TZ) : DateTime.now().setZone(SP_TZ)
  return base.toFormat('yyyy-MM-dd')
})
const { data: dailyBetsData } = useDailyBets({ date: preLiveDate })
const allBets = computed(() => dailyBetsData.value?.bets || [])

// Map: game.id → bets relevantes para aquele jogo
const preLiveBetsByGame = computed(() => {
  const map = {}
  for (const game of games.value) {
    map[game.id] = filterBetsForGame(allBets.value, game)
  }
  return map
})

// Set de ids de jogos que têm ≥1 aposta pré-live — usado pelo filtro "só com pré-live".
const preLiveGameIds = computed(
  () => new Set(Object.keys(preLiveBetsByGame.value).filter((id) => preLiveBetsByGame.value[id].length > 0)),
)

const favoriteGames = computed(() => games.value.filter((g) => !g.finished && isFavorite(g.id)))
const otherGames = computed(() =>
  filterScannerGames(
    games.value.filter((g) => !(!g.finished && isFavorite(g.id))),
    {
      query: query.value,
      onlyNotified: onlyNotified.value,
      oddsPreset: oddsPreset.value,
      onlyPreLive: onlyPreLive.value,
      preLiveGameIds: preLiveGameIds.value,
    },
  ),
)

// Aplica um snapshot já validado pelo safeParse no estado da página.
function applySnapshot(parsed) {
  hadSnapshot.value = snapshot.value != null // ciclo anterior: 1º snapshot suprime toast
  const localHistory = loadLocalHistory()
  const games = (parsed.games || []).map((g) => {
    const merged = mergeHistories(g.notifications, localHistory[g.id])
    return { ...g, notifications: merged }
  })
  saveLocalHistory(pruneLocalHistory(games))
  const prevDay = dayEntries.value.date ? dayEntries.value : loadDayEntries()
  newEntries.value = findNewEntries(prevDay.byGame, games)
  dayEntries.value = mergeDayEntries(prevDay, games)
  saveDayEntries(dayEntries.value)
  snapshot.value = { ...parsed, games }
  loading.value = false
  maybeHighlight(games)
}

// Sleep abortável: o kick (volta à aba) interrompe backoff/fallback na hora.
function sleep(ms, signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve()
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        resolve()
      },
      { once: true },
    )
  })
}

// Loop de long polling: sempre há um request no ar; resposta com a mesma
// versão (hold expirou sem mudança) → re-pede na hora.
async function pollLoop() {
  while (pollActive) {
    const controller = new AbortController()
    pollController = controller
    try {
      const base = config.public.SCANNER_SNAPSHOT_URL
      const url = lastVersion == null ? base : `${base}?v=${lastVersion}`
      const signal =
        typeof AbortSignal.any === 'function'
          ? AbortSignal.any([controller.signal, AbortSignal.timeout(35_000)])
          : controller.signal // browsers sem AbortSignal.any (Safari <17.4, Chrome <116): só o abort manual
      const data = await $fetch(url, { signal })
      if (!pollActive) return
      const parsed = safeParse('scannerSnapshot', data)
      fetchError.value = false
      offline.value = false // todo sucesso limpa os flags, inclusive no caso de mesma versão
      if (parsed?.version == null) {
        // Backend antigo (sem version): fallback polling de 10s.
        applySnapshot(parsed)
        await sleep(10_000, controller.signal)
        continue
      }
      if (parsed.version === lastVersion) continue // hold expirou sem mudança: re-pede já
      lastVersion = parsed.version
      applySnapshot(parsed)
    } catch {
      if (!pollActive) return
      if (controller.signal.aborted) continue // abort intencional (kick/unmount): re-pede já
      // Timeout de 35s (request preso) cai aqui: tratado como erro de rede.
      fetchError.value = true
      offline.value = true
      loading.value = false // primeiro erro sai do skeleton e mostra o painel de erro
      await sleep(5_000, controller.signal)
    }
  }
}

// Se o jogo do Telegram está na lista E ainda ao vivo: rola até ele e acende
// o destaque por 12s. Se não está (não é mais transmitido) ou já encerrou
// (fica 15 min no snapshot com finished=true), descarta sem scrollar —
// highlight só dispara para jogo ao vivo presente num snapshot.
function maybeHighlight(list) {
  if (!highlightId.value) return
  const target = highlightId.value
  highlightId.value = null
  highlightGame(target, list)
}

function tick() {
  updatedAgo.value = formatUpdatedAgo(snapshot.value?.generated_at)
  if (!canOpenDrawer.value) canOpenDrawer.value = isAgeGateDismissed()
}

// Browser pausa timers em aba em background: ao voltar pro foco, aborta o
// hold em voo — o loop acorda (catch com controller.signal.aborted → continue,
// ou sleep abortável resolvendo cedo) e re-pede na hora. Sem fetch concorrente.
function onVisibilityChange() {
  if (document.visibilityState === 'visible') pollController?.abort()
}

onMounted(() => {
  // URL limpa depois de ler o parâmetro: refresh não re-dispara o destaque.
  if (route.query.game) router.replace({ query: {} })
  pollLoop()
  tickTimer = setInterval(tick, 1000)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  pollActive = false
  pollController?.abort()
  clearInterval(tickTimer)
  clearTimeout(highlightTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

// Accordion suave: anima 0 ↔ altura real do conteúdo (grid responsivo 1–3 colunas).
function onCollapseEnter(el, done) {
  el.style.height = '0'
  el.style.overflow = 'hidden'
  el.offsetHeight // força reflow para a transição partir de 0
  el.style.height = `${el.scrollHeight}px`
  el.style.transition = 'height 250ms ease-in-out'
  function handleEnd(e) {
    if (e.target !== el) return // transitionend de filho (cards) borbulhou: ignora
    el.removeEventListener('transitionend', handleEnd)
    el.style.height = ''
    el.style.overflow = ''
    el.style.transition = ''
    done()
  }
  el.addEventListener('transitionend', handleEnd)
}

function onCollapseLeave(el, done) {
  el.style.height = `${el.scrollHeight}px`
  el.offsetHeight // força reflow para partir da altura atual
  el.style.height = '0'
  el.style.overflow = 'hidden'
  el.style.transition = 'height 250ms ease-in-out'
  function handleEnd(e) {
    if (e.target !== el) return // transitionend de filho (cards) borbulhou: ignora
    el.removeEventListener('transitionend', handleEnd)
    done()
  }
  el.addEventListener('transitionend', handleEnd)
}
</script>
