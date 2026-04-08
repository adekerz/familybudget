import { create } from 'zustand';
import type { RecurringTransaction } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';

interface FOSRecurringStore {
  items: RecurringTransaction[];
  loading: boolean;
  load: () => Promise<void>;
  add: (data: Omit<RecurringTransaction, 'id' | 'spaceId' | 'createdAt'>) => Promise<string | null>;
  update: (id: string, data: Partial<RecurringTransaction>) => Promise<void>;
  toggle: (id: string, isActive: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => void;
}

function mapRow(r: Record<string, unknown>): RecurringTransaction {
  return {
    id: r.id as string,
    spaceId: r.space_id as string,
    amount: r.amount as number,
    fromAccountId: r.from_account_id as string | undefined,
    toAccountId: r.to_account_id as string | undefined,
    type: r.type as RecurringTransaction['type'],
    categoryId: r.category_id as string,
    description: r.description as string | undefined,
    paidBy: (r.paid_by as string) ?? 'shared',
    frequency: r.frequency as RecurringTransaction['frequency'],
    dayOfMonth: r.day_of_month as number | undefined,
    dayOfWeek: r.day_of_week as number | undefined,
    startDate: r.start_date as string,
    endDate: r.end_date as string | undefined,
    nextOccurrence: r.next_occurrence as string,
    isActive: r.is_active as boolean,
    isAutoConfirm: r.is_auto_confirm as boolean,
    autoAdjustAmount: r.auto_adjust_amount as boolean,
    isMandatory: r.is_mandatory as boolean,
    priority: (r.priority as number) ?? 1,
    createdAt: r.created_at as string,
  };
}

export const useFOSRecurringStore = create<FOSRecurringStore>()((set) => ({
  items: [],
  loading: false,

  load: async () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    set({ loading: true });
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('space_id', spaceId)
      .order('next_occurrence', { ascending: true });
    if (error) {
      useToastStore.getState().show('Не удалось загрузить периодические операции', 'error');
    } else {
      set({ items: (data ?? []).map((r) => mapRow(r as Record<string, unknown>)) });
    }
    set({ loading: false });
  },

  add: async (data) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return null;
    const { data: row, error } = await supabase
      .from('recurring_transactions')
      .insert({
        space_id: spaceId,
        amount: data.amount,
        from_account_id: data.fromAccountId ?? null,
        to_account_id: data.toAccountId ?? null,
        type: data.type,
        category_id: data.categoryId,
        description: data.description ?? null,
        paid_by: data.paidBy ?? 'shared',
        frequency: data.frequency,
        day_of_month: data.dayOfMonth ?? null,
        day_of_week: data.dayOfWeek ?? null,
        start_date: data.startDate,
        end_date: data.endDate ?? null,
        next_occurrence: data.nextOccurrence,
        is_active: data.isActive ?? true,
        is_auto_confirm: data.isAutoConfirm ?? false,
        auto_adjust_amount: data.autoAdjustAmount ?? false,
        is_mandatory: data.isMandatory ?? true,
        priority: data.priority ?? 1,
      })
      .select()
      .single();

    if (error) {
      useToastStore.getState().show('Не удалось сохранить', 'error');
      return null;
    }
    const item = mapRow(row as Record<string, unknown>);
    set((s) => ({ items: [...s.items, item] }));
    return item.id;
  },

  update: async (id, data) => {
    const row: Record<string, unknown> = {};
    if (data.amount !== undefined) row.amount = data.amount;
    if (data.description !== undefined) row.description = data.description;
    if (data.nextOccurrence !== undefined) row.next_occurrence = data.nextOccurrence;
    if (data.isActive !== undefined) row.is_active = data.isActive;
    if (data.isMandatory !== undefined) row.is_mandatory = data.isMandatory;

    const { error } = await supabase.from('recurring_transactions').update(row).eq('id', id);
    if (error) {
      useToastStore.getState().show('Не удалось обновить', 'error');
      return;
    }
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...data } : i)),
    }));
  },

  toggle: async (id, isActive) => {
    const { error } = await supabase
      .from('recurring_transactions')
      .update({ is_active: isActive })
      .eq('id', id);
    if (error) {
      useToastStore.getState().show('Не удалось изменить статус', 'error');
      return;
    }
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, isActive } : i)),
    }));
  },

  remove: async (id) => {
    const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
    if (error) {
      useToastStore.getState().show('Не удалось удалить', 'error');
      return;
    }
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },

  clearAll: () => set({ items: [] }),
}));
