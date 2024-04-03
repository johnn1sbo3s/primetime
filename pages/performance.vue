<template>
  <div class="flex flex-col gap-5">
    <div class="flex justify-between">
      <div class="flex gap-5">
        <h1 class="text-2xl font-semibold align-middle">
          Performance dos modelos
        </h1>
      </div>
    </div>
    <div class="flex gap-5">
      <div class="w-1/5">
        <p class="text-sm mb-0.5">Selecione um modelo</p>
        <USelectMenu
          searchable
          searchable-placeholder="Pesquise por um modelo"
          placeholder="Selecione um modelo"
          :options="listModels"
          v-model:model-value="chosenModel"
        />
      </div>
    </div>
    <div class="w-full gap-4 flex">
      <div class="w-2/5">
        <UCard
          class="mb-3 hover:outline hover:outline-green-300 hover:outline-1"
        >
          <div class="flex flex-col">
            <p class="font-semibold">Métricas de validação</p>
            <div class="font-medium text-sm">
              <div class="grid grid-cols-3 gap-2 my-4">
                <div class="flex gap-1">
                  <p class="font-semibold">Profit:</p>
                  <p>{{ valData.plb.toFixed(2) }}</p>
                </div>
                <div class="flex gap-1">
                  <p class="font-semibold">ROI:</p>
                  <p>{{ valData.roi.toFixed(2) }}</p>
                </div>
                <div class="flex gap-1">
                  <p class="font-semibold">WR:</p>
                  <p>{{ valData.wr.toFixed(2) }}</p>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2 my-4">
                <div class="flex gap-1">
                  <p class="font-semibold">Odd média:</p>
                  <p>{{ valData.odds.toFixed(2) }}</p>
                </div>
                <div class="flex gap-1">
                  <p class="font-semibold">Win médio:</p>
                  <p>{{ valData.med_gain.toFixed(2) }}</p>
                </div>
                <div class="flex gap-1">
                  <p class="font-semibold">Loss médio:</p>
                  <p>{{ valData.med_loss.toFixed(2) }}</p>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2 my-4">
                <div class="flex gap-1">
                  <p class="font-semibold">EV:</p>
                  <p>{{ valData.ev.toFixed(2) }}</p>
                </div>
                <div class="flex gap-1">
                  <p class="font-semibold">Máx DD:</p>
                  <p>{{ valData.dd.toFixed(2) }}</p>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2 my-4">
                <div class="flex gap-1">
                  <p class="font-semibold">Entradas:</p>
                  <p>{{ valData.entradas }}</p>
                </div>
              </div>
            </div>
          </div>
        </UCard>
        <UCard class="hover:outline hover:outline-green-300 hover:outline-1">
          <div class="flex flex-col">
            <p class="font-semibold">Métricas de jogos reais</p>
            <div class="font-medium text-sm">
              <div class="grid grid-cols-3 gap-2 my-4">
                <div class="flex gap-1">
                  <p class="font-semibold">Profit:</p>
                  <p>{{ realData.plb.toFixed(2) }}</p>
                </div>
                <div class="flex gap-1">
                  <p class="font-semibold">ROI:</p>
                  <p>{{ realData.roi.toFixed(2) }}</p>
                </div>
                <div class="flex gap-1">
                  <p class="font-semibold">WR:</p>
                  <p>{{ realData.wr.toFixed(2) }}</p>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2 my-4">
                <div class="flex gap-1">
                  <p class="font-semibold">Odd média:</p>
                  <p>{{ realData.odds.toFixed(2) }}</p>
                </div>
                <div class="flex gap-1">
                  <p class="font-semibold">Win médio:</p>
                  <p>{{ realData.med_gain.toFixed(2) }}</p>
                </div>
                <div class="flex gap-1">
                  <p class="font-semibold">Loss médio:</p>
                  <p>{{ realData.med_loss.toFixed(2) }}</p>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2 my-4">
                <div class="flex gap-1">
                  <p class="font-semibold">EV:</p>
                  <p>{{ realData.ev.toFixed(2) }}</p>
                </div>
                <div class="flex gap-1">
                  <p class="font-semibold">Máx DD:</p>
                  <p>{{ realData.dd.toFixed(2) }}</p>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2 my-4">
                <div class="flex gap-1">
                  <p class="font-semibold">Entradas:</p>
                  <p>{{ realData.entradas }}</p>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
      <UCard class="w-3/5">
        <template #header>
          <div class="flex justify-between">
            <p class="font-semibold">Gráfico de acúmulo de capital</p>
            <div class="flex gap-2">
              <p class="text-sm">Exibir validação</p>
              <UToggle
                size="md"
                on-icon="i-heroicons-check-20-solid"
                off-icon="i-heroicons-x-mark-20-solid"
                :model-value="showVal"
                @click="changeShowVal"
              />
            </div>
          </div>
        </template>
        <div>
          <LineChart
            class="w-full"
            :chartData="chartData"
            :options="chartOptions"
            v-bind="lineChartProps"
          />
        </div>
        <div class="mt-3 px-2 flex justify-between">
          <p class="text-sm font-semibold mt-5">Profit:</p>
          <p class="text-sm font-semibold mt-5">ROI:</p>
          <p class="text-sm font-semibold mt-5">Precisão:</p>
          <p class="text-sm font-semibold mt-5">EV:</p>
          <p class="text-sm font-semibold mt-5">Entradas:</p>
        </div>
      </UCard>
    </div>
  </div>
</template>


<script setup>
import { Chart, registerables } from "chart.js";
import { LineChart } from "vue-chart-3";

Chart.register(...(registerables || []));

const chartData = ref({
  labels: [],
  datasets: [
    {
      label: "Acúmulo de capital",
      data: [],
    },
  ],
});

const lineChartProps = {
  width: 400,
  height: 300,
};

const chartOptions = {
  borderColor: "rgba(255, 255, 255, 1)",
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: "top",
      display: true,
    },
  },
};
const modelsCategories = [
  "Todos",
  "Favoritos",
  "Betfair",
  "lay_away",
  "ltd",
  "lay_home",
  "lay_zebra",
  "back_home",
  "back_away",
  "over_25",
  "back_draw",
  "lay_goleada",
  "lay_0x2",
  "lay_2x0",
];
const chosenCategory = ref("Todos");
const realData = ref({});
const valData = ref({});
const showVal = ref(true);
const listModels = ref([]);
const betsData = ref({});
const objectModel = ref({});

const fetchMetricsData = async () => {
  try {
    const req = await fetch("http://localhost:5000/model_performance");
    const data = await req.json();
    return data;
  } catch (error) {
    console.error("Erro ao buscar os dados:", error);
    return [];
  }
};

const fetchBetsData = async () => {
  try {
    const req = await fetch("http://localhost:5000/model_bets");
    const data = await req.json();
    return data;
  } catch (error) {
    console.error("Erro ao buscar os dados:", error);
    return [];
  }
};

const changeShowVal = () => {
  showVal.value = !showVal.value;
};

// Pega os dados da API
const performanceData = await fetchMetricsData();
betsData.value = await fetchBetsData();

Object.values(performanceData).forEach((item) => {
  let name = item.modelo;
  name = name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (!listModels.value.includes(name)) {
    listModels.value.push(name);
  }
});

const chosenModel = ref(listModels.value[0]);
const changeModel = () => {
  Object.values(performanceData).forEach((item) => {
    let name = item.modelo;
    name = name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    if (name === chosenModel.value) {
      objectModel.value = item;
      const { real } = objectModel.value;
      const { val } = objectModel.value;
      realData.value = real;
      valData.value = val;
    }
  });
};

const objChosenBets = ref([]);
const filterBetsByModel = () => {
  objChosenBets.value = [];
  let name = chosenModel.value.replace(/\s+/g, "_").toLowerCase();
  Object.values(betsData.value).forEach((item) => {
    if (item.Metodo === name) {
      objChosenBets.value.push(item);
    }
  });
};

const listBetsResults = ref([]);
const getBetsArray = () => {
  listBetsResults.value = [];
  Object.values(objChosenBets.value).forEach((item) => {
    listBetsResults.value.push(item.Profit);
  });
};

function cumulativeSum(array) {
  if (array.length === 0) {
    return [];
  }
  let cumSum = [array[0]];
  let listIndex = [array[0]];
  for (let i = 1; i < array.length; i++) {
    cumSum.push(cumSum[i - 1] + array[i]);
    listIndex.push(i);
  }
  chartData.value.labels = listIndex;
  chartData.value.datasets[0].data = cumSum;
}

const changeChartData = () => {
  filterBetsByModel();
  getBetsArray();
  cumulativeSum(listBetsResults.value);
};

const buildInfo = () => {
  changeModel();
  changeChartData();
};

watchEffect(() => {
  buildInfo();
});
</script>

<style lang="scss" scoped></style>