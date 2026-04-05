// src/store/useFinanceEngine.ts
// ЕДИНСТВЕННЫЙ источник расчётных данных. Все UI-компоненты читают отсюда.
//
// Цикл разорван через engineBus:
//   useFinanceEngine → useIncomeStore (статический импорт, цикла нет)
//   useIncomeStore → engineBus → не ссылается на useFinanceEngine
//
import { create } from 'zustand';
import { computeEngineResult, type EngineResult, type FinancePeriod } from '../lib/calculations';
import { registerRecompute } from './engineBus';
import { useIncomeStore } from './useIncomeStore';
import { useExpenseStore } from './useExpenseStore';
import { usePayPeriodStore } from './usePayPeriodStore';

interface FinanceEngineStore {
  result: EngineResult | null;
  lastComputed: number;
  recompute: () => void;
}

export const useFinanceEngine = create<FinanceEngineStore>()((set) => {
  function recompute() {
    const incomes = useIncomeStore.getState().incomes;
    const expenses = useExpenseStore.getState().expenses;
    const payPeriodState = usePayPeriodStore.getState();
    const activePeriod = payPeriodState.activePeriod;
    const plannedTransactions = payPeriodState.summary?.plannedTransactions ?? [];

    const period: FinancePeriod | null = activePeriod ? {
      startDate: activePeriod.startDate,
      endDate: activePeriod.endDate,
      salaryAmount: activePeriod.salaryAmount,
    } : null;

    const result = computeEngineResult({
      period,
      incomes,
      expenses,
      plannedTransactions,
    });

    set({ result, lastComputed: Date.now() });
  }

  // Регистрируем в шине — сторы вызывают через engineBus.triggerRecompute(), не напрямую
  registerRecompute(recompute);

  return {
    result: null,
    lastComputed: 0,
    recompute,
  };
});

// Хук — читает результат из стора
export function useEngine(): EngineResult | null {
  return useFinanceEngine((s) => s.result);
}
