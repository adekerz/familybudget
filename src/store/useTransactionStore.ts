import { create } from 'zustand';
import type { Transaction, TransactionType } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';
import { triggerRecompute } from './engineBus';

interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  accountId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

interface TransactionStore {
  transactions: Transaction[];
  loading: boolean;
  load: (filters?: TransactionFilters) => Promise<void>;
  add: (data: Omit<Transaction, 'id' | 'spaceId' | 'createdAt' | 'updatedAt'>) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;
  update: (id: string, data: Partial<Transaction>) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
  /** Подтвердить pending транзакцию */
  confirm: (id: string) => Promise<void>;
  clearAll: () => void;
}

function mapRow(r: Record<string, unknown>): Transaction {
  return {
    id: r.id as string,
    spaceId: r.space_id as string,
    amount: r.amount as number,
    fromAccountId: r.from_account_id as string | undefined,
    toAccountId: r.to_account_id as string | undefined,
    type: r.type as Transaction['type'],
    categoryId: r.category_id as string,
    subcategory: r.subcategory as string | undefined,
    description: r.description as string | undefined,
    date: r.date as string,
    time: r.time as string | undefined,
    paidBy: (r.paid_by as string) ?? 'shared',
    recurringId: r.recurring_id as string | undefined,
    status: (r.status as Transaction['status']) ?? 'confirmed',
    originalAmount: r.original_amount as number | undefined,
    originalCurrency: r.original_currency as string | undefined,
    exchangeRate: r.exchange_rate as number | undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export const useTransactionStore = create<TransactionStore>()((set, get) => ({
  transactions: [],
  loading: false,

  load: async (filters = {}) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    set({ loading: true });

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('space_id', spaceId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.type) query = query.eq('type', filters.type);
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters.accountId) {
      query = query.or(
        `from_account_id.eq.${filters.accountId},to_account_id.eq.${filters.accountId}`
      );
    }
    if (filters.fromDate) query = query.gte('date', filters.fromDate);
    if (filters.toDate) query = query.lte('date', filters.toDate);
    if (filters.limit) query = query.limit(filters.limit);

    const { data, error } = await query;

    if (error) {
      useToastStore.getState().show('Не удалось загрузить транзакции', 'error');
    } else {
      set({ transactions: (data ?? []).map((r) => mapRow(r as Record<string, unknown>)) });
    }
    set({ loading: false });
  },

  add: async (data) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return { ok: false, error: 'Нет space' };

    const { data: row, error } = await supabase
      .from('transactions')
      .insert({
        space_id: spaceId,
        amount: data.amount,
        from_account_id: data.fromAccountId ?? null,
        to_account_id: data.toAccountId ?? null,
        type: data.type,
        category_id: data.categoryId,
        subcategory: data.subcategory ?? null,
        description: data.description ?? null,
        date: data.date,
        time: data.time ?? null,
        paid_by: data.paidBy ?? 'shared',
        recurring_id: data.recurringId ?? null,
        status: data.status ?? 'confirmed',
      })
      .select()
      .single();

    if (error) {
      useToastStore.getState().show('Не удалось сохранить операцию', 'error');
      return { ok: false, error: error.message };
    }

    const tx = mapRow(row as Record<string, unknown>);
    set((s) => ({ transactions: [tx, ...s.transactions] }));
    triggerRecompute();
    return { ok: true, id: tx.id };
  },

  update: async (id, data): Promise<boolean> => {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.amount !== undefined) row.amount = data.amount;
    if (data.fromAccountId !== undefined) row.from_account_id = data.fromAccountId;
    if (data.toAccountId !== undefined) row.to_account_id = data.toAccountId;
    if (data.categoryId !== undefined) row.category_id = data.categoryId;
    if (data.description !== undefined) row.description = data.description;
    if (data.date !== undefined) row.date = data.date;
    if (data.paidBy !== undefined) row.paid_by = data.paidBy;
    if (data.status !== undefined) row.status = data.status;

    const { error } = await supabase.from('transactions').update(row).eq('id', id);
    if (error) {
      useToastStore.getState().show('Не удалось обновить операцию', 'error');
      return false;
    }
    set((s) => ({
      transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...data } : t)),
    }));
    triggerRecompute();
    return true;
  },

  remove: async (id) => {
    // Optimistic
    const prev = get().transactions;
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));

    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      set({ transactions: prev });
      useToastStore.getState().show('Не удалось удалить операцию', 'error');
      return;
    }
    triggerRecompute();
  },

  confirm: async (id) => {
    const tx = get().transactions.find((t) => t.id === id);
    if (!tx || tx.status !== 'pending') return;

    const ok = await get().update(id, { status: 'confirmed' });
    if (!ok) return;

    // Только после успешного обновления применяем к балансу
    const { useAccountStore } = await import('./useAccountStore');
    if (tx.fromAccountId) useAccountStore.getState().adjustBalance(tx.fromAccountId, -tx.amount);
    if (tx.toAccountId) useAccountStore.getState().adjustBalance(tx.toAccountId, tx.amount);
  },

  clearAll: () => set({ transactions: [] }),
}));
