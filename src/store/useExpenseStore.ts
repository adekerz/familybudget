import { create } from 'zustand';
import type { Expense, ExpenseType } from '../types';
import { supabase } from '../lib/supabase';

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
    set({ loading: true });
    const { data } = await supabase
      .from('expenses')
      .select('*')
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
    const row = {
      amount: data.amount,
      date: data.date,
      category_id: data.categoryId,
      type: data.type,
      description: data.description,
      paid_by: data.paidBy ?? 'shared',
      created_at: new Date().toISOString(),
    };
    const { data: inserted } = await supabase
      .from('expenses')
      .insert(row)
      .select()
      .single();
    if (inserted) {
      const expense: Expense = {
        id: inserted.id,
        amount: inserted.amount,
        date: inserted.date,
        categoryId: inserted.category_id,
        type: inserted.type,
        description: inserted.description,
        paidBy: inserted.paid_by,
        createdAt: inserted.created_at,
      };
      set((s) => ({ expenses: [expense, ...s.expenses] }));
    }
  },

  removeExpense: async (id) => {
    await supabase.from('expenses').delete().eq('id', id);
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
  },
}));
