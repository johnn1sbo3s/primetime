export function resultsByDay(betsToShow) {
  let resultsByDay = _groupBy(betsToShow, "Date");

  const profitByDay = {};
  let profitSum = 0;

  _forEach(resultsByDay, (apostasDia, date) => {
    const profit = _map(apostasDia, "Profit");
    const gameCount = apostasDia.length;
    profitSum += _sum(profit);
    profitByDay[date] = {
      profit: profitSum,
      gameCount: gameCount,
    };
  });

  return profitByDay;
}
