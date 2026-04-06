import { useMemo } from 'react';
import { useIncomeStore } from './useIncomeStore';
import { usePlannedFixedStore } from './usePlannedFixedStore';
import { useSettingsStore } from './useSettingsStore';
import { useFinanceEngine } from './useFinanceEngine';
import { getNextIncomeDate, getDaysUntil, parseLocalDate } from '../lib/dates';
import { computeBudgetRatios, computeBudgetBuckets } from '../lib/domain';
import { getDailyLimit, forecastPeriodSpend } from '../lib/budget';
import type { BudgetSummary, BudgetPeriodType, BudgetPeriodRange } from '../types';

const DEFAULT_BUDGET_SUMMARY: BudgetSummary = {
  totalBalance: 0,
  mandatoryBudget: 0,
  mandatorySpent: 0,
  mandatoryRemaining: 0,
  flexibleBudget: 0,
  flexibleSpent: 0,
  flexibleRemaining: 0,
  savingsBudget: 0,
  savingsActual: 0,
  savingsRemaining: 0,
  forecastFlexibleSpend: 0,
  daysUntilNextIncome: 0,
  nextIncomeDate: new Date().toISOString(),
  nextIncomeSource: '',
  nextIncomeAmount: 0,
  dailyFlexibleLimit: 0,
  fixedTotal: 0,
  periodStart: new Date().toISOString(),
};

/**
 * useBudgetSummary — единственная точка потребления бюджетных данных.
 *
 * Авторитетные числа (периоды, доходы, расходы по типам, баланс, daily limit)
 * берутся ТОЛЬКО из useFinanceEngine, избегая двойного счёта.
 *
 * Локально вычисляются только:
 * - Bucket ratios (mandatory/flexible/savings) — из income.distribution
 * - Next-income прогноз — из incomeSources расписания
 */
export function useBudgetSummary(
  _periodType: BudgetPeriodType = 'month',
  _customRange?: BudgetPeriodRange,
): BudgetSummary {
  const incomes = useIncomeStore((s) => s.incomes);
  const fixedItems = usePlannedFixedStore((s) => s.items);
  const incomeSources = useSettingsStore((s) => s.incomeSources);
  const defaultRatios = useSettingsStore((s) => s.defaultRatios);
  const engine = useFinanceEngine((s) => s.result);

  return useMemo(() => {
    // Edge case: engine not yet computed → show zeroes
    if (!engine) return DEFAULT_BUDGET_SUMMARY;

    // Edge case: no incomes → safe prompt state
    if (engine.totalIncome === 0) {
      return {
        ...DEFAULT_BUDGET_SUMMARY,
        periodStart: engine.periodStart,
        // isOverBudget handled by engine.isOverBudget consumers
      };
    }

    // ── Budget buckets ───────────────────────────────────────────────────────
    // Use period incomes to compute weighted ratios from income.distribution.
    // Fallback to defaultRatios (which default to 50/30/20) if no custom ratios.
    const fixedTotal = fixedItems
      .filter((f) => f.isActive)
      .reduce((s, f) => s + f.amount, 0);

    const distributable = Math.max(0, engine.totalIncome - fixedTotal);

    const periodIncomes = incomes.filter(
      (i) => i.date >= engine.periodStart && i.date <= engine.periodEnd,
    );

    // computeBudgetRatios falls back to 0.5/0.3 when no incomes have custom ratios
    const { mandatoryRatio, flexibleRatio } = periodIncomes.length > 0
      ? computeBudgetRatios(periodIncomes)
      : { mandatoryRatio: defaultRatios.mandatory, flexibleRatio: defaultRatios.flexible };

    const { mandatoryBudget, flexibleBudget, savingsBudget } = computeBudgetBuckets(
      distributable, mandatoryRatio, flexibleRatio,
    );

    // ── Spending numbers from engine (single source of truth) ────────────────
    const mandatorySpent = engine.mandatorySpent;
    const flexibleSpent = engine.flexibleSpent;
    const savingsActual = engine.savingsSpent;

    const mandatoryRemaining = mandatoryBudget - mandatorySpent;
    const flexibleRemaining = flexibleBudget - flexibleSpent;
    const savingsRemaining = savingsBudget - savingsActual;

    // Edge case: negative balance → rawBalance is already negative in engine
    const totalBalance = engine.rawBalance;

    // ── Next income ──────────────────────────────────────────────────────────
    const nextIncome = getNextIncomeDate(incomeSources, incomes);
    const daysUntilNextIncome = getDaysUntil(nextIncome.date);
    const dailyFlexibleLimit = getDailyLimit(flexibleRemaining, daysUntilNextIncome);

    // Forecast: use engine.daysPassed + period length from engine
    const forecastFlexibleSpend = forecastPeriodSpend(
      flexibleSpent,
      engine.daysPassed,
      engine.daysTotal,
    );

    // Next income amount: average of last 3 incomes for that source
    const sourceIncomes = incomes
      .filter((i) => i.source === nextIncome.source)
      .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
      .slice(0, 3);
    const nextIncomeAmount = sourceIncomes.length > 0
      ? Math.round(sourceIncomes.reduce((s, i) => s + i.amount, 0) / sourceIncomes.length)
      : 0;

    return {
      totalBalance,
      mandatoryBudget,
      mandatorySpent,
      mandatoryRemaining,
      flexibleBudget,
      flexibleSpent,
      flexibleRemaining,
      savingsBudget,
      savingsActual,
      savingsRemaining,
      forecastFlexibleSpend,
      daysUntilNextIncome,
      nextIncomeDate: nextIncome.date.toISOString(),
      nextIncomeSource: nextIncome.source,
      nextIncomeAmount,
      dailyFlexibleLimit,
      fixedTotal,
      periodStart: engine.periodStart,
    };
  }, [incomes, fixedItems, incomeSources, defaultRatios, engine]);
}
