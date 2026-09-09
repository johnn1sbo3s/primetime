<template>
  <div
    class="relative h-full min-h-125 cursor-pointer perspective-distant"
    :class="{ 'hl-travel': highlighted }"
    @click="flipped = !flipped"
  >
    <div
      class="relative h-full transition-transform duration-500 transform-3d"
      :class="{ 'transform-[rotateY(180deg)]': flipped }"
    >
      <div
        ref="frontEl"
        class="card-shine flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-3.5 backface-hidden"
        :class="{ 'alert-recent': isRecent, 'opacity-60': game.finished }"
      >
        <div class="mb-2 flex items-center justify-between gap-2">
          <span class="text-2xs font-semibold tracking-wide text-zinc-500 uppercase">{{ game.league }}</span>

          <div class="print-hide flex items-center gap-1.5">
            <TeamHistoryPopover
              v-if="game.team_history"
              :history="game.team_history"
              :home="game.home"
              :away="game.away"
            />

            <UTooltip v-if="game.notifications?.length" text="Notificações recebidas pelo jogo">
              <ScannerActionButton icon="i-lucide-bell">
                <span class="text-2xs font-semibold">{{ game.notifications.length }}</span>
              </ScannerActionButton>
            </UTooltip>

            <UPopover v-if="preLiveBets.length > 0">
              <button
                type="button"
                title="Modelos com apostas pré-live"
                class="flex h-7 items-center gap-1 rounded-lg border border-zinc-800 px-2 text-zinc-400 transition-colors hover:border-teal-400 hover:text-teal-400"
                @click.stop
              >
                <UIcon name="i-lucide-target" mode="svg" class="h-3.5 w-3.5" />

                <span class="text-2xs font-semibold">{{ preLiveBets.length }}</span>
              </button>

              <template #content>
                <div class="flex min-w-40 flex-col gap-1.5 p-2">
                  <span class="text-2xs font-bold tracking-wide text-teal-400 uppercase">Modelos pré-live</span>

                  <div v-for="(bet, i) in preLiveBets" :key="i" class="flex items-center justify-between gap-3 text-xs">
                    <span class="font-semibold text-zinc-100">{{
                      modelNameToNaturalName(bet.Modelo ?? bet.model)
                    }}</span>

                    <span class="font-semibold whitespace-nowrap text-teal-400">
                      {{ formatNumber(bet.Odd ?? bet.Odds, 2) }}
                    </span>
                  </div>
                </div>
              </template>
            </UPopover>

            <UTooltip
              v-if="!game.finished || isFavorite(game.id)"
              :text="isFavorite(game.id) ? 'Remover dos favoritos' : 'Favoritar jogo'"
            >
              <ScannerActionButton
                icon="i-lucide-star"
                square
                color="amber"
                :active="isFavorite(game.id)"
                :class="isFavorite(game.id) ? 'star-fill' : ''"
                :aria-label="isFavorite(game.id) ? 'Remover dos favoritos' : 'Favoritar jogo'"
                @click.stop="toggleFavorite(game.id)"
              />
            </UTooltip>

            <UTooltip text="Tirar print do card">
              <ScannerActionButton icon="i-lucide-camera" square @click.stop="captureCard" />
            </UTooltip>

            <UTooltip text="Abrir no Flashscore">
              <ScannerActionButton
                icon="i-lucide-arrow-up-right"
                square
                :href="game.flashscore_url"
                target="_blank"
                @click.stop
              />
            </UTooltip>
          </div>
        </div>

        <div class="mb-2.5 flex items-center gap-2 text-sm font-semibold">
          <span class="flex min-w-0 items-center gap-1">
            <UTooltip :text="game.home">
              <span class="min-w-0 truncate text-zinc-400">{{ game.home }}</span>
            </UTooltip>

            <UTooltip v-if="trends.home" :text="trendTitle('home')">
              <UIcon
                :name="trends.home === 'up' ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                :class="trends.home === 'up' ? 'text-teal-400' : 'text-zinc-500'"
                class="h-3.5 w-3.5 shrink-0"
              />
            </UTooltip>
          </span>

          <span class="shrink-0 text-base font-bold whitespace-nowrap text-zinc-100"
            >{{ game.score.home }} x {{ game.score.away }}</span
          >

          <span class="flex min-w-0 items-center gap-1">
            <UTooltip :text="game.away">
              <span class="min-w-0 truncate text-zinc-400">{{ game.away }}</span>
            </UTooltip>

            <UTooltip v-if="trends.away" :text="trendTitle('away')">
              <UIcon
                :name="trends.away === 'up' ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                :class="trends.away === 'up' ? 'text-teal-400' : 'text-zinc-500'"
                class="h-3.5 w-3.5 shrink-0"
              />
            </UTooltip>
          </span>

          <UBadge
            v-if="game.finished"
            color="neutral"
            variant="outline"
            size="md"
            class="ml-auto shrink-0 rounded-full font-bold whitespace-nowrap"
            >Encerrado</UBadge
          >

          <UBadge
            v-else-if="isHalftime"
            color="primary"
            variant="subtle"
            size="md"
            class="ml-auto shrink-0 rounded-full font-bold whitespace-nowrap"
            >Intervalo</UBadge
          >

          <UBadge
            v-else
            color="primary"
            variant="subtle"
            size="md"
            class="ml-auto shrink-0 rounded-full font-bold whitespace-nowrap"
            >{{ game.minute }}'</UBadge
          >
        </div>

        <div v-if="hasOdds" class="mb-2.5 grid grid-cols-[1fr_1fr_1fr_0.85fr_0.85fr] gap-x-1 gap-y-0.5">
          <div v-for="col in oddsColumns" :key="col.label" class="flex flex-col gap-0.5">
            <span class="text-2xs text-center font-semibold tracking-wide text-zinc-600 uppercase">{{
              col.label
            }}</span>

            <UBadge color="secondary" variant="soft" size="sm" class="justify-center">{{
              col.value != null ? formatNumber(col.value) : '-'
            }}</UBadge>
          </div>
        </div>

        <MomentumChart :bars="game.momentum" :goals="game.goals" class="mb-3" />

        <div class="mt-auto flex flex-col gap-2">
          <div v-for="row in statRows" :key="row.label" class="flex flex-col gap-0.5">
            <div class="flex items-baseline justify-between text-xs">
              <span class="font-bold text-zinc-200">{{ row.home }}</span>

              <span class="flex items-center gap-0.5">
                <span class="text-2xs tracking-wide text-zinc-500 uppercase">{{ row.label }}</span>

                <UPopover v-if="row.hint">
                  <UIcon
                    name="i-lucide-circle-help"
                    class="h-3 w-3 cursor-help text-zinc-600 transition-colors hover:text-zinc-300"
                    @click.stop
                  />

                  <template #content>
                    <div class="max-w-56 p-3 text-xs leading-relaxed text-zinc-200">{{ row.hint }}</div>
                  </template>
                </UPopover>
              </span>

              <span class="font-bold text-zinc-200">{{ row.away }}</span>
            </div>

            <div class="flex h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div v-if="row.pctHome !== null" class="bg-teal-400" :style="{ width: row.pctHome + '%' }"></div>

              <div v-if="row.pctHome !== null" class="bg-blue-500" :style="{ width: 100 - row.pctHome + '%' }"></div>
            </div>
          </div>

          <div v-if="!game.finished" class="mt-1 grid grid-cols-2 gap-1.5">
            <UButton
              block
              color="primary"
              variant="soft"
              size="sm"
              title="Ver a evolução de xG do jogo"
              @click.stop="openXgHistory"
            >
              Evolução de xG
            </UButton>

            <UButton
              block
              color="primary"
              variant="soft"
              size="sm"
              title="Ver a análise pré-jogo do jogo (relatório do dia)"
              @click.stop="openPreGame"
            >
              Análise pré-jogo
            </UButton>
          </div>
        </div>
      </div>

      <div
        class="absolute inset-0 flex transform-[rotateY(180deg)] flex-col overflow-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-3.5 backface-hidden"
      >
        <div class="mb-2.5 flex items-center justify-between">
          <span class="flex items-center gap-1.5 text-sm font-bold">
            <UIcon name="i-lucide-bell" class="text-teal-400" /> Notificações
          </span>

          <button
            class="rounded-lg border border-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-400 hover:border-teal-400 hover:text-teal-400"
            @click.stop="flipped = false"
          >
            ← Voltar
          </button>
        </div>

        <div v-if="game.notifications?.length" class="flex flex-col gap-1.5">
          <div
            v-for="(n, i) in game.notifications"
            :key="i"
            class="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs"
          >
            <UIcon name="i-lucide-bell" class="shrink-0 text-teal-400" />

            <span class="flex-1 font-semibold text-zinc-200">{{ n.label }}</span>

            <span class="text-2xs rounded-full bg-teal-500/10 px-1.5 py-0.5 font-bold text-teal-400"
              >{{ n.minute }}'</span
            >

            <span class="text-xs whitespace-nowrap text-zinc-500">{{ formatTime(n.at) }}</span>
          </div>
        </div>

        <p v-else class="m-auto text-center text-xs text-zinc-600">Sem notificações neste jogo ainda</p>
      </div>
    </div>

    <span v-if="isRecent && !flipped" class="alert-tag">Alerta</span>

    <div
      v-if="preGameOpen"
      class="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/70 p-3"
      @click.stop
    >
      <div class="max-h-full w-full overflow-auto rounded-xl border border-zinc-700 bg-zinc-900 p-3">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-2xs font-bold tracking-wide text-teal-400 uppercase">
            {{ preGameResponse?.time ? `Análise pré-jogo · ${preGameResponse.time}` : 'Análise pré-jogo' }}
          </span>

          <button
            class="flex h-5 w-5 items-center justify-center rounded border border-zinc-700 text-xs text-zinc-400 hover:border-teal-400 hover:text-teal-400"
            @click.stop="preGameOpen = false"
          >
            ✕
          </button>
        </div>

        <div v-if="preGameLoading" class="flex flex-col items-center gap-2 py-4">
          <span class="h-5 w-5 animate-spin rounded-full border-2 border-teal-500/25 border-t-teal-400"></span>

          <span class="text-xs text-zinc-400">Buscando análise pré-jogo...</span>
        </div>

        <div v-else-if="preGameState.error" class="flex flex-col items-center gap-2 py-2 text-center">
          <p class="text-xs text-zinc-400">Não foi possível carregar a análise pré-jogo.</p>

          <button
            class="rounded-lg border border-teal-500/30 px-3 py-1 text-xs font-semibold text-teal-400"
            @click.stop="retryPreGame"
          >
            Tentar de novo
          </button>
        </div>

        <template v-else-if="preGameResponse">
          <p class="text-xs leading-relaxed text-zinc-200">{{ preGameResponse.leitura_geral }}</p>

          <div class="mt-2 flex flex-col gap-1.5">
            <div
              v-for="e in preGameResponse.estrategias"
              :key="e.estrategia"
              class="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5"
            >
              <span class="text-xs font-bold text-zinc-100">{{ modelNameToNaturalName(e.estrategia) }}</span>

              <span class="text-xs font-bold" :class="e.recomendacao === 'entrar' ? 'text-teal-400' : 'text-amber-400'">
                {{ e.recomendacao }} · {{ e.confianca }}%
              </span>
            </div>

            <p v-for="e in preGameResponse.estrategias" :key="e.estrategia + '-an'" class="text-2xs text-zinc-500">
              {{ e.analise }}
            </p>
          </div>
        </template>

        <div v-else class="flex flex-col items-center gap-1 py-4 text-center">
          <p class="text-xs text-zinc-400">Sem análise pré-jogo para este jogo.</p>
        </div>
      </div>
    </div>

    <div
      v-if="xgOpen"
      class="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/70 p-3"
      @click.stop
    >
      <div class="max-h-full w-full overflow-auto rounded-xl border border-zinc-700 bg-zinc-900 p-3">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-2xs font-bold tracking-wide text-teal-400 uppercase">Evolução de xG</span>

          <button
            class="flex h-5 w-5 items-center justify-center rounded border border-zinc-700 text-xs text-zinc-400 hover:border-teal-400 hover:text-teal-400"
            @click.stop="closeXgHistory"
          >
            ✕
          </button>
        </div>

        <div v-if="xgLoading" class="flex flex-col items-center gap-2 py-4">
          <span class="h-5 w-5 animate-spin rounded-full border-2 border-teal-500/25 border-t-teal-400"></span>

          <span class="text-xs text-zinc-400">Carregando xG...</span>
        </div>

        <div v-else-if="xgState.error" class="flex flex-col items-center gap-2 py-2 text-center">
          <p class="text-xs text-zinc-400">Não foi possível carregar o histórico de xG.</p>

          <button
            class="rounded-lg border border-teal-500/30 px-3 py-1 text-xs font-semibold text-teal-400"
            @click.stop="retryXg"
          >
            Tentar de novo
          </button>
        </div>

        <XgLineChart v-else :history="xgHistory" :live-samples="xgLiveSamples" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { isRecentNotification } from '~/utils/scanner.js'
import { modelNameToNaturalName } from '~/utils/resolveModelName'
import { formatNumber, formatPercent } from '~/utils/formatNumber'
import { computePressure, computeControl } from '~/utils/scannerPressure'
import { mergeXgSeries, sumTiers } from '~/utils/scannerShots'
import { toBlob } from 'html-to-image'
import { useFavorites } from '~/composables/useFavorites'
import { usePreGameAnalysis } from '~/composables/usePreGameAnalysis'
import { useXgHistory } from '~/composables/useXgHistory'
const props = defineProps({
  game: { type: Object, required: true },
  // Destaque vindo do Telegram (?game=<id>): luz viajante na borda por ~12s.
  highlighted: { type: Boolean, default: false },
  preLiveBets: { type: Array, default: () => [] },
})

const { isFavorite, toggleFavorite } = useFavorites()

const { get: getPreGame, load: loadPreGame } = usePreGameAnalysis()
const preGameOpen = ref(false)

const preGameState = computed(() => getPreGame(props.game.id))
const preGameLoading = computed(() => preGameState.value.status === 'loading')
const preGameResponse = computed(() => preGameState.value.response)

async function openPreGame() {
  preGameOpen.value = true
  try {
    await loadPreGame(props.game.id)
  } catch {
    // erro fica no estado (preGameState.error) e o modal mostra retry
  }
}

function retryPreGame() {
  loadPreGame(props.game.id).catch(() => {})
}

const { get: getXgState, load: loadXgHistory } = useXgHistory()
const xgOpen = ref(false)
const xgLiveSamples = ref([])
let stopXgWatch = null
const xgState = computed(() => getXgState(props.game.id))
const xgLoading = computed(() => xgState.value.status === 'loading')
const xgHistory = computed(() => xgState.value.response?.series ?? [])

async function openXgHistory() {
  xgOpen.value = true
  xgLiveSamples.value = []
  try {
    await loadXgHistory(props.game.id)
  } catch {
    // erro fica no estado
  }
  if (stopXgWatch) stopXgWatch()
  stopXgWatch = watch(
    () => props.game.stats?.xg,
    (xg) => {
      if (!xgOpen.value) return
      const minute = props.game.minute
      if (minute == null) return
      const entry = {
        minute: Number(minute),
        xg_home: xg?.home ?? null,
        xg_away: xg?.away ?? null,
        // Delta do ciclo ainda não salvo no histórico: se o ponto ao vivo não
        // carregar os chutes novos, o merge do gráfico apagaria os do minuto.
        // Vazio = sem chute novo, normal (nunca erro/retry).
        shot_events: props.game.shot_events ?? [],
      }
      if (entry.xg_home == null && entry.xg_away == null) return
      // Upsert incremental com a função do gráfico: se o minuto não avançou
      // (ex.: 90' + acréscimos), o ciclo novo NÃO substitui o ponto inteiro —
      // o merge une por minuto (xg novo vence, shot_events dos ciclos se
      // acumulam com dedup). Sem isto, chutes de um ciclo anterior no mesmo
      // minuto seriam perdidos antes de o `merged` rodar.
      xgLiveSamples.value = mergeXgSeries(xgLiveSamples.value, [entry])
    },
    { immediate: true },
  )
}

function closeXgHistory() {
  xgOpen.value = false
  if (stopXgWatch) {
    stopXgWatch()
    stopXgWatch = null
  }
}

function retryXg() {
  loadXgHistory(props.game.id).catch(() => {})
}

const STAT_LABELS = [
  ['shots', 'FINALIZAÇÕES', 0, ''],
  ['big_chances', 'CHANCES CLARAS', 0, ''],
  ['box_touches', 'TOQUES NA ÁREA', 0, ''],
]

const CONTROL_HINT =
  'Controle do jogo: % dos minutos com barra em que o time pressionou mais que o adversário no gráfico de momentum.'
const C10_HINT = 'C10 = controle dos últimos 10 minutos: o mesmo cálculo, considerando só as últimas 10 barras.'
const PICO_HINT =
  "PICO 10' = maior barra de pressão do time nos últimos 10 minutos. O valor vai de 0 a 1 (máximo = 1). A barra de progresso mostra a disputa entre os times."
const SHOT_C12_HINT = 'Grande chance (xG ≥ 0,50) + Boa chance (xG 0,20–0,50)'
const SHOT_C3_HINT = 'Chance média (xG 0,05–0,20)'
const TREND_THRESHOLD = 0.05

const flipped = ref(false)

const isRecent = computed(() => isRecentNotification(props.game.notifications))

// Intervalo: Flashscore entrega "Half time"/"HALF TIME"/"Halftime"/"HT"/
// "Interval(o)" conforme locale — o backend fixa o minuto em 45, e aqui o
// badge troca o minuto por "Intervalo" (não confundir com "1ST HALF"/"2nd Half").
const isHalftime = computed(() => /^(ht|halftime)$|interval|half[\s-]*time/i.test((props.game.status || '').trim()))

const pressure = computed(() => computePressure(props.game.momentum))
const control = computed(() => computeControl(props.game.momentum))
const control10 = computed(() => computeControl((props.game.momentum || []).slice(-10)))

const sharePct = (pair) => {
  const h = Number(pair?.home)
  const a = Number(pair?.away)
  if (!Number.isFinite(h) || !Number.isFinite(a) || h + a <= 0) return null
  return (h / (h + a)) * 100
}

const fmtPct = (v) => (v == null ? '—' : formatPercent(v * 100, 0))

// Pressão (média 5'/10', pico e tooltip de tendência) é exibida como valor
// bruto 0..1 — o usuário aprende que pressão vai de 0 a 1; percentual
// confundiria com share das barras (CONTROLE/C10 são share e ficam em %).
const fmtRaw = (v) => (v == null ? '—' : formatNumber(v, 2))

const derivedRows = computed(() => {
  const p = pressure.value
  const c = control.value
  const c10 = control10.value
  const pos = props.game.stats?.possession || {}
  return [
    {
      label: 'POSSE',
      home: pos.home != null ? `${formatNumber(pos.home, 0)}%` : '—',
      away: pos.away != null ? `${formatNumber(pos.away, 0)}%` : '—',
      pctHome: sharePct(pos),
      hint: null,
    },
    { label: 'CONTROLE', home: fmtPct(c.home), away: fmtPct(c.away), pctHome: sharePct(c), hint: CONTROL_HINT },
    { label: 'C10', home: fmtPct(c10.home), away: fmtPct(c10.away), pctHome: sharePct(c10), hint: C10_HINT },
    {
      label: "PICO 10'",
      home: fmtRaw(p.max10.home),
      away: fmtRaw(p.max10.away),
      pctHome: sharePct(p.max10),
      hint: PICO_HINT,
    },
    {
      label: "PRESSÃO 10'",
      home: fmtRaw(p.mean10.home),
      away: fmtRaw(p.mean10.away),
      pctHome: sharePct(p.mean10),
      hint: null,
    },
    {
      label: "PRESSÃO 5'",
      home: fmtRaw(p.mean5.home),
      away: fmtRaw(p.mean5.away),
      pctHome: sharePct(p.mean5),
      hint: null,
    },
  ]
})

const trends = computed(() => {
  const { mean5, meanTotal } = pressure.value
  const dir = (recent, total) => {
    if (recent == null || total == null) return null
    if (recent > total + TREND_THRESHOLD) return 'up'
    if (recent < total - TREND_THRESHOLD) return 'down'
    return null
  }
  return { home: dir(mean5.home, meanTotal.home), away: dir(mean5.away, meanTotal.away) }
})

const trendTitle = (side) => {
  const p = pressure.value
  const pair =
    side === 'home'
      ? { recent: p.mean5.home, total: p.meanTotal.home }
      : { recent: p.mean5.away, total: p.meanTotal.away }
  if (pair.recent == null || pair.total == null) return ''
  // Mesmo formato das métricas de pressão do card (0..1), não % — consistência
  // com o que o usuário já aprendeu nas linhas PRESSÃO/PICO.
  return `Pressão ${trends.value[side] === 'up' ? 'subindo' : 'caindo'}: últimos 5' (${fmtRaw(pair.recent)}) vs média do jogo (${fmtRaw(pair.total)})`
}

// Constrói a row de uma stat do Flashscore (mesmo shape de antes — extraído
// para reordenar com as linhas de chute sem duplicar a lógica).
const statRow = ([key, label, dec, suffix]) => {
  const pair = props.game.stats?.[key] || {}
  const home = pair.home
  const away = pair.away
  const total = (Number(home) || 0) + (Number(away) || 0)
  return {
    label,
    home: home != null ? `${formatNumber(home, dec)}${suffix}` : '—',
    away: away != null ? `${formatNumber(away, dec)}${suffix}` : '—',
    pctHome: total > 0 ? ((Number(home) || 0) / total) * 100 : null,
    hint: null,
  }
}

// Linhas de chute com perigo: "CHUTES C1–C2" (soma C1+C2 por lado) e "C3"
// (chance média). C4 (sem perigo) não é exibido — decisão do usuário.
// Fonte: shot_tiers do Ticket 0 (acumulado por jogo). Campo ausente (fixture
// antiga/preview) → "—"; zeros → "0" com trilho vazio — política FINALIZAÇÕES:
// a linha nunca some por falta de dado.
const shotTierRows = computed(() => {
  const tiers = props.game.shot_tiers
  const present = tiers != null
  const make = (label, tierKeys, hint) => {
    const pair = sumTiers(tiers, tierKeys)
    const total = pair.home + pair.away
    return {
      label,
      home: present ? `${formatNumber(pair.home, 0)}` : '—',
      away: present ? `${formatNumber(pair.away, 0)}` : '—',
      pctHome: present && total > 0 ? (pair.home / total) * 100 : null,
      hint,
    }
  }
  return [make('CHUTES C1–C2', ['C1', 'C2'], SHOT_C12_HINT), make('C3', ['C3'], SHOT_C3_HINT)]
})

const statRows = computed(() => [
  ...derivedRows.value,
  statRow(['xg', 'XG', 2, '']),
  ...shotTierRows.value,
  ...STAT_LABELS.map(statRow),
])

const odds = computed(() => props.game.odds || {})
const prematch = computed(() => odds.value.prematch || {})

const hasAnyOdds = (o) => [o.home, o.draw, o.away, o.over25, o.btts].some((v) => v != null)
const hasOdds = computed(() => hasAnyOdds(prematch.value))

// Colunas de odds sempre presentes (label + valor empilhados na mesma célula);
// valor ausente vira "-" — assim o grid nunca desalinha por auto-placement.
const oddsColumns = computed(() => [
  { label: 'Casa', value: prematch.value.home },
  { label: 'Empate', value: prematch.value.draw },
  { label: 'Fora', value: prematch.value.away },
  { label: 'O2.5', value: prematch.value.over25 },
  { label: 'BTTS', value: prematch.value.btts },
])

function formatTime(at) {
  return new Date(at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const frontEl = ref(null)
const toast = useToast()

async function captureCard() {
  const node = frontEl.value
  if (!node) return
  // Print sem o glow: remove a classe só durante a captura (o glow é animado
  // via box-shadow e "vaza" para fora do card na imagem). O front face é o
  // alvo — o verso (flip) é irmão no DOM e não entra no subtree.
  const hadGlow = node.classList.contains('alert-recent')
  if (hadGlow) node.classList.remove('alert-recent')
  try {
    const blob = await toBlob(node, {
      pixelRatio: window.devicePixelRatio || 1,
      // Botões de ação (print/Flashscore) não entram no print — o hover do
      // clique ficaria congelado na imagem.
      filter: (n) => !(n instanceof HTMLElement && n.classList.contains('print-hide')),
    })
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        toast.add({ title: 'Print copiado!', color: 'success' })
        return
      } catch {
        // clipboard negada — cai no download abaixo
      }
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scanner-${props.game.id}.png`
    a.click()
    URL.revokeObjectURL(url)
    toast.add({ title: 'Clipboard indisponível — print baixado', color: 'warning' })
  } catch {
    toast.add({ title: 'Não foi possível gerar o print', color: 'error' })
  } finally {
    if (hadGlow) node.classList.add('alert-recent')
  }
}
</script>

<style scoped>
/* Notificação recente (≤5 min): contorno âmbar respirando + selo "Alerta".
   Âmbar de propósito: o teal já é a cor primária do site (estado "em
   chamas"/glow antigo), âmbar diferencia "notificou agora" por cor. */
.alert-recent {
  border-color: rgba(251, 191, 36, 0.85);
  animation: amber-breathe 1.8s ease-in-out infinite;
}

@keyframes amber-breathe {
  0%,
  100% {
    box-shadow:
      0 0 10px rgba(251, 191, 36, 0.25),
      0 0 0 2px rgba(251, 191, 36, 0.6);
  }

  50% {
    box-shadow:
      0 0 26px rgba(251, 191, 36, 0.5),
      0 0 0 2px rgba(251, 191, 36, 0.9);
  }
}

.alert-tag {
  position: absolute;
  top: -11px;
  right: 12px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  background: #fbbf24;
  color: #1c1917;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.03em;
  padding: 3px 10px;
  border-radius: 999px;
  box-shadow: 0 4px 14px rgba(251, 191, 36, 0.35);
  pointer-events: none;
}

/* Destaque de clique vindo do Telegram (highlighted): cometa teal girando
   na borda. Fica no root (sem overflow hidden — a face tem card-shine com
   overflow:hidden e cortaria o anel). */
@property --angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.hl-travel {
  border-color: transparent !important;
}

.hl-travel::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 18px;
  padding: 2.5px;
  z-index: 2;
  pointer-events: none;
  background: conic-gradient(
    from var(--angle),
    transparent 0deg,
    transparent 300deg,
    #2dd4bf 340deg,
    #f4f4f5 355deg,
    #2dd4bf 360deg
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: spin-angle 2.4s linear infinite;
}

@keyframes spin-angle {
  to {
    --angle: 360deg;
  }
}
</style>
