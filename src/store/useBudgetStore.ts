import { useMemo } from 'react';
import { useIncomeStore } from './useIncomeStore';
import { useExpenseStore } from './useExpenseStore';
import { usePlannedFixedStore } from './usePlannedFixedStore';
import { useSettingsStore } from './useSettingsStore';
import { useFinanceEngine } from './useFinanceEngine';
import { getPayPeriodRange, getNextIncomeDate, getDaysUntil, parseLocalDate } from '../lib/dates';
import { computeBudgetRatios, computeBudgetBuckets, computeSpending } from '../lib/domain';
import { getDailyLimit, forecastPeriodSpend } from '../lib/budget';
import type { BudgetSummary, BudgetPeriodType, BudgetPeriodRange } from '../types';

export function useBudgetSummary(
  periodType: BudgetPeriodType = 'month',
  customRange?: BudgetPeriodRange,
): BudgetSummary {
  const incomes = useIncomeStore((s) => s.incomes);
  const expenses = useExpenseStore((s) => s.expenses);
  const fixedItems = usePlannedFixedStore((s) => s.items);
  const incomeSources = useSettingsStore((s) => s.incomeSources);
  const engineResult = useFinanceEngine((s) => s.result);

  void periodType; void customRange;

  return useMemo(() => {
    let start: Date;
    let end: Date;

    if (engineResult) {
      start = new Date(engineResult.periodStart);
      end = new Date(engineResult.periodEnd);
    } else {
      const range = getPayPeriodRange(incomes);
      start = range.start;
      end = range.end;
    }

    const periodIncomes = incomes.filter((i) => {
      const d = parseLocalDate(i.date);
      return d >= start && d <= end;
    });

    const periodExpenses = expenses.filter((e) => {
      const d = parseLocalDate(e.date);
      return d >= start && d <= end;
    });

    const fixedTotal = fixedItems
      .filter((f) => f.isActive)
      .reduce((s, f) => s + f.amount, 0);

    const totalIncome = periodIncomes.reduce((s, i) => s + i.amount, 0);
    const distributable = Math.max(0, totalIncome - fixedTotal);

    const { mandatoryRatio, flexibleRatio } = computeBudgetRatios(periodIncomes);
    const { mandatoryBudget, flexibleBudget, savingsBudget } = computeBudgetBuckets(
      distributable, mandatoryRatio, flexibleRatio,
    );
    const { mandatorySpent, flexibleSpent, savingsActual } = computeSpending(periodExpenses);

    const mandatoryRemaining = mandatoryBudget - mandatorySpent;
    const flexibleRemaining = flexibleBudget - flexibleSpent;
    const savingsRemaining = savingsBudget - savingsActual;
    const totalBalance = mandatoryRemaining + flexibleRemaining + savingsRemaining;

    const nextIncome = getNextIncomeDate(incomeSources, incomes);
    const daysUntilNextIncome = getDaysUntil(nextIncome.date);
    const dailyFlexibleLimit = getDailyLimit(flexibleRemaining, daysUntilNextIncome);

    const daysPassed = Math.max(1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const periodLengthDays = Math.max(daysPassed, getDaysUntil(nextIncome.date, start));

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
      forecastFlexibleSpend: forecastPeriodSpend(flexibleSpent, daysPassed, periodLengthDays),
      daysUntilNextIncome,
      nextIncomeDate: nextIncome.date.toISOString(),
      nextIncomeSource: nextIncome.source,
      nextIncomeAmount,
      dailyFlexibleLimit,
      fixedTotal,
      periodStart: start.toISOString(),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomes, expenses, fixedItems, incomeSources, engineResult]);
}
