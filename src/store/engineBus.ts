// src/store/engineBus.ts
// Промежуточный модуль для triggerRecompute — разрывает циклическую зависимость
// между useFinanceEngine и useIncomeStore/useExpenseStore/usePayPeriodStore

let _recompute: (() => void) | null = null;

export function registerRecompute(fn: () => void) {
  _recompute = fn;
}

export function triggerRecompute() {
  _recompute?.();
}
