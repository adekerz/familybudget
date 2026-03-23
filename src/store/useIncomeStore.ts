import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Income, IncomeSource } from '../types';
import { distributeIncome } from '../lib/budget';

interface IncomeStore {
  incomes: Income[];
  addIncome: (data: {
    amount: number;
    date: string;
    source: IncomeSource;
    note?: string;
    ratios?: { mandatory: number; flexible: number; savings: number };
  }) => void;
  removeIncome: (id: string) => void;
}

export const useIncomeStore = create<IncomeStore>()(
  persist(
    (set) => ({
      incomes: [],

      addIncome: (data) => {
        const distribution = distributeIncome(data.amount, data.ratios);
        const income: Income = {
          id: crypto.randomUUID(),
          amount: data.amount,
          date: data.date,
          source: data.source,
          note: data.note,
          distribution,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ incomes: [...state.incomes, income] }));
      },

      removeIncome: (id) => {
        set((state) => ({ incomes: state.incomes.filter((i) => i.id !== id) }));
      },
    }),
    { name: 'family-budget-incomes' }
  )
);
