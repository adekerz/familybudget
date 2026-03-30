import { create } from 'zustand';
import type { SavingsGoal } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

interface GoalsStore {
  goals: SavingsGoal[];
  loading: boolean;
  loadGoals: () => Promise<void>;
  subscribeRealtime: () => () => void;
  clearAll: () => void;
  restoreGoals: (goals: SavingsGoal[]) => void;
  addGoal: (data: Omit<SavingsGoal, 'id' | 'createdAt'>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<SavingsGoal>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  contributeToGoal: (id: string, amount: number) => Promise<void>;
}

function toGoal(r: Record<string, unknown>): SavingsGoal {
  return {
    id: r.id as string,
    name: r.name as string,
    targetAmount: r.target_amount as number,
    currentAmount: r.current_amount as number,
    targetDate: r.target_date as string | undefined,
    icon: r.icon as string,
    color: r.color as string,
    isActive: r.is_active as boolean,
    createdAt: r.created_at as string,
  };
}

export const useGoalsStore = create<GoalsStore>()((set, get) => ({
  goals: [],
  loading: false,

  subscribeRealtime: () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return () => {};
    const channel = supabase
      .channel(`goals-realtime-${spaceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'goals', filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const goal = toGoal(payload.new as Record<string, unknown>);
          set((s) => {
            if (s.goals.find((g) => g.id === goal.id)) return s;
            return { goals: [...s.goals, goal] };
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'goals' },
        (payload) => {
          const id = (payload.old as Record<string, unknown>).id as string;
          set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'goals', filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const goal = toGoal(payload.new as Record<string, unknown>);
          set((s) => ({
            goals: s.goals.map((g) => (g.id === goal.id ? goal : g)),
          }));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },

  loadGoals: async () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) { set({ loading: false }); return; }
    set({ loading: true });
    const { data } = await supabase.from('goals').select('*').eq('space_id', spaceId).order('created_at', { ascending: true });
    if (data) set({ goals: data.map(toGoal) });
    set({ loading: false });
  },

  clearAll: () => set({ goals: [] }),

  restoreGoals: (goals) => set({ goals }),

  addGoal: async (data) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    const { data: row } = await supabase
      .from('goals')
      .insert({
        name: data.name,
        target_amount: data.targetAmount,
        current_amount: data.currentAmount ?? 0,
        target_date: data.targetDate,
        icon: data.icon,
        color: data.color,
        is_active: data.isActive ?? true,
        space_id: spaceId,
      })
      .select()
      .single();
    if (row) set((s) => ({ goals: [...s.goals, toGoal(row)] }));
  },

  updateGoal: async (id, updates) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.targetAmount !== undefined) dbUpdates.target_amount = updates.targetAmount;
    if (updates.currentAmount !== undefined) dbUpdates.current_amount = updates.currentAmount;
    if (updates.targetDate !== undefined) dbUpdates.target_date = updates.targetDate;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    const { error } = await supabase.from('goals').update(dbUpdates).eq('id', id);
    if (error) return;
    set((s) => ({
      goals: s.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    }));
  },

  removeGoal: async (id) => {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) return;
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
  },

  contributeToGoal: async (id, amount) => {
    const goal = get().goals.find((g) => g.id === id);
    if (!goal) return;
    const newAmount = goal.currentAmount + amount;
    const { error } = await supabase.from('goals').update({ current_amount: newAmount }).eq('id', id);
    if (error) return;
    set((s) => ({
      goals: s.goals.map((g) => (g.id === id ? { ...g, currentAmount: newAmount } : g)),
    }));
  },
}));
