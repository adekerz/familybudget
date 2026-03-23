# Статус реализации — Family Budget App

## ✅ Что полностью сделано (Sprint 1 + 2 + 3 + 4)

### Инфраструктура
- `package.json` — vite@5, react@19, zustand@5, tailwindcss@3, recharts@3, lucide-react, **vite-plugin-pwa**
- `vite.config.ts` — @vitejs/plugin-react, alias @/, **VitePWA (registerType: autoUpdate, manifest)**
- `tsconfig.json` — strict mode
- `tailwind.config.ts` — дизайн-токены: primary/card/border/muted/accent/danger/warning/success/white; шрифты DM Mono + Outfit
- `index.html` — Google Fonts, viewport, theme-color
- `src/index.css` — tailwind + тёмная тема
- `public/icons/icon-192.svg`, `icon-512.svg` — PWA иконки
- **dist/** — продакшн билд работает (`npm run build` ✅)

### Типы и константы
- `src/types/index.ts` — все интерфейсы + `PageTab = 'dashboard' | 'income' | 'expenses' | 'analytics' | 'goals' | 'settings'`
- `src/constants/categories.ts` — 16 дефолтных категорий, INCOME_SOURCE_LABELS, INCOME_SOURCE_DAYS

### Утилиты (src/lib/)
- `format.ts` — formatMoney, formatPhone, formatDate, formatDateFull
- `dates.ts` — getLastDayOfMonth, getDaysUntil, getMonthsUntil, isInPeriod, getNextIncomeDates, getNextIncomeDate, getCurrentMonthRange
- `budget.ts` — distributeIncome, getDailyLimit, getPeriodBalance, getGoalMonthlyContribution

### Zustand сторы (src/store/) — все с persist middleware
- `useAuthStore.ts` — login, logout, **addToWhitelist, removeFromWhitelist**
- `useIncomeStore.ts` — addIncome (с авто-распределением), removeIncome
- `useExpenseStore.ts` — addExpense, removeExpense
- `useCategoryStore.ts` — categories
- `useBudgetStore.ts` — хук `useBudgetSummary()` — computed
- **`useGoalsStore.ts`** — addGoal, updateGoal, removeGoal, contributeToGoal

### UI-примитивы (src/components/ui/)
- `Button.tsx` (default export), `Card.tsx`, `Modal.tsx` (default export), `ProgressBar.tsx` (named export, prop: `value`), `Badge.tsx`

### Layout (src/components/layout/)
- `Header.tsx` — "FamilyBudget" + дата + logout
- `BottomNav.tsx` — **6 табов**: Главная/Доходы/Расходы/Цели/Аналитика/Настройки

### Dashboard компоненты (src/components/dashboard/)
- `BalanceWidget.tsx`, `CategoryCards.tsx`, `QuickExpenseBar.tsx`, `RecentExpenses.tsx`, `IncomeTimeline.tsx`, `OverBudgetAlert.tsx`

### Goals компоненты (src/components/goals/) — НОВЫЕ
- `GoalCard.tsx` — карточка цели с прогресс-баром, пополнение через Modal
- `GoalForm.tsx` — создание цели (иконка, цвет, название, сумма, дата)
- `GoalsList.tsx` — grid из GoalCard, empty state

### Expenses компоненты
- `ExpenseForm.tsx` — полная форма расхода

### Income компоненты
- `IncomeForm.tsx`, `DistributionPreview.tsx`, `IncomeList.tsx`

### ErrorBoundary
- `src/components/ErrorBoundary.tsx` — class component с fallback UI

### Страницы (src/pages/)
- `AuthPage.tsx` — ввод телефона +7 XXX XXX XX XX
- `DashboardPage.tsx` — **онбординг** если нет доходов + BalanceWidget + CategoryCards + QuickExpenseBar + RecentExpenses + IncomeTimeline
- `IncomePage.tsx` — IncomeList + IncomeForm modal
- `ExpensesPage.tsx` — история с фильтрами + ExpenseForm
- `AnalyticsPage.tsx` — период selector + Recharts (bar + pie)
- **`GoalsPage.tsx`** — GoalsList + FAB "+" → GoalForm, показывает savings budget
- **`SettingsPage.tsx`** — whitelist management, экспорт/импорт JSON, очистка данных, logout

### Роутинг
- `src/App.tsx` — ErrorBoundary + state-based routing (6 страниц) + BottomNav
- `src/main.tsx` — ReactDOM.createRoot

---

## ❌ Что НЕ сделано (опционально Sprint 5)

### Sprint 5 — Supabase Sync (опционально)
1. Supabase project — таблицы: users, incomes, expenses, categories, goals
2. Row Level Security
3. Замена localStorage на Supabase
4. Real-time sync через subscriptions
5. Deploy на Vercel с env vars

### Мелкие улучшения (если нужно)
- PNG иконки для PWA (сейчас SVG — работает, но PNG надёжнее)
- Framer-motion анимации переходов между табами
- Настройки распределения (слайдеры 50/30/20 в SettingsPage)
- Кастомный лимит по категориям в настройках

---

## ⚠️ Важные технические заметки

### Импорты UI-компонентов
```typescript
// Button и Modal — default exports
import Button from '../ui/Button';
import Modal from '../ui/Modal';

// ProgressBar — named export, prop value (не percent!)
import { ProgressBar } from '../ui/ProgressBar';
<ProgressBar value={75} /> // не percent!
```

### Критический баг паттерн — НЕ делать:
```typescript
// ПЛОХО — infinite loop в Zustand
const quickCats = useCategoryStore((s) => s.getQuickAccessCategories());

// ХОРОШО
const categories = useCategoryStore((s) => s.categories);
const quickCats = categories.filter(c => c.isQuickAccess);
```

### Интеграция Goals с бюджетом
При пополнении цели через GoalCard автоматически создаётся expense типа 'savings':
```typescript
contributeToGoal(goal.id, val);        // обновляет currentAmount в goal
addExpense({ type: 'savings', ... });  // учитывается в savingsActual в useBudgetSummary
```

### Дизайн-система (Tailwind токены)
| Класс | Цвет | Использование |
|---|---|---|
| `bg-primary` | #0D1117 | Основной фон |
| `bg-card` | #161B22 | Карточки |
| `border-border` | #30363D | Бордеры |
| `text-muted` | #8B949E | Вторичный текст |
| `text-accent` / `bg-accent` | #00B4D8 | Акцент (teal) |
| `text-danger` | #F85149 | Ошибки/перерасход |
| `text-warning` | #E3B341 | Предупреждения |
| `text-success` | #2EA043 | Успех |
| `font-mono` | DM Mono | Числа (деньги) |

### Роутинг
- Без react-router — state-based через `activeTab` в `App.tsx`
- PageTab: `'dashboard' | 'income' | 'expenses' | 'analytics' | 'goals' | 'settings'`

### Хранение данных (Zustand persist ключи)
- `family-budget-auth`
- `family-budget-incomes`
- `family-budget-expenses`
- `family-budget-categories`
- `family-budget-goals`

## Полная спецификация
Полный дизайн-документ — см. `CLAUDE_CODE_PLAN.md`
