import { create } from 'zustand';
import type { Expense, ExpenseType } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';
import { triggerRecompute } from './engineBus';

interface ExpenseStore {
  expenses: Expense[];
  loading: boolean;
  loadExpenses: () => Promise<void>;
  subscribeRealtime: () => () => void;
  addExpense: (data: {
    amount: number;
    date: string;
    categoryId: string;
    type: ExpenseType;
    description?: string;
    paidBy?: string;
    accountId?: string;
    toAccountId?: string;
    bank?: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  clearAll: () => void;
}

function mapRow(r: Record<string, unknown>): Expense {
  return {
    id: r.id as string,
    amount: r.amount as number,
    date: r.date as string,
    categoryId: r.category_id as string,
    type: r.type as ExpenseType,
    description: r.description as string | undefined,
    paidBy: (r.paid_by as string | undefined) ?? '',
    accountId: r.account_id as string | undefined,
    toAccountId: r.to_account_id as string | undefined,
    bank: (r.bank as string | undefined) ?? 'other',
    createdAt: r.created_at as string,
  };
}

export const useExpenseStore = create<ExpenseStore>()((set) => ({
  expenses: [],
  loading: false,

  subscribeRealtime: () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return () => {};
    const channel = supabase
      .channel(`expenses-realtime-${spaceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'expenses', filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const newExp = mapRow(payload.new as Record<string, unknown>);
          set((s) => {
            if (s.expenses.find((e) => e.id === newExp.id)) return s;
            // Race condition guard: пропускаем если висит optimistic с теми же данными
            const hasOptimistic = s.expenses.some(
              (e) =>
                e.id.startsWith('optimistic-') &&
                e.amount === newExp.amount &&
                e.date === newExp.date &&
                e.categoryId === newExp.categoryId
            );
            if (hasOptimistic) return s;
            return { expenses: [newExp, ...s.expenses] };
          });
        }
      )
      .on(
        'postgres_changes',
        // Фильтр по space_id обязателен — иначе DELETE других пространств удаляет наши записи
        { event: 'DELETE', schema: 'public', table: 'expenses', filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const id = (payload.old as Record<string, unknown>).id as string;
          set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'expenses', filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          // soft delete приходит как UPDATE с deleted_at != null
          if (raw.deleted_at) {
            const id = raw.id as string;
            set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
            return;
          }
          const updated = mapRow(raw);
          set((s) => {
            const existing = s.expenses.find((e) => e.id === updated.id);
            if (existing?.deletedAt) return s;
            return {
              expenses: s.expenses.map((e) => e.id === updated.id ? updated : e),
            };
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },

  loadExpenses: async () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) { set({ loading: false }); return; }
    set({ loading: true });
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('space_id', spaceId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (data) {
      set({ expenses: data.map((r) => mapRow(r as Record<string, unknown>)) });
    }
    set({ loading: false });
    triggerRecompute();
  },

  addExpense: async (data) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return { ok: false, error: 'Нет пространства' };

    // Оптимистичное добавление
    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticItem: Expense = {
      id: optimisticId,
      amount: data.amount,
      date: data.date,
      categoryId: data.categoryId,
      type: data.type,
      description: data.description,
      paidBy: data.paidBy ?? 'shared',
      accountId: data.accountId,
      toAccountId: data.toAccountId,
      bank: data.bank ?? 'kaspi',
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ expenses: [optimisticItem, ...s.expenses] }));

    let payPeriodId: string | null = null;
    try {
      const ppStore = (await import('./usePayPeriodStore')).usePayPeriodStore;
      payPeriodId = ppStore.getState().activePeriod?.id ?? null;
    } catch { /* ignore */ }

    const row = {
      amount: data.amount,
      date: data.date,
      category_id: data.categoryId,
      type: data.type,
      description: data.description,
      paid_by: data.paidBy ?? 'shared',
      account_id: data.accountId ?? null,
      to_account_id: data.toAccountId ?? null,
      bank: data.bank ?? 'kaspi',
      space_id: spaceId,
      created_at: new Date().toISOString(),
      pay_period_id: payPeriodId,
    };

    const { data: inserted, error } = await supabase.from('expenses').insert(row).select().single();

    if (error || !inserted) {
      // Откат оптимистичного изменения
      set((s) => ({ expenses: s.expenses.filter((e) => e.id !== optimisticId) }));
      return { ok: false, error: error?.message ?? 'Ошибка при сохранении расхода' };
    }

    // Заменяем оптимистичную запись реальной
    const realItem = mapRow(inserted as Record<string, unknown>);
    set((s) => ({
      expenses: s.expenses.map((e) => e.id === optimisticId ? realItem : e),
    }));
    // Инвалидируем AI-кеш после добавления расхода
    import('../store/useAIStore').then(({ useAIStore }) => {
      useAIStore.setState({ dashboardInsightAt: null, analyticsInsightAt: null });
    });
    // Обновляем баланс счёта
    if (data.accountId) {
      import('./useAccountStore').then(({ useAccountStore }) => {
        if (data.type === 'transfer' && data.toAccountId) {
          // Перевод: списываем с FROM, пополняем TO
          useAccountStore.getState().adjustBalance(data.accountId!, -data.amount);
          useAccountStore.getState().adjustBalance(data.toAccountId, data.amount);
        } else {
          useAccountStore.getState().adjustBalance(data.accountId!, -data.amount);
        }
      });
    }
    // Обновляем pay period summary если расход привязан к периоду
    if (payPeriodId) {
      import('./usePayPeriodStore').then(({ usePayPeriodStore }) => {
        usePayPeriodStore.getState().refreshSummary();
      });
    }
    triggerRecompute();
    return { ok: true };
  },

  updateExpense: async (id, data) => {
    const row: Record<string, unknown> = {};
    if (data.amount !== undefined) row.amount = data.amount;
    if (data.date !== undefined) row.date = data.date;
    if (data.categoryId !== undefined) row.category_id = data.categoryId;
    if (data.type !== undefined) row.type = data.type;
    if (data.description !== undefined) row.description = data.description;
    if (data.paidBy !== undefined) row.paid_by = data.paidBy;
    const { error } = await supabase.from('expenses').update(row).eq('id', id);
    if (error) {
      useToastStore.getState().show('Не удалось обновить расход', 'error');
      return;
    }
    set(s => ({
      expenses: s.expenses.map(e => e.id === id ? { ...e, ...data } : e),
    }));
    triggerRecompute();
  },

  removeExpense: async (id) => {
    const { error } = await supabase
      .from('expenses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      useToastStore.getState().show('Не удалось удалить расход', 'error');
      return;
    }
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
    triggerRecompute();
  },

  clearAll: () => set({ expenses: [] }),
}));
