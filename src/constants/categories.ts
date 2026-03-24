import type { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  // MANDATORY — из 50%
  { id: 'rent',       name: 'Аренда/ипотека',  icon: 'Home',            type: 'mandatory', color: '#2274A5', isQuickAccess: false, sortOrder: 1 },
  { id: 'utilities',  name: 'Коммуналка',       icon: 'Zap',             type: 'mandatory', color: '#2274A5', isQuickAccess: false, sortOrder: 2 },
  { id: 'groceries',  name: 'Продукты',         icon: 'ShoppingCart',    type: 'mandatory', color: '#2274A5', isQuickAccess: true,  sortOrder: 3 },
  { id: 'transport',  name: 'Транспорт',        icon: 'Truck',           type: 'mandatory', color: '#2274A5', isQuickAccess: true,  sortOrder: 4 },
  { id: 'medicine',   name: 'Медицина',         icon: 'Activity',        type: 'mandatory', color: '#2274A5', isQuickAccess: false, sortOrder: 5 },
  { id: 'internet',   name: 'Интернет/связь',   icon: 'Smartphone',      type: 'mandatory', color: '#2274A5', isQuickAccess: false, sortOrder: 6 },

  // FLEXIBLE — из 30%
  { id: 'cafe',       name: 'Кафе/кофе',        icon: 'Coffee',          type: 'flexible',  color: '#B8AA8E', isQuickAccess: true,  sortOrder: 7 },
  { id: 'dining',     name: 'Рестораны',        icon: 'UtensilsCrossed', type: 'flexible',  color: '#B8AA8E', isQuickAccess: true,  sortOrder: 8 },
  { id: 'clothes',    name: 'Одежда',           icon: 'Shirt',           type: 'flexible',  color: '#B8AA8E', isQuickAccess: false, sortOrder: 9 },
  { id: 'fun',        name: 'Развлечения',      icon: 'Film',            type: 'flexible',  color: '#B8AA8E', isQuickAccess: true,  sortOrder: 10 },
  { id: 'sports',     name: 'Спорт',            icon: 'Dumbbell',        type: 'flexible',  color: '#B8AA8E', isQuickAccess: false, sortOrder: 11 },
  { id: 'gifts',      name: 'Подарки',          icon: 'Gift',            type: 'flexible',  color: '#B8AA8E', isQuickAccess: false, sortOrder: 12 },
  { id: 'other_flex', name: 'Прочее',           icon: 'MoreHorizontal',  type: 'flexible',  color: '#B8AA8E', isQuickAccess: false, sortOrder: 13 },

  // SAVINGS — из 20%
  { id: 'deposit',    name: 'Общий депозит',    icon: 'Landmark',        type: 'savings',   color: '#15664E', isQuickAccess: false, sortOrder: 14 },
  { id: 'emergency',  name: 'Подушка',          icon: 'Shield',          type: 'savings',   color: '#15664E', isQuickAccess: false, sortOrder: 15 },
  { id: 'goals',      name: 'Цели',             icon: 'Target',          type: 'savings',   color: '#15664E', isQuickAccess: false, sortOrder: 16 },
];

export const INCOME_SOURCE_LABELS: Record<string, string> = {
  husband_salary: 'Зарплата мужа',
  wife_advance:   'Аванс жены',
  wife_salary:    'Зарплата жены',
  general:        'Общий доход',
};

export const INCOME_SOURCE_DAYS: Record<string, number | 'last'> = {
  husband_salary: 29,
  wife_advance:   15,
  wife_salary:    'last',
  general:        10,
};
