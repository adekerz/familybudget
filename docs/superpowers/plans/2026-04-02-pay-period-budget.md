# Pay-Period Budget Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace calendar-month budget logic with pay-period logic so the balance widget always shows correct remaining money from the last paycheck — regardless of calendar month boundaries.

**Architecture:** The budget period starts on the date of the most recent income received and ends today. Income = all receipts since that date; Expenses = all spending since that date. No carry-forward hacks needed — the model is self-correcting: when a new paycheck arrives, it becomes the new period start.

**Tech Stack:** TypeScript strict, Zustand, React 18, Recharts (AnalyticsPage unaffected — it has its own period picker)

---

## The Bug (for context)

```
Today: April 1
Last salary: March 27 (500 000 ₸)
Spent March 28-31: 80 000 ₸

Old model:
  periodIncomes  = [] (no April income yet) → carry-forward: March 500 000
  periodExpenses = [] (only April expenses, March excluded)
  balance = 500 000 - 0 = 500 000  ← WRONG

New model (pay period):
  periodStart = March 27
  periodIncomes  = [March 27: 500 000]
  periodExpenses = [March 28-31: 80 000] + [April 1: ...]
  balance = 500 000 - fixedTotal - 80 000 = 420 000  ← CORRECT
```

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `src/lib/dates.ts` | Modify | Add `getPayPeriodRange(incomes, today)` |
| `src/lib/domain.ts` | Modify | Delete `computeCarryForward` (no longer needed) |
| `src/lib/budget.ts` | Modify | Rename/update `forecastMonthlySpend` → `forecastPeriodSpend(spent, daysPassed, totalDays)` |
| `src/store/useBudgetStore.ts` | Modify | Replace `getPeriodRange('month')` + carry-forward with `getPayPeriodRange` |
| `src/types/index.ts` | Modify | `BudgetSummary`: replace `isCarryForward: boolean` with `periodStart: string` |
| `src/components/dashboard/BalanceWidget.tsx` | Modify | Replace carry-forward banner with "С [date]" period label |

---

## Task 1: Add `getPayPeriodRange` to dates.ts

**Files:**
- Modify: `src/lib/dates.ts`

- [ ] **Step 1: Add function at the end of the file**

Open `src/lib/dates.ts`. At the very end of the file (after `getPeriodRange`), add:

```typescript
/**
 * Возвращает диапазон бюджетного периода от последнего дохода до сегодня.
 *
 * Логика «зарплата к зарплате»:
 *   periodStart = дата самого последнего дохода в истории
 *   periodEnd   = конец сегодняшнего дня
 *
 * Если доходов нет → fallback на начало текущего календарного месяца.
 */
export function getPayPeriodRange(
  incomes: Income[],
  today = new Date(),
): BudgetPeriodRange {
  if (incomes.length === 0) {
    const y = today.getFullYear();
    const m = today.getMonth();
    return {
      start: new Date(y, m, 1, 0, 0, 0),
      end: new Date(y, m, today.getDate(), 23, 59, 59),
    };
  }

  // Найти дату последнего дохода
  const lastDate = incomes.reduce<Date>((latest, inc) => {
    const d = parseLocalDate(inc.date);
    return d > latest ? d : latest;
  }, parseLocalDate(incomes[0].date));

  return {
    start: new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate(), 0, 0, 0),
    end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59),
  };
}
```

- [ ] **Step 2: Verify TypeScript — no errors**

```bash
cd "C:\Users\esima\OneDrive\Рабочий стол\FAMILY BUDGET"
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/dates.ts
git commit -m "feat(dates): add getPayPeriodRange — pay-period from last income to today"
```

---

## Task 2: Update `forecastPeriodSpend` in budget.ts

**Files:**
- Modify: `src/lib/budget.ts`

The old `forecastMonthlySpend` projected spending to end of calendar month using `today.getDate()` as days passed. This is meaningless in pay-period model. Replace with a function that takes explicit period length.

- [ ] **Step 1: Replace `forecastMonthlySpend` with `forecastPeriodSpend`**

Find (lines 81–88):
```typescript
export function forecastMonthlySpend(spentSoFar: number): number {
  if (spentSoFar <= 0) return 0;
  const today = new Date();
  // Минимальный порог 5 дней чтобы избежать нереалистичных прогнозов в начале месяца
  const daysPassed = Math.max(5, today.getDate());
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return Math.round((spentSoFar / daysPassed) * daysInMonth);
}
```

Replace with:
```typescript
/**
 * Прогноз расходов до конца периода на основе текущего темпа.
 *
 * @param spentSoFar  — потрачено за прошедшие дни периода
 * @param daysPassed  — сколько дней прошло с начала периода (min 1)
 * @param totalDays   — общая длина периода в днях (до следующей зарплаты)
 */
export function forecastPeriodSpend(
  spentSoFar: number,
  daysPassed: number,
  totalDays: number,
): number {
  if (spentSoFar <= 0 || totalDays <= 0) return 0;
  const safePassd = Math.max(1, daysPassed);
  return Math.round((spentSoFar / safePassd) * totalDays);
}
```

- [ ] **Step 2: Check if `forecastMonthlySpend` is used anywhere else**

```bash
grep -r "forecastMonthlySpend" "C:\Users\esima\OneDrive\Рабочий стол\FAMILY BUDGET\src" --include="*.ts" --include="*.tsx"
```

Expected output: only `useBudgetStore.ts` uses it. If other files use it — update them too (but most likely it's only the store).

- [ ] **Step 3: Commit**

```bash
git add src/lib/budget.ts
git commit -m "refactor(budget): replace forecastMonthlySpend with forecastPeriodSpend(spent, daysPassed, totalDays)"
```

---

## Task 3: Update `BudgetSummary` type

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Replace `isCarryForward` with `periodStart`**

Find in `src/types/index.ts` the `BudgetSummary` interface. It currently has:
```typescript
  fixedTotal: number;
  isCarryForward: boolean;
```

Replace those two lines with:
```typescript
  fixedTotal: number;
  periodStart: string; // ISO date — начало текущего бюджетного периода (дата последнего дохода)
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: TypeScript now errors on any file that reads `summary.isCarryForward`. That's intentional — we'll fix those in Tasks 4 and 5.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): BudgetSummary — replace isCarryForward with periodStart string"
```

---

## Task 4: Rewrite `useBudgetStore.ts` with pay-period logic

**Files:**
- Modify: `src/store/useBudgetStore.ts`

This is the core change. Replace the entire file content:

- [ ] **Step 1: Read the current file to understand imports**

Current file has imports from `../lib/dates`, `../lib/domain`, `../lib/budget`. We keep all of them except we drop `computeCarryForward` and add `getPayPeriodRange` + `forecastPeriodSpend`.

- [ ] **Step 2: Replace the entire `useBudgetStore.ts`**

```typescript
import { useIncomeStore } from './useIncomeStore';
import { useExpenseStore } from './useExpenseStore';
import { useFixedExpenseStore } from './useFixedExpenseStore';
import { useSettingsStore } from './useSettingsStore';
import { getPayPeriodRange, getNextIncomeDate, getDaysUntil, parseLocalDate } from '../lib/dates';
import { computeBudgetRatios, computeBudgetBuckets, computeSpending } from '../lib/domain';
import { getDailyLimit, forecastPeriodSpend } from '../lib/budget';
import type { BudgetSummary, BudgetPeriodType, BudgetPeriodRange } from '../types';

export function useBudgetSummary(
  periodType: BudgetPeriodType = 'month',
  customRange?: BudgetPeriodRange,
): BudgetSummary {
  const incomes = useIncomeStore((s) => s.incomes);
  const expenses = useExpenseStore((s) => s.expenses);
  const fixedExpenses = useFixedExpenseStore((s) => s.fixedExpenses);
  const incomeSources = useSettingsStore((s) => s.incomeSources);

  // --- Pay Period ---
  // periodType/customRange игнорируются для главного виджета — он всегда pay-period.
  // Параметры оставлены для обратной совместимости с вызовами из других мест (если появятся).
  const { start, end } = getPayPeriodRange(incomes);

  const periodIncomes = incomes.filter((i) => {
    const d = parseLocalDate(i.date);
    return d >= start && d <= end;
  });

  const periodExpenses = expenses.filter((e) => {
    const d = parseLocalDate(e.date);
    return d >= start && d <= end;
  });

  const fixedTotal = fixedExpenses
    .filter((f) => f.isActive)
    .reduce((s, f) => s + f.amount, 0);

  const totalIncome = periodIncomes.reduce((s, i) => s + i.amount, 0);
  const distributable = Math.max(0, totalIncome - fixedTotal);

  const { mandatoryRatio, flexibleRatio } = computeBudgetRatios(periodIncomes);
  const { mandatoryBudget, flexibleBudget, savingsBudget } = computeBudgetBuckets(
    distributable, mandatoryRatio, flexibleRatio,
  );
  const { mandatorySpent, flexibleSpent, savingsActual } = computeSpending(periodExpenses);

  const mandatoryRemaining = mandatoryBudget - mandatorySpent;
  const flexibleRemaining = flexibleBudget - flexibleSpent;
  const savingsRemaining = savingsBudget - savingsActual;
  const totalBalance = mandatoryRemaining + flexibleRemaining + savingsRemaining;

  const nextIncome = getNextIncomeDate(incomeSources, incomes);
  const daysUntilNextIncome = getDaysUntil(nextIncome.date);

  // Дневной лимит — только от гибкого остатка
  const dailyFlexibleLimit = getDailyLimit(flexibleRemaining, daysUntilNextIncome);

  // Длина текущего периода в днях (от начала периода до следующей зарплаты)
  const periodLengthDays = Math.max(1, getDaysUntil(nextIncome.date, start));
  const daysPassed = Math.max(1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Сумма следующего прихода: среднее по последним 3 приходам от того же источника
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
    forecastFlexibleSpend: forecastPeriodSpend(flexibleSpent, daysPassed, periodLengthDays) + fixedTotal,
    daysUntilNextIncome,
    nextIncomeDate: nextIncome.date.toISOString(),
    nextIncomeSource: nextIncome.source,
    nextIncomeAmount,
    dailyFlexibleLimit,
    fixedTotal,
    periodStart: start.toISOString(),
  };
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: The only errors should be in `BalanceWidget.tsx` (uses `isCarryForward`). Fixed in Task 5.

- [ ] **Step 4: Commit**

```bash
git add src/store/useBudgetStore.ts
git commit -m "feat(budget): replace calendar-month with pay-period (since last income)"
```

---

## Task 5: Update `BalanceWidget.tsx`

**Files:**
- Modify: `src/components/dashboard/BalanceWidget.tsx`

- [ ] **Step 1: Replace carry-forward banner with period label**

Find the carry-forward block (lines 52–57):
```tsx
      {summary.isCarryForward && (
        <div className="flex items-center gap-1.5 mb-2 px-0.5">
          <Clock size={11} className="text-white/60 shrink-0" />
          <p className="text-[10px] text-white/60 leading-none">Бюджет на основе предыдущего дохода</p>
        </div>
      )}
```

Replace with (always visible — shows when the period started):
```tsx
      <div className="flex items-center gap-1.5 mb-2 px-0.5">
        <Clock size={11} className="text-white/60 shrink-0" />
        <p className="text-[10px] text-white/60 leading-none">
          С {new Date(summary.periodStart).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
        </p>
      </div>
```

- [ ] **Step 2: Update the top label from "Остаток бюджета" to "Остаток от зарплаты"**

Find:
```tsx
        <p className="text-[9px] text-white/60 uppercase tracking-widest">Остаток бюджета</p>
```

Replace with:
```tsx
        <p className="text-[9px] text-white/60 uppercase tracking-widest">Остаток от зарплаты</p>
```

- [ ] **Step 3: Remove `Clock` import if it's now always shown (it's used, so keep it)**

The `Clock` import from `@phosphor-icons/react` stays — it's still used. No change needed.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Verify in browser**

1. Open dashboard
2. Widget shows "С 27 марта" (or whatever the last income date was)
3. Balance reflects income minus all spending since that date
4. Add a new expense — balance decreases immediately (optimistic update)

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/BalanceWidget.tsx
git commit -m "feat(widget): show pay-period start date instead of carry-forward banner"
```

---

## Task 6: Remove `computeCarryForward` from domain.ts

**Files:**
- Modify: `src/lib/domain.ts`

- [ ] **Step 1: Delete the `computeCarryForward` function**

Find the entire block (lines 67–93 in current domain.ts):
```typescript
/**
 * Если в текущем периоде нет доходов — берём последний месяц с доходами (до 2 назад).
 * Возвращает effectiveIncomes и флаг isCarryForward.
 */
export function computeCarryForward(
  monthIncomes: Income[],
  allIncomes: Income[],
  today = new Date(),
): { effectiveIncomes: Income[]; isCarryForward: boolean } {
  ...
}
```

Delete this entire function (including its JSDoc comment). The function is no longer called anywhere after Task 4.

- [ ] **Step 2: Check that `computeCarryForward` is not imported anywhere**

```bash
grep -r "computeCarryForward" "C:\Users\esima\OneDrive\Рабочий стол\FAMILY BUDGET\src" --include="*.ts" --include="*.tsx"
```

Expected: no results. If any file still imports it, remove that import.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/domain.ts
git commit -m "refactor(domain): remove computeCarryForward — superseded by getPayPeriodRange"
```

---

## Self-Review

**Spec coverage:**
- ✅ Balance widget shows correct remaining money after last paycheck (Tasks 1, 4, 5)
- ✅ March 28-31 expenses counted correctly on April 1 (Task 4 — period includes all expenses since last income)
- ✅ Forecast updated to use period length instead of calendar month (Task 2)
- ✅ `isCarryForward` removed — no more misleading banner (Tasks 3, 5)
- ✅ No calendar-month hacks in budget calculation (Task 4)
- ✅ Dead code `computeCarryForward` removed (Task 6)

**Edge cases handled:**
- New user (no incomes) → `getPayPeriodRange` fallback to current month start (Task 1)
- Multiple income sources with different dates → `getPayPeriodRange` takes the most recent of all incomes
- Single income source with end-of-month schedule → correctly works: period starts on March 27, includes all March 27-April N spending
- Two paychecks in same period (e.g., advance + salary) → both included in `periodIncomes`, both counted as income

**Placeholder scan:** No TBDs, no "add error handling", all code blocks complete.

**Type consistency:**
- `periodStart: string` in BudgetSummary (Task 3) → read as `summary.periodStart` in BalanceWidget (Task 5) ✓
- `forecastPeriodSpend(spent, daysPassed, totalDays)` defined in Task 2 → called in Task 4 with correct args ✓
- `getPayPeriodRange(incomes, today)` defined in Task 1 → called in Task 4 ✓
