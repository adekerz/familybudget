import { useIncomeStore } from './useIncomeStore';
import { useExpenseStore } from './useExpenseStore';
import { useFixedExpenseStore } from './useFixedExpenseStore';
import { getCurrentMonthRange, getNextIncomeDate, getDaysUntil } from '../lib/dates';
import { getDailyLimit } from '../lib/budget';
import type { BudgetSummary } from '../types';

export function useBudgetSummary(): BudgetSummary {
  const incomes = useIncomeStore((s) => s.incomes);
  const expenses = useExpenseStore((s) => s.expenses);
  const fixedExpenses = useFixedExpenseStore((s) => s.fixedExpenses);

  const { start, end } = getCurrentMonthRange();

  const monthIncomes = incomes.filter((i) => {
    const d = new Date(i.date);
    return d >= start && d <= end;
  });

  const monthExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    return d >= start && d <= end;
  });

  const fixedTotal = fixedExpenses
    .filter((f) => f.isActive)
    .reduce((s, f) => s + f.amount, 0);

  const totalIncome = monthIncomes.reduce((s, i) => s + i.amount, 0);
  const distributable = Math.max(0, totalIncome - fixedTotal);

  // Compute weighted average ratios from incomes, fallback to 50/30/20
  let mandatoryRatio = 0.5;
  let flexibleRatio = 0.3;
  let savingsRatio = 0.2;

  if (monthIncomes.length > 0) {
    const totalAmount = monthIncomes.reduce((s, i) => s + i.amount, 0);
    if (totalAmount > 0) {
      mandatoryRatio = monthIncomes.reduce((s, i) => s + i.amount * (i.distribution.customRatios?.mandatory ?? 0.5), 0) / totalAmount;
      flexibleRatio = monthIncomes.reduce((s, i) => s + i.amount * (i.distribution.customRatios?.flexible ?? 0.3), 0) / totalAmount;
      savingsRatio = monthIncomes.reduce((s, i) => s + i.amount * (i.distribution.customRatios?.savings ?? 0.2), 0) / totalAmount;
    }
  }

  const mandatoryBudget = Math.round(distributable * mandatoryRatio);
  const flexibleBudget = Math.round(distributable * flexibleRatio);
  const savingsBudget = Math.round(distributable * savingsRatio);

  const mandatorySpent = monthExpenses.filter((e) => e.type === 'mandatory').reduce((s, e) => s + e.amount, 0);
  const flexibleSpent = monthExpenses.filter((e) => e.type === 'flexible').reduce((s, e) => s + e.amount, 0);
  const savingsActual = monthExpenses.filter((e) => e.type === 'savings').reduce((s, e) => s + e.amount, 0);

  const mandatoryRemaining = mandatoryBudget - mandatorySpent;
  const flexibleRemaining = flexibleBudget - flexibleSpent;

  const savingsRemaining = savingsBudget - savingsActual;
  // Общий остаток = всё нераспределённое из distributable
  const totalBalance = mandatoryRemaining + flexibleRemaining + savingsRemaining;

  const nextIncome = getNextIncomeDate();
  const daysUntilNextIncome = getDaysUntil(nextIncome.date);
  // Дневной лимит считается от общего остатка, а не только гибких
  const dailyFlexibleLimit = getDailyLimit(totalBalance, daysUntilNextIncome);

  // Сумма следующего прихода: среднее по последним 3 приходам от того же источника
  const sourceIncomes = incomes
    .filter((i) => i.source === nextIncome.source)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)
  const nextIncomeAmount = sourceIncomes.length > 0
    ? Math.round(sourceIncomes.reduce((s, i) => s + i.amount, 0) / sourceIncomes.length)
    : 0

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
    nextIncomeAmount,
    dailyFlexibleLimit,
    fixedTotal,
  };
}
