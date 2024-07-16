<template>
    <u-card class="w-full">
        <template #header>
            <div class="flex justify-between">
                <p class="font-semibold">{{ title }}</p>
                <u-button
                    color="blue"
                    size="2xs"
                    variant="soft"
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
                    class="flex align-middle justify-between text-gray-700"
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

</template>

<script setup>
defineProps({
    items: {
        type: Array,
        required: true,
        default: () => []
    },
    title: {
        type: String,
        required: true,
        default: () => ""
    }
})
</script>

<style>

</style>