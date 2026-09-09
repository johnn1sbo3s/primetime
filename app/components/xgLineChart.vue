<template>
  <div>
    <div
      v-if="!merged.length"
      class="flex h-45 items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-950"
    >
      <span class="text-xs text-zinc-500">aguardando dados de xG</span>
    </div>

    <template v-else>
      <div class="text-2xs flex items-center gap-4 pb-2 font-bold">
        <span class="flex items-center gap-1.5 text-teal-400"
          ><span class="h-2 w-2 rounded-full bg-teal-400"></span> Casa</span
        >

        <span class="flex items-center gap-1.5 text-blue-400"
          ><span class="h-2 w-2 rounded-full bg-blue-500"></span> Fora</span
        >
      </div>

      <ClientOnly>
        <component :is="ChartComp" :chart-data="chartData" :options="chartOptions" class="h-45 w-full" />

        <template #fallback>
          <div class="h-45 w-full rounded-xl bg-zinc-950"></div>
        </template>
      </ClientOnly>

      <div class="mt-3 grid grid-cols-3 gap-2">
        <div class="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-center">
          <div class="text-2xs font-bold tracking-wide text-zinc-500">xG Casa</div>

          <div class="text-sm font-bold text-teal-400">{{ fmt(lastHome) }}</div>
        </div>

        <div class="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-center">
          <div class="text-2xs font-bold tracking-wide text-zinc-500">xG Fora</div>

          <div class="text-sm font-bold text-blue-400">{{ fmt(lastAway) }}</div>
        </div>

        <div class="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-center">
          <div class="text-2xs font-bold tracking-wide text-zinc-500">Diff</div>

          <div class="text-sm font-bold text-zinc-100">{{ fmt(diff) }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ensureChartSetup, lineChartComponent } from '~/utils/chartSetup'
import { formatNumber } from '~/utils/formatNumber'
import { mergeXgSeries } from '~/utils/scannerShots'

ensureChartSetup()

const ChartComp = lineChartComponent()

const props = defineProps({
  history: { type: Array, default: () => [] },
  liveSamples: { type: Array, default: () => [] },
})

// União por minuto: xg do ao vivo vence, mas os shot_events do minuto são
// preservados (histórico + delta do ciclo, com dedup) — ver scannerShots.js.
const merged = computed(() => mergeXgSeries(props.history, props.liveSamples))

const lastHome = computed(() => {
  const m = merged.value
  return m.length ? m[m.length - 1]?.xg_home : null
})
const lastAway = computed(() => {
  const m = merged.value
  return m.length ? m[m.length - 1]?.xg_away : null
})
const diff = computed(() => {
  if (lastHome.value == null || lastAway.value == null) return null
  return lastHome.value - lastAway.value
})

function fmt(v) {
  return v == null ? '—' : formatNumber(v, 2)
}

const chartData = computed(() => {
  const labels = merged.value.map((p) => String(p.minute))
  return {
    labels,
    datasets: [
      {
        label: 'Casa',
        data: merged.value.map((p) => p.xg_home),
        borderColor: '#2dd4bf',
        backgroundColor: 'rgba(45,212,191,0.14)',
        fill: true,
        tension: 0.2,
        pointRadius: 1,
        pointHoverRadius: 7,
        borderWidth: 1.8,
      },
      {
        label: 'Fora',
        data: merged.value.map((p) => p.xg_away),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.14)',
        fill: true,
        tension: 0.2,
        pointRadius: 1,
        pointHoverRadius: 7,
        borderWidth: 1.8,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  interaction: { intersect: false, mode: 'index' },
  scales: {
    x: {
      grid: { color: '#27272a' },
      ticks: { color: '#a1a1aa', maxTicksLimit: 6 },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      grid: { color: '#27272a' },
      ticks: { color: '#a1a1aa' },
      border: { display: false },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#18181b',
      titleColor: '#fafafa',
      bodyColor: '#d4d4d8',
      borderColor: '#27272a',
      borderWidth: 1,
      padding: 8,
    },
  },
}
</script>
