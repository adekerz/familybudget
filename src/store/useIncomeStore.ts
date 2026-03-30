import { create } from 'zustand';
import type { Income, IncomeSource } from '../types';
import { distributeIncome } from '../lib/budget';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';

interface IncomeStore {
  incomes: Income[];
  loading: boolean;
  loadIncomes: () => Promise<void>;
  subscribeRealtime: () => () => void;
  clearAll: () => void;
  restoreIncomes: (incomes: Income[]) => void;
  addIncome: (data: {
    amount: number;
    date: string;
    source: IncomeSource;
    note?: string;
    ratios?: { mandatory: number; flexible: number; savings: number };
    fixedTotal?: number;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  removeIncome: (id: string) => Promise<void>;
}

export const useIncomeStore = create<IncomeStore>()((set) => ({
  incomes: [],
  loading: false,

  subscribeRealtime: () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return () => {};
    const channel = supabase
      .channel(`incomes-realtime-${spaceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incomes', filter: `space_id=eq.${spaceId}` },
        (payload) => {
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
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'incomes' },
        (payload) => {
          const id = (payload.old as Record<string, unknown>).id as string;
          set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incomes', filter: `space_id=eq.${spaceId}` },
        (payload) => {
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
          set((s) => ({
            incomes: s.incomes.map((i) => (i.id === income.id ? income : i)),
          }));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },

  loadIncomes: async () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) { set({ loading: false }); return; }
    set({ loading: true });
    const { data } = await supabase
      .from('incomes')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });
    if (data) {
      set({
        incomes: data.map((r: Record<string, unknown>) => ({
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
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return { ok: false, error: 'Нет пространства' };

    const distribution = distributeIncome(data.amount, data.ratios, data.fixedTotal);

    // Оптимистичное добавление
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticItem: Income = {
      id: optimisticId,
      amount: data.amount,
      date: data.date,
      source: data.source,
      note: data.note,
      distribution,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ incomes: [optimisticItem, ...s.incomes] }));

    const row = {
      amount: data.amount,
      date: data.date,
      source: data.source,
      note: data.note,
      distribution,
      space_id: spaceId,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await supabase.from('incomes').insert(row).select().single();

    if (error || !inserted) {
      // Откат оптимистичного изменения
      set((s) => ({ incomes: s.incomes.filter((i) => i.id !== optimisticId) }));
      return { ok: false, error: error?.message ?? 'Ошибка при сохранении дохода' };
    }

    // Заменяем оптимистичную запись реальной
    const realItem: Income = {
      id: (inserted as Record<string, unknown>).id as string,
      amount: (inserted as Record<string, unknown>).amount as number,
      date: (inserted as Record<string, unknown>).date as string,
      source: (inserted as Record<string, unknown>).source as IncomeSource,
      note: (inserted as Record<string, unknown>).note as string | undefined,
      distribution: (inserted as Record<string, unknown>).distribution as Income['distribution'],
      createdAt: (inserted as Record<string, unknown>).created_at as string,
    };
    set((s) => ({
      incomes: s.incomes.map((i) => i.id === optimisticId ? realItem : i),
    }));
    return { ok: true };
  },

  clearAll: () => set({ incomes: [] }),

  restoreIncomes: (incomes) => set({ incomes }),

  removeIncome: async (id) => {
    const { error } = await supabase.from('incomes').delete().eq('id', id);
    if (error) {
      useToastStore.getState().show('Не удалось удалить доход', 'error');
      return;
    }
    set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) }));
  },
}));
