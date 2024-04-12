<template>
  <div class="flex divide-x divide-slate-800">
    <div class="w-64 mr-2.5 h-dvh px-1 pt-3">
      <UVerticalNavigation
        class="fixed"
        :links="links"
        :ui="{
          padding: 'p-4',
          gap: 'gap-2',
          avatar: 'w-5 h-5',
        }"
      >
        <template #avatar> </template>
      </UVerticalNavigation>
    </div>
    <div class="w-full">
      <NuxtPage class="p-6" />
    </div>
  </div>
</template>

<script setup>
const links = [
  [
    {
      avatar: {
        src: "https://avatars.githubusercontent.com/u/49643446?v=4",
        srcset: "",
        alt: "",
      },
      label: "Joneta You Planeta",
      to: "https://github.com/johnn1sbo3s",
      target: "_blank",
    },
  ],
  [
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
  ],
];
</script>

<style>
</style>