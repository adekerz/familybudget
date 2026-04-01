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
    accountId?: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  removeIncome: (id: string) => Promise<void>;
}

function mapRow(r: Record<string, unknown>): Income {
  return {
    id: r.id as string,
    amount: r.amount as number,
    date: r.date as string,
    source: r.source as IncomeSource,
    note: r.note as string | undefined,
    distribution: (r.distribution as Income['distribution']) ?? { mandatory: 0, flexible: 0, savings: 0 },
    accountId: r.account_id as string | undefined,
    createdAt: r.created_at as string,
  };
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
          const income = mapRow(payload.new as Record<string, unknown>);
          set((s) => {
            // Пропускаем если уже есть запись с этим id (реальная) или если ещё
            // висит optimistic-запись с тем же amount+date+source (race condition guard)
            if (s.incomes.find((i) => i.id === income.id)) return s;
            const hasOptimistic = s.incomes.some(
              (i) =>
                i.id.startsWith('optimistic-') &&
                i.amount === income.amount &&
                i.date === income.date &&
                i.source === income.source
            );
            if (hasOptimistic) return s;
            return { incomes: [income, ...s.incomes] };
          });
        }
      )
      .on(
        'postgres_changes',
        // Фильтр по space_id обязателен — иначе DELETE других пространств удаляет наши записи
        { event: 'DELETE', schema: 'public', table: 'incomes', filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const id = (payload.old as Record<string, unknown>).id as string;
          set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incomes', filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          if (raw.deleted_at) {
            const id = raw.id as string;
            set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) }));
            return;
          }
          const income = mapRow(raw);
          set((s) => {
            const existing = s.incomes.find((i) => i.id === income.id);
            if (existing?.deletedAt) return s;
            return {
              incomes: s.incomes.map((i) => (i.id === income.id ? income : i)),
            };
          });
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
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (data) {
      set({ incomes: data.map((r: Record<string, unknown>) => mapRow(r)) });
    }
    set({ loading: false });
  },

  addIncome: async (data) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return { ok: false, error: 'Нет пространства' };

    const distribution = distributeIncome(data.amount, data.ratios, data.fixedTotal);

    // Оптимистичное добавление
    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticItem: Income = {
      id: optimisticId,
      amount: data.amount,
      date: data.date,
      source: data.source,
      note: data.note,
      distribution,
      accountId: data.accountId,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ incomes: [optimisticItem, ...s.incomes] }));

    const row = {
      amount: data.amount,
      date: data.date,
      source: data.source,
      note: data.note,
      distribution,
      account_id: data.accountId ?? null,
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
    const realItem = mapRow(inserted as Record<string, unknown>);
    set((s) => ({
      incomes: s.incomes.map((i) => i.id === optimisticId ? realItem : i),
    }));
    return { ok: true };
  },

  clearAll: () => set({ incomes: [] }),

  restoreIncomes: (incomes) => set({ incomes }),

  removeIncome: async (id) => {
    const { error } = await supabase
      .from('incomes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      useToastStore.getState().show('Не удалось удалить доход', 'error');
      return;
    }
    set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) }));
  },
}));
