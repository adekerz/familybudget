import { create } from 'zustand';
import type { Expense, ExpenseType } from '../types';
import { supabase } from '../lib/supabase';

interface ExpenseStore {
  expenses: Expense[];
  loading: boolean;
  loadExpenses: () => Promise<void>;
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

export const useExpenseStore = create<ExpenseStore>()((set) => ({
  expenses: [],
  loading: false,

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
