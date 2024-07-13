<template>
    <u-card class="w-full">
        <template #header>
        <p class="font-semibold">{{ title }}</p>
        </template>

        <template #default>
            <div class="flex flex-col gap-4">
                <div
                    v-for="item in items"
                    :key="item.id"
                    class="flex align-middle justify-between text-gray-700"
                >
                    <div class="hover:text-purple-700 hover:cursor-pointer">{{ item.name }}</div>
                    <div>{{ item.profit }} u</div>
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