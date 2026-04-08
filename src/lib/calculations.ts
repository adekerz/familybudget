// src/lib/calculations.ts
// Единые расчётные функции — используются ТОЛЬКО отсюда по всему приложению

import type { Income, Expense } from '../types';
import type { IncomeSourceConfig } from '../types';
import type { PlannedTransaction } from '../types/payPeriod';

export interface FinancePeriod {
  startDate: string;
  endDate: string;
  salaryAmount: number; // из pay_periods
}

export type PeriodSource = 'pay_period' | 'income_sources' | 'auto_month';

export interface EngineResult {
  // Период
  periodStart: string;
  periodEnd: string;
  daysTotal: number;
  daysPassed: number;
  daysRemaining: number;
  periodSource: PeriodSource;

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
  rawBalance: number;
  safeToSpend: number;
  dailyLimit: number;

  // Темп трат
  paceStatus: 'on_track' | 'warning' | 'danger';
  paceRatio: number;
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
  incomeSources?: IncomeSourceConfig[];
}): EngineResult {
  const { period, incomes, expenses, plannedTransactions, incomeSources = [] } = params;

  const today = new Date();

  // Определяем period source и даты
  let startDate: string;
  let endDate: string;
  let periodSource: PeriodSource;

  if (period !== null) {
    // Приоритет: активный pay_period
    startDate = period.startDate;
    endDate = period.endDate;
    periodSource = 'pay_period';
  } else if (incomeSources.length > 0) {
    // Вычисляем период из источников дохода
    const derived = derivePeriodFromSources(incomeSources, today);
    startDate = derived.startDate;
    endDate = derived.endDate;
    periodSource = 'income_sources';
  } else {
    // Fallback: текущий месяц
    startDate = getMonthStart();
    endDate = getMonthEnd();
    periodSource = 'auto_month';
  }

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
    periodSource,
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

/** Вычисляет период из источников дохода:
 *  - start = ближайшая прошедшая дата поступления
 *  - end   = ближайшая будущая дата поступления (не включая её)
 */
function derivePeriodFromSources(
  sources: IncomeSourceConfig[],
  today: Date
): { startDate: string; endDate: string } {
  const todayDay = today.getDate();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed

  // Собираем все дни поступлений из всех источников
  const days = sources.map((s) => {
    if (s.day === 'last') {
      return new Date(year, month + 1, 0).getDate(); // последний день текущего месяца
    }
    return s.day;
  });

  if (days.length === 0) {
    return { startDate: getMonthStart(), endDate: getMonthEnd() };
  }

  // Дни в текущем месяце, которые уже прошли (включая сегодня)
  const pastDays = days.filter((d) => d <= todayDay).sort((a, b) => b - a);
  // Дни в текущем или следующем месяце, которые ещё не наступили
  const futureDays = days.filter((d) => d > todayDay).sort((a, b) => a - b);

  let startDate: string;
  let endDate: string;

  if (pastDays.length > 0) {
    // Последняя прошедшая дата поступления — начало периода
    const startDay = pastDays[0];
    const s = new Date(year, month, startDay);
    startDate = s.toISOString().slice(0, 10);
  } else {
    // Нет прошедших дат в этом месяце → берём последнее поступление из прошлого месяца
    const prevMonthDays = days.sort((a, b) => b - a);
    const startDay = prevMonthDays[0];
    const s = new Date(year, month - 1, startDay);
    startDate = s.toISOString().slice(0, 10);
  }

  if (futureDays.length > 0) {
    // Следующая будущая дата поступления — конец периода (день до неё)
    const endDay = futureDays[0];
    const e = new Date(year, month, endDay - 1);
    endDate = e.toISOString().slice(0, 10);
  } else {
    // Нет будущих дат в этом месяце → берём первое поступление следующего месяца
    const nextMonthDays = days.sort((a, b) => a - b);
    const endDay = nextMonthDays[0];
    const e = new Date(year, month + 1, endDay - 1);
    endDate = e.toISOString().slice(0, 10);
  }

  return { startDate, endDate };
}

// Форматирование суммы в тенге
export function formatTenge(amount: number): string {
  return new Intl.NumberFormat('ru-KZ', {
    style: 'currency',
    currency: 'KZT',
    maximumFractionDigits: 0,
  }).format(amount);
}
