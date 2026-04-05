# FamilyBudget — Мастер-документ реализации для Claude Code

> **Версия:** 4.0 — Полный рабочий продукт  
> **Агент:** Claude Code (claude-sonnet-4-5 / opus-4)  
> **Суpabase проект:** `wwsjbgdesrtmlqaychzo`  
> **Deploy:** Vercel + PWA  
> **Стек:** React 18 + TypeScript + Vite + Tailwind + Zustand + Supabase

---

## 🔴 КРИТИЧЕСКИ ВАЖНО: читать перед стартом

### Настройка MCP (Supabase)
```bash
# 1. Добавить MCP сервер
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=wwsjbgdesrtmlqaychzo"

# 2. Аутентификация (в обычном терминале, НЕ в IDE)
claude /mcp
# → выбрать supabase → Authenticate

# 3. Установить agent skills
npx skills add supabase/agent-skills
```

### Абсолютные правила (нарушать нельзя)
1. **НИКАКИХ DROP TABLE, TRUNCATE, DELETE без WHERE** — данные в БД сохраняем
2. Все SQL изменения — только через `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`  
3. Не трогать существующую auth логику (auth-password Edge Function, bcrypt, recovery codes)
4. Не трогать RLS политики существующих таблиц — только добавлять новые
5. Все новые компоненты — функциональные с TypeScript типами
6. Стили только через Tailwind CSS классы
7. Supabase запросы только через `src/lib/supabase.ts` клиент
8. После каждого спринта — `npm run build` должен проходить без ошибок

### Существующие таблицы (НЕ УДАЛЯТЬ)
```
app_users, spaces, incomes, expenses, goals, recovery_codes,
login_attempts, passkeys, categories, settings, accounts,
planned_transactions, sinking_funds, pay_periods,
goal_contributions, ai_chats, push_subscriptions
```

---

## 📋 Порядок выполнения

```
ФАЗА 0: SQL миграция (запустить ПЕРВОЙ)
ФАЗА 1: Единый движок расчётов (ОБЯЗАТЕЛЬНА до UI)
ФАЗА 2: QuickAddSheet + банки КЗ + Hero-цифра
ФАЗА 3: PWA + Push уведомления  
ФАЗА 4: Редизайн Dashboard (единый экран)
ФАЗА 5: AI автопилот + онбординг
ФАЗА 6: i18n + полировка
```

---

## ФАЗА 0: SQL миграция v4

### 0.1 Создать файл и выполнить в Supabase SQL Editor

Создать файл `supabase/migrations/017_v4_unified_engine.sql`:

```sql
-- ================================================
-- FamilyBudget v4 Migration
-- SAFE: только ADD COLUMN IF NOT EXISTS
-- ================================================

-- Банк в транзакциях
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS bank text DEFAULT 'kaspi';
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS bank text DEFAULT 'kaspi';

-- Онбординг и локализация
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS onboarded boolean DEFAULT false;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS locale text DEFAULT 'ru';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS notify_morning boolean DEFAULT true;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS notify_evening boolean DEFAULT true;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS notify_idle_hours int DEFAULT 4;

-- AI инсайты (отдельная таблица)
CREATE TABLE IF NOT EXISTS ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE,
  text text NOT NULL,
  type text DEFAULT 'daily', -- daily | alert | goal | onboarding
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS для ai_insights
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "allow all ai_insights" ON ai_insights 
  FOR ALL USING (true);

-- Обновить push_subscriptions если нет device_id
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS device_id text;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_expenses_bank ON expenses(bank);
CREATE INDEX IF NOT EXISTS idx_incomes_bank ON incomes(bank);
CREATE INDEX IF NOT EXISTS idx_ai_insights_space ON ai_insights(space_id, created_at DESC);
```

**После создания файла выполнить через MCP:**
```
Используй Supabase MCP для выполнения SQL миграции из файла supabase/migrations/017_v4_unified_engine.sql
```

---

## ФАЗА 1: Единый движок расчётов

> **Цель:** Устранить конфликт между `useBudgetStore` и `usePayPeriodStore`. Одна формула, один источник правды.

### 1.1 Создать `src/lib/calculations.ts`

Чистые функции без сайд-эффектов. Тестируемые. Никаких импортов сторов.

```typescript
// src/lib/calculations.ts
// Единые расчётные функции — используются ТОЛЬКО отсюда по всему приложению

import type { Income, Expense } from '../types';
import type { PlannedTransaction } from '../types/payPeriod';

export interface FinancePeriod {
  startDate: string;
  endDate: string;
  salaryAmount: number; // из pay_periods
}

export interface EngineResult {
  // Период
  periodStart: string;
  periodEnd: string;
  daysTotal: number;
  daysPassed: number;
  daysRemaining: number;
  
  // Доходы
  totalIncome: number;
  
  // Расходы
  totalExpenses: number;
  mandatorySpent: number;
  flexibleSpent: number;
  savingsSpent: number;
  
  // Планы
  plannedTotal: number;
  plannedPending: number;
  
  // Главные числа
  rawBalance: number;          // totalIncome - totalExpenses
  safeToSpend: number;         // rawBalance - plannedPending
  dailyLimit: number;          // safeToSpend / daysRemaining
  
  // Темп трат
  paceStatus: 'on_track' | 'warning' | 'danger';
  paceRatio: number;           // actualSpent / expectedSpent
  expectedSpent: number;
  
  // Прогноз
  forecastEndBalance: number;
  
  // Распределение по банкам
  bankBreakdown: Record<string, number>;
  
  // Флаги
  hasPeriod: boolean;
  isOverBudget: boolean;
}

export function computeEngineResult(params: {
  period: FinancePeriod | null;
  incomes: Income[];
  expenses: Expense[];
  plannedTransactions: PlannedTransaction[];
}): EngineResult {
  const { period, incomes, expenses, plannedTransactions } = params;
  
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  
  // Если периода нет — используем авто-период (текущий месяц)
  const startDate = period?.startDate ?? getMonthStart();
  const endDate = period?.endDate ?? getMonthEnd();
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const daysTotal = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const daysPassed = Math.max(0, Math.min(daysTotal, 
    Math.ceil((today.getTime() - start.getTime()) / 86400000)
  ));
  const daysRemaining = Math.max(1, daysTotal - daysPassed);
  
  // Фильтрация по периоду
  const periodIncomes = incomes.filter(i => i.date >= startDate && i.date <= endDate);
  const periodExpenses = expenses.filter(e => 
    e.date >= startDate && e.date <= endDate && e.type !== 'transfer'
  );
  
  const totalIncome = period?.salaryAmount > 0 
    ? period.salaryAmount 
    : periodIncomes.reduce((s, i) => s + i.amount, 0);
    
  const totalExpenses = periodExpenses.reduce((s, e) => s + e.amount, 0);
  const mandatorySpent = periodExpenses
    .filter(e => e.type === 'mandatory').reduce((s, e) => s + e.amount, 0);
  const flexibleSpent = periodExpenses
    .filter(e => e.type === 'flexible').reduce((s, e) => s + e.amount, 0);
  const savingsSpent = periodExpenses
    .filter(e => e.type === 'savings').reduce((s, e) => s + e.amount, 0);
  
  // Планы
  const pendingPlanned = plannedTransactions.filter(tx => 
    tx.status === 'pending' && tx.type === 'expense'
  );
  const plannedTotal = plannedTransactions
    .filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  const plannedPending = pendingPlanned.reduce((s, tx) => s + tx.amount, 0);
  
  // Главные числа
  const rawBalance = totalIncome - totalExpenses;
  const safeToSpend = Math.max(0, rawBalance - plannedPending);
  const dailyLimit = daysRemaining > 0 ? Math.floor(safeToSpend / daysRemaining) : 0;
  
  // Темп трат
  const expectedSpent = daysTotal > 0 
    ? totalIncome * (daysPassed / daysTotal) 
    : 0;
  const paceRatio = expectedSpent > 0 ? totalExpenses / expectedSpent : 0;
  const paceStatus = paceRatio > 1.2 ? 'danger' : paceRatio > 1.0 ? 'warning' : 'on_track';
  
  // Прогноз
  const dailySpendRate = daysPassed > 0 ? totalExpenses / daysPassed : 0;
  const forecastEndBalance = totalIncome - (dailySpendRate * daysTotal) - plannedPending;
  
  // Банки
  const bankBreakdown: Record<string, number> = {};
  periodExpenses.forEach(e => {
    const bank = (e as any).bank ?? 'kaspi';
    bankBreakdown[bank] = (bankBreakdown[bank] ?? 0) + e.amount;
  });
  
  return {
    periodStart: startDate,
    periodEnd: endDate,
    daysTotal,
    daysPassed,
    daysRemaining,
    totalIncome,
    totalExpenses,
    mandatorySpent,
    flexibleSpent,
    savingsSpent,
    plannedTotal,
    plannedPending,
    rawBalance,
    safeToSpend,
    dailyLimit,
    paceStatus,
    paceRatio,
    expectedSpent,
    forecastEndBalance,
    bankBreakdown,
    hasPeriod: period !== null,
    isOverBudget: rawBalance < 0,
  };
}

function getMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function getMonthEnd(): string {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return last.toISOString().slice(0, 10);
}

// Форматирование суммы в тенге
export function formatTenge(amount: number): string {
  return new Intl.NumberFormat('ru-KZ', {
    style: 'currency',
    currency: 'KZT',
    maximumFractionDigits: 0,
  }).format(amount);
}
```

### 1.2 Создать `src/store/useFinanceEngine.ts`

```typescript
// src/store/useFinanceEngine.ts
// ЕДИНСТВЕННЫЙ источник расчётных данных. Все UI-компоненты читают отсюда.

import { create } from 'zustand';
import { computeEngineResult, type EngineResult, type FinancePeriod } from '../lib/calculations';
import { useIncomeStore } from './useIncomeStore';
import { useExpenseStore } from './useExpenseStore';
import { usePayPeriodStore } from './usePayPeriodStore';

interface FinanceEngineStore {
  result: EngineResult | null;
  lastComputed: number;
  recompute: () => void;
}

export const useFinanceEngine = create<FinanceEngineStore>()((set) => ({
  result: null,
  lastComputed: 0,
  
  recompute: () => {
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
  },
}));

// Хук с автоматическим пересчётом
export function useEngine(): EngineResult | null {
  return useFinanceEngine((s) => s.result);
}

// Вызывается при изменении данных
export function triggerRecompute() {
  useFinanceEngine.getState().recompute();
}
```

### 1.3 Обновить `src/store/useIncomeStore.ts`

Добавить вызов `triggerRecompute()` после каждой мутации:

```typescript
// В методах addIncome, updateIncome, deleteIncome добавить в конец:
import { triggerRecompute } from './useFinanceEngine';

// После каждого успешного сохранения:
triggerRecompute();
```

### 1.4 Обновить `src/store/useExpenseStore.ts`

Аналогично — добавить `triggerRecompute()` после каждой мутации.

### 1.5 Обновить `src/store/usePayPeriodStore.ts`

В методе `refreshSummary` в конце добавить:
```typescript
import { triggerRecompute } from './useFinanceEngine';
// В конце refreshSummary:
triggerRecompute();
```

### 1.6 Инициализация в `src/main.tsx`

```typescript
// Добавить после инициализации сторов:
import { triggerRecompute } from './store/useFinanceEngine';

// После загрузки данных:
triggerRecompute();
```

---

## ФАЗА 2: Банки КЗ + QuickAddSheet + Hero-цифра

### 2.1 Создать `src/constants/banks.ts`

```typescript
export const BANKS = [
  { id: 'kaspi',   name: 'Kaspi',       color: '#E31E24', bgColor: 'bg-red-100',    textColor: 'text-red-700',    icon: '🔴' },
  { id: 'halyk',   name: 'Halyk Bank',  color: '#009B4E', bgColor: 'bg-green-100',  textColor: 'text-green-700',  icon: '🟢' },
  { id: 'freedom', name: 'Freedom Bank',color: '#0066CC', bgColor: 'bg-blue-100',   textColor: 'text-blue-700',   icon: '🔵' },
  { id: 'forte',   name: 'ForteBank',   color: '#FF6B00', bgColor: 'bg-orange-100', textColor: 'text-orange-700', icon: '🟠' },
  { id: 'other',   name: 'Другой',      color: '#6B7280', bgColor: 'bg-gray-100',   textColor: 'text-gray-700',   icon: '⚪' },
] as const;

export type BankId = typeof BANKS[number]['id'];

export function getBankById(id: string) {
  return BANKS.find(b => b.id === id) ?? BANKS[4];
}
```

### 2.2 Создать `src/components/QuickAddSheet.tsx`

Bottom sheet для быстрого ввода. Требования:
- Нумпад (0-9, backspace) — НЕ `input type=number`
- Горизонтальный скролл банков (цветные чипы)
- Переключатель расход/доход
- Категории в 2 ряда (иконки)
- Кнопка Сохранить disabled пока amount === 0
- `navigator.vibrate(50)` при сохранении
- Анимация slide-up: `transform: translateY(0)` → `translateY(100%)`
- Backdrop с `backdrop-blur-sm`

```typescript
// src/components/QuickAddSheet.tsx

import { useState, useEffect, useCallback } from 'react';
import { X, Delete } from '@phosphor-icons/react';
import { BANKS, type BankId } from '../constants/banks';
import { useExpenseStore } from '../store/useExpenseStore';
import { useIncomeStore } from '../store/useIncomeStore';
import { useCategoryStore } from '../store/useCategoryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToastStore } from '../store/useToastStore';
import { Icon } from '../lib/icons';
import { triggerRecompute } from '../store/useFinanceEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  prefilledAmount?: number;
  prefilledBank?: BankId;
}

type Mode = 'expense' | 'income';

const LAST_BANK_KEY = 'fb_last_bank';
const LAST_CAT_KEY = 'fb_last_category';

export function QuickAddSheet({ isOpen, onClose, prefilledAmount, prefilledBank }: Props) {
  const [digits, setDigits] = useState('');
  const [mode, setMode] = useState<Mode>('expense');
  const [bank, setBank] = useState<BankId>(
    () => (prefilledBank ?? localStorage.getItem(LAST_BANK_KEY) ?? 'kaspi') as BankId
  );
  const [categoryId, setCategoryId] = useState(
    () => localStorage.getItem(LAST_CAT_KEY) ?? ''
  );
  const [saving, setSaving] = useState(false);

  const categories = useCategoryStore(s => s.categories);
  const addExpense = useExpenseStore(s => s.addExpense);
  const addIncome = useIncomeStore(s => s.addIncome);
  const payers = useSettingsStore(s => s.payers);

  const amount = parseInt(digits.replace(/\s/g, ''), 10) || 0;
  const formattedAmount = amount > 0
    ? amount.toLocaleString('ru-KZ')
    : '0';

  const quickCats = categories.filter(c => c.isQuickAccess && c.type !== 'transfer');
  const isValid = amount > 0 && (mode === 'income' || categoryId !== '');

  useEffect(() => {
    if (prefilledAmount) {
      setDigits(String(prefilledAmount));
    }
  }, [prefilledAmount]);

  useEffect(() => {
    if (!isOpen) {
      // сброс при закрытии
      setTimeout(() => {
        setDigits('');
        setSaving(false);
      }, 300);
    }
  }, [isOpen]);

  const handleDigit = useCallback((d: string) => {
    setDigits(prev => {
      const raw = (prev + d).replace(/\D/g, '');
      if (raw.length > 9) return prev;
      return raw;
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setDigits(prev => prev.slice(0, -1));
  }, []);

  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true);

    // Haptic feedback
    if ('vibrate' in navigator) navigator.vibrate(50);

    localStorage.setItem(LAST_BANK_KEY, bank);
    if (categoryId) localStorage.setItem(LAST_CAT_KEY, categoryId);

    try {
      if (mode === 'expense') {
        const cat = categories.find(c => c.id === categoryId);
        await addExpense({
          amount,
          date: new Date().toISOString().slice(0, 10),
          categoryId,
          type: cat?.type ?? 'flexible',
          paidBy: payers[0]?.id ?? 'shared',
          bank,
        } as any);
      } else {
        await addIncome({
          amount,
          date: new Date().toISOString().slice(0, 10),
          source: 'general',
          bank,
        } as any);
      }

      triggerRecompute();
      useToastStore.getState().show('Сохранено ✓', 'success');
      onClose();
    } catch {
      useToastStore.getState().show('Ошибка сохранения', 'error');
      setSaving(false);
    }
  }

  const numpadKeys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '92vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header: режим */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex bg-sand rounded-xl p-1 gap-1">
            {(['expense', 'income'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === m
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-muted'
                }`}
              >
                {m === 'expense' ? 'Расход' : 'Доход'}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-sand">
            <X size={18} className="text-muted" />
          </button>
        </div>

        {/* Amount display */}
        <div className="text-center px-4 py-3">
          <p className={`text-5xl font-bold tracking-tight transition-colors ${
            amount > 0 ? 'text-ink' : 'text-muted/30'
          }`}>
            {formattedAmount} <span className="text-3xl text-muted">₸</span>
          </p>
        </div>

        {/* Bank selector */}
        <div className="overflow-x-auto px-4 py-2">
          <div className="flex gap-2 w-max">
            {BANKS.map(b => (
              <button
                key={b.id}
                onClick={() => setBank(b.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  bank === b.id
                    ? `${b.bgColor} ${b.textColor} border-current`
                    : 'bg-sand text-muted border-transparent'
                }`}
              >
                <span style={{ fontSize: 14 }}>{b.icon}</span>
                {b.name}
              </button>
            ))}
          </div>
        </div>

        {/* Categories (только для расходов) */}
        {mode === 'expense' && (
          <div className="px-4 py-2">
            <div className="grid grid-cols-5 gap-2">
              {quickCats.slice(0, 10).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                    categoryId === cat.id
                      ? 'bg-accent/10 ring-2 ring-accent'
                      : 'bg-sand hover:bg-accent/5'
                  }`}
                >
                  <span className="text-xl leading-none">
                    <Icon name={cat.icon} size={20} />
                  </span>
                  <span className="text-[10px] text-muted truncate w-full text-center">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-1 px-4 py-2">
          {numpadKeys.map((key, i) => (
            <button
              key={i}
              onClick={() => {
                if (key === '⌫') handleBackspace();
                else if (key !== '') handleDigit(key);
              }}
              disabled={key === ''}
              className={`h-14 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
                key === '⌫'
                  ? 'bg-sand text-muted'
                  : key === ''
                  ? 'opacity-0 pointer-events-none'
                  : 'bg-sand text-ink hover:bg-accent/10'
              }`}
            >
              {key === '⌫' ? <Delete size={20} className="mx-auto" /> : key}
            </button>
          ))}
        </div>

        {/* Save button */}
        <div className="px-4 pb-6 pt-1">
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className={`w-full py-4 rounded-2xl text-base font-bold transition-all ${
              isValid && !saving
                ? 'bg-accent text-white active:scale-[0.98] shadow-lg'
                : 'bg-sand text-muted cursor-not-allowed'
            }`}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </>
  );
}
```

### 2.3 Создать `src/components/FAB.tsx`

```typescript
// src/components/FAB.tsx
import { Plus } from '@phosphor-icons/react';

interface Props {
  onClick: () => void;
}

export function FAB({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-[84px] right-4 w-14 h-14 rounded-full bg-accent text-white shadow-lg 
                 flex items-center justify-center active:scale-95 transition-all z-30
                 hover:bg-accent/90"
      aria-label="Добавить транзакцию"
    >
      <Plus size={26} weight="bold" />
    </button>
  );
}
```

### 2.4 Обновить `src/components/layout/Layout.tsx`

Добавить `FAB` и `QuickAddSheet` на все страницы через Layout:

```typescript
import { useState } from 'react';
import { FAB } from '../FAB';
import { QuickAddSheet } from '../QuickAddSheet';

// Внутри Layout компонента добавить:
const [showQuickAdd, setShowQuickAdd] = useState(false);

// В JSX перед закрывающим тегом:
<FAB onClick={() => setShowQuickAdd(true)} />
<QuickAddSheet isOpen={showQuickAdd} onClose={() => setShowQuickAdd(false)} />
```

### 2.5 Обновить Dashboard: Hero-цифра

В `src/pages/DashboardPage.tsx` заменить `BalanceWidget` на новый `HeroCard`:

Создать `src/components/dashboard/HeroCard.tsx`:

```typescript
// src/components/dashboard/HeroCard.tsx
import { useEngine } from '../../store/useFinanceEngine';
import { formatTenge } from '../../lib/calculations';
import { navigateTo } from '../../lib/navigation';
import { Sun, TrendDown, TrendUp } from '@phosphor-icons/react';

export function HeroCard() {
  const engine = useEngine();

  if (!engine) return null;

  const { safeToSpend, dailyLimit, daysRemaining, paceStatus, isOverBudget, hasPeriod } = engine;

  const heroColor = isOverBudget
    ? 'bg-red-600'
    : paceStatus === 'danger'
    ? 'bg-orange-500'
    : 'bg-accent';

  return (
    <div className={`relative overflow-hidden rounded-3xl ${heroColor} p-5 shadow-md`}>
      {/* Декоративный круг */}
      <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />

      <p className="text-[10px] text-white/60 uppercase tracking-widest mb-1">
        Безопасно потратить
      </p>

      <p className="text-4xl font-bold text-white leading-none mb-1">
        {formatTenge(safeToSpend)}
      </p>

      <p className="text-white/70 text-xs mb-4">
        {isOverBudget ? '⚠️ Бюджет превышен' : `${daysRemaining} дн. до конца периода`}
      </p>

      {/* 2 метрики */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/10 border border-white/20 rounded-2xl px-3 py-2">
          <div className="flex items-center gap-1 mb-1">
            <Sun size={11} className="text-white/60" />
            <p className="text-[9px] text-white/60 uppercase tracking-wider">На сегодня</p>
          </div>
          <p className={`text-base font-bold ${dailyLimit < 0 ? 'text-red-200' : 'text-white'}`}>
            {dailyLimit < 0 ? 'Лимит исчерпан' : formatTenge(dailyLimit)}
          </p>
        </div>

        <button
          onClick={() => navigateTo('budget')}
          className="bg-white/10 border border-white/20 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-white/15"
        >
          <div className="flex items-center gap-1 mb-1">
            {paceStatus === 'on_track'
              ? <TrendUp size={11} className="text-white/60" />
              : <TrendDown size={11} className="text-white/60" />
            }
            <p className="text-[9px] text-white/60 uppercase tracking-wider">
              Темп трат
            </p>
          </div>
          <p className={`text-base font-bold ${
            paceStatus === 'danger' ? 'text-red-200'
            : paceStatus === 'warning' ? 'text-yellow-200'
            : 'text-white'
          }`}>
            {paceStatus === 'on_track' ? '✓ В норме'
             : paceStatus === 'warning' ? '⚡ Выше плана'
             : '⚠️ Слишком быстро'}
          </p>
        </button>
      </div>

      {!hasPeriod && (
        <button
          onClick={() => navigateTo('budget')}
          className="mt-3 w-full text-center text-[11px] text-white/60 border border-white/20 rounded-xl py-2"
        >
          Создай период → узнай точную сумму
        </button>
      )}
    </div>
  );
}
```

### 2.6 Обновить `src/pages/DashboardPage.tsx`

Заменить `<BalanceWidget />` на `<HeroCard />`. Убрать дублирующие секции:
- Убрать `QuickExpenseBar` (заменён FAB)
- Убрать отдельный FAB (теперь в Layout)
- Оставить: `HeroCard`, `SetupChecklist` (если не онбординг), `AIInsightCard`, `CategoryCards`, `RecentExpenses`

Итоговая структура Dashboard:
```tsx
<main>
  <HeroCard />
  <SetupChecklist />           {/* скрывается после онбординга */}
  <AIInsightCard />            {/* последний инсайт */}
  <CategoryCards />            {/* распределение по категориям */}
  <RecentExpenses />           {/* последние 10 транзакций */}
</main>
```

### 2.7 Обновить `src/pages/BudgetPage.tsx`

`SafeToSpendWidget` теперь читает из `useEngine()`, а не из `usePayPeriodStore`. Обновить импорт:

```typescript
import { useEngine, formatTenge } from '../store/useFinanceEngine';
// Заменить все обращения к payPeriodSummary.safeToSpend на engine.safeToSpend
```

---

## ФАЗА 3: PWA + Push уведомления

### 3.1 Обновить `vite.config.ts`

```typescript
import { VitePWA } from 'vite-plugin-pwa';

// В plugins добавить:
VitePWA({
  registerType: 'autoUpdate',
  strategies: 'generateSW',
  includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
  manifest: {
    name: 'FamilyBudget',
    short_name: 'Budget',
    description: 'Семейный бюджет для Казахстана',
    theme_color: '#2274A5',
    background_color: '#ffffff',
    display: 'standalone',
    orientation: 'portrait',
    start_url: '/',
    scope: '/',
    lang: 'ru',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
    shortcuts: [
      {
        name: 'Добавить расход',
        url: '/add?type=expense',
        description: 'Быстрый ввод расхода',
      },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-cache',
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
        },
      },
    ],
  },
})
```

### 3.2 Создать `src/hooks/useInstallPWA.ts`

```typescript
// src/hooks/useInstallPWA.ts
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa_install_dismissed_at';
const SHOW_AFTER_DAYS = 3;

export function useInstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = (navigator as any).standalone === true;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    const daysSinceDismiss = dismissed
      ? (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24)
      : Infinity;

    if (isIOSDevice && !isInStandaloneMode && daysSinceDismiss > SHOW_AFTER_DAYS) {
      setIsIOS(true);
      setCanInstall(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      if (daysSinceDismiss > SHOW_AFTER_DAYS) {
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setCanInstall(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setCanInstall(false);
      setDeferredPrompt(null);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setCanInstall(false);
  };

  return { canInstall, isIOS, install, dismiss };
}
```

### 3.3 Создать `src/components/InstallPrompt.tsx`

```typescript
// src/components/InstallPrompt.tsx
import { X, ArrowDown } from '@phosphor-icons/react';
import { useInstallPWA } from '../hooks/useInstallPWA';

export function InstallPrompt() {
  const { canInstall, isIOS, install, dismiss } = useInstallPWA();

  if (!canInstall) return null;

  if (isIOS) {
    return (
      <div className="fixed bottom-24 left-4 right-4 z-40 bg-card border border-border rounded-2xl p-4 shadow-lg">
        <div className="flex items-start justify-between mb-2">
          <p className="text-sm font-semibold text-ink">Установить приложение</p>
          <button onClick={dismiss}><X size={16} className="text-muted" /></button>
        </div>
        <p className="text-xs text-muted">
          Нажми <strong>Поделиться</strong> → <strong>На экран «Домой»</strong>
        </p>
        <div className="flex items-center justify-center mt-2 text-accent animate-bounce">
          <ArrowDown size={20} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 bg-accent text-white rounded-2xl p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Установить FamilyBudget</p>
          <p className="text-xs text-white/70">Работает офлайн, быстрее браузера</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={install} className="bg-white text-accent text-xs font-bold px-3 py-2 rounded-xl">
            Установить
          </button>
          <button onClick={dismiss}><X size={16} className="text-white/70" /></button>
        </div>
      </div>
    </div>
  );
}
```

### 3.4 Создать Supabase Edge Function: `daily-reminder`

```
supabase/functions/daily-reminder/index.ts
```

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  const { type } = await req.json().catch(() => ({ type: 'morning' }));
  
  // Получить все push подписки
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription, user_id');

  if (!subs?.length) return new Response('No subscribers');

  // Для каждого пользователя — считаем данные
  for (const sub of subs) {
    try {
      const { data: user } = await supabase
        .from('app_users')
        .select('space_id, notify_morning, notify_evening')
        .eq('id', sub.user_id)
        .single();

      if (!user) continue;
      if (type === 'morning' && !user.notify_morning) continue;
      if (type === 'evening' && !user.notify_evening) continue;

      // Данные для уведомления
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('space_id', user.space_id)
        .gte('date', new Date().toISOString().slice(0, 10));

      const todaySpent = (expenses ?? []).reduce((s: number, e: any) => s + e.amount, 0);

      const message = type === 'morning'
        ? `☀️ Доброе утро! Сегодня потрачено: ${todaySpent.toLocaleString('ru-KZ')} ₸`
        : `🌙 Итог дня: ${todaySpent.toLocaleString('ru-KZ')} ₸ потрачено`;

      // Отправить через push-notify функцию
      await supabase.functions.invoke('push-notify', {
        body: { subscription: sub.subscription, message, title: 'FamilyBudget' },
      });
    } catch (e) {
      console.error('Push error:', e);
    }
  }

  return new Response('OK');
});
```

Деплой:
```bash
supabase functions deploy daily-reminder
```

---

## ФАЗА 4: Редизайн Dashboard (единый экран)

### 4.1 Обновить навигацию

В `src/components/layout/BottomNav.tsx` переименовать вкладку "Бюджет" в "Планы".

Логика:
- **Dashboard** = "Сегодня": Hero, AI-инсайт, Быстрые категории, Последние транзакции
- **Планы** (BudgetPage) = "Планирование": Период, SafeToSpend, PlannedTransactions, SinkingFunds

Оба экрана читают из `useEngine()` — одинаковые числа.

### 4.2 Создать `src/components/dashboard/BankBreakdown.tsx`

```typescript
// src/components/dashboard/BankBreakdown.tsx
import { useEngine } from '../../store/useFinanceEngine';
import { BANKS, getBankById } from '../../constants/banks';
import { formatTenge } from '../../lib/calculations';

export function BankBreakdown() {
  const engine = useEngine();
  if (!engine) return null;

  const { bankBreakdown, totalExpenses } = engine;
  const entries = Object.entries(bankBreakdown)
    .filter(([, amount]) => amount > 0)
    .sort(([, a], [, b]) => b - a);

  if (!entries.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
        Расходы по банкам
      </h3>
      <div className="space-y-2">
        {entries.map(([bankId, amount]) => {
          const bank = getBankById(bankId);
          const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
          return (
            <div key={bankId}>
              <div className="flex justify-between text-xs mb-1">
                <span className="flex items-center gap-1.5 text-ink font-medium">
                  <span style={{ fontSize: 14 }}>{bank.icon}</span>
                  {bank.name}
                </span>
                <span className="text-muted">{formatTenge(amount)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-sand overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: bank.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## ФАЗА 5: AI автопилот + онбординг

### 5.1 Обновить AI контекст

Создать `src/lib/aiContext.ts`:

```typescript
// src/lib/aiContext.ts
// Единый контекст для AI — берёт данные из useEngine()

import type { EngineResult } from './calculations';
import type { Expense } from '../types';
import type { Category } from '../types';

export function buildAIContext(
  engine: EngineResult,
  recentExpenses: Expense[],
  categories: Category[]
): string {
  const topCategories = recentExpenses
    .reduce((acc: Record<string, number>, e) => {
      const cat = categories.find(c => c.id === e.categoryId);
      const name = cat?.name ?? 'Прочее';
      acc[name] = (acc[name] ?? 0) + e.amount;
      return acc;
    }, {});

  const topCatList = Object.entries(topCategories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, amount]) => `${name}: ${amount.toLocaleString('ru-KZ')} ₸`)
    .join(', ');

  return `
# Контекст семейного бюджета (Казахстан, ₸)

## Текущий период
- Начало: ${engine.periodStart}
- Конец: ${engine.periodEnd}
- Прошло: ${engine.daysPassed} из ${engine.daysTotal} дней (осталось ${engine.daysRemaining})

## Финансы
- Бюджет периода: ${engine.totalIncome.toLocaleString('ru-KZ')} ₸
- Потрачено: ${engine.totalExpenses.toLocaleString('ru-KZ')} ₸
- Безопасно потратить: ${engine.safeToSpend.toLocaleString('ru-KZ')} ₸
- Лимит на день: ${engine.dailyLimit.toLocaleString('ru-KZ')} ₸
- Темп трат: ${engine.paceStatus === 'on_track' ? 'в норме' : engine.paceStatus === 'warning' ? 'выше плана' : 'опасно высокий'}

## Топ расходы
${topCatList}

## Банки
${Object.entries(engine.bankBreakdown).map(([b, a]) => `${b}: ${a.toLocaleString('ru-KZ')} ₸`).join(', ')}

## Запланировано к оплате
Осталось заплатить: ${engine.plannedPending.toLocaleString('ru-KZ')} ₸
  `.trim();
}
```

### 5.2 Обновить `src/hooks/useAIInsight.ts`

Заменить `buildDashboardPrompt` на `buildAIContext` из `src/lib/aiContext.ts`.

### 5.3 Создать `src/pages/OnboardingPage.tsx`

3-шаговый онбординг:

```typescript
// src/pages/OnboardingPage.tsx
// Шаг 1: Выбор банков
// Шаг 2: Ввод зарплаты и дат (создать PayPeriod)
// Шаг 3: Добавить первый расход через QuickAddSheet

// После завершения: UPDATE app_users SET onboarded = true WHERE id = userId
```

Показывать если `user.onboarded === false`. Проверять в `src/App.tsx`.

### 5.4 Создать Edge Function: `ai-insights`

```
supabase/functions/ai-insights/index.ts
```

Логика:
1. Для каждого пространства считать `EngineResult` на стороне сервера через SQL
2. Генерировать инсайт через OpenRouter (тот же промт что в `useAIInsight`)
3. Сохранять в таблицу `ai_insights`
4. Если пользователь не открывал > 8 часов → отправить push

Запускать по cron в Supabase (09:00 и 21:00 UTC+5):
```sql
-- В Supabase: Database → Extensions → pg_cron
SELECT cron.schedule('morning-insights', '0 4 * * *', $$
  SELECT net.http_post(
    url := 'https://wwsjbgdesrtmlqaychzo.supabase.co/functions/v1/ai-insights',
    body := '{"type":"morning"}'::jsonb
  );
$$);
```

### 5.5 Обновить Dashboard: показывать инсайт из БД

```typescript
// В DashboardPage.tsx добавить:
const [dbInsight, setDbInsight] = useState<string | null>(null);

useEffect(() => {
  const spaceId = useAuthStore.getState().user?.spaceId;
  if (!spaceId) return;
  
  supabase
    .from('ai_insights')
    .select('text, created_at')
    .eq('space_id', spaceId)
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
    .then(({ data }) => {
      if (data) setDbInsight(data.text);
    });
}, []);
```

---

## ФАЗА 6: i18n + полировка

### 6.1 Установить i18next

```bash
npm install i18next react-i18next
```

### 6.2 Создать структуру локалей

```
src/i18n/
  index.ts          # инициализация
  locales/
    ru.json         # русский (основной)
    kz.json         # казахский
    en.json         # английский
```

Ключевые ключи:
```json
{
  "safe_to_spend": "Безопасно потратить",
  "daily_limit": "На сегодня",
  "add_expense": "Добавить расход",
  "add_income": "Добавить доход",
  "budget_period": "Период бюджета",
  "days_remaining": "{{count}} дн. до конца",
  "saved": "Сохранено",
  "error": "Ошибка"
}
```

### 6.3 Переключатель языка в Settings

В `src/pages/SettingsPage.tsx` добавить секцию:
```typescript
import { useTranslation } from 'react-i18next';
const { i18n } = useTranslation();

// Кнопки: RU / KZ / EN
// При выборе: i18n.changeLanguage('kz') + localStorage.setItem('fb_locale', 'kz')
```

### 6.4 URL Deep Link обработка

В `src/App.tsx` добавить:

```typescript
useEffect(() => {
  const url = new URL(window.location.href);
  const amount = url.searchParams.get('amount');
  const bank = url.searchParams.get('bank');
  const type = url.searchParams.get('type');
  
  if (amount || bank || type) {
    // Открыть QuickAddSheet с предзаполненными данными
    setDeepLinkParams({ amount: parseInt(amount ?? '0'), bank, type });
    setShowQuickAdd(true);
    // Очистить URL
    window.history.replaceState({}, '', '/');
  }
}, []);
```

### 6.5 Skeleton loaders (уже есть, проверить покрытие)

Убедиться что skeleton есть:
- `DashboardPage` (isLoading → skeleton)
- `BudgetPage` (isLoading → skeleton)
- `ExpensesPage` (isLoading → skeleton)

### 6.6 Pull-to-refresh

Создать `src/hooks/usePullToRefresh.ts`:

```typescript
// При свайпе вниз от верха: вызывать triggerRecompute() + fetchActivePeriod()
```

### 6.7 Lazy loading страниц

В `src/App.tsx`:

```typescript
const BudgetPage = lazy(() => import('./pages/BudgetPage').then(m => ({ default: m.BudgetPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const AssistantPage = lazy(() => import('./pages/AssistantPage').then(m => ({ default: m.AssistantPage })));
const GoalsPage = lazy(() => import('./pages/GoalsPage').then(m => ({ default: m.GoalsPage })));

// Обернуть в Suspense:
<Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" /></div>}>
  {/* pages */}
</Suspense>
```

---

## Виджет iOS (Scriptable)

Создать `public/widget/scriptable.js`:

```javascript
// FamilyBudget Widget for Scriptable
// Установка: скопировать в Scriptable → добавить виджет

const BASE_URL = 'https://familybudget-aa.vercel.app';
const TOKEN_KEY = 'familybudget_session';

const token = Keychain.contains(TOKEN_KEY) ? Keychain.get(TOKEN_KEY) : null;

if (!token) {
  const w = new ListWidget();
  w.addText('⚙️ Откройте FamilyBudget').font = Font.boldSystemFont(14);
  w.addText('для настройки виджета').font = Font.systemFont(12);
  Script.setWidget(w);
  Script.complete();
} else {
  const req = new Request(`${BASE_URL}/api/widget`);
  req.headers = { Authorization: `Bearer ${token}` };
  const data = await req.loadJSON();

  const w = new ListWidget();
  w.backgroundColor = new Color('#2274A5');
  w.url = BASE_URL;

  const title = w.addText('Безопасно потратить');
  title.textColor = new Color('#FFFFFF', 0.7);
  title.font = Font.systemFont(11);

  const amount = w.addText(`₸ ${(data.safeToSpend ?? 0).toLocaleString('ru-KZ')}`);
  amount.textColor = Color.white();
  amount.font = Font.boldSystemFont(24);

  w.addSpacer(6);

  const sub = w.addText(`На день: ₸ ${(data.dailyLimit ?? 0).toLocaleString('ru-KZ')}`);
  sub.textColor = new Color('#FFFFFF', 0.5);
  sub.font = Font.systemFont(11);

  const updated = w.addText(`${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`);
  updated.textColor = new Color('#FFFFFF', 0.3);
  updated.font = Font.systemFont(9);

  Script.setWidget(w);
  Script.complete();
}
```

Создать `src/api/widget.ts` (Vercel API route):

```typescript
// api/widget.ts
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Найти пользователя по session token
  const { data: user } = await supabase
    .from('app_users')
    .select('space_id')
    .eq('id', token) // упрощённо — использовать user_id из session
    .single();

  if (!user) return res.status(401).json({ error: 'Invalid token' });

  // Данные для виджета
  const { data: activePeriod } = await supabase.rpc('get_active_pay_period', {
    p_space_id: user.space_id
  });

  const { data: safeData } = await supabase.rpc('calculate_safe_to_spend', {
    p_period_id: activePeriod?.[0]?.id
  });

  return res.json({
    safeToSpend: safeData ?? 0,
    dailyLimit: 0, // рассчитать аналогично
    updatedAt: new Date().toISOString(),
  });
}
```

---

## Чеклист проверки перед деплоем

### Данные
- [ ] Миграция `017_v4_unified_engine.sql` применена
- [ ] Существующие записи в `incomes`, `expenses`, `pay_periods` не затронуты
- [ ] RLS политики работают (проверить через Supabase Dashboard → Table Editor)

### Единый движок
- [ ] `useFinanceEngine` инициализируется при старте
- [ ] `triggerRecompute()` вызывается после каждой мутации
- [ ] `HeroCard` и `SafeToSpendWidget` показывают одинаковые числа
- [ ] AI-промт использует `buildAIContext()` из `useEngine()`

### QuickAddSheet
- [ ] Открывается за < 1 сек
- [ ] Нумпад работает без лагов
- [ ] Haptic (vibrate 50ms) при сохранении
- [ ] Банк и категория запоминаются через `localStorage`
- [ ] Анимация slide-up плавная

### PWA
- [ ] `npm run build` проходит без ошибок
- [ ] Lighthouse PWA score > 90
- [ ] Установка на iPhone (Safari → Поделиться → На экран «Домой»)
- [ ] Установка на Android (Chrome → Установить)
- [ ] Работает офлайн (показывает кешированные данные)

### Безопасность
- [ ] `bank` поле в expenses/incomes — не валидируется на клиенте, только допустимые значения из `BANKS`
- [ ] API виджета проверяет токен
- [ ] RLS на `ai_insights` не позволяет читать чужие данные

### Сборка
```bash
npm run build
npm run preview  # проверить локально
```

---

## Структура файлов (итог)

```
src/
├── constants/
│   └── banks.ts              # NEW: константы банков КЗ
├── lib/
│   ├── calculations.ts       # NEW: единый расчётный модуль
│   ├── aiContext.ts          # NEW: контекст для AI
│   └── ... (существующие)
├── store/
│   ├── useFinanceEngine.ts   # NEW: единый стор расчётов
│   └── ... (обновлённые: +triggerRecompute)
├── hooks/
│   ├── useInstallPWA.ts      # NEW
│   └── usePullToRefresh.ts   # NEW
├── components/
│   ├── FAB.tsx               # NEW
│   ├── QuickAddSheet.tsx     # NEW
│   ├── InstallPrompt.tsx     # NEW
│   └── dashboard/
│       ├── HeroCard.tsx      # NEW (заменяет BalanceWidget)
│       └── BankBreakdown.tsx # NEW
├── pages/
│   ├── OnboardingPage.tsx    # NEW
│   └── ... (обновлённые)
└── i18n/
    ├── index.ts              # NEW
    └── locales/
        ├── ru.json           # NEW
        ├── kz.json           # NEW
        └── en.json           # NEW

supabase/
├── migrations/
│   └── 017_v4_unified_engine.sql  # NEW
└── functions/
    ├── daily-reminder/       # NEW
    ├── ai-insights/          # NEW
    └── ... (существующие)

public/
└── widget/
    └── scriptable.js         # NEW

api/
└── widget.ts                 # NEW (Vercel API route)
```

---

## Критерий успеха продукта

> Пользователь открыл приложение → увидел одну цифру «Можно потратить» → нажал FAB → внёс расход за 8 секунд → закрыл приложение.  
> Та же цифра на Dashboard и на странице Планов.  
> Вечером получил push с итогом дня.  
> Если эти три сценария работают идеально — продукт готов к пилоту.
