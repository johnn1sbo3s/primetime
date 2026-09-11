<script setup>
import { DateTime } from 'luxon'
import { useDevice } from '../../../node_modules/@nuxtjs/device/dist/runtime/composables/useDevice'

const route = useRoute()

// --- Models list (with playedOn flag for the green dot) ---
const yesterdayIso = DateTime.now().minus({ days: 1 }).toFormat('yyyy-MM-dd')
const { data: modelsPayload, status: statusModels } = await useModelsList({
  playedOn: yesterdayIso,
  metricsOnly: true,
})
const listModels = computed(() => (modelsPayload.value?.items || []).map((m) => m.name))
const listModelItems = computed(() =>
  listModels.value.map((rawId) => ({
    label: modelNameToNaturalName(rawId),
    value: rawId,
  })),
)
const playedOnSet = computed(() => {
  const set = new Set()
  for (const m of modelsPayload.value?.items || []) {
    if (m.playedOn) set.add(m.name)
  }
  return set
})

const chosenModel = ref(listModels.value[0] || null)

if (route.params.model && listModels.value.length && listModels.value.includes(route.params.model)) {
  chosenModel.value = route.params.model
}

const chosenModelId = computed(() => (chosenModel.value ? modelNameToIdName(chosenModel.value) : null))
const chartByDay = ref(false)

// --- Per-model data: each composable re-runs when chosenModelId changes ---
const { data: modelData, status: statusModel } = useModelById(chosenModelId)
const { data: dailyResults, pending: dailyResultsPending } = useModelResults(chosenModelId, ref('daily'))
const { data: monthlyResults } = useModelResults(chosenModelId, ref('monthly'))

// --- Bets pagination ---
const device = useDevice()
const betsPage = ref(1)
const betsSize = ref(device.isMobileOrTablet ? 20 : 100)
const betsSort = ref('Date')
const betsOrder = ref('desc')

const { data: betsPayload } = useModelBets(chosenModelId, {
  page: betsPage,
  size: betsSize,
  sort: betsSort,
  order: betsOrder,
})
const betsItems = computed(() => betsPayload.value?.items || [])
const betsTotal = computed(() => betsPayload.value?.total || 0)
const betsTotalPages = computed(() => Math.max(1, Math.ceil(betsTotal.value / betsSize.value)))

watch(chosenModelId, () => {
  betsPage.value = 1
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <PageHeader
      title="Performance dos modelos"
      description="Acompanhe o desempenho e as métricas de cada modelo"
      class="mb-3"
    >
      <template #right>
        <UButton
          to="/performance/trading-models"
          color="primary"
          variant="soft"
          size="sm"
          trailing-icon="i-lucide-arrow-right"
        >
          Trading Models
        </UButton>
      </template>
    </PageHeader>

    <div class="flex gap-5">
      <USelectMenu
        v-model="chosenModel"
        class="w-full max-w-89"
        searchable
        placeholder="Selecione um modelo"
        :items="listModelItems"
        value-key="value"
        :loading="statusModels === 'pending'"
      >
        <template #item-label="{ item }">
          <div class="my-1 flex items-center">
            <UTooltip v-if="playedOnSet.has(item.value)" text="O modelo possui atualização de resultados de ontem">
              <span class="mr-2 h-2 w-2 rounded-full bg-teal-500" />
            </UTooltip>

            <span>{{ item.label }}</span>
          </div>
        </template>
      </USelectMenu>
    </div>

    <PerformancePageSkeleton v-if="statusModel === 'pending'" />

    <DataErrorCard v-else-if="!modelData" message="Não foi possível carregar as métricas do modelo" />

    <template v-else>
      <div class="grid w-full grid-cols-1 gap-3 xl:grid-cols-10">
        <div id="metrics-cards" class="order-2 flex flex-col gap-3 xl:order-1 xl:col-span-3">
          <MetricsCard :metrics-data="modelData.metrics.val" :card-title="'Métricas de validação'" />

          <MetricsCard
            :metrics-data="modelData.metrics.real"
            :compare-with="modelData.metrics.val"
            :card-title="'Métricas de jogos reais'"
          />
        </div>

        <PerformanceChartCard
          v-model:chart-by-day="chartByDay"
          :chosen-model-id="chosenModelId"
          :daily-results="dailyResults"
          :daily-results-pending="dailyResultsPending"
        />
      </div>

      <StatisticalSignificanceCard :stats="modelData.metrics.statisticalSignificance" />

      <BlockMetricsPanel :metrics-total="modelData.metrics.total" :blocks-history="modelData.blocksHistory" />

      <ResultsTablesGrid :monthly-results="monthlyResults" :daily-results="dailyResults" />

      <BetsTableCard
        v-model:page="betsPage"
        :bets-items="betsItems"
        :bets-total="betsTotal"
        :bets-total-pages="betsTotalPages"
        :bets-size="betsSize"
      />
    </template>
  </div>
</template>
