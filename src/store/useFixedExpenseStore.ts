import { create } from 'zustand';
import type { FixedExpense } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';

interface FixedExpenseStore {
  fixedExpenses: FixedExpense[];
  loading: boolean;
  reset: () => void;
  loadFixedExpenses: () => Promise<void>;
  subscribeRealtime: () => () => void;
  addFixedExpense: (data: { name: string; amount: number; icon: string }) => Promise<void>;
  updateFixedExpense: (id: string, data: Partial<Pick<FixedExpense, 'name' | 'amount' | 'icon' | 'isActive'>>) => Promise<void>;
  removeFixedExpense: (id: string) => Promise<void>;
  toggleFixedExpense: (id: string) => Promise<void>;
  getActiveTotal: () => number;
}

export const useFixedExpenseStore = create<FixedExpenseStore>()((set, get) => ({
  fixedExpenses: [],
  loading: false,

  subscribeRealtime: () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return () => {};
    const channel = supabase
      .channel(`fixed-expenses-realtime-${spaceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fixed_expenses', filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const r = payload.new as Record<string, unknown>;
          const fe: FixedExpense = {
            id: r.id as string,
            name: r.name as string,
            amount: r.amount as number,
            icon: r.icon as string,
            isActive: r.is_active as boolean,
            createdAt: r.created_at as string,
          };
          set((s) => {
            if (s.fixedExpenses.find((x) => x.id === fe.id)) return s;
            return { fixedExpenses: [...s.fixedExpenses, fe] };
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'fixed_expenses' },
        (payload) => {
          const id = (payload.old as Record<string, unknown>).id as string;
          set((s) => ({ fixedExpenses: s.fixedExpenses.filter((x) => x.id !== id) }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'fixed_expenses', filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const r = payload.new as Record<string, unknown>;
          const fe: FixedExpense = {
            id: r.id as string,
            name: r.name as string,
            amount: r.amount as number,
            icon: r.icon as string,
            isActive: r.is_active as boolean,
            createdAt: r.created_at as string,
          };
          set((s) => ({
            fixedExpenses: s.fixedExpenses.map((x) => (x.id === fe.id ? fe : x)),
          }));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },

  reset: () => set({ fixedExpenses: [], loading: false }),

  loadFixedExpenses: async () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    set({ loading: true });
    const { data } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: true });
    if (data) {
      set({
        fixedExpenses: data.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          name: r.name as string,
          amount: r.amount as number,
          icon: r.icon as string,
          isActive: r.is_active as boolean,
          createdAt: r.created_at as string,
        })),
      });
    }
    set({ loading: false });
  },

  addFixedExpense: async (data) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    const row = {
      name: data.name,
      amount: data.amount,
      icon: data.icon,
      is_active: true,
      space_id: spaceId,
      created_at: new Date().toISOString(),
    };
    const { data: inserted, error } = await supabase
      .from('fixed_expenses')
      .insert(row)
      .select()
      .single();
    if (error) {
      useToastStore.getState().show('Не удалось добавить расход', 'error');
      return;
    }
    if (inserted) {
      const fe: FixedExpense = {
        id: inserted.id,
        name: inserted.name,
        amount: inserted.amount,
        icon: inserted.icon,
        isActive: inserted.is_active,
        createdAt: inserted.created_at,
      };
      set((s) => ({ fixedExpenses: [...s.fixedExpenses, fe] }));
    }
  },

  updateFixedExpense: async (id, data) => {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.amount !== undefined) updates.amount = data.amount;
    if (data.icon !== undefined) updates.icon = data.icon;
    if (data.isActive !== undefined) updates.is_active = data.isActive;

    const { error } = await supabase
      .from('fixed_expenses')
      .update(updates)
      .eq('id', id);
    if (error) {
      useToastStore.getState().show('Не удалось обновить расход', 'error');
      return;
    }
    set((s) => ({
      fixedExpenses: s.fixedExpenses.map((fe) =>
        fe.id === id ? { ...fe, ...data } : fe
      ),
    }));
  },

  removeFixedExpense: async (id) => {
    const { error } = await supabase.from('fixed_expenses').delete().eq('id', id);
    if (error) return;
    set((s) => ({ fixedExpenses: s.fixedExpenses.filter((fe) => fe.id !== id) }));
  },

  toggleFixedExpense: async (id) => {
    const fe = get().fixedExpenses.find((f) => f.id === id);
    if (!fe) return;
    const newActive = !fe.isActive;
    const { error } = await supabase.from('fixed_expenses').update({ is_active: newActive }).eq('id', id);
    if (error) return;
    set((s) => ({
      fixedExpenses: s.fixedExpenses.map((f) =>
        f.id === id ? { ...f, isActive: newActive } : f
      ),
    }));
  },

  getActiveTotal: () => {
    return get().fixedExpenses
      .filter((f) => f.isActive)
      .reduce((sum, f) => sum + f.amount, 0);
  },
}));
