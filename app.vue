<template>
  <div class="flex divide-x divide-slate-800">
    <div class="w-64 mr-2.5 h-dvh px-1 pt-3">
      <UVerticalNavigation
        class="fixed"
        :links="links"
        :ui="{
          padding: 'p-4',
        }"
      />
    </div>
    <div class="w-full">
      <NuxtPage class="p-6" />
    </div>
  </div>
</template>

<script setup>
const route = useRoute();

const links = [
  {
    label: "Dashboard",
    icon: "i-heroicons-squares-2x2",
    to: "/",
  },
  {
    label: "Apostas do dia",
    icon: "i-heroicons-clipboard-document-list",
    to: "/daily-bets",
  },
  {
    label: "Performance dos modelos",
    icon: "i-heroicons-chart-bar",
    to: "/performance",
  },
  {
    label: "Comparação de modelos",
    icon: "i-heroicons-chart-pie",
    to: "/comparison",
  },
];
</script>

<style>
</style>