import { create } from 'zustand';
import type { CategoryTarget } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';

interface CategoryTargetStore {
  targets: CategoryTarget[];
  loading: boolean;
  load: () => Promise<void>;
  upsert: (data: Omit<CategoryTarget, 'id' | 'spaceId' | 'createdAt'>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => void;
}

function mapRow(r: Record<string, unknown>): CategoryTarget {
  return {
    id: r.id as string,
    spaceId: r.space_id as string,
    categoryId: r.category_id as string,
    targetAmount: r.target_amount as number,
    period: (r.period as CategoryTarget['period']) ?? 'monthly',
    targetDate: r.target_date as string | undefined,
    targetType: (r.target_type as CategoryTarget['targetType']) ?? 'limit',
    allowRollover: r.allow_rollover as boolean,
    rolloverAmount: (r.rollover_amount as number) ?? 0,
    isActive: r.is_active as boolean,
    createdAt: r.created_at as string,
  };
}

export const useCategoryTargetStore = create<CategoryTargetStore>()((set) => ({
  targets: [],
  loading: false,

  load: async () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    set({ loading: true });
    const { data, error } = await supabase
      .from('category_targets')
      .select('*')
      .eq('space_id', spaceId)
      .eq('is_active', true);
    if (error) {
      useToastStore.getState().show('Не удалось загрузить цели категорий', 'error');
    } else {
      set({ targets: (data ?? []).map((r) => mapRow(r as Record<string, unknown>)) });
    }
    set({ loading: false });
  },

  upsert: async (data) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;

    const { data: row, error } = await supabase
      .from('category_targets')
      .upsert(
        {
          space_id: spaceId,
          category_id: data.categoryId,
          target_amount: data.targetAmount,
          period: data.period ?? 'monthly',
          target_date: data.targetDate ?? null,
          target_type: data.targetType ?? 'limit',
          allow_rollover: data.allowRollover ?? false,
          rollover_amount: data.rolloverAmount ?? 0,
          is_active: true,
        },
        { onConflict: 'space_id,category_id,period' }
      )
      .select()
      .single();

    if (error) {
      useToastStore.getState().show('Не удалось сохранить цель', 'error');
      return;
    }
    const target = mapRow(row as Record<string, unknown>);
    set((s) => {
      const filtered = s.targets.filter(
        (t) => !(t.categoryId === target.categoryId && t.period === target.period)
      );
      return { targets: [...filtered, target] };
    });
  },

  remove: async (id) => {
    const { error } = await supabase
      .from('category_targets')
      .update({ is_active: false })
      .eq('id', id);
    if (error) {
      useToastStore.getState().show('Не удалось удалить цель', 'error');
      return;
    }
    set((s) => ({ targets: s.targets.filter((t) => t.id !== id) }));
  },

  clearAll: () => set({ targets: [] }),
}));
