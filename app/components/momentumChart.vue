<template>
  <div class="relative">
    <svg
      v-if="bars.length"
      viewBox="0 0 640 252"
      preserveAspectRatio="none"
      role="img"
      aria-label="Gráfico de momentum"
      class="w-full"
    >
      <line x1="0" y1="56" x2="640" y2="56" stroke="#3f3f46" stroke-width="1" />

      <template v-for="lane in lanes" :key="lane.key">
        <template v-for="item in lane.items" :key="trackKey(item)">
          <g
            v-if="item.kind === 'shots' && item.shownShot"
            class="lane-shot"
            tabindex="0"
            @mouseenter="activeKey = trackKey(item)"
            @mouseleave="activeKey = null"
            @focus="activeKey = trackKey(item)"
            @blur="activeKey = null"
            @click.stop="activeKey = activeKey === trackKey(item) ? null : trackKey(item)"
          >
            <circle :cx="item.x" :cy="lane.cy" r="14" fill="transparent" />

            <circle
              :cx="item.x"
              :cy="lane.cy"
              r="10"
              fill="#27272a"
              :stroke="teamColor(item.team)"
              stroke-width="2.5"
            />

            <text
              :x="item.x"
              :y="lane.cy"
              text-anchor="middle"
              dominant-baseline="central"
              font-size="14"
              font-weight="bold"
              fill="#ffffff"
            >
              {{ item.shownShot.tier.slice(1) }}
            </text>
          </g>

          <g
            v-else-if="item.kind === 'goal'"
            class="lane-goal"
            tabindex="0"
            @mouseenter="activeKey = trackKey(item)"
            @mouseleave="activeKey = null"
            @focus="activeKey = trackKey(item)"
            @blur="activeKey = null"
            @click.stop="activeKey = activeKey === trackKey(item) ? null : trackKey(item)"
          >
            <circle :cx="item.x" :cy="lane.cy" r="14" fill="transparent" />

            <circle :cx="item.x" :cy="lane.cy" r="10" fill="#f4f4f5" />

            <path :d="BALL_PATH" :fill="teamColor(item.team)" :transform="ballTransform(item.x, lane.cy)" />
          </g>

          <g
            v-else
            class="lane-alert"
            tabindex="0"
            @mouseenter="activeKey = trackKey(item)"
            @mouseleave="activeKey = null"
            @focus="activeKey = trackKey(item)"
            @blur="activeKey = null"
            @click.stop="activeKey = activeKey === trackKey(item) ? null : trackKey(item)"
          >
            <circle :cx="item.x" :cy="lane.cy" r="14" fill="transparent" />

            <path :d="diamondD(item.x, lane.cy)" fill="#fbbf24" />
          </g>

          <g v-if="item.extra > 0" class="lane-more">
            <circle :cx="item.x + 11" :cy="lane.cy + lane.badgeDir * 11" r="9" fill="#52525b" />

            <text
              :x="item.x + 11"
              :y="lane.cy + lane.badgeDir * 11"
              text-anchor="middle"
              dominant-baseline="central"
              font-size="11"
              font-weight="bold"
              fill="#ffffff"
            >
              +{{ item.extra }}
            </text>
          </g>
        </template>
      </template>

      <line x1="0" y1="196" x2="640" y2="196" stroke="#3f3f46" stroke-width="1" />

      <g transform="translate(0 56)">
        <rect x="0" y="0" :width="W1" height="110" fill="#27272a" />

        <rect :x="P2" y="0" :width="W2" height="110" fill="#27272a" />

        <rect x="0" y="0" width="640" height="33" fill="#fafafa" opacity="0.05" />

        <rect x="0" y="77" width="640" height="33" fill="#fafafa" opacity="0.05" />

        <line class="lane-threshold" x1="0" y1="33" x2="640" y2="33" stroke="#52525b" stroke-width="1" />

        <line class="lane-threshold" x1="0" y1="77" x2="640" y2="77" stroke="#52525b" stroke-width="1" />

        <line x1="0" y1="55" x2="640" y2="55" stroke="#52525b" stroke-width="1.5" />

        <rect
          v-for="b in bars"
          :key="`${halfOf(b)}-${b.minute}`"
          class="momentum-bar"
          :x="barX(b)"
          :y="barY(b)"
          width="6"
          :height="barHeight(b)"
          rx="1.5"
          :fill="Number(b.home) > 0 ? '#2dd4bf' : '#3b82f6'"
          opacity="0.85"
        />

        <template v-for="t in TICKS" :key="`${t.half}-${t.minute}`">
          <line :x1="tickX(t)" y1="51" :x2="tickX(t)" y2="59" stroke="#3f3f46" />

          <text :x="Math.min(tickX(t), 620)" y="135" font-size="18" fill="#52525b" text-anchor="middle">
            {{ t.minute }}'
          </text>
        </template>
      </g>
    </svg>

    <p v-else class="py-6 text-center text-xs text-zinc-500">aguardando dados do gráfico</p>

    <div
      v-if="activeTrack"
      class="lane-pop pointer-events-none absolute z-10 max-w-60 -translate-x-1/2 rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-100 shadow-lg"
      :style="{ left: popLeft, top: popTop, bottom: popBottom }"
    >
      <template v-for="g in activeTrack.groups" :key="g.half + ':' + g.minute">
        <p v-if="g.goal">
          <span class="font-bold">{{ g.minute }}'</span> Gol
        </p>

        <p v-for="(s, i) in g.shots" :key="'shot' + i">
          <span class="font-bold">{{ g.minute }}'</span> {{ shotRow(s) }}
        </p>

        <p v-for="(a, i) in g.alerts" :key="'alert' + i">
          <span class="font-bold">{{ g.minute }}'</span> {{ a.label }}
        </p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { BALL_PATH, buildTracks, snapShotsToGoals } from '~/utils/scannerIncidents'

const props = defineProps({
  bars: { type: Array, default: () => [] },
  goals: { type: Array, default: () => [] },
  shots: { type: Array, default: () => [] },
  notifications: { type: Array, default: () => [] },
})

// Geometria do gráfico do Flashscore (viewBox 640x158, centro em 55):
// mesma moldura — barra de valor 1.0 encosta no topo, como lá.
const CENTER = 55

// Ticks fixos por tempo (posição relativa ao painel).
const TICKS = [
  { half: 1, minute: 15 },
  { half: 1, minute: 30 },
  { half: 1, minute: 45 },
  { half: 2, minute: 60 },
  { half: 2, minute: 75 },
  { half: 2, minute: 90 },
]

// Painéis flexíveis: largura proporcional à duração real de cada tempo
// (45' + acréscimo). h1Len/h2Len derivam do maior minuto observado por half
// nas props (bars + goals), com mínimo 45 (jogo ao vivo — divisor estável)
// e clamp em 50 (backend clampado). Sem `half` (snapshot antigo na janela de
// deploy) mantém o mapeamento legado contínuo no painel 1, h2Len = 45.
// GAP: vão vazio entre os tempos (estilo Flashscore) — os dois painéis têm o
// mesmo fundo zinc-800 e a separação vem do espaço vazio, não de linha/cor.
const GAP = 8
function halfOf(item) {
  return Number(item.half) === 2 ? 2 : 1
}

function halfMaxMinute(half, items) {
  return items.reduce((max, it) => {
    if (halfOf(it) !== half) return max
    const m = (Number(it.minute) || 0) + (Number(it.stoppage_time) || 0)
    return Math.max(max, m)
  }, 0)
}

const h1Len = computed(() => Math.min(50, Math.max(45, halfMaxMinute(1, props.bars), halfMaxMinute(1, props.goals))))
const h2Len = computed(() =>
  Math.min(50, Math.max(45, halfMaxMinute(2, props.bars) - 45, halfMaxMinute(2, props.goals) - 45)),
)
const STEP = computed(() => (640 - GAP) / (h1Len.value + h2Len.value))
const W1 = computed(() => h1Len.value * STEP.value)
const W2 = computed(() => h2Len.value * STEP.value)
// Start do 2º painel: após o painel 1 + o gap.
const P2 = computed(() => W1.value + GAP)

// Minuto relativo ao painel: o 2º tempo recomeça em 1 (46' -> 1). Sem `half`
// mantém o mapeamento legado contínuo. Clamp só no relativo do 2º painel:
// gol de acréscimo longo (90+6' -> rel 51) estoura o viewBox.
function panelMinute(item) {
  const m = Number(item.minute) || 0
  if (halfOf(item) !== 2) return m
  return Math.min(m - 45, 50)
}

function barX(item) {
  return (halfOf(item) === 2 ? P2.value : 0) + (panelMinute(item) - 1) * STEP.value
}

function tickX(t) {
  const rel = t.half === 2 ? t.minute - 45 : t.minute
  return (t.half === 2 ? P2.value : 0) + (rel - 1) * STEP.value
}

function barHeight(b) {
  return Math.max(Number(b.home) || 0, Number(b.away) || 0) * 55
}

function barY(b) {
  return Number(b.home) > 0 ? CENTER - barHeight(b) : CENTER
}

// Quatro trilhas: shots/gol da casa em cima, gol/shots de fora embaixo
// (gol sempre colado no gráfico). x exato pelo barX; vizinhos da mesma
// trilha fundem (popover lista os minutos fundidos).
const lanes = computed(() => {
  const tracks = buildTracks(
    { shots: snapShotsToGoals(props.shots, props.goals), goals: props.goals, notifications: props.notifications },
    props.bars,
    (g) => barX({ minute: g.minute, half: g.half }),
  )
  const of = (team, kind) => tracks.filter((t) => t.team === team && t.kind === kind)
  return [
    { key: 'sH', cy: 20, badgeDir: -1, items: of('home', 'shots') },
    { key: 'gH', cy: 44, badgeDir: -1, items: of('home', 'goal') },
    { key: 'gA', cy: 208, badgeDir: 1, items: of('away', 'goal') },
    { key: 'sA', cy: 232, badgeDir: 1, items: of('away', 'shots') },
  ]
})
const laneItems = computed(() => lanes.value.flatMap((l) => l.items))
const trackKey = (t) => t.half + ':' + t.minute + ':' + t.team + ':' + t.kind

function teamColor(team) {
  return team === 'home' ? '#2dd4bf' : '#3b82f6'
}

// Bola Packball (viewBox 512) centrada em (x, 26) com ~21px de diâmetro.
const BALL_S = 17 / 416
function ballTransform(x, cy) {
  return `translate(${x - 256 * BALL_S} ${cy - 256 * BALL_S}) scale(${BALL_S})`
}

function diamondD(x, cy) {
  return `M ${x} ${cy - 10} L ${x + 10} ${cy} L ${x} ${cy + 10} L ${x - 10} ${cy} Z`
}

// Popover da trilha: lista todos os minutos fundidos no item.
// Gol mostra só o time, nunca o jogador.
const activeKey = ref(null)
const activeTrack = computed(() => laneItems.value.find((i) => trackKey(i) === activeKey.value) || null)
// Popover ancorado no marcador (clamp pra não vazar do card).
const popLeft = computed(() => {
  if (!activeTrack.value) return '50%'
  const pct = (activeTrack.value.x / 640) * 100
  return Math.min(Math.max(pct, 30), 70) + '%'
})
// Faixa de cima: popover abaixo dos marcadores; faixa de baixo: acima.
const popTop = computed(() => (activeTrack.value && activeTrack.value.team !== 'home' ? 'auto' : '20%'))
const popBottom = computed(() => (activeTrack.value && activeTrack.value.team !== 'home' ? '18%' : 'auto'))
function shotRow(s) {
  const xg = Number.isFinite(Number(s.xg_delta)) ? ` - xG: ${Number(s.xg_delta).toFixed(2)}` : ''
  return `Chute ${s.tier}${xg}`
}
</script>

<style scoped>
.lane-threshold {
  stroke-dasharray: 6 5;
}
</style>
