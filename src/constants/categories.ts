import type { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  // MANDATORY (50%)
  { id: 'rent',       name: 'Аренда/ипотека',  icon: '\uD83C\uDFE0', color: '#4A90D9', type: 'mandatory', isQuickAccess: false, sortOrder: 0 },
  { id: 'utilities',  name: 'Коммуналка',       icon: '\uD83C\uDFE1', color: '#5B9BD5', type: 'mandatory', isQuickAccess: false, sortOrder: 1 },
  { id: 'groceries',  name: 'Продукты',         icon: '\uD83D\uDED2', color: '#70AD47', type: 'mandatory', isQuickAccess: true,  sortOrder: 2 },
  { id: 'transport',  name: 'Транспорт',        icon: '\uD83D\uDE8C', color: '#ED7D31', type: 'mandatory', isQuickAccess: true,  sortOrder: 3 },
  { id: 'medicine',   name: 'Медицина',         icon: '\uD83D\uDC8A', color: '#FF6B6B', type: 'mandatory', isQuickAccess: false, sortOrder: 4 },
  { id: 'internet',   name: 'Интернет/связь',   icon: '\uD83D\uDCF1', color: '#A855F7', type: 'mandatory', isQuickAccess: false, sortOrder: 5 },

  // FLEXIBLE (30%)
  { id: 'cafe',       name: 'Кафе/кофе',        icon: '\u2615',       color: '#C4A35A', type: 'flexible',  isQuickAccess: true,  sortOrder: 6 },
  { id: 'dining',     name: 'Рестораны',        icon: '\uD83C\uDF7D\uFE0F', color: '#E85D75', type: 'flexible',  isQuickAccess: true,  sortOrder: 7 },
  { id: 'clothes',    name: 'Одежда',           icon: '\uD83D\uDC55', color: '#9B59B6', type: 'flexible',  isQuickAccess: false, sortOrder: 8 },
  { id: 'fun',        name: 'Развлечения',      icon: '\uD83C\uDFAC', color: '#E74C3C', type: 'flexible',  isQuickAccess: true,  sortOrder: 9 },
  { id: 'sports',     name: 'Спорт',            icon: '\uD83C\uDFCB', color: '#2ECC71', type: 'flexible',  isQuickAccess: false, sortOrder: 10 },
  { id: 'gifts',      name: 'Подарки',          icon: '\uD83C\uDF81', color: '#F39C12', type: 'flexible',  isQuickAccess: false, sortOrder: 11 },
  { id: 'other_flex', name: 'Прочее',           icon: '\uD83D\uDCB8', color: '#95A5A6', type: 'flexible',  isQuickAccess: false, sortOrder: 12 },

  // SAVINGS (20%)
  { id: 'deposit',    name: 'Общий депозит',    icon: '\uD83C\uDFE6', color: '#00B4D8', type: 'savings',   isQuickAccess: false, sortOrder: 13 },
  { id: 'emergency',  name: 'Подушка',          icon: '\uD83D\uDEE1\uFE0F', color: '#F0AD4E', type: 'savings',   isQuickAccess: false, sortOrder: 14 },
  { id: 'goals',      name: 'Цели',             icon: '\uD83C\uDFAF', color: '#2EA043', type: 'savings',   isQuickAccess: false, sortOrder: 15 },
];

export const INCOME_SOURCE_LABELS: Record<string, string> = {
  husband_salary: 'Зарплата мужа',
  wife_advance: 'Аванс жены',
  wife_salary: 'Зарплата жены',
  general: 'Общий доход',
};

export const INCOME_SOURCE_DAYS: Record<string, number | 'last'> = {
  general: 10,
  wife_advance: 15,
  husband_salary: 29,
  wife_salary: 'last',
};
