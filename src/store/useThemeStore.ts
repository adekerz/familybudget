import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { THEMES, applyTheme, type ThemeId } from '../lib/themes';
import { useAuthStore } from './useAuthStore';

interface ThemeStore {
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      themeId: 'dark',
      setTheme: (id) => {
        applyTheme(THEMES[id] ?? THEMES.dark);
        set({ themeId: id });
        useAuthStore.getState().updateTheme(id);
      },
      initTheme: () => {
        const user = useAuthStore.getState().user;
        const stored = get().themeId;
        const themeId = (user?.themeId as ThemeId | undefined) ?? stored ?? 'dark';
        const safeId: ThemeId = themeId === 'light' ? 'light' : 'dark';
        applyTheme(THEMES[safeId]);
        set({ themeId: safeId });
      },
    }),
    { name: 'fb-theme' }
  )
);
