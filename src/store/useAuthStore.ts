import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore {
  isAuthenticated: boolean;
  currentUser: string | null;
  whitelist: string[];
  login: (phone: string) => boolean;
  logout: () => void;
  addToWhitelist: (phone: string) => void;
  removeFromWhitelist: (phone: string) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      currentUser: null,
      whitelist: [],

      login: (phone: string) => {
        const { whitelist } = get();
        const normalized = phone.replace(/\D/g, '');

        // First login — add to whitelist as admin
        if (whitelist.length === 0) {
          set({
            isAuthenticated: true,
            currentUser: normalized,
            whitelist: [normalized],
          });
          return true;
        }

        if (whitelist.includes(normalized)) {
          set({ isAuthenticated: true, currentUser: normalized });
          return true;
        }

        return false;
      },

      logout: () => {
        set({ isAuthenticated: false, currentUser: null });
      },

      addToWhitelist: (phone: string) =>
        set((state) => ({
          whitelist: state.whitelist.includes(phone)
            ? state.whitelist
            : [...state.whitelist, phone],
        })),

      removeFromWhitelist: (phone: string) =>
        set((state) => ({
          whitelist: state.whitelist.filter((p) => p !== phone),
        })),
    }),
    { name: 'family-budget-auth' }
  )
);
