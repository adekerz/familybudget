import type { Distribution, Income, Expense, BudgetSummary } from '../types';
import { isInPeriod, getMonthsUntil } from './dates';

export function distributeIncome(
  amount: number,
  ratios = { mandatory: 0.5, flexible: 0.3, savings: 0.2 },
  fixedTotal = 0
): Distribution {
  const distributable = Math.max(0, amount - fixedTotal);
  return {
    mandatory: Math.round(distributable * ratios.mandatory),
    flexible: Math.round(distributable * ratios.flexible),
    savings: Math.round(distributable * ratios.savings),
    customRatios: ratios,
  };
}

export function getDailyLimit(
  flexibleRemaining: number,
  daysUntilNextIncome: number
): number {
  if (daysUntilNextIncome <= 0) return flexibleRemaining;
  return Math.floor(flexibleRemaining / daysUntilNextIncome);
}

export function getPeriodBalance(
  incomes: Income[],
  expenses: Expense[],
  startDate: Date,
  endDate: Date
): number {
  const periodIncomes = incomes.filter(i => isInPeriod(i.date, startDate, endDate));
  const periodExpenses = expenses.filter(e => isInPeriod(e.date, startDate, endDate));
  const totalIn = periodIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalOut = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  return totalIn - totalOut;
}

export function calcHealthScore(s: BudgetSummary): number {
  let score = 100;

  const distributable = s.mandatoryBudget + s.flexibleBudget + s.savingsBudget;
  const totalSpent = s.mandatorySpent + s.flexibleSpent + s.savingsActual;
  const totalPct = distributable > 0 ? totalSpent / distributable : 0;

  // Общий перерасход бюджета (-25)
  if (totalPct > 1) score -= 25;
  else if (totalPct > 0.9) score -= 10;

  // Обязательные не превышены? (-20 если превышены)
  if (s.mandatorySpent > s.mandatoryBudget) score -= 20;

  // Гибкие превышены, но общий баланс положительный — мягкий штраф
  if (s.flexibleBudget > 0 && s.flexibleSpent > s.flexibleBudget) {
    if (s.totalBalance >= 0) score -= 10; // есть резерв в других категориях
    else score -= 20; // реальный перерасход
  }

  // Накопления: штрафуем только в конце месяца (последние 7 дней)
  if (s.savingsBudget > 0 && s.daysUntilNextIncome <= 7) {
    const savePct = s.savingsActual / s.savingsBudget;
    if (savePct < 0.5) score -= 15;
    else if (savePct < 1) score -= 7;
  }

  // Дневной лимит отрицательный — критично (-10)
  if (s.dailyFlexibleLimit < 0) score -= 10;

  return Math.max(0, Math.min(100, score));
}

export function getGoalMonthlyContribution(
  targetAmount: number,
  currentAmount: number,
  targetDate: Date
): number {
  const monthsLeft = getMonthsUntil(targetDate);
  if (monthsLeft <= 0) return targetAmount - currentAmount;
  return Math.ceil((targetAmount - currentAmount) / monthsLeft);
}
