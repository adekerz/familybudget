import { useSettingsStore } from '../store/useSettingsStore';
import { useIncomeStore } from '../store/useIncomeStore';

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
  source: string;
}

export function getNextIncomeDates(today = new Date()): NextIncome[] {
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDay = getLastDayOfMonth(year, month);

  const sources = useSettingsStore.getState().incomeSources;
  if (sources.length === 0) return [];

  // Проверяем, какие источники уже имеют доход в этом месяце
  const incomes = useIncomeStore.getState().incomes;
  const receivedThisMonth = new Set(
    incomes
      .filter((i) => {
        const d = new Date(i.date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map((i) => i.source)
  );

  const results: NextIncome[] = [];

  for (const src of sources) {
    const dayNum = src.day === 'last' ? lastDay : src.day;
    let date = new Date(year, month, dayNum);
    // Переходим на следующий месяц если уже получили доход из этого источника
    // или если дата строго в прошлом (сегодняшняя дата ещё актуальна)
    if (date < today || receivedThisMonth.has(src.id)) {
      const nextMonth = month + 1;
      const nextLastDay = getLastDayOfMonth(year, nextMonth);
      const nextDay = src.day === 'last' ? nextLastDay : Math.min(dayNum, nextLastDay);
      date = new Date(year, nextMonth, nextDay);
    }
    results.push({ date, source: src.id });
  }

  results.sort((a, b) => a.date.getTime() - b.date.getTime());
  return results;
}

export function getNextIncomeDate(today = new Date()): NextIncome {
  const dates = getNextIncomeDates(today);
  if (dates.length === 0) {
    return { date: new Date(today.getFullYear(), today.getMonth() + 1, 1), source: '' };
  }
  return dates[0];
}

export function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}
