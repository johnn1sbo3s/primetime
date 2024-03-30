<template>
    <div class="w-full p-6">
        <div class="flex gap-5 align-middle">
            <h1 class="text-2xl font-semibold align-middle">Apostas do dia</h1>
            <USelect class="pt-0.5"
            v-model="date" 
            :options="dates" 
            />
        </div>
        <div class="my-4">
            <div class="text-sm text-slate-400 mb-3"
            v-if="bets.length > 0"
            >
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
import { ref } from 'vue'

const sort = { column : 'Modelo', direction: 'asc' };

const columns = [
  { key: 'Date', label: 'Date' },
  { key: 'Home', label: 'Home Team', sortable: true },
  { key: 'Away', label: 'Away Team', sortable: true },
  { key: 'FT_Odds_H', label: 'Odds Home' },
  { key: 'FT_Odds_D', label: 'Odds Draw' },
  { key: 'FT_Odds_A', label: 'Odds Away' },
  { key: 'Modelo', label: 'Modelo', sortable: true },
]

const filterByDate = (data, selectedDate) => {
    return Object.values(data).filter(item => item.Date === selectedDate);
};

const normalizeColumns = (object_data) => {
    object_data.forEach(item => {
        item.Modelo = item.Modelo.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        item.FT_Odds_H = parseFloat(item.FT_Odds_H).toFixed(2);
        item.FT_Odds_D = parseFloat(item.FT_Odds_D).toFixed(2);
        item.FT_Odds_A = parseFloat(item.FT_Odds_A).toFixed(2);
    })
    
    return object_data
}

const fetchData = async () => {
    try {
        const req = await fetch('http://localhost:5000/daily_bets');
        const data = await req.json();
        return data;
    } catch (error) {
        console.error('Erro ao buscar os dados:', error);
        return [];
    }
};

const dates = ref([]);

const games = await fetchData();
const uniqueDates = new Set();
Object.values(games).forEach(item => {
    uniqueDates.add(item.Date);
});

dates.value = Array.from(uniqueDates);
const date = ref(dates.value[dates.value.length - 1])

const bets = ref([]);

const buildTableData = async (chosenDate) => {
  try {
    const filteredBets = filterByDate(games, chosenDate);
    normalizeColumns(filteredBets);
    bets.value = filteredBets;
  } catch (error) {
    console.error('Erro ao buscar apostas do dia:', error);
    bets.value = []; // Limpar a lista em caso de erro
  }
};

const qtd_games = computed(() => bets.value.length);

watchEffect(() => {
    buildTableData(date.value);
});

</script>


<style>

</style>