export type PeriodComparison = {
  current: number;
  previous: number;
  diff: number;
  percent: number | null;
  hasBase: boolean;
  direction: 'up' | 'down' | 'flat';
};

export function buildPeriodComparison(current: number, previous: number): PeriodComparison {
  const diff = Number((current - previous).toFixed(2));

  return {
    current,
    previous,
    diff,
    percent: previous !== 0 ? (diff / Math.abs(previous)) * 100 : null,
    hasBase: previous !== 0,
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
  };
}

export function buildIncomeConsumption(income: number, expenses: number) {
  return {
    income,
    expenses,
    percent: income > 0 ? Number(((expenses / income) * 100).toFixed(1)) : null,
  };
}
