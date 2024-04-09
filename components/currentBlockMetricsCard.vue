<template>
  <UCard class="h-full">
    <template #header>
      <p class="font-semibold">{{ cardTitle }}</p>
    </template>
    <div class="grid grid-cols-2 text-sm gap-y-5">
      <div class="flex gap-1">
        <p class="font-semibold">Profit:</p>
        <p>{{ metricsData.media_atual.toFixed(2) }}</p>
      </div>
      <div class="flex gap-1">
        <p class="font-semibold">Desvpad:</p>
        <p>{{ metricsData.desvpad_atual.toFixed(2) }}</p>
      </div>
      <div class="flex gap-1">
        <p class="font-semibold">Jogos:</p>
        <p>{{ metricsData.qtd_jgs_atual.toFixed(0) }}</p>
      </div>
    </div>
  </UCard>
</template>

<script setup>
const props = defineProps(["metricsData", "cardTitle"]);
</script>