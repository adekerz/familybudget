import { useEffect, useRef } from 'react';
import { useExpenseStore } from '../store/useExpenseStore';
import { useCategoryStore } from '../store/useCategoryStore';
import { useToastStore } from '../store/useToastStore';
import { parseLocalDate } from '../lib/dates';

/**
 * Проверяет лимиты категорий и показывает toast при 80% и 100%.
 * Запускается при изменении расходов.
 */
export function useCategoryLimitAlerts() {
  const expenses = useExpenseStore((s) => s.expenses);
  const categories = useCategoryStore((s) => s.categories);
  // Храним уже показанные алерты чтобы не дублировать
  const shownRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthExpenses = expenses.filter((e) => {
      const d = parseLocalDate(e.date);
      return d >= monthStart && d <= monthEnd && e.type !== 'transfer';
    });

    categories.forEach((cat) => {
      if (!cat.monthlyLimit || cat.monthlyLimit <= 0) return;

      const spent = monthExpenses
        .filter((e) => e.categoryId === cat.id)
        .reduce((s, e) => s + e.amount, 0);

      const ratio = spent / cat.monthlyLimit;
      const key100 = `${cat.id}-100-${now.getMonth()}`;
      const key80  = `${cat.id}-80-${now.getMonth()}`;

      if (ratio >= 1.0 && !shownRef.current.has(key100)) {
        shownRef.current.add(key100);
        useToastStore.getState().show(
          `⚠️ ${cat.name}: лимит исчерпан (${Math.round(spent / 1000)}k / ${Math.round(cat.monthlyLimit / 1000)}k ₸)`,
          'error',
        );
      } else if (ratio >= 0.8 && !shownRef.current.has(key80)) {
        shownRef.current.add(key80);
        useToastStore.getState().show(
          `${cat.name}: использовано 80% лимита`,
          'warn',
        );
      }
    });
  }, [expenses, categories]);
}
