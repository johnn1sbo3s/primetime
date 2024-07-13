<template>
    <u-card class="w-full">
        <template #header>
        <p class="font-semibold">Resultados de ontem</p>
        </template>

        <template #default>
        <div
            class="flex justify-between"
        >
            <div
                v-for="(item, index) in items"
                :key="index"
                class="flex flex-col justify-center"
            >
                <p class="text-gray-600">{{ item.title }}</p>
                <p class="text-3xl font-black text-purple-700 ">{{ item.value }} {{ item.sufix }}</p>
            </div>
        </div>
        </template>

        <template #footer>
        <p class="text-xs text-gray-500">u = Unidade</p>
        </template>
    </u-card>

</template>

<script setup>
defineProps({
    items: {
        type: Array,
        required: true,
        default: () => []
    }
})
</script>

<style>

</style>