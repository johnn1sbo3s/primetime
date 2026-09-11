<template>
  <div class="flex flex-col gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
    <div class="flex items-center justify-between gap-3">
      <span class="truncate text-sm font-semibold text-teal-400">{{ bet.Modelo ?? bet.model }}</span>

      <a
        v-if="bet.Fixture_ID"
        :href="flashscoreUrl(bet.Fixture_ID)"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Ver no Flashscore"
        class="shrink-0"
      >
        <UIcon name="i-lucide-external-link" class="text-lg text-zinc-500 hover:text-teal-400" />
      </a>
    </div>

    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 flex-col">
        <span :title="bet.Home" class="truncate text-xs font-semibold text-zinc-100 sm:text-sm">{{ bet.Home }}</span>

        <span :title="bet.Away" class="truncate text-xs font-semibold text-zinc-100 sm:text-sm">{{ bet.Away }}</span>
      </div>

      <div class="flex shrink-0 gap-1 sm:gap-1.5">
        <div class="w-16 rounded-lg border border-zinc-800 bg-zinc-950 px-1.5 py-1 text-center sm:px-2.5">
          <div class="text-2xs font-medium tracking-wide text-zinc-500 uppercase">H</div>

          <div class="text-xs font-semibold text-zinc-100 sm:text-sm">{{ bet.FT_Odds_H }}</div>
        </div>

        <div class="w-16 rounded-lg border border-zinc-800 bg-zinc-950 px-1.5 py-1 text-center sm:px-2.5">
          <div class="text-2xs font-medium tracking-wide text-zinc-500 uppercase">D</div>

          <div class="text-xs font-semibold text-zinc-100 sm:text-sm">{{ bet.FT_Odds_D }}</div>
        </div>

        <div class="w-16 rounded-lg border border-zinc-800 bg-zinc-950 px-1.5 py-1 text-center sm:px-2.5">
          <div class="text-2xs font-medium tracking-wide text-zinc-500 uppercase">A</div>

          <div class="text-xs font-semibold text-zinc-100 sm:text-sm">{{ bet.FT_Odds_A }}</div>
        </div>

        <div
          v-if="bet.Odd != null"
          class="w-16 rounded-lg border border-teal-800/60 bg-teal-950/40 px-1.5 py-1 text-center sm:px-2.5"
        >
          <div class="text-2xs font-medium tracking-wide whitespace-nowrap text-teal-500 uppercase">
            {{ bet.Market }}
          </div>

          <div class="text-xs font-semibold text-teal-300 sm:text-sm">{{ bet.Odd }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  bet: { type: Object, required: true },
})
</script>
