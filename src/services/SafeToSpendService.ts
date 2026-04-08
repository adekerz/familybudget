import { supabase } from '../lib/supabase';
import type { SafeToSpendResult } from '../types';
import { BalanceService } from './BalanceService';

const SAFETY_BUFFER_PCT = 0.05; // 5% резерв по умолчанию

export const SafeToSpendService = {
  /**
   * Главный KPI — сколько можно безопасно потратить.
   *
   * safe_to_spend = liquid_cash
   *   - SUM(recurring WHERE is_mandatory AND next_occurrence <= period_end)
   *   - SUM(category_targets WHERE target_type = 'allocation' AND (target - spent) > 0)
   *   - reserved_buffer (5%)
   */
  async compute(spaceId: string): Promise<SafeToSpendResult> {
    const today = new Date();
    const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0); // конец месяца
    const daysInPeriod = Math.max(1, Math.ceil((periodEnd.getTime() - today.getTime()) / 86400000));

    // 1. Liquid cash
    const liquidCash = await BalanceService.getLiquidCash(spaceId);

    // 2. Предстоящие обязательные recurring
    const periodEndStr = periodEnd.toISOString().slice(0, 10);
    const todayStr = today.toISOString().slice(0, 10);

    const { data: recurringRows } = await supabase
      .from('recurring_transactions')
      .select('amount, next_occurrence')
      .eq('space_id', spaceId)
      .eq('is_active', true)
      .eq('is_mandatory', true)
      .lte('next_occurrence', periodEndStr)
      .gte('next_occurrence', todayStr);

    const upcomingMandatory = (recurringRows ?? []).reduce(
      (s, r) => s + ((r as { amount: number }).amount ?? 0),
      0
    );

    // 3. Недофинансированные allocation-цели
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

    const { data: targets } = await supabase
      .from('category_targets')
      .select('category_id, target_amount, rollover_amount')
      .eq('space_id', spaceId)
      .eq('is_active', true)
      .eq('target_type', 'allocation')
      .eq('period', 'monthly');

    let underfundedTargets = 0;

    if (targets && targets.length > 0) {
      for (const target of targets) {
        const t = target as { category_id: string; target_amount: number; rollover_amount: number };
        const { data: spent } = await supabase
          .from('transactions')
          .select('amount')
          .eq('space_id', spaceId)
          .eq('category_id', t.category_id)
          .eq('type', 'expense')
          .gte('date', monthStart);

        const spentSum = (spent ?? []).reduce((s, r) => s + ((r as { amount: number }).amount ?? 0), 0);
        const remaining = t.target_amount + t.rollover_amount - spentSum;
        if (remaining > 0) underfundedTargets += remaining;
      }
    }

    // 4. Резервный буфер
    const reservedBuffer = liquidCash * SAFETY_BUFFER_PCT;

    // 5. Итог
    const amount = liquidCash - upcomingMandatory - underfundedTargets - reservedBuffer;
    const dailyBudget = daysInPeriod > 0 ? amount / daysInPeriod : 0;

    // 6. Уровень риска
    const pct = liquidCash > 0 ? amount / liquidCash : 0;
    let riskLevel: SafeToSpendResult['riskLevel'] = 'safe';
    if (amount < 0) riskLevel = 'critical';
    else if (pct < 0.1) riskLevel = 'danger';
    else if (pct < 0.25) riskLevel = 'caution';

    return {
      amount: Math.round(amount),
      liquidCash: Math.round(liquidCash),
      upcomingMandatory: Math.round(upcomingMandatory),
      underfundedTargets: Math.round(underfundedTargets),
      daysInPeriod,
      dailyBudget: Math.round(dailyBudget),
      riskLevel,
    };
  },
};
