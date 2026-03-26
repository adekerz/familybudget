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
      themeId: 'wife',
      setTheme: (id) => {
        applyTheme(THEMES[id] ?? THEMES.wife);
        set({ themeId: id });
        // Сохранить в профиль пользователя
        useAuthStore.getState().updateTheme(id);
      },
      initTheme: () => {
        const user = useAuthStore.getState().user;
        let themeId = (user?.themeId ?? get().themeId) as ThemeId;
        const isFamily = user?.spaceName?.toLowerCase() === 'family';
        // Для не-family пространств wife/husband недоступны — переключаем на light
        if (!isFamily && (themeId === 'wife' || themeId === 'husband')) {
          themeId = 'light';
        }
        applyTheme(THEMES[themeId] ?? THEMES.light);
        set({ themeId });
      },
    }),
    { name: 'fb-theme' }
  )
);
