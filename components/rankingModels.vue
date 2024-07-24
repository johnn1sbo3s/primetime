<template>
    <u-card class="w-full">
        <template #header>
            <div class="flex justify-between">
                <p class="font-semibold">{{ title }}</p>
                <u-button
                    color="blue"
                    size="2xs"
                    variant="soft"
                    @click="isModalOpen = true"
                >
                    Ver todos
                </u-button>
            </div>
        </template>

        <template #default>
            <div class="flex flex-col gap-4">
                <div
                    v-for="item in items"
                    :key="item.id"
                    class="flex align-middle justify-between"
                >
                    <div class="hover:text-purple-600 hover:cursor-pointer">{{ item.name }}</div>
                    <div
                        class="font-semibold"
                        :class="item.profit >= 0 ? 'text-purple-600' : 'text-red-600'"
                    >
                    {{ item.profit.toLocaleString() }} u</div>
                </div>
            </div>
        </template>
    </u-card>

    <u-modal
        v-model="isModalOpen"
    >
        <div class="flex justify-center">
            <u-card
                class="w-fit"
            >
                <template #header>
                    <p class="font-semibold">{{ title }}</p>
                </template>

                <template #default>
                    <u-table
                        style="width: 45dvw;"
                        :rows="sanitizedAllResultsData"
                        :columns="columns"
                        :ui="{
                            wrapper:
                                'relative overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-lg',
                        }"
                    />
                </template>
            </u-card>
        </div>
    </u-modal>

</template>

<script setup>
import { formatDate } from "../utils/formatDate.js";

const props = defineProps({
    items: {
        type: Array,
        required: true,
        default: () => []
    },
    title: {
        type: String,
        required: true,
        default: () => ""
    },
    allResultsData: {
        type: Array,
        required: true,
        default: () => []
    }
})

const isModalOpen = ref(false);
const columns = [
    { key: "Date", label: "Data", sortable: false },
    { key: "Method", label: "Modelo", sortable: false },
    { key: "Profit", label: "Lucro", sortable: false },
    { key: "ROI", label: "ROI", sortable: false },
    { key: "Responsibility", label: "Investido", sortable: false },
    { key: "Num_Bets", label: "Qtd de apostas", sortable: false },
];

const sanitizedAllResultsData = computed(() => {
    return props.allResultsData.map(item => {
        return {
            ...item,
            Date: item.date === 'Total' ? formatDate(item.Date) : item.Date,
            Profit: item.Profit.toLocaleString('pt-BR'),
            ROI: item.ROI.toLocaleString('pt-BR'),
            Num_Bets: item.Num_Bets.toLocaleString('pt-BR')
        };
    });
});

</script>

<style>

</style>