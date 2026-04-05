import { create } from 'zustand';
import type { Deposit } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';

interface DepositStore {
  deposits: Deposit[];
  loading: boolean;
  loadDeposits: () => Promise<void>;
  addDeposit: (data: Omit<Deposit, 'id' | 'spaceId' | 'createdAt'>) => Promise<void>;
  updateDeposit: (id: string, data: Partial<Deposit>) => Promise<void>;
  removeDeposit: (id: string) => Promise<void>;
  clearAll: () => void;
}

function mapRow(r: Record<string, unknown>): Deposit {
  return {
    id: r.id as string,
    spaceId: r.space_id as string,
    name: r.name as string,
    accountId: r.account_id as string | undefined,
    initialAmount: r.initial_amount as number,
    currentAmount: r.current_amount as number,
    interestRate: r.interest_rate as number,
    startDate: r.start_date as string,
    endDate: r.end_date as string | undefined,
    isReplenishable: r.is_replenishable as boolean,
    capitalization: r.capitalization as boolean,
    frequency: r.frequency as Deposit['frequency'],
    createdAt: r.created_at as string,
  };
}

export const useDepositStore = create<DepositStore>()((set) => ({
  deposits: [],
  loading: false,

  loadDeposits: async () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    set({ loading: true });
    const { data } = await supabase
      .from('deposits')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });
    set({ deposits: (data ?? []).map(mapRow), loading: false });
  },

  addDeposit: async (data) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    const { data: row, error } = await supabase
      .from('deposits')
      .insert({
        space_id: spaceId,
        name: data.name,
        account_id: data.accountId ?? null,
        initial_amount: data.initialAmount,
        current_amount: data.currentAmount,
        interest_rate: data.interestRate,
        start_date: data.startDate,
        end_date: data.endDate ?? null,
        is_replenishable: data.isReplenishable,
        capitalization: data.capitalization,
        frequency: data.frequency,
      })
      .select()
      .single();
    if (error) {
      useToastStore.getState().show('Ошибка сохранения', 'error');
      return;
    }
    set((s) => ({ deposits: [mapRow(row as Record<string, unknown>), ...s.deposits] }));
    useToastStore.getState().show('Депозит добавлен', 'success');
  },

  updateDeposit: async (id, data) => {
    await supabase.from('deposits').update({
      current_amount: data.currentAmount,
    }).eq('id', id);
    set((s) => ({
      deposits: s.deposits.map((d) => d.id === id ? { ...d, ...data } : d),
    }));
  },

  removeDeposit: async (id) => {
    await supabase.from('deposits').delete().eq('id', id);
    set((s) => ({ deposits: s.deposits.filter((d) => d.id !== id) }));
    useToastStore.getState().show('Депозит удалён', 'success');
  },

  clearAll: () => set({ deposits: [] }),
}));
