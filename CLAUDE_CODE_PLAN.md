# FamilyBudget — Claude Code Implementation Plan

## Project Summary

Personal family budget web app for husband + wife.
- Husband salary: 29th of each month
- Wife advance: 15th, salary: last day of month
- General income: 10th of each month
- Separate spending, shared savings deposit
- Currency: Tenge (₸)
- Auth: phone number whitelist (no password)
- Core UX: enter income → app distributes by formula → shows limits per category → user enters expenses quickly → app tracks what's left

---

## Tech Stack

```
Frontend:  React 18 + TypeScript + Vite
Styling:   Tailwind CSS v3
State:     Zustand (lightweight, no boilerplate)
Storage:   localStorage (MVP) → Supabase (Phase 2)
Charts:    Recharts
Icons:     Lucide React
Auth:      Phone whitelist in localStorage (MVP) → Supabase Auth (Phase 2)
Deploy:    Vercel (free)
PWA:       vite-plugin-pwa
```

---

## Project Structure

```
family-budget/
├── public/
│   ├── icons/           # PWA icons
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── ui/          # Reusable UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── Badge.tsx
│   │   ├── layout/
│   │   │   ├── BottomNav.tsx
│   │   │   └── Header.tsx
│   │   ├── dashboard/
│   │   │   ├── BalanceWidget.tsx      # "Сегодня: X₸, до зарплаты N дней"
│   │   │   ├── DailyLimitCard.tsx     # Дневной лимит свободных денег
│   │   │   ├── CategoryCards.tsx      # 3 карточки: Обязательные/Гибкие/Копилка
│   │   │   └── RecentExpenses.tsx     # Последние 5 трат
│   │   ├── income/
│   │   │   ├── IncomeForm.tsx         # Добавить доход
│   │   │   ├── IncomeList.tsx
│   │   │   └── DistributionPreview.tsx  # Показать как распределится
│   │   ├── expenses/
│   │   │   ├── QuickExpenseBar.tsx    # Быстрые кнопки-пресеты
│   │   │   ├── ExpenseForm.tsx        # Полная форма
│   │   │   └── ExpenseList.tsx
│   │   ├── goals/
│   │   │   ├── GoalCard.tsx
│   │   │   ├── GoalForm.tsx
│   │   │   └── GoalsList.tsx
│   │   └── analytics/
│   │       ├── SpendingChart.tsx
│   │       └── CategoryBreakdown.tsx
│   ├── pages/
│   │   ├── AuthPage.tsx               # Ввод номера телефона
│   │   ├── DashboardPage.tsx
│   │   ├── IncomePage.tsx
│   │   ├── ExpensesPage.tsx
│   │   ├── GoalsPage.tsx
│   │   └── AnalyticsPage.tsx
│   ├── store/
│   │   ├── useAuthStore.ts            # Auth state + phone whitelist
│   │   ├── useIncomeStore.ts          # Income entries + distribution
│   │   ├── useExpenseStore.ts         # Expense entries
│   │   ├── useCategoryStore.ts        # Categories + limits
│   │   ├── useGoalsStore.ts           # Savings goals
│   │   └── useBudgetStore.ts          # Computed: balances, periods, daily limits
│   ├── lib/
│   │   ├── budget.ts                  # Core financial formulas
│   │   ├── periods.ts                 # Income period calculations
│   │   ├── distribution.ts            # 50/30/20 logic
│   │   ├── storage.ts                 # localStorage helpers
│   │   └── dates.ts                   # Date utilities (last day of month etc)
│   ├── types/
│   │   └── index.ts                   # All TypeScript interfaces
│   ├── constants/
│   │   └── categories.ts              # Default categories list
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Data Types (src/types/index.ts)

```typescript
// ── AUTH ──────────────────────────────────────────────
export interface AuthState {
  isAuthenticated: boolean;
  currentUser: string | null; // phone number
  whitelist: string[];         // allowed phone numbers
}

// ── INCOME ────────────────────────────────────────────
export type IncomeSource =
  | 'husband_salary'    // 29-е
  | 'wife_advance'      // 15-е
  | 'wife_salary'       // последний день
  | 'general';          // 10-е

export interface Income {
  id: string;
  amount: number;           // in tenge
  date: string;             // ISO date string
  source: IncomeSource;
  note?: string;
  distribution: Distribution; // auto-calculated on save
  createdAt: string;
}

export interface Distribution {
  mandatory: number;   // 50% by default
  flexible: number;    // 30% by default
  savings: number;     // 20% by default
  customRatios?: {
    mandatory: number;
    flexible: number;
    savings: number;
  };
}

// ── EXPENSES ──────────────────────────────────────────
export type ExpenseType = 'mandatory' | 'flexible' | 'savings';

export interface Expense {
  id: string;
  amount: number;
  date: string;
  categoryId: string;
  description?: string;
  type: ExpenseType;
  paidBy: 'husband' | 'wife' | 'shared';
  createdAt: string;
}

// ── CATEGORIES ────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  type: ExpenseType;
  icon: string;          // emoji
  color: string;         // hex
  monthlyLimit?: number; // optional override
  isQuickAccess: boolean; // shown in QuickExpenseBar
  sortOrder: number;
}

// ── SAVINGS GOALS ────────────────────────────────────
export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  icon: string;
  color: string;
  isActive: boolean;
  createdAt: string;
}

// ── PERIOD ────────────────────────────────────────────
export interface Period {
  id: string;
  startDate: string;
  endDate: string;           // next income date - 1
  expectedIncome: number;
  actualIncome: number;
  source: IncomeSource;
}

// ── BUDGET COMPUTED ───────────────────────────────────
export interface BudgetSummary {
  totalBalance: number;
  mandatoryBudget: number;
  mandatorySpent: number;
  mandatoryRemaining: number;
  flexibleBudget: number;
  flexibleSpent: number;
  flexibleRemaining: number;
  savingsBudget: number;
  savingsActual: number;
  daysUntilNextIncome: number;
  nextIncomeDate: string;
  nextIncomeSource: IncomeSource;
  dailyFlexibleLimit: number;  // flexibleRemaining / daysUntilNextIncome
}
```

---

## Core Financial Formulas (src/lib/budget.ts)

```typescript
// 1. DISTRIBUTION — распределение при вводе дохода
export function distributeIncome(
  amount: number,
  ratios = { mandatory: 0.5, flexible: 0.3, savings: 0.2 }
): Distribution {
  return {
    mandatory: Math.round(amount * ratios.mandatory),
    flexible: Math.round(amount * ratios.flexible),
    savings: Math.round(amount * ratios.savings),
  };
}

// 2. DAILY LIMIT — дневной лимит свободных денег
export function getDailyLimit(
  flexibleRemaining: number,
  daysUntilNextIncome: number
): number {
  if (daysUntilNextIncome <= 0) return flexibleRemaining;
  return Math.floor(flexibleRemaining / daysUntilNextIncome);
}

// 3. NEXT INCOME DATE — следующая дата прихода денег
// Income dates: 10, 15, 29, last day of month
export function getNextIncomeDates(today: Date): Array<{date: Date, source: IncomeSource}> {
  // Returns all 4 upcoming income dates sorted by proximity
}

// 4. DAYS UNTIL — сколько дней до следующего прихода
export function getDaysUntil(targetDate: Date, fromDate = new Date()): number {
  const diff = targetDate.getTime() - fromDate.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// 5. GOAL MONTHLY CONTRIBUTION — сколько откладывать в месяц на цель
export function getGoalMonthlyContribution(
  targetAmount: number,
  currentAmount: number,
  targetDate: Date
): number {
  const monthsLeft = getMonthsUntil(targetDate);
  if (monthsLeft <= 0) return targetAmount - currentAmount;
  return Math.ceil((targetAmount - currentAmount) / monthsLeft);
}

// 6. PERIOD BALANCE — баланс за период
export function getPeriodBalance(
  incomes: Income[],
  expenses: Expense[],
  startDate: Date,
  endDate: Date
): number {
  const periodIncomes = incomes.filter(i => isInPeriod(i.date, startDate, endDate));
  const periodExpenses = expenses.filter(e => isInPeriod(e.date, startDate, endDate));
  const totalIn = periodIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalOut = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  return totalIn - totalOut;
}
```

---

## Default Categories (src/constants/categories.ts)

```typescript
// MANDATORY (обязательные) — из 50%
{ id: 'rent',       name: 'Аренда/ипотека',  icon: '🏠', type: 'mandatory', isQuickAccess: false }
{ id: 'utilities',  name: 'Коммуналка',       icon: '💡', type: 'mandatory', isQuickAccess: false }
{ id: 'groceries',  name: 'Продукты',         icon: '🛒', type: 'mandatory', isQuickAccess: true  }
{ id: 'transport',  name: 'Транспорт',        icon: '🚗', type: 'mandatory', isQuickAccess: true  }
{ id: 'medicine',   name: 'Медицина',         icon: '💊', type: 'mandatory', isQuickAccess: false }
{ id: 'internet',   name: 'Интернет/связь',   icon: '📱', type: 'mandatory', isQuickAccess: false }

// FLEXIBLE (гибкие) — из 30%
{ id: 'cafe',       name: 'Кафе/кофе',        icon: '☕', type: 'flexible',  isQuickAccess: true  }
{ id: 'dining',     name: 'Рестораны',        icon: '🍽️', type: 'flexible',  isQuickAccess: true  }
{ id: 'clothes',    name: 'Одежда',           icon: '👗', type: 'flexible',  isQuickAccess: false }
{ id: 'fun',        name: 'Развлечения',      icon: '🎬', type: 'flexible',  isQuickAccess: true  }
{ id: 'sports',     name: 'Спорт',            icon: '🏃', type: 'flexible',  isQuickAccess: false }
{ id: 'gifts',      name: 'Подарки',          icon: '🎁', type: 'flexible',  isQuickAccess: false }
{ id: 'other_flex', name: 'Прочее',           icon: '💸', type: 'flexible',  isQuickAccess: false }

// SAVINGS (накопления) — из 20%
{ id: 'deposit',    name: 'Общий депозит',    icon: '🏦', type: 'savings',   isQuickAccess: false }
{ id: 'emergency',  name: 'Подушка',          icon: '🛡️', type: 'savings',   isQuickAccess: false }
{ id: 'goals',      name: 'Цели',             icon: '🎯', type: 'savings',   isQuickAccess: false }
```

---

## Pages Specification

### AuthPage
- Shows app logo + name
- Input for phone number (Kazakhstan format: +7 XXX XXX XX XX)
- On submit: checks against whitelist in localStorage
- If match → set isAuthenticated = true, save to sessionStorage
- Admin mode: if whitelist is empty, first login creates admin, can add more numbers
- No password. No SMS. Just whitelist check.

### DashboardPage (main screen)

**Layout (top to bottom):**

1. **Header bar**: "FamilyBudget" + today's date + avatar/logout icon
2. **Balance Hero Widget** (large card, prominent):
   - "Свободных денег: 32,500 ₸"
   - "Дневной лимит: 2,700 ₸/день"
   - "До зарплаты мужа: 8 дней (29 окт)"
3. **Three budget cards** (horizontal scroll or 3-column):
   - 🔵 Обязательные: 45,000 из 50,000 ₸ (progress bar, 90%)
   - 🟢 Гибкие: 18,500 из 30,000 ₸ (62%)
   - 🟡 Накопления: 20,000 ₸ (отложено ✓)
4. **Quick expense buttons** (isQuickAccess categories):
   - [🛒 Продукты] [☕ Кофе] [🚗 Транспорт] [🍽️ Ресторан] [🎬 Развлечения] [+ Другое]
   - Tap → amount input modal → save → done
5. **Recent transactions** (last 5, with category icon + amount + date)
6. **Next incomes timeline** (small, at bottom):
   - 10 окт → 15 окт → 29 окт → 31 окт

### IncomePage
- List of all incomes grouped by month
- "+ Добавить доход" button
- On add: modal with amount + source selector + date
- After amount entered: SHOW DISTRIBUTION PREVIEW before saving
  ```
  Введено: 150,000 ₸
  ─────────────────────
  🔵 Обязательные (50%): 75,000 ₸
  🟢 Гибкие (30%):       45,000 ₸
  🟡 Накопления (20%):   30,000 ₸
  
  [Изменить %]  [Подтвердить →]
  ```
- Optional: adjust ratios with sliders before confirming

### ExpensesPage
- Full expense history with filters (by type, category, date range)
- Search by description
- Edit/delete expense
- Grouped by day

### GoalsPage
- Grid of goal cards
- Each card: icon, name, progress bar, "X₸ / Y₸", "осталось M месяцев"
- "+ Новая цель" 
- Tap goal → detail: history of contributions, "+ Пополнить"
- Auto-calculate: "Нужно откладывать: 12,500 ₸/мес"

### AnalyticsPage
- Period selector: текущий месяц / прошлый / 3 месяца
- Bar chart: доходы vs расходы по неделям
- Donut chart: разбивка по категориям
- Stats cards: Всего потрачено / Сэкономлено / Самая крупная трата

---

## Sprint Plan

### Sprint 1 — Foundation (Days 1–7)
**Goal: Working app, can enter income and see distribution**

Tasks:
1. `npm create vite@latest family-budget -- --template react-ts`
2. Install deps: `tailwindcss zustand lucide-react recharts`
3. Configure Tailwind with custom theme (colors, fonts)
4. Create all TypeScript types in `src/types/index.ts`
5. Implement `src/lib/budget.ts` with all formulas
6. Implement `src/lib/dates.ts` (next income dates, days until, last day of month)
7. Create `src/lib/storage.ts` (localStorage read/write with type safety)
8. Build `useAuthStore.ts` — phone whitelist auth
9. Build `AuthPage.tsx` — phone input, whitelist check
10. Build `useIncomeStore.ts` + `useExpenseStore.ts`
11. Build `IncomeForm.tsx` with `DistributionPreview.tsx`
12. Build basic `DashboardPage.tsx` with hero balance widget
13. Build `BottomNav.tsx` with 4 tabs

**Deliverable: Can auth, add income, see distribution, see balance**

---

### Sprint 2 — Quick Expenses (Days 8–14)
**Goal: Fast expense entry, category limits tracking**

Tasks:
1. Build `QuickExpenseBar.tsx` — tap category → amount modal → save
2. Build full `ExpenseForm.tsx` for detailed entry
3. Build `CategoryCards.tsx` with progress bars (spent / budget)
4. Implement `useBudgetStore.ts` — computed budget summary
5. Add daily limit calculation to dashboard
6. Add "next income dates" timeline to dashboard
7. Build `useCategoryStore.ts` with default categories
8. Build `ExpensesPage.tsx` with history and filters
9. Add warning visual when category is over 80% spent
10. Add "over budget" alert card on dashboard

**Deliverable: Full income + expense cycle works. Dashboard shows real data.**

---

### Sprint 3 — Goals + PWA (Days 15–21)
**Goal: Savings goals, mobile-ready**

Tasks:
1. Build `useGoalsStore.ts`
2. Build `GoalCard.tsx`, `GoalForm.tsx`, `GoalsList.tsx`
3. Add contribution flow: tap goal → enter amount → deducted from savings budget
4. Add monthly contribution calculator
5. Install `vite-plugin-pwa`, configure manifest.json
6. Create PWA icons (192x192, 512x512)
7. Test on mobile — fix any layout issues
8. Add pull-to-refresh on dashboard
9. Build `AnalyticsPage.tsx` with Recharts (bar + donut)

**Deliverable: Works as installable PWA on phone. Goals visible.**

---

### Sprint 4 — Polish + Settings (Days 22–28)
**Goal: Production-ready, full settings control**

Tasks:
1. Settings page:
   - Manage phone whitelist (add/remove numbers)
   - Change distribution ratios (sliders for 50/30/20)
   - Edit categories (name, icon, limit, quick access toggle)
   - Export data as JSON
   - Import data from JSON
2. Income sources management (can rename, reorder)
3. Notifications: browser notification on income date approaching
4. Smooth animations on page transitions
5. Loading states for all async operations
6. Error boundaries + fallback UI
7. Empty states (no income yet → onboarding card)
8. Responsive polish: tablet view

**Deliverable: Fully polished app ready to share with wife.**

---

### Sprint 5 — Supabase Sync (Optional, Days 29–40)
**Goal: Shared data between husband's and wife's devices**

Tasks:
1. Create Supabase project (free tier)
2. Create tables: users, incomes, expenses, categories, goals
3. Enable Row Level Security (each user sees all family data)
4. Replace localStorage stores with Supabase queries
5. Add real-time sync with Supabase subscriptions
6. Keep localStorage as offline cache (sync on reconnect)
7. Auth: Supabase phone OTP or magic link by email
8. Deploy to Vercel with env vars

---

## Key Implementation Notes

### Why Zustand over Redux/Context
- Zero boilerplate
- Works perfectly with localStorage persistence
- `persist` middleware: `useIncomeStore` automatically saves to localStorage

### localStorage Persistence Pattern
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useIncomeStore = create(
  persist(
    (set, get) => ({
      incomes: [] as Income[],
      addIncome: (income: Omit<Income, 'id' | 'createdAt' | 'distribution'>) => {
        const distribution = distributeIncome(income.amount);
        set(state => ({
          incomes: [...state.incomes, {
            ...income,
            id: crypto.randomUUID(),
            distribution,
            createdAt: new Date().toISOString(),
          }]
        }));
      },
    }),
    { name: 'family-budget-incomes' }
  )
);
```

### Income Period Logic
```
Month example (October):
Day 1  ─── 
Day 10 ─── 💰 General income     → Period A starts
Day 15 ─── 💰 Wife advance       → Period B starts, Period A ends
Day 29 ─── 💰 Husband salary     → Period C starts, Period B ends
Day 31 ─── 💰 Wife salary        → Period D starts, Period C ends
Day 10 (Nov) ── Period D ends

For any given day → find current period → show:
"До следующего прихода: N дней (source name, date)"
"Свободный дневной бюджет: FlexibleRemaining / N"
```

### Distribution Preview UX (critical flow)
```
User taps "+ Доход"
  → enters amount: 150,000
  → selects source: "Зарплата мужа"
  → system shows BEFORE saving:
    ┌────────────────────────────┐
    │ Как распределить 150,000 ₸ │
    ├────────────────────────────┤
    │ 🔵 Обязательные  75,000 ₸ │  ←─ tap to adjust
    │ 🟢 Гибкие        45,000 ₸ │
    │ 🟡 Накопления    30,000 ₸ │
    └────────────────────────────┘
    [Изменить %]   [Сохранить →]
  → User confirms → income saved → limits updated → dashboard refreshes
```

### Quick Expense UX (critical flow)
```
User taps [☕ Кофе] on dashboard
  → Small modal appears (bottom sheet):
    "Кофе ☕"
    [    1,500    ] ₸   ← numeric keypad
    [  Сохранить  ]
  → Done. 2 seconds total.
```

---

## Design Direction

**Aesthetic: "Premium Finance Dark"**
- Dark background: `#0D1117` (near-black, not pure black)
- Cards: `#161B22` with subtle border `#30363D`
- Accent: Teal `#00B4D8` for interactive elements
- Success green: `#2EA043` for positive balances
- Warning amber: `#E3B341` for near-limit
- Danger red: `#F85149` for over-limit
- Font: `DM Mono` for numbers (financial feel), `Outfit` for UI text
- Numbers always formatted: `1 500 000 ₸` (space separator, tenge symbol)
- Smooth transitions: 200ms ease-out on all state changes
- Progress bars: animated fill on load

---

## Commands to Start

```bash
# 1. Create project
npm create vite@latest family-budget -- --template react-ts
cd family-budget

# 2. Install dependencies
npm install zustand recharts lucide-react
npm install -D tailwindcss postcss autoprefixer @types/node
npm install vite-plugin-pwa

# 3. Init Tailwind
npx tailwindcss init -p

# 4. Start dev
npm run dev
```

---

## Files to Create First (in order)

1. `src/types/index.ts` — all interfaces
2. `src/lib/dates.ts` — date utilities
3. `src/lib/budget.ts` — financial formulas
4. `src/lib/storage.ts` — localStorage helpers
5. `src/constants/categories.ts` — default categories
6. `src/store/useAuthStore.ts`
7. `src/store/useIncomeStore.ts`
8. `src/store/useExpenseStore.ts`
9. `src/store/useCategoryStore.ts`
10. `src/store/useBudgetStore.ts` — computed summaries
11. `src/components/ui/` — Button, Card, Modal, ProgressBar
12. `src/components/layout/` — BottomNav, Header
13. `src/pages/AuthPage.tsx`
14. `src/pages/DashboardPage.tsx`
15. `src/components/dashboard/` — all widgets
16. `src/components/income/` — IncomeForm, DistributionPreview
17. `src/components/expenses/` — QuickExpenseBar, ExpenseForm
18. `src/App.tsx` — routing
19. `vite.config.ts` — with PWA plugin
20. `tailwind.config.ts` — custom theme

---

## Notes for Claude Code

- Always use TypeScript strict mode — no `any`
- All monetary values stored as integers (tenge, no decimals)
- Dates stored as ISO strings, manipulated with native Date
- All stores use Zustand `persist` middleware for automatic localStorage sync
- Components should be < 150 lines — split if larger
- Financial formulas in `src/lib/budget.ts` must have unit tests
- The `useBudgetStore` is read-only computed — never stores raw data, derives from income/expense stores
- Mobile-first: design for 390px width first, then expand
