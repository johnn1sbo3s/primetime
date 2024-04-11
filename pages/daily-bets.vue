<template>
  <div class="flex flex-col gap-5">
    <div class="flex justify-between">
      <page-header title="Apostas do dia">
        <template #right>
          <USelect class="pt-0.5" v-model="date" :options="dates" />
        </template>
      </page-header>
      <div class="flex items-center gap-2">
        <div class="pt-2 flex gap-3">
          <UToggle
            size="md"
            on-icon="i-heroicons-check-20-solid"
            off-icon="i-heroicons-x-mark-20-solid"
            :model-value="favsOnly"
            @click="changeFavsOnly"
          />
        </div>
        <div class="text-sm pt-1.5">Apenas favoritos</div>
      </div>
    </div>

    <div>
      <div class="text-sm text-slate-400 mb-3" v-if="bets.length > 0">
        {{ qtd_games }} apostas encontradas
      </div>
      <UTable
        class="border border-gray-700 rounded-lg"
        :rows="bets"
        :columns="columns"
        :sort="sort"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const sort = { column: "Modelo", direction: "asc" };
const favsOnly = ref(true);
const favsModels = ref([
  "Ltd V1 Betfair",
  "Lay Home V10 Betfair",
  "Back Home V3",
]);

const columns = [
  { key: "Date", label: "Data" },
  { key: "Home", label: "Casa", sortable: true },
  { key: "Away", label: "Fora", sortable: true },
  { key: "FT_Odds_H", label: "Odds casa" },
  { key: "FT_Odds_D", label: "Odds empate" },
  { key: "FT_Odds_A", label: "Odds fora" },
  { key: "Modelo", label: "Modelo", sortable: true },
];

const changeFavsOnly = () => {
  favsOnly.value = !favsOnly.value;
};
const filterByDate = (selectedDate) => {
  return Object.values(games).filter((item) => item.Date === selectedDate);
};

const normalizeColumns = (object_data) => {
  object_data.forEach((item) => {
    item.Modelo = item.Modelo.replace(/_/g, " ").replace(/\b\w/g, (c) =>
      c.toUpperCase()
    );
    item.FT_Odds_H = parseFloat(item.FT_Odds_H).toFixed(2);
    item.FT_Odds_D = parseFloat(item.FT_Odds_D).toFixed(2);
    item.FT_Odds_A = parseFloat(item.FT_Odds_A).toFixed(2);
  });

  return object_data;
};

const fetchData = async () => {
  try {
    const req = await fetch("http://localhost:5000/daily_bets");
    const data = await req.json();
    return data;
  } catch (error) {
    console.error("Erro ao buscar os dados:", error);
    return [];
  }
};

const dates = ref([]);
const uniqueDates = new Set();

const games = await fetchData();
Object.values(games).forEach((item) => {
  uniqueDates.add(item.Date);
});

dates.value = Array.from(uniqueDates);
const date = ref(dates.value[dates.value.length - 1]);

const bets = ref([]);

const buildTableData = async (chosenDate) => {
  try {
    const filteredBets = filterByDate(chosenDate);
    normalizeColumns(filteredBets);
    bets.value = filteredBets;
  } catch (error) {
    console.error("Erro ao buscar apostas do dia:", error);
    bets.value = []; // Limpar a lista em caso de erro
  }
};

const qtd_games = computed(() => bets.value.length);

watchEffect(() => {
  buildTableData(date.value);
  if (favsOnly.value) {
    bets.value = bets.value.filter((item) =>
      favsModels.value.includes(item.Modelo)
    );
  }
});
</script>


<style>
</style>