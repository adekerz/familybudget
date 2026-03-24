import { create } from 'zustand';
import type { Income, IncomeSource } from '../types';
import { distributeIncome } from '../lib/budget';
import { supabase } from '../lib/supabase';

interface IncomeStore {
  incomes: Income[];
  loading: boolean;
  loadIncomes: () => Promise<void>;
  addIncome: (data: {
    amount: number;
    date: string;
    source: IncomeSource;
    note?: string;
    ratios?: { mandatory: number; flexible: number; savings: number };
  }) => Promise<void>;
  removeIncome: (id: string) => Promise<void>;
}

export const useIncomeStore = create<IncomeStore>()((set) => ({
  incomes: [],
  loading: false,

  loadIncomes: async () => {
    set({ loading: true });
    const { data } = await supabase
      .from('incomes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) set({ incomes: data as Income[] });
    set({ loading: false });
  },

  addIncome: async (data) => {
    const distribution = distributeIncome(data.amount, data.ratios);
    const income: Omit<Income, 'id'> = {
      amount: data.amount,
      date: data.date,
      source: data.source,
      note: data.note,
      distribution,
      createdAt: new Date().toISOString(),
    };
    const { data: row } = await supabase
      .from('incomes')
      .insert(income)
      .select()
      .single();
    if (row) set((s) => ({ incomes: [row as Income, ...s.incomes] }));
  },

  removeIncome: async (id) => {
    await supabase.from('incomes').delete().eq('id', id);
    set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) }));
  },
}));
