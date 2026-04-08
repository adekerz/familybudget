import { supabase } from '../lib/supabase';
import type { CashflowProjection, CashflowEvent } from '../types';
import { BalanceService } from './BalanceService';

export const CashflowService = {
  /**
   * Прогноз cashflow на N дней вперёд.
   * Учитывает: текущий баланс + предстоящие recurring транзакции.
   */
  async projectCashflow(spaceId: string, days = 30): Promise<CashflowProjection[]> {
    const liquidCash = await BalanceService.getLiquidCash(spaceId);

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    const todayStr = today.toISOString().slice(0, 10);
    const endDateStr = endDate.toISOString().slice(0, 10);

    // Предстоящие recurring
    const { data: recurrings } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('space_id', spaceId)
      .eq('is_active', true)
      .lte('next_occurrence', endDateStr)
      .gte('next_occurrence', todayStr);

    // Группируем по дате
    const eventsByDate = new Map<string, CashflowEvent[]>();

    for (const r of recurrings ?? []) {
      const rec = r as {
        next_occurrence: string;
        type: string;
        description: string;
        amount: number;
        category_id: string;
      };
      const dateKey = rec.next_occurrence;
      if (!eventsByDate.has(dateKey)) eventsByDate.set(dateKey, []);
      eventsByDate.get(dateKey)!.push({
        type: rec.type as CashflowEvent['type'],
        description: rec.description ?? '',
        amount: rec.amount,
        categoryId: rec.category_id,
      });
    }

    // Строим проекцию
    const projections: CashflowProjection[] = [];
    let runningBalance = liquidCash;

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);

      const events = eventsByDate.get(dateStr) ?? [];

      for (const ev of events) {
        if (ev.type === 'income') runningBalance += ev.amount;
        else if (ev.type === 'expense') runningBalance -= ev.amount;
        // transfer не меняет total
      }

      projections.push({
        date: dateStr,
        projectedBalance: Math.round(runningBalance),
        events,
        isNegative: runningBalance < 0,
      });
    }

    return projections;
  },

  /**
   * Ближайший кассовый разрыв (день когда баланс уходит в минус).
   */
  async findNextCashGap(spaceId: string): Promise<CashflowProjection | null> {
    const projections = await CashflowService.projectCashflow(spaceId, 60);
    return projections.find((p) => p.isNegative) ?? null;
  },

  /**
   * Предупреждения о будущих кассовых разрывах.
   */
  async getWarnings(spaceId: string): Promise<Array<{ date: string; balance: number; message: string }>> {
    const gap = await CashflowService.findNextCashGap(spaceId);
    if (!gap) return [];

    const today = new Date();
    const gapDate = new Date(gap.date);
    const daysUntil = Math.ceil((gapDate.getTime() - today.getTime()) / 86400000);

    return [
      {
        date: gap.date,
        balance: gap.projectedBalance,
        message: `Через ${daysUntil} дн. баланс уйдёт в минус (${gap.projectedBalance.toLocaleString('ru-KZ')} ₸)`,
      },
    ];
  },
};
