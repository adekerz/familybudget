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
    if (data) Object.assign(data, { map: data.map }); // type assert below
    if (data) {
      set({
        incomes: data.map((r: any) => ({
          id: r.id,
          amount: r.amount,
          date: r.date,
          source: r.source,
          note: r.note,
          distribution: r.distribution,
          createdAt: r.created_at,
        })) as Income[],
      });
    }
    set({ loading: false });
  },

  addIncome: async (data) => {
    const distribution = distributeIncome(data.amount, data.ratios);
    const row = {
      amount: data.amount,
      date: data.date,
      source: data.source,
      note: data.note,
      distribution,
      created_at: new Date().toISOString(),
    };
    const { data: inserted, error } = await supabase
      .from('incomes')
      .insert(row)
      .select()
      .single();
      
    if (error) {
      console.error('Error inserting income:', error);
      return;
    }

    if (inserted) {
      const income: Income = {
        id: inserted.id,
        amount: inserted.amount,
        date: inserted.date,
        source: inserted.source,
        note: inserted.note,
        distribution: inserted.distribution,
        createdAt: inserted.created_at,
      };
      set((s) => ({ incomes: [income, ...s.incomes] }));
    }
  },

  removeIncome: async (id) => {
    await supabase.from('incomes').delete().eq('id', id);
    set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) }));
  },
}));
