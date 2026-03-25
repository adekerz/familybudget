import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { THEMES, applyTheme, type ThemeId } from '../lib/themes';

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
        applyTheme(THEMES[id]);
        set({ themeId: id });
      },
      initTheme: () => {
        applyTheme(THEMES[get().themeId]);
      },
    }),
    { name: 'fb-theme' }
  )
);
