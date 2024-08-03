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
			:loading="status === 'pending'"
			:model-value="onlyChosenModels"
			@click="onlyChosenModels = !onlyChosenModels"
		  />
		</div>

		<p>Apenas modelos selecionados</p>
	  </div>
	</div>

	<u-skeleton
	  v-if="status === 'pending'"
	  class="w-full h-[510px]"
	/>

	<u-card v-else>
	  <template #header>
		<p class="font-semibold">Evolução da banca</p>
	  </template>

	  <div class="w-full">
		<bankroll-evolution
		  :model-value="status === 'pending'"
		  :bankroll-data="bankrollData"
		/>
	  </div>
	</u-card>

	<u-skeleton
	  v-if="status === 'pending'"
	  class="w-full h-[330px]"
	/>

	<u-card v-else>
	  <template #header>
		<p class="font-semibold">{{ !yesterdayDataError ? `Resultados de ontem - ${formatDate(yesterday)}` : `Resultados de anteontem - ${formatDate(dayBeforeYesterday)}`}}</p>
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
	  v-if="status === 'pending'"
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
import { formatDate } from '~/utils/formatDate';
import { useStore } from '~/stores/useStore';

const runtimeConfig = useRuntimeConfig();
const apiUrl = runtimeConfig.public.API_URL;
const store = useStore();

const month = DateTime.now().toFormat('M');
const yesterday = DateTime.now().minus({ days: 1 }).toFormat('yyyy-MM-dd');
const dayBeforeYesterday = DateTime.now().minus({ days: 2 }).toFormat('yyyy-MM-dd');
const onlyChosenModels = ref(true);

const bankrollData = ref({});
const yesterdayData = ref({});
const dayBeforeYesterdayData = ref({});
const monthData = ref({});
const status = ref('pending');
const yesterdayDataError = ref(false);

const lastFetchOverTwentyHours = () => {
	const twentyHours = 20 * 60 * 60 * 1000;
	const currentDate = new Date();
	const lastFetchDate = new Date(store.getLastFetch);
	const lastFilteredFetchDate = new Date(store.getFilteredLastFetch);
	const timeDifference = ref(0);

	if(onlyChosenModels.value) {
		timeDifference.value = currentDate.getTime() - lastFilteredFetchDate.getTime();
	} else {
		timeDifference.value = currentDate.getTime() - lastFetchDate.getTime();
	}

	return timeDifference > twentyHours;
};

const fetchData = async () => {
	try {
		status.value = 'pending';
		const [
		bankrollResponse,
		yesterdayResponse,
		dayBeforeYesterdayResponse,
		monthResponse,
		] = await Promise.all([
		useFetch(`${apiUrl}/bankroll-evolution`, {
			params: { filtered: onlyChosenModels },
		}),
		useFetch(`${apiUrl}/daily-results/${yesterday}`, {
			params: { filtered: onlyChosenModels },
		}),
		useFetch(`${apiUrl}/daily-results/${dayBeforeYesterday}`, {
			params: { filtered: onlyChosenModels },
		}),
		useFetch(`${apiUrl}/monthly-results/${month}`, {
			params: { filtered: onlyChosenModels },
		}),
		]);

		bankrollData.value = bankrollResponse.data.value;
		store.setBankrollData(bankrollResponse.data.value, onlyChosenModels.value);

		yesterdayDataError.value = yesterdayResponse.error?.value || null;
		yesterdayData.value = yesterdayResponse.data.value;
		store.setYesterdayData(yesterdayResponse.data.value, onlyChosenModels.value);

		dayBeforeYesterdayData.value = dayBeforeYesterdayResponse.data.value;
		store.setDayBeforeYesterdayData(dayBeforeYesterdayResponse.data.value, onlyChosenModels.value);

		monthData.value = monthResponse.data.value;
		store.setMonthData(monthResponse.data.value, onlyChosenModels.value);

		store.setLastFetch(onlyChosenModels.value);

		status.value = 'success';
	} catch (error) {
		console.error('Error fetching data:', error);
	}
};

fetchData();

// if (onlyChosenModels.value) {
// 	if (!!store.getFilteredMonthData || lastFetchOverTwentyHours()) {
// 		console.log('fetching filtered data...');
// 		fetchData();
// 	} else {
// 		status.value = 'pending';
// 		bankrollData.value = store.getFilteredBankrollData;
// 		yesterdayData.value = store.getFilteredYesterdayData;
// 		dayBeforeYesterdayData.value = store.getFilteredDayBeforeYesterdayData;
// 		monthData.value = store.getFilteredMonthData;
// 		status.value = 'success';
// 	}
// } else {
// 	if (!store.monthData || !store.dayBeforeYesterdayData || lastFetchOverTwentyHours()) {
// 	} else {status.value = 'pending';
// 		bankrollData.value = store.getBankrollData;
// 		yesterdayData.value = store.getYesterdayData;
// 		dayBeforeYesterdayData.value = store.getDayBeforeYesterdayData;
// 		monthData.value = store.getMonthData;
// 		status.value = 'success';
// 	}
// }

const yesterdayResults = computed(() => {
  return yesterdayData?.value ? yesterdayData.value : dayBeforeYesterdayData.value;
});

const monthResults = computed(() => {
  return monthData.value;
});

const yesterdayTotal = computed(() => {
  return _find(yesterdayResults.value, { Date: 'Total' });
})

const monthTotal = computed(() => {
  return _find(monthResults.value, { Date: 'Total' });
})

const yesterdayMetrics = computed(() => {
  return [
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
  ]
});

const monthMetrics = computed(() => {
  return [
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
  ]
});

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

watch(onlyChosenModels, () => {
  fetchData();
});

</script>

<style lang="scss" scoped></style>