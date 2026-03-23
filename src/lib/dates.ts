import type { IncomeSource } from '../types';

export function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getDaysUntil(targetDate: Date, fromDate = new Date()): number {
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const diff = target.getTime() - from.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getMonthsUntil(targetDate: Date, fromDate = new Date()): number {
  return (targetDate.getFullYear() - fromDate.getFullYear()) * 12
    + targetDate.getMonth() - fromDate.getMonth();
}

export function isInPeriod(dateStr: string, startDate: Date, endDate: Date): boolean {
  const date = new Date(dateStr);
  return date >= startDate && date <= endDate;
}

interface NextIncome {
  date: Date;
  source: IncomeSource;
}

export function getNextIncomeDates(today = new Date()): NextIncome[] {
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDay = getLastDayOfMonth(year, month);

  const incomeDays: Array<{ day: number; source: IncomeSource }> = [
    { day: 10, source: 'general' },
    { day: 15, source: 'wife_advance' },
    { day: 29, source: 'husband_salary' },
    { day: lastDay, source: 'wife_salary' },
  ];

  const results: NextIncome[] = [];

  for (const { day, source } of incomeDays) {
    let date = new Date(year, month, day);
    if (date <= today) {
      const nextMonth = month + 1;
      const nextLastDay = getLastDayOfMonth(year, nextMonth);
      const nextDay = source === 'wife_salary' ? nextLastDay : Math.min(day, nextLastDay);
      date = new Date(year, nextMonth, nextDay);
    }
    results.push({ date, source });
  }

  results.sort((a, b) => a.date.getTime() - b.date.getTime());
  return results;
}

export function getNextIncomeDate(today = new Date()): NextIncome {
  return getNextIncomeDates(today)[0];
}

export function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}
