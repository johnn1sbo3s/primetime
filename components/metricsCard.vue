<template>
  <UCard class="hover:outline hover:outline-violet-400 hover:outline-1 h-full">
    <template #header>
      <p class="font-semibold">{{ cardTitle }}</p>
    </template>
    <div class="text-sm flex flex-col gap-5">
      <div class="grid grid-cols-3 gap-y-5">
        <div class="flex gap-1">
          <p class="font-semibold">Profit:</p>
          <p>{{ metricsData.plb.toFixed(2) }}</p>
        </div>
        <div class="flex gap-1">
          <p class="font-semibold">ROI:</p>
          <p>{{ (metricsData.roi * 100).toFixed(2) }}%</p>
        </div>
        <div class="flex gap-1">
          <p class="font-semibold">WR:</p>
          <p>{{ (metricsData.wr * 100).toFixed(0) }}%</p>
        </div>
        <div class="flex gap-1">
          <p class="font-semibold">Odd média:</p>
          <p>{{ metricsData.odds.toFixed(2) }}</p>
        </div>
        <div class="flex gap-1">
          <p class="font-semibold">Win médio:</p>
          <p>{{ metricsData.med_gain.toFixed(2) }}</p>
        </div>
        <div class="flex gap-1">
          <p class="font-semibold">Loss médio:</p>
          <p>{{ metricsData.med_loss.toFixed(2) }}</p>
        </div>
        <div class="flex gap-1">
          <p class="font-semibold">EV:</p>
          <p>{{ metricsData.ev.toFixed(2) }}</p>
        </div>
        <div class="flex gap-1">
          <p class="font-semibold">Máx DD:</p>
          <p>{{ metricsData.dd.toFixed(2) }}</p>
        </div>
      </div>
      <div class="grid grid-cols-3">
        <div class="flex gap-1">
          <p class="font-semibold">Entradas:</p>
          <p>{{ metricsData.entradas }}</p>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup>
const props = defineProps(["metricsData", "cardTitle"]);
</script>

<style scoped></style>