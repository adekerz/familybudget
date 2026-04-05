import { create } from 'zustand';
import type { Debt, DebtPayment } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';

interface DebtStore {
  debts: Debt[];
  payments: DebtPayment[];
  loading: boolean;
  loadDebts: () => Promise<void>;
  addDebt: (data: {
    personName: string;
    direction: Debt['direction'];
    totalAmount: number;
    note?: string;
    dueDate?: string;
  }) => Promise<void>;
  addPayment: (debtId: string, amount: number, note?: string) => Promise<void>;
  closeDebt: (id: string) => Promise<void>;
  clearAll: () => void;
}

function mapDebt(r: Record<string, unknown>): Debt {
  return {
    id: r.id as string,
    spaceId: r.space_id as string,
    personName: r.person_name as string,
    direction: r.direction as Debt['direction'],
    totalAmount: r.total_amount as number,
    paidAmount: r.paid_amount as number,
    note: r.note as string | undefined,
    dueDate: r.due_date as string | undefined,
    isActive: r.is_active as boolean,
    createdAt: r.created_at as string,
  };
}

function mapPayment(r: Record<string, unknown>): DebtPayment {
  return {
    id: r.id as string,
    debtId: r.debt_id as string,
    amount: r.amount as number,
    note: r.note as string | undefined,
    createdAt: r.created_at as string,
  };
}

export const useDebtStore = create<DebtStore>()((set, get) => ({
  debts: [],
  payments: [],
  loading: false,

  loadDebts: async () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    set({ loading: true });
    const [{ data: debtsData }, { data: paymentsData }] = await Promise.all([
      supabase.from('debts').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }),
      supabase.from('debt_payments').select('*').order('created_at', { ascending: false }),
    ]);
    set({
      debts: (debtsData ?? []).map(mapDebt),
      payments: (paymentsData ?? []).map(mapPayment),
      loading: false,
    });
  },

  addDebt: async (data) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    const { data: row, error } = await supabase
      .from('debts')
      .insert({
        space_id: spaceId,
        person_name: data.personName,
        direction: data.direction,
        total_amount: data.totalAmount,
        paid_amount: 0,
        note: data.note ?? null,
        due_date: data.dueDate ?? null,
      })
      .select()
      .single();
    if (error) {
      useToastStore.getState().show('Ошибка сохранения', 'error');
      return;
    }
    set((s) => ({ debts: [mapDebt(row as Record<string, unknown>), ...s.debts] }));
    useToastStore.getState().show('Долг добавлен', 'success');
  },

  addPayment: async (debtId, amount, note) => {
    const { data: row, error } = await supabase
      .from('debt_payments')
      .insert({ debt_id: debtId, amount, note: note ?? null })
      .select()
      .single();
    if (error) {
      useToastStore.getState().show('Ошибка платежа', 'error');
      return;
    }
    // обновить paid_amount в debts
    const debt = get().debts.find((d) => d.id === debtId);
    if (debt) {
      const newPaid = debt.paidAmount + amount;
      const isActive = newPaid < debt.totalAmount;
      await supabase.from('debts').update({ paid_amount: newPaid, is_active: isActive }).eq('id', debtId);
      set((s) => ({
        payments: [mapPayment(row as Record<string, unknown>), ...s.payments],
        debts: s.debts.map((d) =>
          d.id === debtId ? { ...d, paidAmount: newPaid, isActive } : d
        ),
      }));
    }
    useToastStore.getState().show('Платёж сохранён', 'success');
  },

  closeDebt: async (id) => {
    await supabase.from('debts').update({ is_active: false }).eq('id', id);
    set((s) => ({
      debts: s.debts.map((d) => (d.id === id ? { ...d, isActive: false } : d)),
    }));
  },

  clearAll: () => set({ debts: [], payments: [] }),
}));
