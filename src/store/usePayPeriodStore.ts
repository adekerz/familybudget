import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';
import type { PayPeriod, PlannedTransaction, SinkingFund, PaceResult, PayPeriodSummary } from '../types';

function mapPeriod(r: Record<string, unknown>): PayPeriod {
  return {
    id: r.id as string,
    spaceId: r.space_id as string,
    startDate: r.start_date as string,
    endDate: r.end_date as string,
    salaryAmount: r.salary_amount as number,
    status: r.status as PayPeriod['status'],
    notes: r.notes as string | undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function mapPlanned(r: Record<string, unknown>): PlannedTransaction {
  return {
    id: r.id as string,
    spaceId: r.space_id as string,
    payPeriodId: r.pay_period_id as string | undefined,
    title: r.title as string,
    amount: r.amount as number,
    type: r.type as PlannedTransaction['type'],
    categoryId: r.category_id as string | undefined,
    scheduledDate: r.scheduled_date as string,
    isRecurring: r.is_recurring as boolean,
    recurrenceRule: r.recurrence_rule as PlannedTransaction['recurrenceRule'],
    isFixed: r.is_fixed as boolean,
    status: r.status as PlannedTransaction['status'],
    createdBy: r.created_by as string | undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function mapSinkingFund(r: Record<string, unknown>): SinkingFund {
  const targetDate = new Date(r.target_date as string);
  const today = new Date();
  const monthsLeft = Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const targetAmount = r.target_amount as number;
  const currentSaved = r.current_saved as number;
  return {
    id: r.id as string,
    spaceId: r.space_id as string,
    name: r.name as string,
    targetAmount,
    targetDate: r.target_date as string,
    currentSaved,
    categoryId: r.category_id as string | undefined,
    isActive: r.is_active as boolean,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    monthlyContribution: monthsLeft > 0 ? Math.ceil((targetAmount - currentSaved) / monthsLeft) : 0,
    monthsLeft,
    progressPercent: targetAmount > 0 ? Math.min(100, Math.round((currentSaved / targetAmount) * 100)) : 0,
  };
}

interface PayPeriodStore {
  activePeriod: PayPeriod | null;
  summary: PayPeriodSummary | null;
  isLoading: boolean;
  error: string | null;

  fetchActivePeriod: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  createPayPeriod: (data: {
    startDate: string;
    endDate: string;
    salaryAmount: number;
    notes?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  closePeriod: (periodId: string) => Promise<void>;
  addPlannedTransaction: (data: {
    title: string; amount: number; type: 'income' | 'expense';
    scheduledDate: string; isFixed?: boolean; isRecurring?: boolean;
    categoryId?: string; recurrenceRule?: PlannedTransaction['recurrenceRule'];
  }) => Promise<{ ok: boolean; error?: string }>;
  markTransactionStatus: (id: string, status: PlannedTransaction['status']) => Promise<void>;
  addSinkingFund: (data: {
    name: string; targetAmount: number; targetDate: string; categoryId?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  addSinkingContribution: (fundId: string, amount: number) => Promise<void>;
  subscribeRealtime: () => () => void;
}

export const usePayPeriodStore = create<PayPeriodStore>()((set, get) => ({
  activePeriod: null,
  summary: null,
  isLoading: false,
  error: null,

  fetchActivePeriod: async () => {
    if (get().isLoading) return;
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('get_active_pay_period', { p_space_id: spaceId });
      if (error) throw error;
      const period = data && (data as Record<string, unknown>[]).length > 0
        ? mapPeriod((data as Record<string, unknown>[])[0])
        : null;
      set({ activePeriod: period });
      if (period) await get().refreshSummary();
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshSummary: async () => {
    const { activePeriod } = get();
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!activePeriod || !spaceId) return;

    const [safeRes, paceRes, txRes, fundsRes] = await Promise.all([
      supabase.rpc('calculate_safe_to_spend', { p_period_id: activePeriod.id }),
      supabase.rpc('calculate_pace', { p_period_id: activePeriod.id }),
      supabase.from('planned_transactions')
        .select('*')
        .eq('pay_period_id', activePeriod.id)
        .order('scheduled_date'),
      supabase.from('sinking_funds')
        .select('*')
        .eq('space_id', spaceId)
        .eq('is_active', true)
        .order('target_date'),
    ]);

    const safeToSpend = (safeRes.data as number) ?? 0;
    const pace = (paceRes.data as PaceResult) ?? {
      status: 'on_track' as const,
      expectedSpent: 0,
      actualSpent: 0,
      paceRatio: 0,
      projectedEndBalance: 0,
      daysRemaining: 0,
      variableBudget: 0,
      progressPercent: 0,
    };
    const planned = ((txRes.data ?? []) as Record<string, unknown>[]).map(mapPlanned);
    const funds = ((fundsRes.data ?? []) as Record<string, unknown>[]).map(mapSinkingFund);

    const today = new Date();
    const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingDays7 = planned.filter(tx => {
      const d = new Date(tx.scheduledDate);
      return tx.status === 'pending' && d >= today && d <= in7Days;
    });

    set({
      summary: {
        period: activePeriod,
        safeToSpend,
        pace,
        plannedTransactions: planned,
        sinkingFunds: funds,
        upcomingDays7,
      }
    });
  },

  createPayPeriod: async ({ startDate, endDate, salaryAmount, notes }) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return { ok: false, error: 'No space' };
    const { activePeriod } = get();

    if (activePeriod) {
      await supabase.rpc('close_pay_period', { p_period_id: activePeriod.id });
    }

    const { data, error } = await supabase.from('pay_periods').insert({
      space_id: spaceId,
      start_date: startDate,
      end_date: endDate,
      salary_amount: salaryAmount,
      status: 'active',
      notes,
    }).select().single();

    if (error) {
      useToastStore.getState().show('Ошибка создания периода', 'error');
      return { ok: false, error: error.message };
    }

    const newPeriod = mapPeriod(data as Record<string, unknown>);
    set({ activePeriod: newPeriod });

    if (activePeriod) {
      const { data: recurring } = await supabase
        .from('planned_transactions')
        .select('*')
        .eq('pay_period_id', activePeriod.id)
        .eq('is_recurring', true);

      if (recurring && (recurring as Record<string, unknown>[]).length > 0) {
        const toInsert = (recurring as Record<string, unknown>[]).map(tx => ({
          space_id: spaceId,
          pay_period_id: newPeriod.id,
          title: tx.title,
          amount: tx.amount,
          type: tx.type,
          category_id: tx.category_id,
          scheduled_date: startDate,
          is_recurring: true,
          recurrence_rule: tx.recurrence_rule,
          is_fixed: tx.is_fixed,
          status: 'pending',
        }));
        await supabase.from('planned_transactions').insert(toInsert);
      }
    }

    await get().refreshSummary();
    useToastStore.getState().show('Новый период начат', 'success');
    return { ok: true };
  },

  closePeriod: async (periodId) => {
    await supabase.rpc('close_pay_period', { p_period_id: periodId });
    set({ activePeriod: null, summary: null });
    useToastStore.getState().show('Период закрыт', 'success');
  },

  addPlannedTransaction: async (data) => {
    const { activePeriod } = get();
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return { ok: false, error: 'No space' };

    const { error } = await supabase.from('planned_transactions').insert({
      space_id: spaceId,
      pay_period_id: activePeriod?.id,
      title: data.title,
      amount: data.amount,
      type: data.type,
      category_id: data.categoryId,
      scheduled_date: data.scheduledDate,
      is_recurring: data.isRecurring ?? false,
      recurrence_rule: data.recurrenceRule,
      is_fixed: data.isFixed ?? false,
      status: 'pending',
    });

    if (error) {
      useToastStore.getState().show('Ошибка добавления', 'error');
      return { ok: false, error: error.message };
    }

    await get().refreshSummary();
    useToastStore.getState().show('Добавлено', 'success');
    return { ok: true };
  },

  markTransactionStatus: async (id, status) => {
    await supabase.from('planned_transactions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    await get().refreshSummary();
  },

  addSinkingFund: async (data) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return { ok: false, error: 'No space' };

    const { error } = await supabase.from('sinking_funds').insert({
      space_id: spaceId,
      name: data.name,
      target_amount: data.targetAmount,
      target_date: data.targetDate,
      category_id: data.categoryId,
      current_saved: 0,
      is_active: true,
    });

    if (error) {
      useToastStore.getState().show('Ошибка создания фонда', 'error');
      return { ok: false, error: error.message };
    }

    await get().refreshSummary();
    useToastStore.getState().show('Фонд создан', 'success');
    return { ok: true };
  },

  addSinkingContribution: async (fundId, amount) => {
    const { data: fund } = await supabase.from('sinking_funds')
      .select('current_saved').eq('id', fundId).single();
    if (!fund) return;

    const newAmount = ((fund as Record<string, unknown>).current_saved as number) + amount;
    await supabase.from('sinking_funds')
      .update({ current_saved: newAmount, updated_at: new Date().toISOString() })
      .eq('id', fundId);
    await get().refreshSummary();
    useToastStore.getState().show(`+${amount} ₸ в фонд`, 'success');
  },

  subscribeRealtime: () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return () => {};

    const channel = supabase
      .channel(`pay-period-realtime-${spaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pay_periods', filter: `space_id=eq.${spaceId}` },
        () => { usePayPeriodStore.getState().fetchActivePeriod(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planned_transactions', filter: `space_id=eq.${spaceId}` },
        () => { usePayPeriodStore.getState().refreshSummary(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sinking_funds', filter: `space_id=eq.${spaceId}` },
        () => { usePayPeriodStore.getState().refreshSummary(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
}));
