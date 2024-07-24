<template>
    <div
        v-if="pending"
        class="flex gap-4"
    >
        <USkeleton class="h-[400px] w-4/6" />
        <USkeleton class="h-[400px] w-2/6" />
    </div>

    <div v-else class="flex gap-3">
        <div class="w-4/6">
            <LineChart
            :chartData="chartData"
            :options="chartOptions"
            :style="chartStyle"
            />
        </div>

        <div class="w-2/6 pt-8 pb-7 h-full">
            <u-card class="h-full">
                <template #header>
                    <p class="font-semibold">Dados da evolução</p>
                </template>

                <template #default>
                    <div class="flex flex-col gap-4 max-h-56 overflow-y-scroll">
                        <div
                            v-for="item in resultsByMonth"
                            :key="item.month"
                        >
                            <div class="flex justify-between pr-4">
                                <p>{{ item.month }}</p>

                                <p
                                    class="font-semibold"
                                    :class="item.profit >= 0 ? 'text-purple-600' : 'text-red-600'"
                                >
                                    {{ item.profit.toLocaleString('pt-BR') }} u
                                </p>
                            </div>
                        </div>
                    </div>
                </template>
            </u-card>
        </div>
    </div>
</template>

<script setup>
import { Chart, registerables } from "chart.js";
import { LineChart } from "vue-chart-3";

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
    default: () => true
  }
})

const runtimeConfig = useRuntimeConfig();
const apiUrl = runtimeConfig.public.API_URL;

if (process.client) {
  const zoomPlugin = (await import("chartjs-plugin-zoom")).default;
  const annotationPlugin = (await import("chartjs-plugin-annotation")).default;
  Chart.register(zoomPlugin);
  Chart.register(annotationPlugin);
  Chart.register(...registerables);
}

const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  transitions: {
    zoom: {
      animation: {
        duration: 1000,
        easing: "easeOutCubic",
      },
    },
  },
  plugins: {
    legend: {
      position: "top",
      display: true,
    },
    zoom: {
      zoom: {
        wheel: {
          enabled: true,
        },
        pinch: {
          enabled: true,
        },
        mode: "x",
        drag: {
          enabled: true,
          borderColor: "rgb(54, 162, 235)",
          borderWidth: 1,
          backgroundColor: "rgba(54, 162, 235, 0.3)",
        },
      },
      pan: {
        enabled: true,
        mode: "x",
        modifierKey: "ctrl",
      },
    },
    annotation: {
      annotations: {
        line1: {
          type: "line",
          xMin: -100,
          xMax: -100,
          borderColor: "rgb(20 184 166)",
          borderWidth: 2,
        },
      },
    },
  },
});

const chartStyle = ref({
  height: "400px",
  width: "100%",
});

const { data: bankrollData, pending } = await useLazyFetch(`${apiUrl}/bankroll-evolution`,
{
    params: {
        filtered: props.modelValue,
    }
});

const chartData = computed(() => {
    let labels = bankrollData.value.map((item) => item.Month);
    let data = bankrollData.value.map((item) => item.Bankroll);

    return {
        labels: labels,
        datasets: [
            {
                label: "Acúmulo de capital",
                data: data,
                borderColor: "#6d28d9",
                backgroundColor: "rgb(109, 40, 217, 0.05)",
                pointRadius: 3,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.2,
            },
        ],
    };
})

const resultsByMonth = computed(() => {
    let removedInitialMonth = bankrollData.value.slice(1);
    let months = removedInitialMonth.map((item) => {
        return {
            month: item.Month,
            profit: item.Profit,
        }
    })

    return months.reverse();
})

watchEffect(async () => {
  pending.value = true;

  bankrollData.value = await $fetch(`${apiUrl}/bankroll-evolution`, {
    params: {
      filtered: props.modelValue,
    }
  })

  pending.value = false;
});

</script>

<style lang="scss" scoped>

</style>