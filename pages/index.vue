<template>
  <div
      class="w-full h-full flex flex-col gap-2 justify-center items-center bg-purple-950 fixed z-50 left-0 top-0 text-gray-100 text-3xl"
  >
      <p>Por favor, aguarde! O time está no aquecimento.</p>
      <p>Estará disponível em até: {{ formattedTime }}</p>
  </div>
</template>

<script setup>
const router = useRouter();

const { data, status } = await useLazyFetch("https://primetime-api.onrender.com");

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

  setTimeout(async () => {
    const { data, status } = await useLazyFetch("https://primetime-api.onrender.com");
    watchEffect(() => {
      if (status.value === 'success') {
        loading.value = false;
        router.push({ path: "/dashboard" });
      }
    });
  }, 3000);
});

onUnmounted(() => {
  clearInterval(intervalId);
});

watchEffect(() => {
  if (status.value === 'success') {
    router.push({ path: "/dashboard" });
  }
});

</script>

<style>

</style>