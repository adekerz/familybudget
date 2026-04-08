import { supabase } from '../lib/supabase';
import type { RecurringTransaction, Transaction } from '../types';

function mapRecurring(r: Record<string, unknown>): RecurringTransaction {
  return {
    id: r.id as string,
    spaceId: r.space_id as string,
    amount: r.amount as number,
    fromAccountId: r.from_account_id as string | undefined,
    toAccountId: r.to_account_id as string | undefined,
    type: r.type as RecurringTransaction['type'],
    categoryId: r.category_id as string,
    description: r.description as string | undefined,
    paidBy: (r.paid_by as string) ?? 'shared',
    frequency: r.frequency as RecurringTransaction['frequency'],
    dayOfMonth: r.day_of_month as number | undefined,
    dayOfWeek: r.day_of_week as number | undefined,
    startDate: r.start_date as string,
    endDate: r.end_date as string | undefined,
    nextOccurrence: r.next_occurrence as string,
    isActive: r.is_active as boolean,
    isAutoConfirm: r.is_auto_confirm as boolean,
    autoAdjustAmount: r.auto_adjust_amount as boolean,
    isMandatory: r.is_mandatory as boolean,
    priority: r.priority as number,
    createdAt: r.created_at as string,
  };
}

function computeNextOccurrence(rec: RecurringTransaction, fromDate: Date): string {
  let next = new Date(fromDate);
  switch (rec.frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly': {
      const targetDay = rec.dayOfMonth ?? fromDate.getDate();
      const newMonth = fromDate.getMonth() + 1;
      const newYear = fromDate.getFullYear() + (newMonth > 11 ? 1 : 0);
      const normalizedMonth = newMonth % 12;
      // Кол-во дней в целевом месяце
      const daysInMonth = new Date(newYear, normalizedMonth + 1, 0).getDate();
      const clampedDay = Math.min(targetDay, daysInMonth);
      next = new Date(newYear, normalizedMonth, clampedDay);
      break;
    }
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next.toISOString().slice(0, 10);
}

export const RecurringEngine = {
  /**
   * Вызывается при открытии приложения.
   * Генерирует pending транзакции для всех due recurring.
   */
  async processRecurrings(spaceId: string): Promise<Transaction[]> {
    const todayStr = new Date().toISOString().slice(0, 10);

    const { data: rows } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('space_id', spaceId)
      .eq('is_active', true)
      .lte('next_occurrence', todayStr);

    if (!rows || rows.length === 0) return [];

    const generated: Transaction[] = [];

    for (const row of rows) {
      const rec = mapRecurring(row as Record<string, unknown>);
      const status = rec.isAutoConfirm ? 'confirmed' : 'pending';

      // Идемпотентность: не создавать дубль если уже есть за эту дату
      const { count } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('recurring_id', rec.id)
        .eq('date', rec.nextOccurrence);

      if ((count ?? 0) > 0) {
        // Уже создана — просто продвигаем next_occurrence
        const nextDate = computeNextOccurrence(rec, new Date(rec.nextOccurrence));
        await supabase
          .from('recurring_transactions')
          .update({ next_occurrence: nextDate })
          .eq('id', rec.id);
        continue;
      }

      const { data: tx, error } = await supabase
        .from('transactions')
        .insert({
          space_id: rec.spaceId,
          amount: rec.amount,
          from_account_id: rec.fromAccountId ?? null,
          to_account_id: rec.toAccountId ?? null,
          type: rec.type,
          category_id: rec.categoryId,
          description: rec.description ?? null,
          date: rec.nextOccurrence,
          paid_by: rec.paidBy,
          recurring_id: rec.id,
          status,
        })
        .select()
        .single();

      if (!error && tx) {
        generated.push(tx as unknown as Transaction);

        // Обновляем next_occurrence
        const nextDate = computeNextOccurrence(rec, new Date(rec.nextOccurrence));
        await supabase
          .from('recurring_transactions')
          .update({ next_occurrence: nextDate })
          .eq('id', rec.id);
      }
    }

    return generated;
  },

  /**
   * Будущие обязательства в диапазоне дат.
   */
  async getUpcomingObligations(
    spaceId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<RecurringTransaction[]> {
    const fromStr = fromDate.toISOString().slice(0, 10);
    const toStr = toDate.toISOString().slice(0, 10);

    const { data } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('space_id', spaceId)
      .eq('is_active', true)
      .gte('next_occurrence', fromStr)
      .lte('next_occurrence', toStr)
      .order('next_occurrence', { ascending: true });

    return (data ?? []).map((r) => mapRecurring(r as Record<string, unknown>));
  },
};
