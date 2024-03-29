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
            <UTable 
            :rows="people"
            :key="people.id" 
            />
        </div>
    </div>
</template>

<script setup>
const people = [
        {
            "ID": 1,
            "Date": "2024-03-29",
            "Home": "Le Mans",
            "Away": "Epinal",
            "FT_Odds_H": 1.67,
            "FT_Odds_D": 3.7,
            "FT_Odds_A": 5.6,
            "Modelo": "lay_away_v1_betfair"
        },
        {
            "ID": 2,
            "Date": "2024-03-29",
            "Home": "QPR",
            "Away": "Birmingham",
            "FT_Odds_H": 2.04,
            "FT_Odds_D": 3.48,
            "FT_Odds_A": 3.66,
            "Modelo": "lay_away_v8"
        },
        {
            "ID": 3,
            "Date": "2024-03-29",
            "Home": "Eindhoven",
            "Away": "Cambuur",
            "FT_Odds_H": 2.57,
            "FT_Odds_D": 3.65,
            "FT_Odds_A": 2.46,
            "Modelo": "over_25_v4"
        }
]

const dates = ['2024-03-29', '2024-03-28', '2024-03-27', '2024-03-26']
const date = ref(dates[0])

</script>

<style>

</style>