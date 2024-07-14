<template>
    <u-card class="w-full">
        <template #header>
        <p class="font-semibold">Detalhes</p>
        </template>

        <template #default>
            <div class="flex flex-col gap-4 text-gray-700">
                <div class="flex align-middle justify-between">
                    <div>Apostas</div>
                    <div>{{ numberBets }}</div>
                </div>

                <div class="flex align-middle justify-between">
                    <div>Modelos com apostas</div>
                    <div>{{ numberModels }}</div>
                </div>

                <div class="flex align-middle justify-between">
                    <div>Modelos positivos</div>
                    <div>{{ positiveModels }}</div>
                </div>
            </div>
        </template>
    </u-card>

</template>

<script setup>
defineProps({
    numberModels: {
        type: Number,
        required: true,
        default: () => 0
    },
    numberBets: {
        type: Number,
        required: true,
        default: () => 0
    },
    positiveModels: {
        type: Number,
        required: true,
        default: () => 0
    }
})
</script>

<style>

</style>