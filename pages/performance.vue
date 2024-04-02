<template>
  <div class="flex flex-col gap-5">
    <div class="flex justify-between">
      <div class="flex gap-5">
        <h1 class="text-2xl font-semibold align-middle">
          Performance dos modelos
        </h1>
      </div>
    </div>
    <div>
      <p class="text-sm mb-0.5">Selecione um modelo</p>
      <USelectMenu
        searchable
        searchable-placeholder="Pesquise por um modelo"
        class="w-1/4"
        placeholder="Selecione um modelo"
        :options="listModels"
        :model-value="chosenModel"
      />
    </div>
    <div class="w-full gap-4 flex">
      <div class="w-2/5">
        <UCard
          class="mb-3 hover:outline hover:outline-green-300 hover:outline-1"
        >
          <div class="flex flex-col">
            <p class="font-semibold">Métricas da validação</p>
            <div class="font-medium text-sm">
              <div class="grid grid-cols-3 gap-2 my-4">
                <p>Profit:</p>
                <p>ROI:</p>
                <p>Precisão:</p>
              </div>
              <div class="grid grid-cols-3 gap-2 my-4">
                <p>Odd média:</p>
                <p>Win médio:</p>
                <p>Loss médio:</p>
              </div>
              <div class="grid grid-cols-3 gap-2 my-4">
                <p>EV:</p>
                <p>Máx DD:</p>
              </div>
              <div class="grid grid-cols-3 gap-2 my-4">
                <p>Entradas:</p>
              </div>
            </div>
          </div>
        </UCard>
        <UCard class="hover:outline hover:outline-green-300 hover:outline-1">
          <div class="flex flex-col">
            <p class="font-semibold">Métricas da validação</p>
            <div class="font-medium text-sm">
              <div class="grid grid-cols-3 gap-2 my-4">
                <p>Profit:</p>
                <p>ROI:</p>
                <p>Precisão:</p>
              </div>
              <div class="grid grid-cols-3 gap-2 my-4">
                <p>Odd média:</p>
                <p>Win médio:</p>
                <p>Loss médio:</p>
              </div>
              <div class="grid grid-cols-3 gap-2 my-4">
                <p>EV:</p>
                <p>Máx DD:</p>
              </div>
              <div class="grid grid-cols-3 gap-2 my-4">
                <p>Entradas:</p>
              </div>
            </div>
          </div>
        </UCard>
      </div>
      <UCard class="w-3/5">
        <template #header>
          <div class="flex justify-between">
            <p class="font-semibold">Gráfico de acúmulo de capital</p>
            <div class="flex">
              <p class="text-sm">Exibir validação</p>
              <UToggle
                size="md"
                on-icon="i-heroicons-check-20-solid"
                off-icon="i-heroicons-x-mark-20-solid"
                :model-value="favsOnly"
                @click="changeFavsOnly"
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
        <div class="mt-3 flex justify-between">
          <p class="text-sm text-slate-300 font-semibold mt-5">Profit:</p>
          <p class="text-sm text-slate-300 font-semibold mt-5">ROI:</p>
          <p class="text-sm text-slate-300 font-semibold mt-5">Precisão:</p>
          <p class="text-sm text-slate-300 font-semibold mt-5">EV:</p>
          <p class="text-sm text-slate-300 font-semibold mt-5">Entradas:</p>
        </div>
      </UCard>
    </div>
  </div>
</template>


<script setup>
import { Chart, registerables } from "chart.js";
import { LineChart } from "vue-chart-3";
Chart.register(...(registerables || []));

const fetchData = async () => {
  try {
    const req = await fetch("http://localhost:5000/model_performance");
    const data = await req.json();
    return data;
  } catch (error) {
    console.error("Erro ao buscar os dados:", error);
    return [];
  }
};

const performance_data = await fetchData();
const listModels = ref([]);
Object.values(performance_data).forEach((item) => {
  let name = item.modelo;
  name = name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (!listModels.value.includes(name)) {
    listModels.value.push(name);
  }
});

const chosenModel = ref(listModels.value[0]);
console.log(listModels);

const chartData = {
  labels: ["Paris", "Nîmes", "Toulon", "Perpignan", "Autre"],
  datasets: [
    {
      data: [30, 40, 60, 70, 5],
    },
  ],
};

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
</script>
  
<style lang="scss" scoped></style>