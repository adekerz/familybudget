import type { BudgetPeriodType, BudgetPeriodRange } from '../types';
import type { IncomeSourceConfig } from '../types';
import type { Income } from '../types';

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

export interface NextIncome {
  date: Date;
  source: string;
}

/**
 * Возвращает ближайшие даты поступлений по каждому источнику.
 *
 * Принимает данные явно — не читает глобальные сторы,
 * что делает функцию чистой и тестируемой.
 */
export function getNextIncomeDates(
  sources: IncomeSourceConfig[],
  incomes: Income[],
  today = new Date(),
): NextIncome[] {
  if (sources.length === 0) return [];

  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDay = getLastDayOfMonth(year, month);

  // Какие регулярные источники уже получены в этом месяце
  // (разовые _oneoff не считаются — не привязаны к расписанию)
  const receivedThisMonth = new Set(
    incomes
      .filter((i) => {
        if (i.source === ONEOFF_SOURCE_ID) return false;
        const d = parseLocalDate(i.date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map((i) => i.source),
  );

  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const results: NextIncome[] = [];

  for (const src of sources) {
    const dayNum = src.day === 'last' ? lastDay : src.day;
    let date = new Date(year, month, dayNum);
    // Переходим на следующий месяц если:
    // 1. дата уже прошла (строго < сегодня) — сегодняшняя дата ещё актуальна
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

/**
 * Возвращает ближайшую дату поступления (первую из списка).
 */
export function getNextIncomeDate(
  sources: IncomeSourceConfig[],
  incomes: Income[],
  today = new Date(),
): NextIncome {
  const dates = getNextIncomeDates(sources, incomes, today);
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

/**
 * Возвращает диапазон дат для выбранного типа периода.
 * Используется в useBudgetStore и аналитике вместо жёстко заданного getCurrentMonthRange().
 */
export function getPeriodRange(
  periodType: BudgetPeriodType,
  custom?: BudgetPeriodRange,
  from = new Date(),
): BudgetPeriodRange {
  const y = from.getFullYear();
  const m = from.getMonth();
  const d = from.getDate();

  switch (periodType) {
    case 'day':
      return {
        start: new Date(y, m, d, 0, 0, 0),
        end: new Date(y, m, d, 23, 59, 59),
      };
    case 'week': {
      const dow = from.getDay();
      // ISO week: понедельник = начало недели
      const diffToMonday = (dow + 6) % 7;
      const monday = new Date(y, m, d - diffToMonday);
      const sunday = new Date(y, m, d + (6 - diffToMonday));
      return {
        start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0),
        end: new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59),
      };
    }
    case 'month':
      return {
        start: new Date(y, m, 1),
        end: new Date(y, m + 1, 0, 23, 59, 59),
      };
    case 'custom':
      if (!custom) throw new Error('BudgetPeriodRange required for periodType="custom"');
      return custom;
  }
}

/**
 * Возвращает диапазон бюджетного периода от последнего дохода до сегодня.
 *
 * Логика «зарплата к зарплате»:
 *   periodStart = дата самого последнего дохода в истории
 *   periodEnd   = конец сегодняшнего дня
 *
 * Если доходов нет → fallback на начало текущего календарного месяца.
 */
export function getPayPeriodRange(
  incomes: Income[],
  today = new Date(),
): BudgetPeriodRange {
  if (incomes.length === 0) {
    const y = today.getFullYear();
    const m = today.getMonth();
    return {
      start: new Date(y, m, 1, 0, 0, 0),
      end: new Date(y, m, today.getDate(), 23, 59, 59),
    };
  }

  // Найти дату последнего дохода
  const lastDate = incomes.reduce<Date>((latest, inc) => {
    const d = parseLocalDate(inc.date);
    return d > latest ? d : latest;
  }, parseLocalDate(incomes[0].date));

  return {
    start: new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate(), 0, 0, 0),
    end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59),
  };
}
