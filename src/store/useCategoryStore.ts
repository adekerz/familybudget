import { create } from 'zustand';
import type { Category, ExpenseType } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { DEFAULT_CATEGORIES } from '../constants/categories';

interface CategoryStore {
  categories: Category[];
  loading: boolean;
  loadCategories: () => Promise<void>;
  subscribeRealtime: () => () => void;
  getCategory: (id: string) => Category | undefined;
  getQuickAccessCategories: () => Category[];
  addCategory: (data: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id'>>) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  setCategoryLimit: (id: string, limit: number | undefined) => Promise<void>;
}

function mapRow(r: Record<string, unknown>): Category {
  return {
    id: r.id as string,
    name: r.name as string,
    type: r.type as ExpenseType,
    icon: r.icon as string,
    color: r.color as string,
    monthlyLimit: r.monthly_limit as number | undefined ?? undefined,
    isQuickAccess: r.is_quick_access as boolean ?? false,
    sortOrder: r.sort_order as number ?? 0,
  };
}

export const useCategoryStore = create<CategoryStore>()((set, get) => ({
  categories: [],
  loading: false,

  subscribeRealtime: () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return () => {};
    const channel = supabase
      .channel(`categories-realtime-${spaceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'categories', filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const cat = mapRow(payload.new);
          set((s) => {
            if (s.categories.find((c) => c.id === cat.id)) return s;
            return { categories: [...s.categories, cat] };
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'categories' },
        (payload) => {
          const id = payload.old.id as string;
          set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'categories', filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const cat = mapRow(payload.new);
          set((s) => ({
            categories: s.categories.map((c) => (c.id === cat.id ? cat : c)),
          }));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },

  loadCategories: async () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) { set({ loading: false }); return; }
    set({ loading: true });
    
    let { data } = await supabase
      .from('categories')
      .select('*')
      .eq('space_id', spaceId)
      .order('sort_order', { ascending: true });

    if (!data || data.length === 0) {
      // Инициализируем дефолтные категории для нового пространства
      const rows = DEFAULT_CATEGORIES.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        icon: c.icon,
        color: c.color,
        monthly_limit: c.monthlyLimit,
        is_quick_access: c.isQuickAccess,
        sort_order: c.sortOrder,
        space_id: spaceId,
      }));
      await supabase.from('categories').insert(rows);
      
      const { data: newData } = await supabase
        .from('categories')
        .select('*')
        .eq('space_id', spaceId)
        .order('sort_order', { ascending: true });
        
      if (newData) data = newData;
      else data = [];
    }

    if (data) {
      set({ categories: data.map(mapRow) });
    }
    set({ loading: false });
  },

  getCategory: (id) => get().categories.find((c) => c.id === id),

  getQuickAccessCategories: () => get().categories.filter((c) => c.isQuickAccess).sort((a, b) => a.sortOrder - b.sortOrder),

  addCategory: async (data) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    const newId = crypto.randomUUID();
    const row = {
      id: newId,
      name: data.name,
      type: data.type,
      icon: data.icon,
      color: data.color,
      monthly_limit: data.monthlyLimit,
      is_quick_access: data.isQuickAccess,
      sort_order: data.sortOrder,
      space_id: spaceId,
    };
    await supabase.from('categories').insert(row);
  },

  updateCategory: async (id, patch) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    const updates: Record<string, unknown> = {};
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.type !== undefined) updates.type = patch.type;
    if (patch.icon !== undefined) updates.icon = patch.icon;
    if (patch.color !== undefined) updates.color = patch.color;
    if (patch.monthlyLimit !== undefined) updates.monthly_limit = patch.monthlyLimit;
    if (patch.isQuickAccess !== undefined) updates.is_quick_access = patch.isQuickAccess;
    if (patch.sortOrder !== undefined) updates.sort_order = patch.sortOrder;
    await supabase.from('categories').update(updates).eq('id', id).eq('space_id', spaceId);
  },

  removeCategory: async (id) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    await supabase.from('categories').delete().eq('id', id).eq('space_id', spaceId);
  },

  setCategoryLimit: async (id, limit) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    await supabase.from('categories').update({ monthly_limit: limit ?? null }).eq('id', id).eq('space_id', spaceId);
  },
}));
