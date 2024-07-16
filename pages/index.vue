<template>
    <div
        v-if="formattedTime === '0:00' || data"
        class="w-full h-full flex flex-col gap-2 justify-center items-center bg-gray-300 fixed z-50 left-0 top-0 text-gray-800 text-3xl"
    >
        <p>Pode passar!</p>
    </div>

    <div
        v-else
        class="w-full h-full flex flex-col gap-2 justify-center items-center bg-purple-950 fixed z-50 left-0 top-0 text-gray-100 text-3xl"
    >
        <p>Por favor, aguarde a máquina começar a girar!</p>
        <p>Tempo restante: {{ formattedTime }}</p>
    </div>
</template>

<script setup>
const { data, status } = await useFetch("https://primetime-api.onrender.com");

const countdownTime = ref(50); // Duração da contagem regressiva em segundos
const formattedTime = ref('');

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};

const updateCountdown = () => {
  if (countdownTime.value > 0) {
    countdownTime.value--;
    formattedTime.value = formatTime(countdownTime.value);
  }
};

let intervalId;

onMounted(() => {
  formattedTime.value = formatTime(countdownTime.value);
  intervalId = setInterval(updateCountdown, 1000);
});

onUnmounted(() => {
  clearInterval(intervalId);
});

</script>

<style>

</style>