import { supabase } from '../lib/supabase';

/**
 * BalanceService — гибридный расчёт баланса: snapshot + delta транзакций.
 *
 * Формула: current_balance = latest_snapshot.balance
 *   + SUM(transactions WHERE date > snapshot_date AND to_account = account)
 *   - SUM(transactions WHERE date > snapshot_date AND from_account = account)
 */
export const BalanceService = {
  /**
   * Текущий баланс счёта (snapshot + дельта).
   * Если снапшота нет — считаем от initial_balance.
   */
  async getAccountBalance(accountId: string): Promise<number> {
    // Берём последний снапшот
    const { data: snapshots } = await supabase
      .from('balance_snapshots')
      .select('balance, snapshot_date')
      .eq('account_id', accountId)
      .order('snapshot_date', { ascending: false })
      .limit(1);

    let baseBalance = 0;
    let baseDate: string | null = null;

    if (snapshots && snapshots.length > 0) {
      baseBalance = snapshots[0].balance as number;
      baseDate = snapshots[0].snapshot_date as string;
    } else {
      // Fallback на initial_balance из accounts
      const { data: acc } = await supabase
        .from('accounts')
        .select('initial_balance')
        .eq('id', accountId)
        .single();
      baseBalance = (acc as { initial_balance: number } | null)?.initial_balance ?? 0;
    }

    // Транзакции после снапшота
    let inQuery = supabase
      .from('transactions')
      .select('amount')
      .eq('to_account_id', accountId)
      .eq('status', 'confirmed');
    let outQuery = supabase
      .from('transactions')
      .select('amount')
      .eq('from_account_id', accountId)
      .eq('status', 'confirmed');

    if (baseDate) {
      inQuery = inQuery.gt('date', baseDate);
      outQuery = outQuery.gt('date', baseDate);
    }

    const [{ data: incoming }, { data: outgoing }] = await Promise.all([inQuery, outQuery]);

    const inSum = (incoming ?? []).reduce((s, r) => s + (r.amount as number), 0);
    const outSum = (outgoing ?? []).reduce((s, r) => s + (r.amount as number), 0);

    return baseBalance + inSum - outSum;
  },

  /**
   * Суммарный liquid cash: debit + cash + ewallet (без deposits, credit)
   */
  async getLiquidCash(spaceId: string): Promise<number> {
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, account_type, balance')
      .eq('space_id', spaceId)
      .eq('is_active', true)
      .eq('is_excluded_from_total', false)
      .in('account_type', ['debit', 'cash', 'ewallet']);

    if (!accounts) return 0;

    // Используем текущий balance из accounts (быстрый путь)
    return accounts.reduce((s, a) => s + ((a as { balance: number }).balance ?? 0), 0);
  },

  /**
   * Net Worth: все активные счета минус кредитные обязательства
   */
  async getNetWorth(spaceId: string): Promise<number> {
    const { data: accounts } = await supabase
      .from('accounts')
      .select('account_type, balance, credit_limit')
      .eq('space_id', spaceId)
      .eq('is_active', true)
      .eq('is_excluded_from_total', false);

    if (!accounts) return 0;

    return accounts.reduce((s, a) => {
      const acc = a as { account_type: string; balance: number; credit_limit: number };
      if (acc.account_type === 'credit') {
        // Для кредитных карт: credit_limit - balance = долг
        return s - (acc.credit_limit - acc.balance);
      }
      return s + (acc.balance ?? 0);
    }, 0);
  },

  /**
   * Создать дневной снапшот баланса для счёта
   */
  async createDailySnapshot(accountId: string): Promise<void> {
    const balance = await BalanceService.getAccountBalance(accountId);
    const today = new Date().toISOString().slice(0, 10);

    await supabase.from('balance_snapshots').upsert(
      { account_id: accountId, balance, snapshot_date: today, source: 'calculated' },
      { onConflict: 'account_id,snapshot_date' }
    );

    // Обновляем и поле balance в accounts для быстрого чтения
    await supabase.from('accounts').update({ balance }).eq('id', accountId);
  },
};
