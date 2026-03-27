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
      themeId: 'light',
      setTheme: (id) => {
        applyTheme(THEMES[id] ?? THEMES.light);
        set({ themeId: id });
        // Сохранить в профиль пользователя
        useAuthStore.getState().updateTheme(id);
      },
      initTheme: () => {
        const user = useAuthStore.getState().user;
        const themeId = (user?.themeId ?? get().themeId ?? 'light') as ThemeId;
        applyTheme(THEMES[themeId] ?? THEMES.light);
        set({ themeId });
      },
    }),
    { name: 'fb-theme' }
  )
);
