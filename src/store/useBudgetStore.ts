import { useIncomeStore } from './useIncomeStore';
import { useExpenseStore } from './useExpenseStore';
import { useFixedExpenseStore } from './useFixedExpenseStore';
import { useSettingsStore } from './useSettingsStore';
import { getPeriodRange, getNextIncomeDate, getDaysUntil, parseLocalDate } from '../lib/dates';
import { computeBudgetRatios, computeBudgetBuckets, computeSpending, computeCarryForward } from '../lib/domain';
import { getDailyLimit, forecastMonthlySpend } from '../lib/budget';
import type { BudgetSummary, BudgetPeriodType, BudgetPeriodRange } from '../types';

export function useBudgetSummary(
  periodType: BudgetPeriodType = 'month',
  customRange?: BudgetPeriodRange,
): BudgetSummary {
  const incomes = useIncomeStore((s) => s.incomes);
  const expenses = useExpenseStore((s) => s.expenses);
  const fixedExpenses = useFixedExpenseStore((s) => s.fixedExpenses);
  const incomeSources = useSettingsStore((s) => s.incomeSources);

  const { start, end } = getPeriodRange(periodType, customRange);

  const monthIncomes = incomes.filter((i) => {
    const d = parseLocalDate(i.date);
    return d >= start && d <= end;
  });

  // для carry-forward всегда используем текущий календарный месяц,
  // независимо от выбранного periodType (day/week не имеют "дохода за период")
  const now = new Date();
  const calMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const calMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const currentMonthIncomes = periodType === 'month'
    ? monthIncomes
    : incomes.filter((i) => {
        const d = parseLocalDate(i.date);
        return d >= calMonthStart && d <= calMonthEnd;
      });

  const monthExpenses = expenses.filter((e) => {
    const d = parseLocalDate(e.date);
    return d >= start && d <= end;
  });

  const fixedTotal = fixedExpenses
    .filter((f) => f.isActive)
    .reduce((s, f) => s + f.amount, 0);

  const { effectiveIncomes, isCarryForward } = computeCarryForward(currentMonthIncomes, incomes);
  const totalIncome = effectiveIncomes.reduce((s, i) => s + i.amount, 0);
  const distributable = Math.max(0, totalIncome - fixedTotal);
  const { mandatoryRatio, flexibleRatio } = computeBudgetRatios(effectiveIncomes);
  const { mandatoryBudget, flexibleBudget, savingsBudget } = computeBudgetBuckets(distributable, mandatoryRatio, flexibleRatio);
  const { mandatorySpent, flexibleSpent, savingsActual } = computeSpending(monthExpenses);

  const mandatoryRemaining = mandatoryBudget - mandatorySpent;
  const flexibleRemaining = flexibleBudget - flexibleSpent;
  const savingsRemaining = savingsBudget - savingsActual;
  const totalBalance = mandatoryRemaining + flexibleRemaining + savingsRemaining;

  const nextIncome = getNextIncomeDate(incomeSources, incomes);
  const daysUntilNextIncome = getDaysUntil(nextIncome.date);
  // Дневной лимит — только от гибкого остатка: обязательные нельзя тратить по желанию
  const dailyFlexibleLimit = getDailyLimit(flexibleRemaining, daysUntilNextIncome);

  // Сумма следующего прихода: среднее по последним 3 приходам от того же источника
  const sourceIncomes = incomes
    .filter((i) => i.source === nextIncome.source)
    .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
    .slice(0, 3);
  const nextIncomeAmount = sourceIncomes.length > 0
    ? Math.round(sourceIncomes.reduce((s, i) => s + i.amount, 0) / sourceIncomes.length)
    : 0;

  return {
    totalBalance,
    mandatoryBudget,
    mandatorySpent,
    mandatoryRemaining,
    flexibleBudget,
    flexibleSpent,
    flexibleRemaining,
    savingsBudget,
    savingsActual,
    savingsRemaining,
    // Прогноз = гибкие траты по тренду + фиксированные (известны заранее, не нужно прогнозировать)
    forecastFlexibleSpend: forecastMonthlySpend(flexibleSpent) + fixedTotal,
    daysUntilNextIncome,
    nextIncomeDate: nextIncome.date.toISOString(),
    nextIncomeSource: nextIncome.source,
    nextIncomeAmount,
    dailyFlexibleLimit,
    fixedTotal,
    isCarryForward,
  };
}
