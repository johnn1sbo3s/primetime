export function buildDailyTable(cumulativeBets) {
  const dailyBetsRows = [];

  Object.entries(cumulativeBets).forEach((element, index) => {
    const date = new Date(element[0]).toLocaleDateString("pt-BR", {
      timeZone: "UTC",
    });

    // Arredonda o lucro acumulado para duas casas decimais
    const accumulated = Number(element[1].profit.toFixed(2));

    dailyBetsRows.push({
      date: date,
      accumulated: accumulated,
      gameCount: element[1].gameCount,
      gain: 0,
    });

    // Calcula o ganho para os dias seguintes
    if (index > 0) {
      const gain =
        dailyBetsRows[index].accumulated - dailyBetsRows[index - 1].accumulated;
      dailyBetsRows[index].gain = gain.toFixed(2); // Arredonda o ganho para duas casas decimais
    } else {
      dailyBetsRows[index].gain = dailyBetsRows[index].accumulated;
    }
  });

  return dailyBetsRows;
}
