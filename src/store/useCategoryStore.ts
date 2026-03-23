import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category } from '../types';
import { DEFAULT_CATEGORIES } from '../constants/categories';

interface CategoryStore {
  categories: Category[];
  getCategory: (id: string) => Category | undefined;
  getQuickAccessCategories: () => Category[];
}

export const useCategoryStore = create<CategoryStore>()(
  persist(
    (_set, get) => ({
      categories: DEFAULT_CATEGORIES,

      getCategory: (id: string) => {
        return get().categories.find((c) => c.id === id);
      },

      getQuickAccessCategories: () => {
        return get().categories.filter((c) => c.isQuickAccess).sort((a, b) => a.sortOrder - b.sortOrder);
      },
    }),
    { name: 'family-budget-categories' }
  )
);
