<template>
  <div class="flex flex-col gap-5">
    <div class="flex justify-between items-end">
      <page-header title="Bem-vindo ao PrimeTime!" />
      <div class="flex gap-2">
        <div class="inline-block align-middle">
          <UToggle
            size="lg"
            on-icon="i-heroicons-check-20-solid"
            off-icon="i-heroicons-x-mark-20-solid"
            :loading="pending"
            :model-value="onlyChosenModels"
            @click="onlyChosenModels = !onlyChosenModels"
          />
        </div>

        <p>Apenas modelos selecionados</p>
      </div>
    </div>

    <u-card>
      <template #header>
        <p class="font-semibold">Evolução da banca</p>
      </template>

      <div class="w-full">
        <bankroll-evolution :model-value="onlyChosenModels" />
      </div>
    </u-card>

    <u-skeleton
      v-if="pending"
      class="w-full h-[330px]"
    />

    <u-card v-else>
      <template #header>
        <p class="font-semibold">{{ !error ? 'Resultados de ontem' : 'Resultados de anteontem'}}</p>
      </template>

      <div class="flex gap-5 w-full">
        <yesterday-metrics-card
          :items="yesterdayMetrics"
        />

        <ranking-models
          :title="'Top 3 modelos'"
          :items="top3YesterdayModels"
          :all-results-data="yesterdayResults"
        />

        <yesterday-details-card
          :number-bets="yesterdayTotal.Num_Bets"
          :number-models="yesterdayTotal.Method"
          :positive-models="positiveYesterdayModels"
        />
      </div>
    </u-card>

    <u-skeleton
      v-if="pending"
      class="w-full h-[330px]"
    />

    <u-card v-else>
      <template #header>
        <p class="font-semibold">Resultados do mês</p>
      </template>

      <div class="flex gap-5 w-full">
        <yesterday-metrics-card
          :items="monthMetrics"
        />

        <ranking-models
          :title="'Top 3 modelos'"
          :items="top3MonthModels"
          :all-results-data="monthResults"
        />

        <yesterday-details-card
          :number-bets="monthTotal.Num_Bets"
          :number-models="monthTotal.Method"
          :positive-models="positiveMonthModels"
        />
      </div>
    </u-card>
  </div>
</template>

<script setup>
import { DateTime } from 'luxon';

const runtimeConfig = useRuntimeConfig();
const apiUrl = runtimeConfig.public.API_URL;

const month = DateTime.now().toFormat('M');
const yesterday = DateTime.now().minus({ days: 1 }).toFormat('yyyy-MM-dd');
const dayBeforeYersterday = DateTime.now().minus({ days: 2 }).toFormat('yyyy-MM-dd');
const onlyChosenModels = ref(true);
const yesterdayResults = ref({});
const monthResults = ref({});

const { data: yesterdayData, pending, error } = await useLazyFetch(`${apiUrl}/daily-results/${yesterday}`, {
  params: {
    filtered: onlyChosenModels,
  },
});
yesterdayResults.value = yesterdayData.value;

if (yesterdayResults.value == null) {
  const { data: yesterdayData, pending } = await useLazyFetch(`${apiUrl}/daily-results/${dayBeforeYersterday}`, {
    params: {
      filtered: onlyChosenModels,
    },
  });
  yesterdayResults.value = yesterdayData.value;
};

const { data: monthData } = await useFetch(`${apiUrl}/monthly-results/${month}`, {
  params: {
    filtered: onlyChosenModels,
  },
});

monthResults.value = monthData.value;

const yesterdayTotal = computed(() => _find(yesterdayResults.value, { Date: 'Total' }));
const monthTotal = computed(() => _find(monthResults.value, { Date: 'Total' }));

const yesterdayMetrics = computed(() => [
  {
    name: 'Profit',
    value: yesterdayTotal.value.Profit,
    sufix: 'u'
  },
  {
    name: 'Investido',
    value: yesterdayTotal.value.Responsibility,
    sufix: 'u'
  },
  {
    name: 'ROI',
    value: yesterdayTotal.value.ROI,
    sufix: ''
  }
]);

const monthMetrics = computed(() => [
  {
    name: 'Profit',
    value: monthTotal.value.Profit,
    sufix: 'u'
  },
  {
    name: 'Investido',
    value: monthTotal.value.Responsibility,
    sufix: 'u'
  },
  {
    name: 'ROI',
    value: monthTotal.value.ROI,
    sufix: ''
  }
]);

const top3YesterdayModels = computed(() => {
  let removedLast = yesterdayResults.value.slice(0, -1);
  let sorted = _filter(removedLast).sort((a, b) => {
    return b.Profit - a.Profit
  }).slice(0, 3);

  return [
    {
      id: sorted[0].Method_Id,
      name: sorted[0].Method,
      profit: sorted[0].Profit,
    },
    {
      id: sorted[1].Method_Id,
      name: sorted[1].Method,
      profit: sorted[1].Profit,
    },
    {
      id: sorted[2].Method_Id,
      name: sorted[2].Method,
      profit: sorted[2].Profit,
    },
  ]
})

const top3MonthModels = computed(() => {
  let removedLast = monthResults.value.slice(0, -1);
  let sorted = _filter(removedLast).sort((a, b) => {
    return b.Profit - a.Profit
  }).slice(0, 3);

  return [
    {
      id: sorted[0].Method_Id,
      name: sorted[0].Method,
      profit: sorted[0].Profit,
    },
    {
      id: sorted[1].Method_Id,
      name: sorted[1].Method,
      profit: sorted[1].Profit,
    },
    {
      id: sorted[2].Method_Id,
      name: sorted[2].Method,
      profit: sorted[2].Profit,
    },
  ]
})

const positiveYesterdayModels = computed(() => {
  let models = _filter(yesterdayResults.value, item => item.Date != 'Total' );
  let positive = _filter(models, item => item.Profit > 0);
  return positive.length;
});

const positiveMonthModels = computed(() => {
  let models = _filter(monthResults.value, item => item.Date != 'Total' );
  let positive = _filter(models, item => item.Profit > 0);
  return positive.length;
});

</script>

<style lang="scss" scoped></style>