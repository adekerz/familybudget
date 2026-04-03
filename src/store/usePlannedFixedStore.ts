/**
 * Хук для управления "шаблонными" фиксированными расходами.
 * Это planned_transactions с is_fixed=true И pay_period_id IS NULL.
 * Они не привязаны к конкретному периоду — это шаблоны.
 * При создании нового периода они автоматически копируются в него
 * (логика уже есть в usePayPeriodStore.createPayPeriod).
 */
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';

export interface PlannedFixed {
  id: string;
  spaceId: string;
  title: string;
  amount: number;
  categoryId?: string;
  isActive: boolean;   // эмулируем через status: 'pending' = active, 'skipped' = inactive
  createdAt: string;
}

function mapRow(r: Record<string, unknown>): PlannedFixed {
  return {
    id: r.id as string,
    spaceId: r.space_id as string,
    title: r.title as string,
    amount: r.amount as number,
    categoryId: r.category_id as string | undefined,
    isActive: (r.status as string) !== 'skipped',
    createdAt: r.created_at as string,
  };
}

interface PlannedFixedStore {
  items: PlannedFixed[];
  loading: boolean;
  load: () => Promise<void>;
  add: (data: { title: string; amount: number; categoryId?: string }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  toggle: (id: string) => Promise<void>;
  subscribeRealtime: () => () => void;
}

export const usePlannedFixedStore = create<PlannedFixedStore>()((set, get) => ({
  items: [],
  loading: false,

  load: async () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    set({ loading: true });
    const { data } = await supabase
      .from('planned_transactions')
      .select('*')
      .eq('space_id', spaceId)
      .eq('is_fixed', true)
      .is('pay_period_id', null)
      .order('created_at', { ascending: true });
    if (data) {
      set({ items: (data as Record<string, unknown>[]).map(mapRow) });
    }
    set({ loading: false });
  },

  add: async ({ title, amount, categoryId }) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;

    const today = new Date().toISOString().split('T')[0];

    // 1. Создаём шаблон (без pay_period_id)
    const { data: inserted, error } = await supabase
      .from('planned_transactions')
      .insert({
        space_id: spaceId,
        pay_period_id: null,
        title,
        amount,
        type: 'expense',
        category_id: categoryId ?? null,
        scheduled_date: today,
        is_recurring: true,
        is_fixed: true,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !inserted) {
      useToastStore.getState().show('Ошибка добавления', 'error');
      return;
    }

    set(s => ({ items: [...s.items, mapRow(inserted as Record<string, unknown>)] }));

    // 2. Если есть активный период — добавляем туда тоже
    try {
      const { usePayPeriodStore } = await import('./usePayPeriodStore');
      const activePeriod = usePayPeriodStore.getState().activePeriod;
      if (activePeriod) {
        await supabase.from('planned_transactions').insert({
          space_id: spaceId,
          pay_period_id: activePeriod.id,
          title,
          amount,
          type: 'expense',
          category_id: categoryId ?? null,
          scheduled_date: today,
          is_recurring: true,
          is_fixed: true,
          status: 'pending',
        });
        usePayPeriodStore.getState().refreshSummary();
      }
    } catch { /* ignore */ }

    useToastStore.getState().show('Добавлено', 'success');
  },

  remove: async (id) => {
    await supabase.from('planned_transactions').delete().eq('id', id);
    set(s => ({ items: s.items.filter(x => x.id !== id) }));
    useToastStore.getState().show('Удалено', 'success');
  },

  toggle: async (id) => {
    const item = get().items.find(x => x.id === id);
    if (!item) return;
    const newStatus = item.isActive ? 'skipped' : 'pending';
    await supabase
      .from('planned_transactions')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    set(s => ({
      items: s.items.map(x =>
        x.id === id ? { ...x, isActive: !x.isActive } : x
      ),
    }));
  },

  subscribeRealtime: () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return () => {};
    const channel = supabase
      .channel(`planned-fixed-realtime-${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planned_transactions',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload) => {
          const r = payload.new as Record<string, unknown> | undefined;
          // Реагируем только на шаблонные (без pay_period_id)
          if (r && r['pay_period_id'] === null && r['is_fixed'] === true) {
            get().load();
          }
          if (payload.eventType === 'DELETE') {
            const old = payload.old as Record<string, unknown>;
            set(s => ({ items: s.items.filter(x => x.id !== old['id']) }));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },
}));
