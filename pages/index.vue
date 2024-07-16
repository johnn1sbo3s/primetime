<template>
    <div
        v-if="status === 'success'"
        class="w-full h-full flex justify-center items-center bg-gray-800 fixed z-50 left-0 top-0 text-gray-100 text-3xl"
    >
        Por favor, aguarde a máquina começar a girar!
    </div>
</template>

<script setup>
const { data, status } = await useFetch("https://primetime-api.onrender.com");
console.log(status.value);

</script>

<style>

</style>