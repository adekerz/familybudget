import { supabase } from '../lib/supabase';
import type { RiskWarning, Transaction } from '../types';
import { BalanceService } from './BalanceService';
import { CashflowService } from './CashflowService';

const LOW_BALANCE_THRESHOLD = 50000; // 50 000 ₸

export const RiskEngine = {
  /**
   * Проверка перед транзакцией: anti-overdraft.
   * Возвращает allowed=false и предупреждения если операция слишком рискована.
   */
  async validateTransaction(tx: Partial<Transaction>): Promise<{
    allowed: boolean;
    warnings: RiskWarning[];
  }> {
    const warnings: RiskWarning[] = [];

    if (!tx.fromAccountId || !tx.amount || tx.type === 'income') {
      return { allowed: true, warnings };
    }

    // Текущий баланс счёта списания
    const currentBalance = await BalanceService.getAccountBalance(tx.fromAccountId);
    const balanceAfter = currentBalance - tx.amount;

    if (balanceAfter < 0) {
      warnings.push({
        type: 'overdraft',
        severity: 'critical',
        message: `Не хватает ${Math.abs(balanceAfter).toLocaleString('ru-KZ')} ₸ на счёте`,
        relatedAmount: Math.abs(balanceAfter),
      });
      return { allowed: false, warnings };
    }

    if (balanceAfter < LOW_BALANCE_THRESHOLD) {
      warnings.push({
        type: 'low_balance',
        severity: 'warning',
        message: `После операции остаток составит ${balanceAfter.toLocaleString('ru-KZ')} ₸`,
        relatedAmount: balanceAfter,
      });
    }

    return { allowed: true, warnings };
  },

  /**
   * Активные предупреждения для дашборда.
   */
  async getActiveWarnings(spaceId: string): Promise<RiskWarning[]> {
    const warnings: RiskWarning[] = [];

    // Предупреждение о кассовом разрыве
    const cashGapWarnings = await CashflowService.getWarnings(spaceId);
    for (const w of cashGapWarnings) {
      warnings.push({
        type: 'cash_gap',
        severity: 'warning',
        message: w.message,
        relatedAmount: Math.abs(w.balance),
        relatedDate: w.date,
      });
    }

    // Низкий баланс на счетах
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name, balance, account_type')
      .eq('space_id', spaceId)
      .eq('is_active', true)
      .in('account_type', ['debit', 'cash', 'ewallet']);

    for (const acc of accounts ?? []) {
      const a = acc as { id: string; name: string; balance: number; account_type: string };
      if (a.balance < LOW_BALANCE_THRESHOLD && a.balance >= 0) {
        warnings.push({
          type: 'low_balance',
          severity: 'info',
          message: `Низкий баланс на счёте "${a.name}": ${a.balance.toLocaleString('ru-KZ')} ₸`,
          relatedAmount: a.balance,
        });
      }
    }

    // Перерасход по категориям
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

    const { data: targets } = await supabase
      .from('category_targets')
      .select('category_id, target_amount, target_type')
      .eq('space_id', spaceId)
      .eq('is_active', true)
      .eq('target_type', 'limit');

    for (const target of targets ?? []) {
      const t = target as { category_id: string; target_amount: number; target_type: string };
      const { data: spent } = await supabase
        .from('transactions')
        .select('amount')
        .eq('space_id', spaceId)
        .eq('category_id', t.category_id)
        .eq('type', 'expense')
        .gte('date', monthStart);

      const spentSum = (spent ?? []).reduce((s, r) => s + ((r as { amount: number }).amount ?? 0), 0);
      const overspend = spentSum - t.target_amount;

      if (overspend > 0) {
        warnings.push({
          type: 'overspending',
          severity: overspend > t.target_amount * 0.2 ? 'critical' : 'warning',
          message: `Перерасход в категории "${t.category_id}" на ${overspend.toLocaleString('ru-KZ')} ₸`,
          relatedAmount: overspend,
          relatedCategory: t.category_id,
        });
      }
    }

    return warnings;
  },
};
