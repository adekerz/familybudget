import { useSettingsStore } from '../store/useSettingsStore';
import { useIncomeStore } from '../store/useIncomeStore';

/** Специальный source id для разовых (нерегулярных) доходов */
export const ONEOFF_SOURCE_ID = '_oneoff';

export function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Парсит дату из ISO-строки (YYYY-MM-DD) как локальную дату,
 * избегая UTC-смещения при new Date("2026-03-01") → полночь UTC.
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getDaysUntil(targetDate: Date, fromDate = new Date()): number {
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const diff = target.getTime() - from.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Возвращает количество полных месяцев до targetDate.
 * Учитывает день месяца: если день targetDate < дня fromDate — вычитает 1 месяц.
 */
export function getMonthsUntil(targetDate: Date, fromDate = new Date()): number {
  const months =
    (targetDate.getFullYear() - fromDate.getFullYear()) * 12 +
    targetDate.getMonth() - fromDate.getMonth();
  return targetDate.getDate() >= fromDate.getDate() ? months : months - 1;
}

export function isInPeriod(dateStr: string, startDate: Date, endDate: Date): boolean {
  const date = parseLocalDate(dateStr);
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

  // Проверяем, какие регулярные источники уже имеют доход в этом месяце
  // (разовые _oneoff НЕ считаются — они не привязаны к источникам)
  const incomes = useIncomeStore.getState().incomes;
  const receivedThisMonth = new Set(
    incomes
      .filter((i) => {
        if (i.source === ONEOFF_SOURCE_ID) return false;
        const d = parseLocalDate(i.date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map((i) => i.source)
  );

  const results: NextIncome[] = [];

  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  for (const src of sources) {
    const dayNum = src.day === 'last' ? lastDay : src.day;
    let date = new Date(year, month, dayNum);
    // Переходим на следующий месяц если:
    // 1. дата уже прошла (строго < сегодня, без учёта времени!) — сегодняшняя дата ещё актуальна
    // 2. ИЛИ доход с этим источником уже добавлен в этом месяце
    if (date < todayDate || receivedThisMonth.has(src.id)) {
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
