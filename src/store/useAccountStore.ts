import { create } from 'zustand';
import type { Account } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';

interface AccountStore {
  accounts: Account[];
  loading: boolean;
  loadAccounts: () => Promise<void>;
  subscribeRealtime: () => () => void;
  addAccount: (data: { name: string; currency?: string; balance?: number }) => Promise<void>;
  updateAccount: (id: string, data: Partial<Pick<Account, 'name' | 'currency' | 'isActive' | 'balance'>>) => Promise<void>;
  /** Атомарно изменить баланс счёта (delta > 0 = пополнение, < 0 = расход) */
  adjustBalance: (accountId: string, delta: number) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  clearAll: () => void;
}

function mapRow(r: Record<string, unknown>): Account {
  return {
    id: r.id as string,
    spaceId: r.space_id as string,
    name: r.name as string,
    currency: r.currency as string,
    balance: (r.balance as number) ?? 0,
    isActive: r.is_active as boolean,
    createdAt: r.created_at as string,
  };
}

export const useAccountStore = create<AccountStore>()((set) => ({
  accounts: [],
  loading: false,

  subscribeRealtime: () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return () => {};
    const channel = supabase
      .channel(`accounts-realtime-${spaceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'accounts', filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const account = mapRow(payload.new as Record<string, unknown>);
          set((s) => {
            if (s.accounts.find((a) => a.id === account.id)) return s;
            return { accounts: [...s.accounts, account] };
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'accounts', filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const account = mapRow(payload.new as Record<string, unknown>);
          set((s) => ({
            accounts: s.accounts.map((a) => (a.id === account.id ? account : a)),
          }));
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'accounts', filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const id = (payload.old as Record<string, unknown>).id as string;
          set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },

  loadAccounts: async () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) { set({ loading: false }); return; }
    set({ loading: true });
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('space_id', spaceId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) {
      useToastStore.getState().show('Не удалось загрузить счета', 'error');
    } else if (data) {
      set({ accounts: data.map((r) => mapRow(r as Record<string, unknown>)) });
    }
    set({ loading: false });
  },

  addAccount: async (data) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    const { error } = await supabase.from('accounts').insert({
      space_id: spaceId,
      name: data.name,
      currency: data.currency ?? 'KZT',
      balance: data.balance ?? 0,
    });
    if (error) useToastStore.getState().show('Не удалось создать счёт', 'error');
  },

  adjustBalance: async (accountId, delta) => {
    if (!accountId || delta === 0) return;
    // Оптимистичное обновление в store
    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === accountId ? { ...a, balance: a.balance + delta } : a
      ),
    }));
    // Атомарное обновление в БД через RPC (если migration 021 применена)
    // Fallback на обычный UPDATE если RPC недоступна
    const { error } = await supabase.rpc('adjust_account_balance', {
      p_account_id: accountId,
      p_delta: delta,
    });
    if (error) {
      // Fallback: читаем текущий баланс и обновляем
      const { data: acc } = await supabase
        .from('accounts').select('balance').eq('id', accountId).single();
      if (acc) {
        await supabase.from('accounts')
          .update({ balance: (acc as { balance: number }).balance + delta })
          .eq('id', accountId);
      }
    }
  },

  updateAccount: async (id, data) => {
    const row: Record<string, unknown> = {};
    if (data.name !== undefined) row.name = data.name;
    if (data.currency !== undefined) row.currency = data.currency;
    if (data.isActive !== undefined) row.is_active = data.isActive;
    if (data.balance !== undefined) row.balance = data.balance;
    const { error } = await supabase.from('accounts').update(row).eq('id', id);
    if (error) {
      useToastStore.getState().show('Не удалось обновить счёт', 'error');
      return;
    }
    set((s) => ({
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...data } : a)),
    }));
  },

  removeAccount: async (id) => {
    // soft deactivate — не удаляем физически, так как могут быть связанные транзакции
    const { error } = await supabase.from('accounts').update({ is_active: false }).eq('id', id);
    if (error) {
      useToastStore.getState().show('Не удалось удалить счёт', 'error');
      return;
    }
    set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }));
  },

  clearAll: () => set({ accounts: [] }),
}));
