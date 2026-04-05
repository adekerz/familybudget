// src/lib/calculations.ts
// Единые расчётные функции — используются ТОЛЬКО отсюда по всему приложению

import type { Income, Expense } from '../types';
import type { PlannedTransaction } from '../types/payPeriod';

export interface FinancePeriod {
  startDate: string;
  endDate: string;
  salaryAmount: number; // из pay_periods
}

export interface EngineResult {
  // Период
  periodStart: string;
  periodEnd: string;
  daysTotal: number;
  daysPassed: number;
  daysRemaining: number;

  // Доходы
  totalIncome: number;

  // Расходы
  totalExpenses: number;
  mandatorySpent: number;
  flexibleSpent: number;
  savingsSpent: number;

  // Планы
  plannedTotal: number;
  plannedPending: number;

  // Главные числа
  rawBalance: number;          // totalIncome - totalExpenses
  safeToSpend: number;         // rawBalance - plannedPending
  dailyLimit: number;          // safeToSpend / daysRemaining

  // Темп трат
  paceStatus: 'on_track' | 'warning' | 'danger';
  paceRatio: number;           // actualSpent / expectedSpent
  expectedSpent: number;

  // Прогноз
  forecastEndBalance: number;

  // Распределение по банкам
  bankBreakdown: Record<string, number>;

  // Флаги
  hasPeriod: boolean;
  isOverBudget: boolean;
}

export function computeEngineResult(params: {
  period: FinancePeriod | null;
  incomes: Income[];
  expenses: Expense[];
  plannedTransactions: PlannedTransaction[];
}): EngineResult {
  const { period, incomes, expenses, plannedTransactions } = params;

  const today = new Date();

  // Если периода нет — используем авто-период (текущий месяц)
  const startDate = period?.startDate ?? getMonthStart();
  const endDate = period?.endDate ?? getMonthEnd();

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Используем UTC-midnight для подсчёта дней, чтобы избежать ошибок DST (+/-1 час)
  const msPerDay = 86400000;
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc   = Date.UTC(end.getFullYear(),   end.getMonth(),   end.getDate());
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const daysTotal   = Math.max(1, Math.round((endUtc - startUtc) / msPerDay) + 1);
  const daysPassed  = Math.max(0, Math.min(daysTotal, Math.round((todayUtc - startUtc) / msPerDay)));
  const daysRemaining = Math.max(1, daysTotal - daysPassed);

  // Фильтрация по периоду
  const periodIncomes = incomes.filter(i => i.date >= startDate && i.date <= endDate);
  const periodExpenses = expenses.filter(e =>
    e.date >= startDate && e.date <= endDate && e.type !== 'transfer'
  );

  const totalIncome = (period?.salaryAmount ?? 0) > 0
    ? period!.salaryAmount
    : periodIncomes.reduce((s, i) => s + i.amount, 0);

  const totalExpenses = periodExpenses.reduce((s, e) => s + e.amount, 0);
  const mandatorySpent = periodExpenses
    .filter(e => e.type === 'mandatory').reduce((s, e) => s + e.amount, 0);
  const flexibleSpent = periodExpenses
    .filter(e => e.type === 'flexible').reduce((s, e) => s + e.amount, 0);
  const savingsSpent = periodExpenses
    .filter(e => e.type === 'savings').reduce((s, e) => s + e.amount, 0);

  // Планы
  const pendingPlanned = plannedTransactions.filter(tx =>
    tx.status === 'pending' && tx.type === 'expense'
  );
  const plannedTotal = plannedTransactions
    .filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  const plannedPending = pendingPlanned.reduce((s, tx) => s + tx.amount, 0);

  // Главные числа
  const rawBalance = totalIncome - totalExpenses;
  const safeToSpend = Math.max(0, rawBalance - plannedPending);
  const dailyLimit = daysRemaining > 0 ? Math.floor(safeToSpend / daysRemaining) : 0;

  // Темп трат
  const expectedSpent = daysTotal > 0
    ? totalIncome * (daysPassed / daysTotal)
    : 0;
  const paceRatio = expectedSpent > 0 ? totalExpenses / expectedSpent : 0;
  const paceStatus = paceRatio > 1.2 ? 'danger' : paceRatio > 1.0 ? 'warning' : 'on_track';

  // Прогноз
  const dailySpendRate = daysPassed > 0 ? totalExpenses / daysPassed : 0;
  const forecastEndBalance = totalIncome - (dailySpendRate * daysTotal) - plannedPending;

  // Банки
  const bankBreakdown: Record<string, number> = {};
  periodExpenses.forEach(e => {
    const bank = e.bank ?? 'kaspi';
    bankBreakdown[bank] = (bankBreakdown[bank] ?? 0) + e.amount;
  });

  return {
    periodStart: startDate,
    periodEnd: endDate,
    daysTotal,
    daysPassed,
    daysRemaining,
    totalIncome,
    totalExpenses,
    mandatorySpent,
    flexibleSpent,
    savingsSpent,
    plannedTotal,
    plannedPending,
    rawBalance,
    safeToSpend,
    dailyLimit,
    paceStatus,
    paceRatio,
    expectedSpent,
    forecastEndBalance,
    bankBreakdown,
    hasPeriod: period !== null,
    isOverBudget: rawBalance < 0,
  };
}

function getMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function getMonthEnd(): string {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return last.toISOString().slice(0, 10);
}

// Форматирование суммы в тенге
export function formatTenge(amount: number): string {
  return new Intl.NumberFormat('ru-KZ', {
    style: 'currency',
    currency: 'KZT',
    maximumFractionDigits: 0,
  }).format(amount);
}
