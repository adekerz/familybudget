import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface AuthStore {
  isAuthenticated: boolean;
  currentUser: string | null;
  whitelist: string[];
  login: (phone: string) => Promise<boolean>;
  logout: () => void;
  loadWhitelist: () => Promise<void>;
  addToWhitelist: (phone: string) => Promise<void>;
  removeFromWhitelist: (phone: string) => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      currentUser: null,
      whitelist: [],

      loadWhitelist: async () => {
        const { data } = await supabase.from('whitelist').select('phone');
        if (data) set({ whitelist: data.map((r) => r.phone) });
      },

      login: async (phone: string) => {
        const normalized = phone.replace(/\D/g, '');
        const { data: rows } = await supabase.from('whitelist').select('phone');
        const list = rows?.map((r) => r.phone) ?? [];

        if (list.length === 0) {
          await supabase.from('whitelist').insert({ phone: normalized });
          set({ isAuthenticated: true, currentUser: normalized, whitelist: [normalized] });
          return true;
        }

        if (list.includes(normalized)) {
          set({ isAuthenticated: true, currentUser: normalized, whitelist: list });
          return true;
        }

        return false;
      },

      logout: () => set({ isAuthenticated: false, currentUser: null }),

      addToWhitelist: async (phone: string) => {
        await supabase.from('whitelist').insert({ phone });
        set((s) => ({ whitelist: [...s.whitelist, phone] }));
      },

      removeFromWhitelist: async (phone: string) => {
        await supabase.from('whitelist').delete().eq('phone', phone);
        set((s) => ({ whitelist: s.whitelist.filter((p) => p !== phone) }));
      },
    }),
    { name: 'family-budget-auth', partialize: (s) => ({ isAuthenticated: s.isAuthenticated, currentUser: s.currentUser }) }
  )
);
