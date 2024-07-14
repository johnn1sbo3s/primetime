<template>
  <div class="flex flex-col gap-5">
    <page-header title="Bem-vindo ao PrimeTime!" />
    <u-card>
      <template #header>
        <p class="font-semibold">Resultados de ontem</p>
      </template>

      <div class="flex gap-5 w-full">
        <yesterday-metrics-card
          :items="metrics"
        />

        <ranking-models
          :title="'Top 3 modelos'"
          :items="bestModels"
        />

        <yesterday-details-card
          number-bets="123"
          number-models="22"
          positive-models="15"
        />
      </div>
    </u-card>

    <u-card>
      <template #header>
        <p class="font-semibold">Resultados do mês</p>
      </template>

      <div class="flex gap-5 w-full">
        <yesterday-metrics-card
          :items="metrics"
        />

        <ranking-models
          :title="'Top 3 modelos'"
          :items="bestModels"
        />

        <yesterday-details-card
          number-bets="2222"
          number-models="55"
          positive-models="45"
        />
      </div>
    </u-card>

    <u-card>
        <template #header>
        <p class="font-semibold">Ranking de modelos</p>
        </template>

        <div class="flex gap-5 w-full">
          <ranking-models
            :title="'Profit'"
            :items="bestModels"
          />

          <ranking-models
            :title="'ROI'"
            :items="worstModels"
          />

          <ranking-models
            :title="'Distância da validação (WR)'"
            :items="worstModels"
          />
        </div>
    </u-card>
  </div>
</template>

<script setup>
  const metrics = [
    {
      title: "Profit",
      value: 50.90,
      sufix: "u",
    },
    {
      title: "Investido",
      value: 50.90,
      sufix: "u",
    },
    {
      title: "ROI",
      value: 0.15,
      sufix: "",
    },
  ];

  const bestModels = [
    {
      id: 1,
      name: "Back Home V2",
      profit: 2.5,
    },
    {
      id: 2,
      name: "Back Home V3",
      profit: 1.3,
    },
    {
      id: 3,
      name: "Lay Home V10 Betfair",
      profit: 5.7,
    },
  ]

  const worstModels = [
    {
      id: 1,
      name: "Back Away V8",
      profit: -5,
    },
    {
      id: 2,
      name: "BTTS V4",
      profit: -2,
    },
    {
      id: 3,
      name: "Lay Home V8 Betfair",
      profit: 1.3,
    },
  ]
</script>

<style lang="scss" scoped></style>