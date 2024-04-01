<template>
  <div class="w-full">
    <div class="flex justify-center">
      <LineChart :chartData="testData" v-bind="doughnutChartProps" />
    </div>
  </div>
</template>

<script setup>
import { Chart, registerables } from "chart.js";
import { LineChart } from "vue-chart-3";

Chart.register(...(registerables || []));

const testData = {
  labels: ["Paris", "Nîmes", "Toulon", "Perpignan", "Autre"],
  datasets: [
    {
      data: [30, 40, 60, 70, 5],
      backgroundColor: ["#77CEFF", "#0079AF", "#123E6B", "#97B0C4", "#A5C8ED"],
    },
  ],
};
</script>
  
<style lang="scss" scoped></style>