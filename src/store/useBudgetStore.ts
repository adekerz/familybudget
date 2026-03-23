import { useIncomeStore } from './useIncomeStore';
import { useExpenseStore } from './useExpenseStore';
import { getCurrentMonthRange, getNextIncomeDate, getDaysUntil } from '../lib/dates';
import { getDailyLimit } from '../lib/budget';
import type { BudgetSummary } from '../types';

export function useBudgetSummary(): BudgetSummary {
  const incomes = useIncomeStore((s) => s.incomes);
  const expenses = useExpenseStore((s) => s.expenses);

  const { start, end } = getCurrentMonthRange();

  const monthIncomes = incomes.filter((i) => {
    const d = new Date(i.date);
    return d >= start && d <= end;
  });

  const monthExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    return d >= start && d <= end;
  });

  const mandatoryBudget = monthIncomes.reduce((s, i) => s + i.distribution.mandatory, 0);
  const flexibleBudget = monthIncomes.reduce((s, i) => s + i.distribution.flexible, 0);
  const savingsBudget = monthIncomes.reduce((s, i) => s + i.distribution.savings, 0);

  const mandatorySpent = monthExpenses.filter((e) => e.type === 'mandatory').reduce((s, e) => s + e.amount, 0);
  const flexibleSpent = monthExpenses.filter((e) => e.type === 'flexible').reduce((s, e) => s + e.amount, 0);
  const savingsActual = monthExpenses.filter((e) => e.type === 'savings').reduce((s, e) => s + e.amount, 0);

  const mandatoryRemaining = mandatoryBudget - mandatorySpent;
  const flexibleRemaining = flexibleBudget - flexibleSpent;

  const totalBalance = mandatoryRemaining + flexibleRemaining;

  const nextIncome = getNextIncomeDate();
  const daysUntilNextIncome = getDaysUntil(nextIncome.date);
  const dailyFlexibleLimit = getDailyLimit(flexibleRemaining, daysUntilNextIncome);

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
    daysUntilNextIncome,
    nextIncomeDate: nextIncome.date.toISOString(),
    nextIncomeSource: nextIncome.source,
    dailyFlexibleLimit,
  };
}
