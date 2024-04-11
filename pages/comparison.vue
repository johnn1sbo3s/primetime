<template>
  <div class="flex flex-col gap-4">
    <page-header title="Comparação de modelos"></page-header>
    <USelectMenu
      class="w-1/5"
      searchable
      searchable-placeholder="Pesquise por categoria"
      placeholder="Selecione uma categoria"
      :options="['1', '2', '3', '4', '5']"
      v-model:model-value="chosenCategory"
    />
    <p>{{ chosenCategory }}</p>
    <div class="h-96 w-full">
      <div>
        <p class="mb-3 text-sm">5 meses</p>
        <UTable
          class="border border-gray-700 rounded-lg"
          :rows="performanceDataRows"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
const chosenCategory = ref("Category");
const performanceDataRows = ref([]);

const { data: performanceData, error } = await useFetch(
  "http://localhost:5000/model_performance"
);

const models = ref(Object.values(performanceData.value));
const modelsList = models.value.map((item) => item.modelo);
console.log("🚀 ~ modelsList:", modelsList);
</script>

<style>
</style>