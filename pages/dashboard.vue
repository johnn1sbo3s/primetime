<template>
  <div class="flex flex-col gap-5">
    <page-header title="Bem-vindo ao PrimeTime!" />
    <u-card>
      <template #header>
        <p class="font-semibold">Evolução da banca</p>
      </template>

      <div class="w-full">
        <bankroll-evolution />
      </div>
    </u-card>

    <u-card>
      <template #header>
        <p class="font-semibold">{{ isAfterTime ? 'Resultados de ontem' : 'Resultados de anteontem'}}</p>
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

    <u-card>
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

const yesterday = DateTime.now().minus({ days: 1 }).toFormat('yyyy-MM-dd');
const month = DateTime.now().toFormat('M');
const dayBeforeYersterday = DateTime.now().minus({ days: 2 }).toFormat('yyyy-MM-dd');
let limit = DateTime.now().set({ hour: 10, minute: 15, second: 0, millisecond: 0 });
const isAfterTime = DateTime.now() > limit ? true : false;

let requisitionUrl = `${apiUrl}/daily-results/${dayBeforeYersterday}`;

if (isAfterTime) {
  requisitionUrl = `${apiUrl}/daily-results/${yesterday}`;
}

const { data: yesterdayResults } = await useFetch(requisitionUrl);
const { data: monthResults } = await useFetch(`${apiUrl}/monthly-results/${month}`);

const yesterdayTotal = _find(yesterdayResults.value, { Date: 'Total' });
const monthTotal = _find(monthResults.value, { Date: 'Total' });

const yesterdayMetrics = computed(() => [
  {
    name: 'Profit',
    value: yesterdayTotal.Profit,
    sufix: 'u'
  },
  {
    name: 'Investido',
    value: yesterdayTotal.Responsibility,
    sufix: 'u'
  },
  {
    name: 'ROI',
    value: yesterdayTotal.ROI,
    sufix: ''
  }
]);

const monthMetrics = computed(() => [
  {
    name: 'Profit',
    value: monthTotal.Profit,
    sufix: 'u'
  },
  {
    name: 'Investido',
    value: monthTotal.Responsibility,
    sufix: 'u'
  },
  {
    name: 'ROI',
    value: monthTotal.ROI,
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