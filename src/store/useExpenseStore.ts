import { create } from 'zustand';
import type { Expense, ExpenseType } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';

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
          const updated = mapRow(payload.new as Record<string, unknown>);
          set((s) => ({
            expenses: s.expenses.map((e) => e.id === updated.id ? updated : e),
          }));
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
      .order('created_at', { ascending: false });
    if (data) {
      set({ expenses: data.map((r) => mapRow(r as Record<string, unknown>)) });
    }
    set({ loading: false });
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
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ expenses: [optimisticItem, ...s.expenses] }));

    const row = {
      amount: data.amount,
      date: data.date,
      category_id: data.categoryId,
      type: data.type,
      description: data.description,
      paid_by: data.paidBy ?? 'shared',
      space_id: spaceId,
      created_at: new Date().toISOString(),
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
  },

  removeExpense: async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      useToastStore.getState().show('Не удалось удалить расход', 'error');
      return;
    }
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
  },

  clearAll: () => set({ expenses: [] }),
}));
