import type { Income, Expense } from '../types';
import { parseLocalDate } from './dates';

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
  return {
    mandatorySpent: expenses
      .filter((e) => e.type === 'mandatory')
      .reduce((s, e) => s + e.amount, 0),
    flexibleSpent: expenses
      .filter((e) => e.type === 'flexible')
      .reduce((s, e) => s + e.amount, 0),
    savingsActual: expenses
      .filter((e) => e.type === 'savings')
      .reduce((s, e) => s + e.amount, 0),
  };
}

/**
 * Если в текущем периоде нет доходов — берём последний месяц с доходами (до 2 назад).
 * Возвращает effectiveIncomes и флаг isCarryForward.
 */
export function computeCarryForward(
  monthIncomes: Income[],
  allIncomes: Income[],
  today = new Date(),
): { effectiveIncomes: Income[]; isCarryForward: boolean } {
  if (monthIncomes.length > 0) {
    return { effectiveIncomes: monthIncomes, isCarryForward: false };
  }

  for (let offset = 1; offset <= 2; offset++) {
    const m = ((today.getMonth() - offset) + 12) % 12;
    const y = today.getMonth() - offset < 0 ? today.getFullYear() - 1 : today.getFullYear();
    const lookStart = new Date(y, m, 1);
    const lookEnd = new Date(y, m + 1, 0, 23, 59, 59);
    const found = allIncomes.filter((i) => {
      const d = parseLocalDate(i.date);
      return d >= lookStart && d <= lookEnd;
    });
    if (found.length > 0) return { effectiveIncomes: found, isCarryForward: true };
  }

  return { effectiveIncomes: [], isCarryForward: true };
}
