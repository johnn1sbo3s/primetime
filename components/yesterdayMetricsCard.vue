<template>
    <u-card class="w-full">
        <template #header>
        <p class="font-semibold">Métricas</p>
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
                <p>{{ item.name }}</p>
                <p
                    class="text-2xl font-black"
                    :class="item.value >= 0 ? 'text-purple-600' : 'text-red-600'"
                >
                    {{ item.value.toLocaleString() }} {{ item.sufix }}
                </p>
            </div>
        </div>
        </template>

        <template #footer>
        <p class="text-xs">u = Unidade</p>
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