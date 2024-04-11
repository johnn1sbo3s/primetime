<template>
  <div class="flex flex-col gap-3">
    <div class="flex justify-between">
      <div class="flex gap-5">
        <h1 class="text-2xl font-semibold align-middle">
          Performance dos modelos
        </h1>
      </div>
    </div>
    <div class="flex gap-5">
      <div class="w-1/5 mb-1">
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
    <div class="w-full gap-3 flex">
      <div class="w-2/5 flex flex-col gap-3">
        <metrics-card
          :metrics-data="valData"
          :card-title="'Métricas de validação'"
        />
        <metrics-card
          :metrics-data="realData"
          :card-title="'Métricas de jogos reais'"
        />
      </div>
      <UCard class="w-3/5">
        <template #header>
          <div class="flex justify-between">
            <p class="font-semibold">Gráfico de acúmulo de capital</p>
            <div class="flex gap-2">
              <div class="inline-block align-middle">
                <UToggle
                  size="md"
                  on-icon="i-heroicons-check-20-solid"
                  off-icon="i-heroicons-x-mark-20-solid"
                  :model-value="chartByDay"
                  @click="changeChartByDay"
                />
              </div>
              <p class="text-sm">Exibição por dia</p>
            </div>
          </div>
        </template>
        <div>
          <div class="flex justify-end">
            <UButton color="gray" variant="solid" @click="resetsZoom">
              Restaurar zoom
            </UButton>
          </div>
          <LineChart
            class="w-full"
            :key="chartKey"
            :chartData="chartData"
            :options="chartOptions"
            :style="chartStyle"
          />
        </div>
      </UCard>
    </div>
    <UCard>
      <template #header>
        <p class="font-semibold">Resultados por blocos de 100 jogos</p>
      </template>
      <div class="flex h-full gap-3">
        <div class="flex flex-col gap-3 w-2/5">
          <block-metrics-card
            :metrics-data="totalData"
            :card-title="'Médias'"
          />
          <current-block-metrics-card
            :metrics-data="totalData"
            :card-title="'Bloco atual'"
          />
        </div>
        <UCard class="w-2/3">
          <template #header>
            <p class="font-semibold">Histórico</p>
          </template>
          <div>
            <UTable
              class="h-80 border border-gray-700 rounded-lg"
              :rows="blocksHistoryRows"
              :columns="blocksHistoryColumns"
            />
          </div>
        </UCard>
      </div>
    </UCard>
    <div class="grid grid-cols-2 gap-3">
      <UCard>
        <template #header>
          <p class="font-semibold">Resultados por mês</p>
        </template>
        <p class="mb-3 text-sm">{{ monthlyBetsRows.length }} meses</p>
        <UTable
          class="h-80 border border-gray-700 rounded-lg"
          :rows="monthlyBetsRows"
          :columns="monthlyBetsColumns"
        />
      </UCard>
      <UCard>
        <template #header>
          <p class="font-semibold">Resultados por dia</p>
        </template>
        <p class="mb-3 text-sm">{{ dailyBetsRows.length }} dias</p>
        <UTable
          class="h-80 border border-gray-700 rounded-lg"
          :rows="dailyBetsRows"
          :columns="dailyBetsColumns"
        />
      </UCard>
    </div>
    <UCard>
      <template #header>
        <p class="font-semibold">Jogos reais</p>
      </template>
      <p class="mb-3 text-sm">{{ allBetsDataFilteredRows.length }} jogos</p>
      <UTable
        class="h-96 border border-gray-700 rounded-lg"
        :rows="allBetsDataFilteredRows"
        :columns="allBetsDataFilteredColumns"
      />
    </UCard>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { Chart, registerables } from "chart.js";
import { LineChart } from "vue-chart-3";

if (process.client) {
  const zoomPlugin = (await import("chartjs-plugin-zoom")).default;
  const annotationPlugin = (await import("chartjs-plugin-annotation")).default;
  Chart.register(zoomPlugin);
  Chart.register(annotationPlugin);
  Chart.register(...registerables);
}

const chartData = ref({
  labels: [],
  datasets: [
    {
      label: "Acúmulo de capital",
      data: [],
      borderColor: "rgb(74 222 128)",
      backgroundColor: "rgb(74 222 128)",
      pointRadius: 1,
      pointHoverRadius: 7,
      fill: false,
      tension: 0.2,
    },
  ],
});

const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  transitions: {
    zoom: {
      animation: {
        duration: 1000,
        easing: "easeOutCubic",
      },
    },
  },
  scales: {
    y: {
      beginAtZero: false,
      ticks: {
        callback: (value) => {
          return value.toFixed(1);
        },
      },
    },
    x: {
      beginAtZero: false,
      ticks: {
        callback: (value) => {
          return value.toFixed(1);
        },
      },
    },
  },
  plugins: {
    legend: {
      position: "top",
      display: true,
    },
    zoom: {
      zoom: {
        wheel: {
          enabled: true,
        },
        pinch: {
          enabled: true,
        },
        mode: "x",
        drag: {
          enabled: true,
          borderColor: "rgb(54, 162, 235)",
          borderWidth: 1,
          backgroundColor: "rgba(54, 162, 235, 0.3)",
        },
      },
      pan: {
        enabled: true,
        mode: "x",
        modifierKey: "ctrl",
      },
    },
    annotation: {
      annotations: {
        line1: {
          type: "line",
          xMin: -100,
          xMax: -100,
          borderColor: "rgb(20 184 166)",
          borderWidth: 2,
        },
      },
    },
  },
});

const chartStyle = ref({
  height: "400px",
  width: "100%",
});

const blocksHistoryColumns = ref([
  { key: "Profit", label: "Profit" },
  { key: "Qtd_Jogos", label: "Quantidade de jogos" },
  { key: "ROI", label: "ROI" },
  { key: "Ult_Dia", label: "Último dia do bloco" },
]);

const dailyBetsColumns = ref([
  { key: "date", label: "Dia" },
  { key: "gain", label: "Ganho" },
  { key: "gameCount", label: "Jogos" },
  { key: "accumulated", label: "Acumulado" },
]);

const monthlyBetsColumns = ref([
  { key: "monthYear", label: "Mês" },
  { key: "profit", label: "Profit" },
  { key: "gameCount", label: "Jogos" },
  { key: "accumulated", label: "Acumulado" },
]);

const allBetsDataFilteredColumns = ref([
  { key: "Date", label: "Data" },
  { key: "Home", label: "Casa" },
  { key: "Away", label: "Fora" },
  { key: "Odds", label: "Odds" },
  { key: "Resultado", label: "Resultado" },
  { key: "Profit", label: "Profit" },
]);

const realData = ref({});
const valData = ref({});
const totalData = ref({});
const listModels = ref([]);
const betsData = ref({});
const objectModel = ref({});
const chartKey = ref(0);
const chartByDay = ref(false);
const blocksHistoryRows = ref([]);
const dailyBetsRows = ref([]);
const monthlyBetsRows = ref([]);
const allBetsDataFilteredRows = ref([]);

const fetchData = async (url) => {
  try {
    const req = await fetch(url);
    const data = await req.json();
    return data;
  } catch (error) {
    console.error("Erro ao buscar os dados:", error);
    return [];
  }
};

const changeChartByDay = () => {
  chartByDay.value = !chartByDay.value;
};

// Pega os dados da API
const performanceData = await fetchData(
  "http://localhost:5000/model_performance"
);
betsData.value = await fetchData("http://localhost:5000/model_bets");

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
      const { total } = objectModel.value;
      realData.value = real;
      valData.value = val;
      totalData.value = total;
      blocksHistoryRows.value = totalData.value.blocks_history;
    }
  });
};

const getBetsArray = () => {
  let betsToShow = totalData.value.pl_history;
  let nRange = -100;
  const cumulativeBets = resultsByDay(betsToShow);
  dailyBetsRows.value = buildDailyTable(cumulativeBets);
  monthlyBetsRows.value = buildMonthlyTable(dailyBetsRows.value);

  if (chartByDay.value === false) {
    nRange = valData.value.entradas;
    const profitList = betsToShow.map((item) => item.Profit);
    cumulativeSum(profitList);
  } else {
    const lastDayVal = ref(
      _findLast(betsToShow.slice(0, valData.value.entradas), "Date").Date
    );

    const datesList = Object.keys(cumulativeBets);
    const profitList = Object.values(cumulativeBets).map((obj) => obj.profit);

    nRange = _filter(datesList, (date) => date <= lastDayVal.value).length;

    chartData.value.labels = datesList;
    chartData.value.datasets[0].data = profitList;
  }
  chartOptions.value.plugins.annotation.annotations.line1.xMax = nRange;
  chartOptions.value.plugins.annotation.annotations.line1.xMin = nRange;
};

function cumulativeSum(array) {
  if (array.length === 0) {
    return [];
  }
  let cumSum = [array[0]];
  let listIndex = [];
  for (let i = 1; i < array.length; i++) {
    cumSum.push(cumSum[i - 1] + array[i]);
  }
  for (let i = 1; i < array.length + 10; i++) {
    listIndex.push(i);
  }
  chartData.value.labels = listIndex;
  chartData.value.datasets[0].data = cumSum;
}

const buildAllBetsTable = () => {
  let name = chosenModel.value.toLowerCase().replace(/\s+/g, "_");
  allBetsDataFilteredRows.value = _filter(betsData.value, { Metodo: name });
  allBetsDataFilteredRows.value = Object.values(allBetsDataFilteredRows.value);
  console.log(
    "🚀 ~ allBetsDataFilteredRows.value:",
    allBetsDataFilteredRows.value
  );
};

function resetsZoom() {
  chartKey.value++;
}

const changeChartData = () => {
  getBetsArray();
};

const buildInfo = () => {
  changeModel();
  changeChartData();
  buildAllBetsTable();
  chartKey.value++;
};

watchEffect(() => {
  buildInfo();
});
</script>

<style lang="scss" scoped></style>