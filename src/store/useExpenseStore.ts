import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Expense, ExpenseType } from '../types';

interface ExpenseStore {
  expenses: Expense[];
  addExpense: (data: {
    amount: number;
    date: string;
    categoryId: string;
    type: ExpenseType;
    description?: string;
    paidBy?: 'husband' | 'wife' | 'shared';
  }) => void;
  removeExpense: (id: string) => void;
}

export const useExpenseStore = create<ExpenseStore>()(
  persist(
    (set) => ({
      expenses: [],

      addExpense: (data) => {
        const expense: Expense = {
          id: crypto.randomUUID(),
          amount: data.amount,
          date: data.date,
          categoryId: data.categoryId,
          type: data.type,
          description: data.description,
          paidBy: data.paidBy ?? 'shared',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ expenses: [...state.expenses, expense] }));
      },

      removeExpense: (id) => {
        set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }));
      },
    }),
    { name: 'family-budget-expenses' }
  )
);
