import type { Income, Expense } from '../types';

/**
 * Вычисляет взвешенное среднее ratios по приходам.
 * Fallback: 0.5 / 0.3 если приходов нет.
 */
export function computeBudgetRatios(effectiveIncomes: Income[]): {
  mandatoryRatio: number;
  flexibleRatio: number;
} {
  const totalIncome = effectiveIncomes.reduce((s, i) => s + i.amount, 0);
  if (totalIncome === 0) return { mandatoryRatio: 0.5, flexibleRatio: 0.3 };

  const mandatoryRatio =
    effectiveIncomes.reduce(
      (s, i) => s + i.amount * (i.distribution.customRatios?.mandatory ?? 0.5),
      0,
    ) / totalIncome;

  const flexibleRatio =
    effectiveIncomes.reduce(
      (s, i) => s + i.amount * (i.distribution.customRatios?.flexible ?? 0.3),
      0,
    ) / totalIncome;

  return { mandatoryRatio, flexibleRatio };
}

/**
 * Распределяет distributable по ratios.
 * Последний bucket (savings) = остаток, чтобы сумма точно равнялась distributable.
 */
export function computeBudgetBuckets(
  distributable: number,
  mandatoryRatio: number,
  flexibleRatio: number,
): { mandatoryBudget: number; flexibleBudget: number; savingsBudget: number } {
  const mandatoryBudget = Math.round(distributable * mandatoryRatio);
  const flexibleBudget = Math.round(distributable * flexibleRatio);
  const savingsBudget = distributable - mandatoryBudget - flexibleBudget;
  return { mandatoryBudget, flexibleBudget, savingsBudget };
}

/**
 * Суммирует расходы по типам для списка трат в периоде.
 */
export function computeSpending(expenses: Expense[]): {
  mandatorySpent: number;
  flexibleSpent: number;
  savingsActual: number;
} {
  const nonTransfer = expenses.filter(e => e.type !== 'transfer');
  return {
    mandatorySpent: nonTransfer
      .filter((e) => e.type === 'mandatory')
      .reduce((s, e) => s + e.amount, 0),
    flexibleSpent: nonTransfer
      .filter((e) => e.type === 'flexible')
      .reduce((s, e) => s + e.amount, 0),
    savingsActual: nonTransfer
      .filter((e) => e.type === 'savings')
      .reduce((s, e) => s + e.amount, 0),
  };
}
