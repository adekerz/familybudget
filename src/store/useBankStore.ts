import { create } from 'zustand';
import type { Bank } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';

interface BankStore {
  banks: Bank[];
  loading: boolean;
  load: () => Promise<void>;
  add: (data: Omit<Bank, 'id' | 'spaceId' | 'createdAt'>) => Promise<string | null>;
  update: (id: string, data: Partial<Omit<Bank, 'id' | 'spaceId' | 'createdAt'>>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => void;
}

function mapRow(r: Record<string, unknown>): Bank {
  return {
    id: r.id as string,
    spaceId: r.space_id as string,
    name: r.name as string,
    bankType: (r.bank_type as Bank['bankType']) ?? 'bank',
    color: (r.color as string) ?? '#00B894',
    icon: (r.icon as string) ?? 'building-2',
    bik: r.bik as string | undefined,
    isActive: r.is_active as boolean,
    createdAt: r.created_at as string,
    sortOrder: (r.sort_order as number) ?? 0,
  };
}

export const useBankStore = create<BankStore>()((set) => ({
  banks: [],
  loading: false,

  load: async () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    set({ loading: true });
    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .eq('space_id', spaceId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) {
      useToastStore.getState().show('Не удалось загрузить банки', 'error');
    } else {
      set({ banks: (data ?? []).map((r) => mapRow(r as Record<string, unknown>)) });
    }
    set({ loading: false });
  },

  add: async (data) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return null;
    const { data: row, error } = await supabase
      .from('banks')
      .insert({
        space_id: spaceId,
        name: data.name,
        bank_type: data.bankType ?? 'bank',
        color: data.color ?? '#00B894',
        icon: data.icon ?? 'building-2',
        bik: data.bik ?? null,
        sort_order: data.sortOrder ?? 0,
      })
      .select()
      .single();
    if (error) {
      useToastStore.getState().show('Не удалось добавить банк', 'error');
      return null;
    }
    const bank = mapRow(row as Record<string, unknown>);
    set((s) => ({ banks: [...s.banks, bank] }));
    return bank.id;
  },

  update: async (id, data) => {
    const row: Record<string, unknown> = {};
    if (data.name !== undefined) row.name = data.name;
    if (data.color !== undefined) row.color = data.color;
    if (data.icon !== undefined) row.icon = data.icon;
    if (data.bik !== undefined) row.bik = data.bik;
    if (data.isActive !== undefined) row.is_active = data.isActive;

    const { error } = await supabase.from('banks').update(row).eq('id', id);
    if (error) {
      useToastStore.getState().show('Не удалось обновить банк', 'error');
      return;
    }
    set((s) => ({
      banks: s.banks.map((b) => (b.id === id ? { ...b, ...data } : b)),
    }));
  },

  remove: async (id) => {
    const { error } = await supabase.from('banks').update({ is_active: false }).eq('id', id);
    if (error) {
      useToastStore.getState().show('Не удалось удалить банк', 'error');
      return;
    }
    set((s) => ({ banks: s.banks.filter((b) => b.id !== id) }));
  },

  clearAll: () => set({ banks: [] }),
}));
