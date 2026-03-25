import { create } from 'zustand';
import type { Income, IncomeSource } from '../types';
import { distributeIncome } from '../lib/budget';
import { supabase } from '../lib/supabase';

interface IncomeStore {
  incomes: Income[];
  loading: boolean;
  loadIncomes: () => Promise<void>;
  subscribeRealtime: () => () => void;
  addIncome: (data: {
    amount: number;
    date: string;
    source: IncomeSource;
    note?: string;
    ratios?: { mandatory: number; flexible: number; savings: number };
    fixedTotal?: number;
  }) => Promise<void>;
  removeIncome: (id: string) => Promise<void>;
}

export const useIncomeStore = create<IncomeStore>()((set) => ({
  incomes: [],
  loading: false,

  subscribeRealtime: () => {
    const channel = supabase
      .channel('incomes-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incomes' }, (payload) => {
        const r = payload.new as Record<string, unknown>;
        const income: Income = {
          id: r.id as string,
          amount: r.amount as number,
          date: r.date as string,
          source: r.source as IncomeSource,
          note: r.note as string | undefined,
          distribution: r.distribution as Income['distribution'],
          createdAt: r.created_at as string,
        };
        set((s) => {
          if (s.incomes.find((i) => i.id === income.id)) return s;
          return { incomes: [income, ...s.incomes] };
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'incomes' }, (payload) => {
        const id = (payload.old as Record<string, unknown>).id as string;
        set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },

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
    const distribution = distributeIncome(data.amount, data.ratios, data.fixedTotal);
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
