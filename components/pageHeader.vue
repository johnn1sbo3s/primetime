<template>
  <div class="flex gap-5">
    <h1 class="text-2xl font-semibold align-middle">{{ title }}</h1>
    <slot name="right"></slot>
  </div>
</template>

<script setup>
const props = defineProps(["title"]);
</script>