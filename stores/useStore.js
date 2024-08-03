export const useStore = defineStore('store', () => {
    const bankrollData = ref({});
    const filteredBankrollData = ref({});
    const yesterdayData = ref({});
    const filteredYesterdayData = ref({});
    const dayBeforeYesterdayData = ref({});
    const filteredDayBeforeYesterdayData = ref({});
    const monthData = ref({});
    const filteredMonthData = ref({});
    const lastFetch = ref(0);
    const filteredLastFetch = ref(0);

    const testinho = ref('nada nada nada');
    const getTestinho = computed(() => testinho.value)

    function setTestinho(data) {
        testinho.value = data;
    }

    const getBankrollData = computed(() => bankrollData.value)
    const getFilteredBankrollData = computed(() => filteredBankrollData.value)
    const getYesterdayData = computed(() => yesterdayData.value)
    const getFilteredYesterdayData = computed(() => filteredYesterdayData.value)
    const getDayBeforeYesterdayData = computed(() => dayBeforeYesterdayData.value)
    const getFilteredDayBeforeYesterdayData = computed(() => filteredDayBeforeYesterdayData.value)
    const getMonthData = computed(() => monthData.value)
    const getFilteredMonthData = computed(() => filteredMonthData.value)
    const getLastFetch = computed(() => lastFetch.value)
    const getFilteredLastFetch = computed(() => filteredLastFetch.value)

    function setBankrollData(data, filtered) {
        if (filtered) {
            filteredBankrollData.value = data;
        } else {
            bankrollData.value = data;
        }
    }

    function setYesterdayData(data, filtered) {
        if (filtered) {
            filteredYesterdayData.value = data;
        } else {
            yesterdayData.value = data;
        }
    }

    function setDayBeforeYesterdayData(data, filtered) {
        if (filtered) {
            filteredDayBeforeYesterdayData.value = data;
        } else {
            dayBeforeYesterdayData.value = data;
        }
    }

    function setMonthData(data, filtered) {
        if (filtered) {
            filteredMonthData.value = data;
        } else {
            monthData.value = data;
        }
    }

    function setLastFetch(filtered) {
        if (filtered) {
            filteredLastFetch.value = Date.now();
        } else {
            lastFetch.value = Date.now();
        }
    }

    return {
        testinho,
        setTestinho,
        getTestinho,
        bankrollData,
        filteredBankrollData,
        yesterdayData,
        filteredYesterdayData,
        dayBeforeYesterdayData,
        filteredDayBeforeYesterdayData,
        monthData,
        filteredMonthData,
        lastFetch,
        filteredLastFetch,
        getBankrollData,
        getFilteredBankrollData,
        getYesterdayData,
        getFilteredYesterdayData,
        getDayBeforeYesterdayData,
        getFilteredDayBeforeYesterdayData,
        getMonthData,
        getFilteredMonthData,
        getLastFetch,
        getFilteredLastFetch,
        setBankrollData,
        setYesterdayData,
        setDayBeforeYesterdayData,
        setMonthData,
        setLastFetch
    };
});