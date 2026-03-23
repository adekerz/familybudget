import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SavingsGoal } from '../types';

interface GoalsStore {
  goals: SavingsGoal[];
  addGoal: (data: Omit<SavingsGoal, 'id' | 'createdAt'>) => void;
  updateGoal: (id: string, updates: Partial<SavingsGoal>) => void;
  removeGoal: (id: string) => void;
  contributeToGoal: (id: string, amount: number) => void;
}

export const useGoalsStore = create<GoalsStore>()(
  persist(
    (set) => ({
      goals: [],

      addGoal: (data) =>
        set((state) => ({
          goals: [
            ...state.goals,
            {
              ...data,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      updateGoal: (id, updates) =>
        set((state) => ({
          goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        })),

      removeGoal: (id) =>
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== id),
        })),

      contributeToGoal: (id, amount) =>
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === id
              ? { ...g, currentAmount: g.currentAmount + amount }
              : g
          ),
        })),
    }),
    { name: 'family-budget-goals' }
  )
);
