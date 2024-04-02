<template>
  <div>
    <div class="flex justify-center">
      <LineChart
        :chartData="chartData"
        :options="chartOptions"
        v-bind="lineChartProps"
      />
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
// const model_name =

const chartData = {
  labels: ["Paris", "Nîmes", "Toulon", "Perpignan", "Autre"],
  datasets: [
    {
      data: [30, 40, 60, 70, 5],
    },
  ],
};

const lineChartProps = {
  width: 500,
  height: 300,
};

const chartOptions = {
  backgroundColor: "rgba(255, 192, 203, 0.2)", // Light pink background
  borderColor: "rgba(255, 255, 255, 1)",
  color: "rgba(255, 255, 255, 1)", // Red borders
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "right",
      display: true,
    },
  },
};
</script>
  
<style lang="scss" scoped></style>