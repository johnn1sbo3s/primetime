<template>
  <div class="flex">
    <div class="w-64 h-dvh px-1 py-3 mr-3">
      <UVerticalNavigation :links="links"/>
    </div>
    <NuxtPage class="bg-gray-800" />
  </div>
</template>

<script setup>
const route = useRoute()

const links = [{
  label: 'Dashboard',
  icon: 'i-heroicons-squares-2x2',
  to: '/'
}, {
  label: 'Apostas do dia',
  icon: 'i-heroicons-home',
  to: '/daily-bets'
}, {
  label: 'Performance dos modelos',
  icon: 'i-heroicons-chart-bar',
  to: '/performance'
}, {
  label: 'Comparação de modelos',
  icon: 'i-heroicons-command-line',
  to: '/comparison'
}]
</script>

<style>

</style>