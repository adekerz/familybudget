import { create } from 'zustand';
import type { Expense, ExpenseType } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

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
    paidBy?: 'husband' | 'wife' | 'shared';
  }) => Promise<void>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
}

function mapRow(r: Record<string, unknown>): Expense {
  return {
    id: r.id as string,
    amount: r.amount as number,
    date: r.date as string,
    categoryId: r.category_id as string,
    type: r.type as ExpenseType,
    description: r.description as string | undefined,
    paidBy: (r.paid_by as 'husband' | 'wife' | 'shared' | undefined) ?? 'shared',
    createdAt: r.created_at as string,
  };
}

export const useExpenseStore = create<ExpenseStore>()((set, _get) => ({
  expenses: [],
  loading: false,

  subscribeRealtime: () => {
    const channel = supabase
      .channel('expenses-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'expenses' }, (payload) => {
        const newExp = mapRow(payload.new as Record<string, unknown>);
        set((s) => {
          if (s.expenses.find((e) => e.id === newExp.id)) return s;
          return { expenses: [newExp, ...s.expenses] };
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'expenses' }, (payload) => {
        const id = (payload.old as Record<string, unknown>).id as string;
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
      })
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
      // map snake_case → camelCase
      set({
        expenses: data.map((r) => ({
          id: r.id,
          amount: r.amount,
          date: r.date,
          categoryId: r.category_id,
          type: r.type,
          description: r.description,
          paidBy: r.paid_by,
          createdAt: r.created_at,
        })) as Expense[],
      });
    }
    set({ loading: false });
  },

  addExpense: async (data) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
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
    await supabase.from('expenses').insert(row);
    // Realtime подписка сама добавит запись в стейт через INSERT событие
  },

  updateExpense: async (id, data) => {
    const row: Record<string, unknown> = {};
    if (data.amount !== undefined) row.amount = data.amount;
    if (data.date !== undefined) row.date = data.date;
    if (data.categoryId !== undefined) row.category_id = data.categoryId;
    if (data.type !== undefined) row.type = data.type;
    if (data.description !== undefined) row.description = data.description;
    if (data.paidBy !== undefined) row.paid_by = data.paidBy;
    await supabase.from('expenses').update(row).eq('id', id);
    set(s => ({
      expenses: s.expenses.map(e => e.id === id ? { ...e, ...data } : e),
    }));
  },

  removeExpense: async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      console.error('Error deleting expense:', error);
      return;
    }
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
  },
}));
