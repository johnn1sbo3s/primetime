export function buildMonthlyTable(cumulativeBets) {
  const monthlyData = cumulativeBets.reduce((acc, curr) => {
    const [day, month, year] = curr.date.split("/"); // Dividindo a data em dia, mês e ano
    const monthYear = `${month}/${year}`; // Construindo o formato mês/ano

    if (!acc[monthYear]) {
      acc[monthYear] = { monthYear, profit: 0, accumulated: 0, gameCount: 0 };
    }

    acc[monthYear].profit += Number(curr.gain); // Somando o ganho do dia ao lucro mensal
    acc[monthYear].accumulated += Number(curr.gain); // Acumulando o ganho mensal
    acc[monthYear].gameCount += curr.gameCount; // Acumulando a quantidade de jogos do mês

    return acc;
  }, {});

  const monthlyBetsRows = Object.values(monthlyData);

  let accumulated = 0;
  for (const monthData of monthlyBetsRows) {
    accumulated += monthData.profit;
    monthData.accumulated = accumulated.toFixed(2); // Arredondando para duas casas decimais
    monthData.profit = monthData.profit.toFixed(2); // Arredondando o lucro mensal
  }

  return monthlyBetsRows;
}
