<template>
  <div class="flex flex-col gap-4">
    <page-header title="Comparação de modelos"></page-header>
    <USelectMenu
      class="w-1/5"
      searchable
      searchable-placeholder="Pesquise por categoria"
      placeholder="Selecione uma categoria"
      :options="categoriesList"
      v-model:model-value="chosenCategory"
    />
    <div class="h-96 w-full">
      <div>
        <p v-if="performanceDataRows.length > 0" class="mb-3 text-sm">
          {{ performanceDataRows.length }} modelos
        </p>
        <UTable
          :ui="{
            wrapper:
              'relative overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-lg',
          }"
          :rows="performanceDataRows"
          :columns="performanceDataColumns"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
const chosenCategory = ref("Selecione uma categoria");
const performanceDataRows = ref([]);

const categoriesList = [
  "Betfair",
  "Lay Away",
  "LTD",
  "Lay_Home",
  "Lay Zebra",
  "Back Home",
  "Back Away",
  "Over 25",
  "Over 05HT",
  "Back Draw",
  "Lay Goleada",
  "Lay 0x2",
  "Lay 2x0",
];

const performanceDataColumns = ref([
  { key: "modelo", label: "Modelo" },
  { key: "media", label: "Média P/L", sortable: true },
  { key: "desvpad", label: "Desvpad P/L", sortable: true },
  { key: "diff_med_dp_um_96_raiz", label: "Dif. valid.", sortable: true },
  { key: "bottom_int", label: "Int. conf. inferior", sortable: true },
  { key: "top_int", label: "Int. conf. superior", sortable: true },
  { key: "med_atual", label: "Média atual" },
  { key: "desvpad_atual", label: "Desvpad atual" },
  { key: "n_games", label: "Jogos" },
]);

const modelNameToBack = (modelName) => {
  return modelName.toLowerCase().replace(/\s+/g, "_");
};

const modelNameToFront = (modelName) => {
  return modelName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

function buildTableObject(objectList) {
  let objects = [];
  objectList.forEach((item) => {
    let myObj = {
      modelo: modelNameToFront(item.modelo),
      media: item.total.media.toFixed(2),
      desvpad: item.total.desvpad.toFixed(2),
      med_dp: item.total.med_dp.toFixed(2),
      diff_med_dp_um_96_raiz: item.total.diff_med_dp_um_96_raiz.toFixed(2),
      bottom_int: item.total.intervalo_confianca[0].toFixed(2),
      top_int: item.total.intervalo_confianca[1].toFixed(2),
      med_atual: item.total.media_atual.toFixed(2),
      desvpad_atual: item.total.desvpad_atual.toFixed(2),
      n_games: item.total.qtd_jgs_atual,
    };
    objects.push(myObj);
  });
  return objects;
}

const { data: performanceData, error } = await useFetch(
  "http://localhost:5000/model_performance"
);

const buildComparisonTable = () => {
  performanceDataRows.value = [];

  let filteredModels = [];
  _forEach(performanceData.value, function (value, key) {
    if (value.modelo.includes(modelNameToBack(chosenCategory.value))) {
      filteredModels.push(value);
    }
  });
  performanceDataRows.value = buildTableObject(filteredModels);
};

watchEffect(() => {
  buildComparisonTable();
});
</script>

<style>
</style>