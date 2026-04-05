import { create } from 'zustand';
import type { RecurringExpense } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';
import { useExpenseStore } from './useExpenseStore';

interface RecurringStore {
  items: RecurringExpense[];
  loading: boolean;
  load: () => Promise<void>;
  add: (data: Omit<RecurringExpense, 'id' | 'spaceId' | 'createdAt' | 'lastGenerated'>) => Promise<void>;
  toggle: (id: string, isActive: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Проверяет и генерирует просроченные транзакции (client-side) */
  generateDue: () => Promise<void>;
  clearAll: () => void;
}

function mapRow(r: Record<string, unknown>): RecurringExpense {
  return {
    id: r.id as string,
    spaceId: r.space_id as string,
    name: r.name as string,
    amount: r.amount as number,
    categoryId: r.category_id as string,
    type: r.type as RecurringExpense['type'],
    frequency: r.frequency as RecurringExpense['frequency'],
    dayOfMonth: r.day_of_month as number | undefined,
    dayOfWeek: r.day_of_week as number | undefined,
    accountId: r.account_id as string | undefined,
    isActive: r.is_active as boolean,
    lastGenerated: r.last_generated as string | undefined,
    createdAt: r.created_at as string,
  };
}

function isDue(item: RecurringExpense): boolean {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  if (item.lastGenerated && item.lastGenerated >= todayStr) return false;

  switch (item.frequency) {
    case 'daily':
      return true;
    case 'weekly': {
      const dow = item.dayOfWeek ?? 1;
      return today.getDay() === dow;
    }
    case 'monthly': {
      const dom = item.dayOfMonth ?? 1;
      return today.getDate() === dom;
    }
    case 'yearly': {
      // проверяем что это нужный месяц/день (берём createdAt как эталон)
      const created = new Date(item.createdAt);
      return today.getMonth() === created.getMonth() && today.getDate() === created.getDate();
    }
    default:
      return false;
  }
}

export const useRecurringStore = create<RecurringStore>()((set, get) => ({
  items: [],
  loading: false,

  load: async () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    set({ loading: true });
    const { data } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });
    set({ items: (data ?? []).map(mapRow), loading: false });
  },

  add: async (data) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    const { data: row, error } = await supabase
      .from('recurring_expenses')
      .insert({
        space_id: spaceId,
        name: data.name,
        amount: data.amount,
        category_id: data.categoryId,
        type: data.type,
        frequency: data.frequency,
        day_of_month: data.dayOfMonth ?? null,
        day_of_week: data.dayOfWeek ?? null,
        account_id: data.accountId ?? null,
        is_active: data.isActive,
      })
      .select()
      .single();
    if (error) {
      useToastStore.getState().show('Ошибка сохранения', 'error');
      return;
    }
    set((s) => ({ items: [mapRow(row as Record<string, unknown>), ...s.items] }));
    useToastStore.getState().show('Шаблон добавлен', 'success');
  },

  toggle: async (id, isActive) => {
    await supabase.from('recurring_expenses').update({ is_active: isActive }).eq('id', id);
    set((s) => ({
      items: s.items.map((i) => i.id === id ? { ...i, isActive } : i),
    }));
  },

  remove: async (id) => {
    await supabase.from('recurring_expenses').delete().eq('id', id);
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    useToastStore.getState().show('Шаблон удалён', 'success');
  },

  generateDue: async () => {
    const { items } = get();
    const activeItems = items.filter((i) => i.isActive && isDue(i));
    if (activeItems.length === 0) return;

    const todayStr = new Date().toISOString().slice(0, 10);

    for (const item of activeItems) {
      await useExpenseStore.getState().addExpense({
        amount: item.amount,
        date: todayStr,
        categoryId: item.categoryId,
        type: item.type,
        description: `Авто: ${item.name}`,
        accountId: item.accountId,
      });
      await supabase
        .from('recurring_expenses')
        .update({ last_generated: todayStr })
        .eq('id', item.id);
      set((s) => ({
        items: s.items.map((i) => i.id === item.id ? { ...i, lastGenerated: todayStr } : i),
      }));
    }

    if (activeItems.length > 0) {
      useToastStore.getState().show(
        `Создано ${activeItems.length} плановых расходов`,
        'info',
      );
    }
  },

  clearAll: () => set({ items: [] }),
}));
