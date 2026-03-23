import type { Distribution, Income, Expense } from '../types';
import { isInPeriod, getMonthsUntil } from './dates';

export function distributeIncome(
  amount: number,
  ratios = { mandatory: 0.5, flexible: 0.3, savings: 0.2 }
): Distribution {
  return {
    mandatory: Math.round(amount * ratios.mandatory),
    flexible: Math.round(amount * ratios.flexible),
    savings: Math.round(amount * ratios.savings),
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

export function getGoalMonthlyContribution(
  targetAmount: number,
  currentAmount: number,
  targetDate: Date
): number {
  const monthsLeft = getMonthsUntil(targetDate);
  if (monthsLeft <= 0) return targetAmount - currentAmount;
  return Math.ceil((targetAmount - currentAmount) / monthsLeft);
}
