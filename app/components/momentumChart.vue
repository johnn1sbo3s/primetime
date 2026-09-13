<template>
  <div class="relative">
    <svg
      v-if="bars.length"
      viewBox="0 0 640 214"
      preserveAspectRatio="none"
      role="img"
      aria-label="Gráfico de momentum"
      class="w-full"
    >
      <line x1="0" y1="56" x2="640" y2="56" stroke="#3f3f46" stroke-width="1" />

      <template v-for="item in laneItems" :key="item.group.half + ':' + item.group.minute">
        <rect :x="item.x - 13" y="11" width="26" height="30" rx="8" fill="#27272a" />

        <line
          v-if="item.leaderTo != null"
          :x1="item.x"
          y1="40"
          :x2="item.leaderTo"
          y2="57"
          stroke="#a1a1aa"
          stroke-width="1.2"
        />

        <g
          v-if="item.group.winner === 'shot'"
          class="lane-shot"
          tabindex="0"
          @mouseenter="activeKey = minKey(item.group)"
          @mouseleave="activeKey = null"
          @focus="activeKey = minKey(item.group)"
          @blur="activeKey = null"
          @click.stop="activeKey = activeKey === minKey(item.group) ? null : minKey(item.group)"
        >
          <circle
            :cx="item.x"
            cy="26"
            r="10"
            fill="#27272a"
            :stroke="teamColor(item.group.shots[0].team)"
            stroke-width="2.5"
          />

          <text
            :x="item.x"
            y="26"
            text-anchor="middle"
            dominant-baseline="central"
            font-size="14"
            font-weight="bold"
            fill="#ffffff"
          >
            {{ item.group.shots[0].tier.slice(1) }}
          </text>
        </g>

        <g
          v-else-if="item.group.winner === 'goal'"
          class="lane-goal"
          tabindex="0"
          @mouseenter="activeKey = minKey(item.group)"
          @mouseleave="activeKey = null"
          @focus="activeKey = minKey(item.group)"
          @blur="activeKey = null"
          @click.stop="activeKey = activeKey === minKey(item.group) ? null : minKey(item.group)"
        >
          <circle :cx="item.x" cy="26" r="10" fill="#f4f4f5" />

          <path :d="BALL_PATH" :fill="teamColor(item.group.goal.team)" :transform="ballTransform(item.x)" />
        </g>

        <g
          v-else
          class="lane-alert"
          tabindex="0"
          @mouseenter="activeKey = minKey(item.group)"
          @mouseleave="activeKey = null"
          @focus="activeKey = minKey(item.group)"
          @blur="activeKey = null"
          @click.stop="activeKey = activeKey === minKey(item.group) ? null : minKey(item.group)"
        >
          <path :d="diamondD(item.x)" fill="none" stroke="#fbbf24" stroke-width="2" />
        </g>

        <g v-if="item.group.extra > 0" class="lane-more">
          <circle :cx="item.x + 19" cy="14" r="9" fill="#52525b" />

          <text
            :x="item.x + 19"
            y="14"
            text-anchor="middle"
            dominant-baseline="central"
            font-size="11"
            font-weight="bold"
            fill="#ffffff"
          >
            +{{ item.group.extra }}
          </text>
        </g>
      </template>

      <line
        v-if="minute != null"
        class="lane-live"
        :x1="liveX"
        y1="0"
        :x2="liveX"
        y2="166"
        stroke="#ef4444"
        stroke-width="2"
      />

      <circle v-if="minute != null" :cx="liveX" cy="6" r="6" fill="#ef4444" />

      <g transform="translate(0 56)">
        <rect x="0" y="0" :width="W1" height="110" fill="#27272a" />

        <rect :x="P2" y="0" :width="W2" height="110" fill="#27272a" />

        <rect x="0" y="33" width="640" height="22" fill="#fafafa" opacity="0.05" />

        <rect x="0" y="55" width="640" height="22" fill="#fafafa" opacity="0.05" />

        <line class="lane-threshold" x1="0" y1="33" x2="640" y2="33" stroke="#52525b" stroke-width="1" />

        <line class="lane-threshold" x1="0" y1="77" x2="640" y2="77" stroke="#52525b" stroke-width="1" />

        <line x1="0" y1="55" x2="640" y2="55" stroke="#52525b" stroke-width="1.5" />

        <rect
          v-for="b in bars"
          :key="`${halfOf(b)}-${b.minute}`"
          class="momentum-bar"
          :x="barX(b)"
          :y="barY(b)"
          width="5"
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
      v-if="activeGroup"
      class="lane-pop absolute top-0 left-1/2 z-10 max-w-60 -translate-x-1/2 rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-100 shadow-lg"
    >
      <p class="font-bold">{{ activeGroup.minute }}'</p>

      <p v-if="activeGroup.goal">{{ goalLabel(activeGroup.goal) }}</p>

      <p v-for="(s, i) in activeGroup.shots" :key="'shot' + i">{{ shotLabel(s) }}</p>

      <p v-for="(a, i) in activeGroup.alerts" :key="'alert' + i">{{ a.label }}</p>
    </div>
  </div>
</template>

<script setup>
import { BALL_PATH, groupIncidents, layoutLane } from '~/utils/scannerIncidents'

const props = defineProps({
  bars: { type: Array, default: () => [] },
  goals: { type: Array, default: () => [] },
  shots: { type: Array, default: () => [] },
  notifications: { type: Array, default: () => [] },
  minute: { type: Number, default: null },
})

// Geometria do gráfico do Flashscore (viewBox 640x158, centro em 55):
// mesma moldura — barra de valor 1.0 encosta no topo, como lá.
const CENTER = 55

// Ticks fixos por tempo (posição relativa ao painel).
const TICKS = [
  { half: 1, minute: 15 },
  { half: 1, minute: 30 },
  { half: 1, minute: 45 },
  { half: 2, minute: 50 },
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

// Faixa de incidentes (y 0..56): grupos por minuto via util da Task 1,
// x verdadeiro pelo barX do grupo. Nome consumido pela Task 3 (popover).
const laneItems = computed(() =>
  layoutLane(groupIncidents({ shots: props.shots, goals: props.goals, notifications: props.notifications }), (g) =>
    barX({ minute: g.minute, half: g.half }),
  ),
)

const liveX = computed(() => {
  if (props.minute == null) return null
  return barX({ minute: props.minute, half: props.minute > 45 ? 2 : 1 })
})

function teamColor(team) {
  return team === 'home' ? '#2dd4bf' : '#3b82f6'
}

// Bola Packball (viewBox 512) centrada em (x, 26) com ~21px de diâmetro.
const BALL_S = 17 / 416
function ballTransform(x) {
  const offset = 26 - 256 * BALL_S
  return `translate(${x - 256 * BALL_S} ${offset}) scale(${BALL_S})`
}

function diamondD(x) {
  return `M ${x} 16 L ${x + 10} 26 L ${x} 36 L ${x - 10} 26 Z`
}

// Popover do minuto: chave half:minuto do grupo ativo.
// Gol mostra só o time, nunca o jogador.
const activeKey = ref(null)
const minKey = (g) => g.half + ':' + g.minute
const activeGroup = computed(
  () => laneItems.value.map((i) => i.group).find((g) => minKey(g) === activeKey.value) || null,
)
function goalLabel(goal) {
  return goal.team === 'home' ? 'Gol — casa' : 'Gol — fora'
}
function shotLabel(s) {
  return s.label || `Chance ${s.tier}`
}
</script>

<style scoped>
.lane-threshold {
  stroke-dasharray: 6 5;
}

.lane-live {
  stroke-dasharray: 6 4;
}
</style>
